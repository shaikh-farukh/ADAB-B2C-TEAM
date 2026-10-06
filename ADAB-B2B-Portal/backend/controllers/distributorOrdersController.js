import { validationResult } from 'express-validator';
import pool from '../Config/database.js';
import { publishToQueue } from '../Config/rabbitmq.js';
import { createInvoicePDFStream } from '../utils/pdfGenerator.js';

// Place order from cart
export const placeOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const distributorId = req.user.userId;
    const { shipping_address, delivery_mode, payment_mode, delivery_charge } = req.body;


    // Get distributor details
    const distributorQuery = await client.query(
      'SELECT email FROM manage_b_to_b_userdetail WHERE id = $1 AND deleted_at IS NULL',
      [distributorId]
    );

    if (distributorQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }

    const distributorEmail = distributorQuery.rows[0].email;

    // Get cart items grouped by manufacturer
    const cartQuery = `
      SELECT
        c.*,
        p.price as unit_price,
        p.product_name,
        p.id::varchar as product_sku,
        p.manufacturer_id,
        p.price as product_price,
        m.company_name as manufacturer_name
      FROM manage_b_to_b_cart c
      INNER JOIN manage_manufacturer_products p ON c.product_id = p.id
      INNER JOIN manage_b_to_b_userdetail m ON p.manufacturer_id = m.id
      WHERE c.distributor_id = $1
      ORDER BY p.manufacturer_id
    `;

    const cartResult = await client.query(cartQuery, [distributorId]);

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Verify B2B partnerships for all manufacturers represented in the cart
    const manufacturerIds = [...new Set(cartResult.rows.map(item => item.manufacturer_id))];
    const partnershipsQuery = `
      SELECT manufacturer_id
      FROM manage_b_to_b_request_access
      WHERE manufacturer_id = ANY($1)
        AND email_distributer = $2
        AND manufacture_request = 1
        AND distributer_request = 1
        AND deleted_at IS NULL
    `;
    const partnershipsResult = await client.query(partnershipsQuery, [manufacturerIds, distributorEmail]);
    const approvedManufacturerIds = new Set(partnershipsResult.rows.map(row => parseInt(row.manufacturer_id)));

    for (const mId of manufacturerIds) {
      if (!approvedManufacturerIds.has(parseInt(mId))) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          message: 'Access Denied. You do not have approved partnerships with all manufacturers in your cart.'
        });
      }
    }

    // Lock product rows in database to check stock safely and prevent race conditions
    const productIds = cartResult.rows.map(item => item.product_id);
    const lockProductsQuery = `
      SELECT id, stock_quantity, product_name
      FROM manage_manufacturer_products
      WHERE id = ANY($1) AND deleted_at IS NULL
      FOR UPDATE
    `;
    const lockProductsResult = await client.query(lockProductsQuery, [productIds]);
    const productStockMap = {};
    lockProductsResult.rows.forEach(prod => {
      productStockMap[prod.id] = parseInt(prod.stock_quantity);
    });

    // Validate stock levels
    for (const item of cartResult.rows) {
      const currentStock = productStockMap[item.product_id];
      if (currentStock === undefined) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: `Product "${item.product_name}" is no longer available.`
        });
      }
      if (item.quantity > currentStock) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product "${item.product_name}". Only ${currentStock} units available, but requested ${item.quantity}.`
        });
      }
    }

    // Group items by manufacturer
    const itemsByManufacturer = {};
    cartResult.rows.forEach(item => {
      if (!itemsByManufacturer[item.manufacturer_id]) {
        itemsByManufacturer[item.manufacturer_id] = [];
      }
      itemsByManufacturer[item.manufacturer_id].push(item);
    });

    const createdOrders = [];

    // Create separate order for each manufacturer
    for (const [manufacturerId, items] of Object.entries(itemsByManufacturer)) {
      const itemsAmount = items.reduce((sum, item) => {
        const price = parseFloat(item.unit_price) > 0 ? parseFloat(item.unit_price) : parseFloat(item.product_price || 0);
        return sum + (price * parseInt(item.quantity));
      }, 0);
      const delCharge = parseFloat(delivery_charge) || 0;
      const totalAmount = itemsAmount + delCharge;

      // Check Net-30 Credit if applicable
      if (payment_mode === 'NET_30') {
        const creditQuery = `
          SELECT credit_limit, outstanding_amount
          FROM relationship_credits
          WHERE creditor_id = $1 AND debtor_id = $2 AND debtor_type = 'distributor'
        `;
        const creditResult = await client.query(creditQuery, [manufacturerId, distributorId]);

        if (creditResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `No credit line established with manufacturer ID ${manufacturerId}.`
          });
        }

        const creditData = creditResult.rows[0];
        const availableCredit = parseFloat(creditData.credit_limit) - parseFloat(creditData.outstanding_amount);

        if (totalAmount > availableCredit) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Credit Limit Exceeded for manufacturer ID ${manufacturerId}. Available: ${availableCredit.toFixed(2)}, Required: ${totalAmount.toFixed(2)}`
          });
        }

        // Check for overdue invoices with this manufacturer
        const overdueInvoices = await client.query(
          `SELECT id FROM manage_b_to_b_invoices
           WHERE distributor_id = $1 AND manufacturer_id = $2
           AND due_date < CURRENT_TIMESTAMP
           AND (status IS NULL OR status != 'paid')
           LIMIT 1`,
          [distributorId, manufacturerId]
        );

        if (overdueInvoices.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(403).json({
            success: false,
            message: `Cannot place Net-30 order. You have overdue unpaid invoices with manufacturer ID ${manufacturerId}. Please clear your dues first.`
          });
        }

        // Reserve the credit
        await client.query(
          `UPDATE relationship_credits 
           SET outstanding_amount = outstanding_amount + $1, modified_at = CURRENT_TIMESTAMP
           WHERE creditor_id = $2 AND debtor_id = $3 AND debtor_type = 'distributor'`,
          [totalAmount, manufacturerId, distributorId]
        );
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create order
      const orderQuery = `
        INSERT INTO manage_b_to_b_orders (
          order_number,
          manufacturer_id,
          distributor_id,
          total_amount,
          final_amount,
          delivery_charge,
          shipping_address,
          status,
          delivery_type,
          payment_mode,
          created_at,
          created_by,
          active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PO_SUBMITTED', $8, $9, CURRENT_TIMESTAMP, $3, true)
        RETURNING *
      `;

      const orderResult = await client.query(orderQuery, [
        orderNumber,
        manufacturerId,
        distributorId,
        itemsAmount,
        totalAmount,
        delCharge,
        shipping_address,
        delivery_mode || 'THIRD_PARTY',
        payment_mode || 'CASH'
      ]);

      const order = orderResult.rows[0];

      // Create order items
      for (const item of items) {
        // Decrement product stock
        await client.query(
          `UPDATE manage_manufacturer_products
           SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );

        await client.query(
          `INSERT INTO manage_b_to_b_order_items (
            order_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [
            order.id,
            item.product_id,
            item.product_name,
            item.quantity,
            parseFloat(item.unit_price) > 0 ? parseFloat(item.unit_price) : parseFloat(item.product_price || 0),
            ((parseFloat(item.unit_price) > 0 ? parseFloat(item.unit_price) : parseFloat(item.product_price || 0)) * parseInt(item.quantity)).toFixed(2)
          ]
        );
      }

      // Add order status history
      await client.query(
        `INSERT INTO manage_b_to_b_order_status_history
         (order_id, status, notes, changed_by, created_at)
         VALUES ($1, 'PO_SUBMITTED', 'Order placed by distributor', $2, CURRENT_TIMESTAMP)`,
        [order.id, distributorId]
      );

      // Create Ledger Entry for the Order (Debit)
      // Create Ledger Entry for the Order (Debit) - For ALL payment modes
      // Find existing balance to compute new balance
      const balanceResult = await client.query(
        `SELECT balance FROM manage_b_to_b_ledger_entries WHERE distributor_id = $1 ORDER BY id DESC LIMIT 1`,
        [distributorId]
      );
      let currentBalance = 0;
      if (balanceResult.rows.length > 0) {
        currentBalance = parseFloat(balanceResult.rows[0].balance);
      }
      
      await client.query(
        `INSERT INTO manage_b_to_b_ledger_entries 
         (distributor_id, type, reference_id, description, debit, credit, balance, created_at)
         VALUES ($1, 'ORDER', $2, $3, $4, 0, $5, CURRENT_TIMESTAMP)`,
        [
          distributorId, 
          order.id, 
          `Purchase Order Placed: ${orderNumber} (${payment_mode || 'CASH'})`, 
          totalAmount, 
          currentBalance + parseFloat(totalAmount)
        ]
      );

      createdOrders.push({
        order_id: order.id,
        order_number: orderNumber,
        manufacturer_id: manufacturerId,
        total_amount: totalAmount,
        items_count: items.length
      });

      // Publish to order processing queue for stock deduction and invoice generation
      publishToQueue('ORDER_CREATED_QUEUE', {
        order_id: order.id,
        order_number: orderNumber,
        distributor_id: distributorId,
        manufacturer_id: manufacturerId,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
      });
    }

    // Clear cart
    await client.query(
      'DELETE FROM manage_b_to_b_cart WHERE distributor_id = $1',
      [distributorId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Order(s) placed successfully',
      data: {
        orders: createdOrders,
        total_orders: createdOrders.length
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Place order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

// Get all orders
export const getOrders = async (req, res) => {
  try {
    const distributorId = req.user.userId;
    const { status, category, page, limit, search, sortBy, sortDesc } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Build the WHERE clause dynamically
    const conditions = ['o.distributor_id = $1', 'o.deleted_at IS NULL'];
    const queryParams = [distributorId];
    let paramIndex = 2;

    if (status) {
      let dbStatus = status;
      if (status.toUpperCase() === 'PO_SUBMITTED') dbStatus = 'pending';
      if (status.toUpperCase() === 'READY_FOR_DISPATCH') dbStatus = 'ready_for_dispatch';

      if (status.toUpperCase() === 'SHIPPED') {
        conditions.push(`(UPPER(o.status) = 'SHIPPED' OR UPPER(o.status) = 'DISPATCHED')`);
      } else {
        conditions.push(`UPPER(o.status) = UPPER($${paramIndex})`);
        queryParams.push(dbStatus);
        paramIndex++;
      }
    }

    if (category) {
      conditions.push(`EXISTS (
        SELECT 1 FROM manage_b_to_b_order_items oi2
        JOIN manage_manufacturer_products p ON oi2.product_id = p.id
        WHERE oi2.order_id = o.id AND p.category = $${paramIndex}
      )`);
      queryParams.push(category);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(o.order_number ILIKE $${paramIndex} OR m.company_name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Determine sorting
    let sortColumn = 'o.created_at';
    if (sortBy === 'order_number') sortColumn = 'o.order_number';
    if (sortBy === 'manufacturer_name') sortColumn = 'm.company_name';
    if (sortBy === 'total_amount') sortColumn = 'o.total_amount';
    if (sortBy === 'status') sortColumn = 'o.status';

    const sortOrder = sortDesc === 'false' ? 'ASC' : 'DESC';

    // First get the total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM manage_b_to_b_orders o
      LEFT JOIN manage_b_to_b_userdetail m ON o.manufacturer_id = m.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].total) || 0;

    // Then get the paginated data
    let query = `
      SELECT
        o.id,
        o.order_number,
        o.manufacturer_id,
        m.company_name as manufacturer_name,
        o.order_date,
        o.total_amount,
        o.status,
        o.delivery_mode,
        o.tracking_number,
        o.created_at,
        COUNT(oi.id) as items_count
      FROM manage_b_to_b_orders o
      LEFT JOIN manage_b_to_b_userdetail m ON o.manufacturer_id = m.id
      LEFT JOIN manage_b_to_b_order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id, m.company_name
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Add limit and offset to queryParams
    const paginatedParams = [...queryParams, limitNum, offset];

    const result = await pool.query(query, paginatedParams);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      total_count: totalCount,
      data: result.rows.map(row => ({
        id: row.id,
        order_number: row.order_number,
        manufacturer_id: row.manufacturer_id,
        manufacturer_name: row.manufacturer_name,
        order_date: row.order_date,
        total_amount: parseFloat(row.total_amount),
        status: row.status.toUpperCase(),
        delivery_mode: row.delivery_mode,
        tracking_number: row.tracking_number,
        items_count: parseInt(row.items_count),
        created_at: row.created_at
      }))
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Get single order details
export const getOrder = async (req, res) => {
  try {
    const distributorId = req.user.userId;
    const { id } = req.params;

    // Get order details
    const orderQuery = `
      SELECT
        o.*,
        m.company_name as manufacturer_name,
        m.email as manufacturer_email,
        m.mobile as manufacturer_mobile,
        m.address as manufacturer_address
      FROM manage_b_to_b_orders o
      LEFT JOIN manage_b_to_b_userdetail m ON o.manufacturer_id = m.id
      WHERE o.id = $1 AND o.distributor_id = $2 AND o.deleted_at IS NULL
    `;

    const orderResult = await pool.query(orderQuery, [id, distributorId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsQuery = `
      SELECT
        oi.*,
        p.product_image,
        p.category
      FROM manage_b_to_b_order_items oi
      LEFT JOIN manage_manufacturer_products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;

    const itemsResult = await pool.query(itemsQuery, [id]);

    if (order.delivery_mode) {
      order.delivery_mode = order.delivery_mode.toUpperCase();
    }
    order.items = itemsResult.rows;

    res.status(200).json({
      success: true,
      data: {
        order: {
          ...order,
          status: order.status.toUpperCase()
        },
        items: itemsResult.rows
      }
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details'
    });
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const distributorId = req.user.userId;
    const { id: orderId } = req.params;

    const orderCheck = await pool.query(
      `SELECT id FROM manage_b_to_b_orders
       WHERE id = $1 AND distributor_id = $2 AND deleted_at IS NULL`,
      [orderId, distributorId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const invoiceQuery = `
      SELECT
        inv.id                        AS invoice_id,
        inv.invoice_number,
        inv.order_id,
        inv.subtotal                  AS subtotal_amount,
        inv.gst_percentage            AS gst_percent,
        inv.tax_amount                AS gst_amount,
        inv.total_amount,
        inv.due_date,
        inv.status                    AS invoice_status,
        inv.created_at                AS invoice_date,
        o.order_number,
        o.order_date,
        o.shipping_address,
        o.status                      AS order_status,
        o.payment_mode                AS payment_mode,

        -- manufacturer info
        m.id                          AS manufacturer_id,
        m.company_name                AS manufacturer_company_name,
        m.address                     AS manufacturer_address,
        m.gst_number                  AS manufacturer_gst,
        m.email                       AS manufacturer_email,
        m.mobile                      AS manufacturer_mobile,
        CONCAT(m.bank_name, ' - ', m.bank_account_no, ' (IFSC: ', m.ifsc_code, ')') AS manufacturer_bank_details,
        d.id                          AS distributor_id,
        d.company_name                AS distributor_company_name,
        d.address                     AS distributor_address,
        d.gst_number                  AS distributor_gst,
        d.email                       AS distributor_email,
        d.mobile                      AS distributor_mobile
      FROM manage_b_to_b_invoices inv
      INNER JOIN manage_b_to_b_orders o        ON inv.order_id       = o.id
      INNER JOIN manage_b_to_b_userdetail m    ON inv.manufacturer_id = m.id
      INNER JOIN manage_b_to_b_userdetail d    ON inv.distributor_id  = d.id
      WHERE inv.order_id       = $1
        AND inv.distributor_id = $2
        AND inv.deleted_at IS NULL
    `;

    const invoiceResult = await pool.query(invoiceQuery, [orderId, distributorId]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not yet generated for this order. Please contact the manufacturer.'
      });
    }

    const inv = invoiceResult.rows[0];

    const itemsQuery = `
      SELECT
        oi.id,
        oi.product_id,
        oi.product_name,
        p.sku AS product_sku,
        oi.quantity,
        oi.unit_price,
        (oi.quantity * oi.unit_price)  AS subtotal,
        p.product_image,
        p.category
      FROM manage_b_to_b_order_items oi
      LEFT JOIN manage_manufacturer_products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC
    `;

    const itemsResult = await pool.query(itemsQuery, [orderId]);

    const paymentsQuery = `
      SELECT
        p.id             AS payment_id,
        p.amount,
        p.mode           AS payment_mode,
        p.reference_id,
        p.status,
        p.created_at     AS received_at,
        pa.allocated_amount
      FROM manage_b_to_b_payment_allocations pa
      INNER JOIN manage_b_to_b_payments p ON pa.payment_id = p.id
      WHERE pa.invoice_id = $1
      ORDER BY p.created_at ASC
    `;

    const paymentsResult = await pool.query(paymentsQuery, [inv.invoice_id]);

    const total_paid = paymentsResult.rows.reduce(
      (sum, p) => sum + parseFloat(p.allocated_amount), 0
    );
    const balance_due = parseFloat(inv.total_amount) - total_paid;

    res.status(200).json({
      success: true,
      message: 'Invoice retrieved successfully',
      data: {
        invoice_id: inv.invoice_id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        invoice_status: inv.invoice_status,
        order: {
          order_id: inv.order_id,
          order_number: inv.order_number,
          order_date: inv.order_date,
          shipping_address: inv.shipping_address,
          order_status: inv.order_status,
          payment_mode: inv.payment_mode
        },
        manufacturer: {
          id: inv.manufacturer_id,
          company_name: inv.manufacturer_company_name,
          address: inv.manufacturer_address,
          gst_number: inv.manufacturer_gst,
          email: inv.manufacturer_email,
          mobile: inv.manufacturer_mobile,
          bank_details: inv.manufacturer_bank_details
        },
        distributor: {
          id: inv.distributor_id,
          company_name: inv.distributor_company_name,
          address: inv.distributor_address,
          gst_number: inv.distributor_gst,
          email: inv.distributor_email,
          mobile: inv.distributor_mobile
        },
        items: itemsResult.rows.map(item => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          product_image: item.product_image,
          category: item.category,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
          subtotal: parseFloat(item.subtotal)
        })),
        financials: {
          subtotal_amount: parseFloat(inv.subtotal_amount),
          gst_percent: parseFloat(inv.gst_percent),
          gst_amount: parseFloat(inv.gst_amount),
          total_amount: parseFloat(inv.total_amount),
          total_paid: parseFloat(total_paid.toFixed(2)),
          balance_due: parseFloat(balance_due.toFixed(2))
        },
        payments: paymentsResult.rows.map(p => ({
          payment_id: p.payment_id,
          amount: parseFloat(p.amount),
          allocated_amount: parseFloat(p.allocated_amount),
          payment_mode: p.payment_mode,
          reference_id: p.reference_id,
          status: p.status,
          received_at: p.received_at
        }))
      }
    });

  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoice'
    });
  }
};

export const downloadInvoicePDF = async (req, res) => {
  try {
    const distributorId = req.user.userId;
    const { id: orderId } = req.params;

    const orderCheck = await pool.query(
      `SELECT id FROM manage_b_to_b_orders
       WHERE id = $1 AND distributor_id = $2 AND deleted_at IS NULL`,
      [orderId, distributorId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const invoiceQuery = `
      SELECT
        inv.id                        AS invoice_id,
        inv.invoice_number,
        inv.order_id,
        inv.subtotal                  AS subtotal_amount,
        inv.gst_percentage            AS gst_percent,
        inv.tax_amount                AS gst_amount,
        inv.total_amount,
        inv.due_date,
        inv.status                    AS invoice_status,
        inv.created_at                AS invoice_date,
        o.order_number, o.order_date, o.shipping_address, o.status AS order_status, o.payment_mode AS payment_mode,
        m.id AS manufacturer_id, m.company_name AS manufacturer_company_name, m.address AS manufacturer_address, m.gst_number AS manufacturer_gst, m.email AS manufacturer_email, m.mobile AS manufacturer_mobile, CONCAT(m.bank_name, ' - ', m.bank_account_no, ' (IFSC: ', m.ifsc_code, ')') AS manufacturer_bank_details,
        d.id AS distributor_id, d.company_name AS distributor_company_name, d.address AS distributor_address, d.gst_number AS distributor_gst, d.email AS distributor_email, d.mobile AS distributor_mobile
      FROM manage_b_to_b_invoices inv
      INNER JOIN manage_b_to_b_orders o ON inv.order_id = o.id
      INNER JOIN manage_b_to_b_userdetail m ON inv.manufacturer_id = m.id
      INNER JOIN manage_b_to_b_userdetail d ON inv.distributor_id = d.id
      WHERE inv.order_id = $1 AND inv.distributor_id = $2 AND inv.deleted_at IS NULL
    `;

    const invoiceResult = await pool.query(invoiceQuery, [orderId, distributorId]);

    let inv;
    let isProForma = false;

    if (invoiceResult.rows.length === 0) {
      isProForma = true;
      const orderDataQuery = `
        SELECT o.id AS order_id, o.order_number, o.order_date, o.shipping_address, o.status AS order_status, o.total_amount, o.payment_mode AS payment_mode,
          m.id AS manufacturer_id, m.company_name AS manufacturer_company_name, m.address AS manufacturer_address, m.gst_number AS manufacturer_gst, m.email AS manufacturer_email, m.mobile AS manufacturer_mobile, CONCAT(m.bank_name, ' - ', m.bank_account_no, ' (IFSC: ', m.ifsc_code, ')') AS manufacturer_bank_details,
          d.id AS distributor_id, d.company_name AS distributor_company_name, d.address AS distributor_address, d.gst_number AS distributor_gst, d.email AS distributor_email, d.mobile AS distributor_mobile
        FROM manage_b_to_b_orders o
        INNER JOIN manage_b_to_b_userdetail m ON o.manufacturer_id = m.id
        INNER JOIN manage_b_to_b_userdetail d ON o.distributor_id = d.id
        WHERE o.id = $1 AND o.distributor_id = $2 AND o.deleted_at IS NULL
      `;
      const orderDataRes = await pool.query(orderDataQuery, [orderId, distributorId]);
      if (orderDataRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      const ord = orderDataRes.rows[0];

      inv = {
        invoice_id: 'PROFORMA',
        invoice_number: `PRO-${ord.order_number || ord.order_id}`,
        order_id: ord.order_id,
        subtotal_amount: ord.total_amount,
        gst_percent: 0,
        gst_amount: 0,
        total_amount: ord.total_amount,
        due_date: new Date(),
        invoice_status: 'PRO-FORMA',
        invoice_date: new Date(),
        order_number: ord.order_number,
        order_date: ord.order_date,
        shipping_address: ord.shipping_address,
        order_status: ord.order_status,
        payment_mode: ord.payment_mode,
        manufacturer_id: ord.manufacturer_id,
        manufacturer_company_name: ord.manufacturer_company_name,
        manufacturer_address: ord.manufacturer_address,
        manufacturer_gst: ord.manufacturer_gst,
        manufacturer_email: ord.manufacturer_email,
        manufacturer_mobile: ord.manufacturer_mobile,
        manufacturer_bank_details: ord.manufacturer_bank_details,
        distributor_id: ord.distributor_id,
        distributor_company_name: ord.distributor_company_name,
        distributor_address: ord.distributor_address,
        distributor_gst: ord.distributor_gst,
        distributor_email: ord.distributor_email,
        distributor_mobile: ord.distributor_mobile
      };
    } else {
      inv = invoiceResult.rows[0];
    }

    const itemsQuery = `
      SELECT oi.id, oi.product_id, oi.product_name, p.sku AS product_sku, oi.quantity, oi.unit_price, (oi.quantity * oi.unit_price) AS subtotal, p.product_image, p.category
      FROM manage_b_to_b_order_items oi
      LEFT JOIN manage_manufacturer_products p ON oi.product_id = p.id
      WHERE oi.order_id = $1 ORDER BY oi.created_at ASC
    `;
    const itemsResult = await pool.query(itemsQuery, [orderId]);

    let paymentsResult = { rows: [] };
    if (!isProForma) {
      const paymentsQuery = `
        SELECT p.id AS payment_id, p.amount, p.mode AS payment_mode, p.reference_id, p.status, p.created_at AS received_at, pa.allocated_amount
        FROM manage_b_to_b_payment_allocations pa
        INNER JOIN manage_b_to_b_payments p ON pa.payment_id = p.id
        WHERE pa.invoice_id = $1 ORDER BY p.created_at ASC
      `;
      paymentsResult = await pool.query(paymentsQuery, [inv.invoice_id]);
    }

    const total_paid = paymentsResult.rows.reduce((sum, p) => sum + parseFloat(p.allocated_amount), 0);
    const balance_due = parseFloat(inv.total_amount) - total_paid;

    const invoiceData = {
      invoice_id: inv.invoice_id,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      invoice_status: inv.invoice_status,
      order: {
        order_id: inv.order_id,
        order_number: inv.order_number,
        order_date: inv.order_date,
        shipping_address: inv.shipping_address,
        order_status: inv.order_status,
        payment_mode: inv.payment_mode
      },
      manufacturer: {
        id: inv.manufacturer_id,
        company_name: inv.manufacturer_company_name,
        address: inv.manufacturer_address,
        gst_number: inv.manufacturer_gst,
        email: inv.manufacturer_email,
        mobile: inv.manufacturer_mobile,
        bank_details: inv.manufacturer_bank_details
      },
      distributor: {
        id: inv.distributor_id,
        company_name: inv.distributor_company_name,
        address: inv.distributor_address,
        gst_number: inv.distributor_gst,
        email: inv.distributor_email,
        mobile: inv.distributor_mobile
      },
      items: itemsResult.rows.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        product_image: item.product_image,
        category: item.category,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.subtotal)
      })),
      financials: {
        subtotal_amount: parseFloat(inv.subtotal_amount),
        gst_percent: parseFloat(inv.gst_percent),
        gst_amount: parseFloat(inv.gst_amount),
        total_amount: parseFloat(inv.total_amount),
        total_paid: parseFloat(total_paid.toFixed(2)),
        balance_due: parseFloat(balance_due.toFixed(2))
      }
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${inv.invoice_number}.pdf`);

    await createInvoicePDFStream(invoiceData, res);

  } catch (error) {
    console.error('Download invoice PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }
};

/**
 * Get AI-powered Smart Reorder recommendations based on order history and inventory velocity.
 */
export const getSmartReorders = async (req, res) => {
  try {
    const distributorId = req.user.userId;

    const query = `
      SELECT
        oi.product_id,
        COALESCE(p.product_name, oi.product_name) as product_name,
        p.product_image,
        p.category,
        COALESCE(oi.unit_price, p.price) as price,
        COALESCE(p.stock_quantity, 0) as current_stock,
        COALESCE(p.moq, 10) as moq,
        SUM(oi.quantity) as historical_demand,
        COUNT(DISTINCT o.id) as order_frequency,
        MAX(o.created_at) as last_ordered_at,
        m.id as manufacturer_id,
        m.company_name as manufacturer_name,
        CASE
          WHEN COALESCE(p.stock_quantity, 0) <= 20 THEN 'CRITICAL'
          WHEN COALESCE(p.stock_quantity, 0) <= 50 THEN 'MEDIUM'
          ELSE 'OPTIMAL'
        END as stock_status,
        GREATEST(COALESCE(p.moq, 10), CEIL(AVG(oi.quantity))) as recommended_qty
      FROM manage_b_to_b_order_items oi
      INNER JOIN manage_b_to_b_orders o ON oi.order_id = o.id
      LEFT JOIN manage_manufacturer_products p ON oi.product_id = p.id
      LEFT JOIN manage_b_to_b_userdetail m ON o.manufacturer_id = m.id
      WHERE o.distributor_id = $1
        AND o.deleted_at IS NULL
      GROUP BY
        oi.product_id, p.product_name, oi.product_name, p.product_image, p.category,
        oi.unit_price, p.price, p.stock_quantity, p.moq, m.id, m.company_name
      ORDER BY historical_demand DESC
      LIMIT 10
    `;

    const result = await pool.query(query, [distributorId]);

    // If no past order items, provide default suggestions from active catalog
    if (result.rows.length === 0) {
      const fallbackQuery = `
        SELECT
          p.id as product_id,
          p.product_name,
          p.product_image,
          p.category,
          p.price,
          p.stock_quantity as current_stock,
          p.moq,
          p.moq as recommended_qty,
          'RECOMMENDED' as stock_status,
          m.id as manufacturer_id,
          m.company_name as manufacturer_name
        FROM manage_manufacturer_products p
        LEFT JOIN manage_b_to_b_userdetail m ON p.manufacturer_id = m.id
        WHERE p.status = 'active'
        LIMIT 5
      `;
      const fallbackRes = await pool.query(fallbackQuery);
      return res.status(200).json({
        success: true,
        data: fallbackRes.rows
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('getSmartReorders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch smart reorders' });
  }
};