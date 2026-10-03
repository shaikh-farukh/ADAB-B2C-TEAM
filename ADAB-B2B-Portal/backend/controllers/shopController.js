import pool from '../Config/database.js';

// Get catalog for shops (respects territory assignments)
export const getCatalog = async (req, res) => {
  const shopId = req.user.userId;
  const { search, category } = req.query;

  try {
    // Get shop location
    const shopRes = await pool.query(
      'SELECT fk_state, fk_city, pincode FROM shopdetail WHERE id = $1',
      [shopId]
    );
    if (shopRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shop details not found' });
    }
    const { fk_state, fk_city, pincode } = shopRes.rows[0];

    // Query all active products
    let query = `
      SELECT p.*, m.company_name as manufacturer_name
      FROM manage_manufacturer_products p
      JOIN manage_b_to_b_userdetail m ON p.manufacturer_id = m.id
      WHERE p.status = 'active' AND p.deleted_at IS NULL AND m.deleted_at IS NULL
    `;
    const queryParams = [];
    let paramIdx = 1;
    if (search) {
      query += ` AND p.product_name ILIKE ${paramIdx}`;
      queryParams.push(`%${search}%`);
      paramIdx++;
    }
    if (category && category !== 'All Categories' && category.trim() !== '') {
      query += ` AND p.category = ${paramIdx}`;
      queryParams.push(category);
      paramIdx++;
    }

    const productsRes = await pool.query(query, queryParams);
    const catalog = [];

    for (const product of productsRes.rows) {
      // Check territory assignment for this manufacturer & shop location
      const taRes = await pool.query(
        `SELECT distributor_id
         FROM territory_assignments
         WHERE manufacturer_id = $1
           AND active = true
           AND (
             pincode = $2
             OR (city_id = $3 AND pincode IS NULL)
             OR (state_id = $4 AND city_id IS NULL AND pincode IS NULL)
           )
         LIMIT 1`,
        [product.manufacturer_id, pincode, fk_city, fk_state]
      );

      if (taRes.rows.length > 0) {
        const distId = taRes.rows[0].distributor_id;
        // Shop must buy from distributor. Fetch distributor product details
        const dpRes = await pool.query(
          `SELECT dp.price, dp.stock_quantity, dp.is_published, d.company_name as distributor_name
           FROM distributor_products dp
           JOIN manage_b_to_b_userdetail d ON dp.distributor_id = d.id
           WHERE dp.product_id = $1 AND dp.distributor_id = $2 AND dp.is_published = true`,
          [product.id, distId]
        );

        if (dpRes.rows.length > 0) {
          const dp = dpRes.rows[0];
          catalog.push({
            id: product.id,
            product_name: product.product_name,
            product_image: product.product_image,
            category: product.category,
            moq: product.moq,
            price: parseFloat(dp.price),
            stock_quantity: parseInt(dp.stock_quantity),
            supplied_through_distributor: true,
            distributor_id: distId,
            distributor_name: dp.distributor_name,
            seller_name: dp.distributor_name,
            original_price: parseFloat(product.price),
            original_manufacturer_name: product.manufacturer_name,
            manufacturer_name: product.manufacturer_name,
            manufacturer_id: product.manufacturer_id,
            is_restricted_territory: true
          });
        }
      }
    }

    res.status(200).json({ success: true, data: catalog });
  } catch (error) {
    console.error('Get shop catalog error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch catalog' });
  }
};

// Place order for shop
export const placeOrder = async (req, res) => {
  const shopId = req.user.userId;
  const { items, shipping_address, delivery_mode } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart items are required' });
  }

  if (!['SELF', 'THIRD_PARTY'].includes(delivery_mode)) {
    return res.status(400).json({ success: false, message: 'Invalid delivery mode' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get shop location
    const shopRes = await client.query(
      'SELECT fk_state, fk_city, pincode FROM shopdetail WHERE id = $1',
      [shopId]
    );
    if (shopRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Shop details not found' });
    }
    const { fk_state, fk_city, pincode } = shopRes.rows[0];

    // Group items by Seller (Distributor ID or Manufacturer ID)
    const ordersToCreate = {};

    for (const item of items) {
      const { product_id, quantity } = item;

      // Fetch product
      const productRes = await client.query(
        'SELECT * FROM manage_manufacturer_products WHERE id = $1 AND deleted_at IS NULL',
        [product_id]
      );
      if (productRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: `Product not found: ${product_id}` });
      }
      const product = productRes.rows[0];

      // Check territory assignment
      const taRes = await client.query(
        `SELECT distributor_id
         FROM territory_assignments
         WHERE manufacturer_id = $1
           AND active = true
           AND (
             pincode = $2
             OR (city_id = $3 AND pincode IS NULL)
             OR (state_id = $4 AND city_id IS NULL AND pincode IS NULL)
           )
         LIMIT 1`,
        [product.manufacturer_id, pincode, fk_city, fk_state]
      );

      let sellerId, sellerType, unitPrice, currentStock;

      if (taRes.rows.length > 0) {
        // Must buy from distributor
        sellerId = taRes.rows[0].distributor_id;
        sellerType = 'distributor';

        // Get distributor product details
        const dpRes = await client.query(
          `SELECT price, stock_quantity
           FROM distributor_products
           WHERE product_id = $1 AND distributor_id = $2 AND is_published = true`,
          [product_id, sellerId]
        );
        if (dpRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Product "${product.product_name}" is not available from your assigned distributor.`
          });
        }
        unitPrice = parseFloat(dpRes.rows[0].price);
        currentStock = parseInt(dpRes.rows[0].stock_quantity);
      } else {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'No active distributor assigned for your territory. Please contact support.'
        });
      }

      if (quantity > currentStock) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product "${product.product_name}". Available: ${currentStock}, Requested: ${quantity}.`
        });
      }

      const key = `${sellerType}-${sellerId}`;
      if (!ordersToCreate[key]) {
        ordersToCreate[key] = {
          sellerId,
          sellerType,
          items: [],
          totalAmount: 0
        };
      }
      ordersToCreate[key].items.push({
        product_id,
        product_name: product.product_name,
        product_sku: product_id.toString(),
        quantity,
        unitPrice
      });
      ordersToCreate[key].totalAmount += unitPrice * quantity;
    }

    const createdOrders = [];

    // Create the orders
    for (const [key, ord] of Object.entries(ordersToCreate)) {
      const { sellerId, sellerType, items: ordItems, totalAmount } = ord;

      // 1. Verify credit limit
      let creditDays = 0;
      let dueDate = null;

      const creditRes = await client.query(
        `SELECT credit_limit, credit_days, outstanding_amount
         FROM relationship_credits
         WHERE creditor_id = $1 AND debtor_id = $2 AND debtor_type = 'shop'`,
        [sellerId, shopId]
      );

      if (creditRes.rows.length > 0) {
        const { credit_limit, credit_days, outstanding_amount } = creditRes.rows[0];
        if (parseFloat(outstanding_amount) + totalAmount > parseFloat(credit_limit)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Order total exceeds credit limit set by your supplier. Available Credit: ${parseFloat(credit_limit) - parseFloat(outstanding_amount)}`
          });
        }
        creditDays = credit_days;

        // Update outstanding amount
        await client.query(
          `UPDATE relationship_credits
           SET outstanding_amount = outstanding_amount + $1, updated_at = CURRENT_TIMESTAMP
           WHERE creditor_id = $2 AND debtor_id = $3 AND debtor_type = 'shop'`,
          [totalAmount, sellerId, shopId]
        );
      }

      if (creditDays > 0) {
        const date = new Date();
        date.setDate(date.getDate() + creditDays);
        dueDate = date;
      }

      // Generate order number
      const orderNumber = `ORD-SHP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Insert order
      const initialStatus = delivery_mode === 'SELF' ? 'dispatched' : 'pending';

      const orderInsert = await client.query(
        `INSERT INTO manage_b_to_b_orders (
          order_number,
          manufacturer_id,
          distributor_id,
          shop_id,
          total_amount,
          shipping_address,
          status,
          delivery_mode,
          due_date,
          created_at,
          created_by,
          active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $4, true)
        RETURNING *`,
        [
          orderNumber,
          sellerType === 'manufacturer' ? sellerId : null,
          sellerType === 'distributor' ? sellerId : null,
          shopId,
          totalAmount,
          shipping_address,
          initialStatus,
          delivery_mode,
          dueDate
        ]
      );

      const order = orderInsert.rows[0];

      // Create status history
      await client.query(
        `INSERT INTO manage_b_to_b_order_status_history (order_id, status, notes, changed_by)
         VALUES ($1, $2, $3, $4)`,
        [order.id, initialStatus, `Order placed by shop. Delivery Mode: ${delivery_mode}`, shopId]
      );

      // Insert order items & decrement stock
      for (const ordItem of ordItems) {
        if (sellerType === 'distributor') {
          // Decrement distributor stock
          await client.query(
            `UPDATE distributor_products
             SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP
             WHERE distributor_id = $2 AND product_id = $3`,
            [ordItem.quantity, sellerId, ordItem.product_id]
          );
        } else {
          // Decrement manufacturer stock
          await client.query(
            `UPDATE manage_manufacturer_products
             SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [ordItem.quantity, ordItem.product_id]
          );
        }

        // Insert item
        await client.query(
          `INSERT INTO manage_b_to_b_order_items (
            order_id, product_id, product_name, product_sku, quantity, unit_price, created_at, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)`,
          [order.id, ordItem.product_id, ordItem.product_name, ordItem.product_sku, ordItem.quantity, ordItem.unitPrice, shopId]
        );
      }

      createdOrders.push(order);
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Orders placed successfully',
      data: createdOrders
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Shop place order error:', error);
    res.status(500).json({ success: false, message: 'Failed to place orders' });
  } finally {
    client.release();
  }
};

// Get shop order history
export const getOrders = async (req, res) => {
  const shopId = req.user.userId;

  try {
    const query = `
      SELECT o.*,
             m.company_name as manufacturer_name,
             d.company_name as distributor_name
      FROM manage_b_to_b_orders o
      LEFT JOIN manage_b_to_b_userdetail m ON o.manufacturer_id = m.id
      LEFT JOIN manage_b_to_b_userdetail d ON o.distributor_id = d.id
      WHERE o.shop_id = $1 AND o.deleted_at IS NULL
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query, [shopId]);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get shop orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// Get single order detail
export const getOrderDetail = async (req, res) => {
  const shopId = req.user.userId;
  const { id } = req.params;

  try {
    const query = `
      SELECT o.*,
             m.company_name as manufacturer_name,
             d.company_name as distributor_name
      FROM manage_b_to_b_orders o
      LEFT JOIN manage_b_to_b_userdetail m ON o.manufacturer_id = m.id
      LEFT JOIN manage_b_to_b_userdetail d ON o.distributor_id = d.id
      WHERE o.id = $1 AND o.shop_id = $2 AND o.deleted_at IS NULL
    `;
    const result = await pool.query(query, [id, shopId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = result.rows[0];

    const itemsQuery = `
      SELECT oi.*, p.product_image
      FROM manage_b_to_b_order_items oi
      LEFT JOIN manage_manufacturer_products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;
    const itemsResult = await pool.query(itemsQuery, [id]);

    res.status(200).json({
      success: true,
      data: {
        order,
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('Get shop order detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
};
