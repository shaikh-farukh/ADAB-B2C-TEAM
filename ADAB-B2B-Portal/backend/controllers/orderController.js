import { createInvoicePDFStream } from '../utils/pdfGenerator.js';
import { createInvoiceInternal } from './payoutsettlementcontroller.js';
import pool from '../Config/database.js';
import logger from '../utils/logger.js';
import { getIO } from '../Config/socket.js';

// Get all orders for manufacturer with pagination
export const getOrders = async (req, res) => {
  try {
    console.log("DEBUG getOrders URL:", req.originalUrl);
    console.log("DEBUG getOrders QUERY:", req.query);
    const manufacturerId = req.user.userId;
    const { status, distributor_id, start_date, end_date, category, search, sortBy, sortDesc } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    logger.info(`Fetching orders for manufacturer: ${manufacturerId}`, { status, distributor_id, start_date, end_date, category, search, page, limit });

    let baseQuery = `
      FROM manage_b_to_b_orders o
      LEFT JOIN manage_b_to_b_userdetail d ON o.distributor_id = d.id
      LEFT JOIN manage_b_to_b_order_items oi ON o.id = oi.order_id
      WHERE o.manufacturer_id = $1 AND o.deleted_at IS NULL
    `;

    const queryParams = [manufacturerId];
    let paramIndex = 2;

    // Filter by status
    if (status) {
      let dbStatus = status;
      if (status.toUpperCase() === 'PO_SUBMITTED') dbStatus = 'pending';
      if (status.toUpperCase() === 'READY_FOR_DISPATCH') dbStatus = 'ready_for_dispatch';

      if (status.toUpperCase() === 'SHIPPED') {
        baseQuery += ` AND (UPPER(o.status) = 'SHIPPED' OR UPPER(o.status) = 'DISPATCHED')`;
      } else {
        baseQuery += ` AND UPPER(o.status) = UPPER($${paramIndex})`;
        queryParams.push(dbStatus);
        paramIndex++;
      }
    }

    // Filter by distributor
    if (distributor_id) {
      baseQuery += ` AND o.distributor_id = $${paramIndex}`;
      queryParams.push(distributor_id);
      paramIndex++;
    }

    // Filter by date range
    if (start_date) {
      baseQuery += ` AND o.order_date >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      baseQuery += ` AND o.order_date <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }

    if (category) {
      baseQuery += ` AND EXISTS (
        SELECT 1 FROM manage_b_to_b_order_items inner_oi 
        JOIN manage_manufacturer_products inner_p ON inner_oi.product_id = inner_p.id 
        WHERE inner_oi.order_id = o.id AND inner_p.category = $${paramIndex}
      )`;
      queryParams.push(category);
      paramIndex++;
    }

    if (search) {
      baseQuery += ` AND (o.order_number ILIKE $${paramIndex} OR d.company_name ILIKE $${paramIndex})`;
      queryParams.push('%' + search + '%');
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT o.id) ${baseQuery}`,
      queryParams
    );
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // Define allowed sort columns to prevent SQL injection
    const allowedSortColumns = {
      'order_number': 'o.order_number',
      'distributor_name': 'd.company_name',
      'order_date': 'o.order_date',
      'total_amount': 'o.total_amount',
      'status': 'o.status',
      'created_at': 'o.created_at'
    };

    const sortColumn = allowedSortColumns[sortBy] || 'o.created_at';
    const sortDirection = (sortDesc === 'true' || sortDesc === true) ? 'DESC' : 'ASC';

    // Get paginated results
    const selectQuery = `
      SELECT
        o.id,
        o.order_number,
        o.distributor_id,
        d.company_name as distributor_name,
        d.email as distributor_email,
        d.mobile as distributor_mobile,
        o.order_date,
        o.total_amount,
        o.status,
        o.delivery_mode,
        o.shipping_address,
        o.created_at,
        COUNT(oi.id) as item_count
      ${baseQuery}
      GROUP BY o.id, o.order_number, o.distributor_id, d.company_name, d.email, d.mobile, o.order_date, o.total_amount, o.status, o.delivery_mode, o.shipping_address, o.created_at
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(selectQuery, queryParams);

    res.status(200).json({
      success: true,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      },
      data: result.rows
    });

  } catch (error) {
    logger.error('Get orders error', error, { manufacturerId: req.user.userId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Get single order details
export const getOrderDetails = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Fetching order details. ID: ${id}, Manufacturer: ${manufacturerId}`);

    // Get order with distributor details
    const orderQuery = `
      SELECT
        o.*,
        d.company_name as distributor_company_name,
        d.email as distributor_email,
        d.mobile as distributor_mobile,
        d.address as distributor_address,
        d.gst_number as distributor_gst
      FROM manage_b_to_b_orders o
      LEFT JOIN manage_b_to_b_userdetail d ON o.distributor_id = d.id
      WHERE o.id = $1 AND o.manufacturer_id = $2 AND o.deleted_at IS NULL
    `;

    const orderResult = await pool.query(orderQuery, [id, manufacturerId]);

    if (orderResult.rows.length === 0) {
      logger.warn(`Order not found. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Get order items with product details
    const itemsQuery = `
      SELECT
        oi.*,
        p.product_name,
        p.product_image,
        p.category,
        (oi.quantity * oi.unit_price) as subtotal
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
        order: order,
        items: itemsResult.rows
      }
    });

  } catch (error) {
    logger.error(`Get order details error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details'
    });
  }
};

// State transition validation helper
const validateStatusTransition = (currentStatus, targetStatus) => {
  if (currentStatus === targetStatus) return true;

  const allowedTransitions = {
    'pending': ['processing', 'rejected'],
    'processing': ['shipped', 'rejected'],
    'shipped': ['delivered'],
    'delivered': [],
    'rejected': []
  };

  return allowedTransitions[currentStatus]?.includes(targetStatus) || false;
};

// Update order status (with Transactions and State Machine check)
export const updateOrderStatus = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const { status, notes } = req.body;

  logger.info(`Manually updating order status. ID: ${id}, Target Status: ${status}, Manufacturer: ${manufacturerId}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock order row for update and fetch current status
    const orderCheck = await client.query(
      `SELECT status FROM manage_b_to_b_orders
       WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [id, manufacturerId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn(`Order not found for status update. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const currentStatus = orderCheck.rows[0].status?.toLowerCase();

    // Validate transition
    if (!validateStatusTransition(currentStatus, status)) {
      await client.query('ROLLBACK');
      logger.warn(`Invalid state transition. ID: ${id}, Transition: ${currentStatus} -> ${status}`);
      return res.status(400).json({
        success: false,
        message: `Cannot transition order status from '${currentStatus}' to '${status}'`
      });
    }

    // Update order
    const updateQuery = `
      UPDATE manage_b_to_b_orders
      SET status = $1,
          status_notes = $2,
          updated_at = CURRENT_TIMESTAMP,
          modified_by = $3
      WHERE id = $4
      RETURNING *
    `;
    const result = await client.query(updateQuery, [status, notes || null, manufacturerId, id]);

    // Insert history
    await client.query(
      `INSERT INTO manage_b_to_b_order_status_history
       (order_id, status, notes, changed_by, changed_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [id, status, notes || `Status changed from ${currentStatus} to ${status}`, manufacturerId]
    );

    await client.query('COMMIT');
    logger.info(`Order status updated successfully. ID: ${id}, Status: ${status}`);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Update order status error. ID: ${id}`, error, { manufacturerId, targetStatus: status });
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  } finally {
    client.release();
  }
};

// Accept order (PENDING → ACCEPTED)
export const acceptOrder = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const { notes } = req.body;

  logger.info(`Accepting order. ID: ${id}, Manufacturer: ${manufacturerId}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch and check order status
    const orderCheck = await client.query(
      `SELECT status FROM manage_b_to_b_orders
       WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [id, manufacturerId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn(`Order not found for acceptance. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const currentStatus = orderCheck.rows[0].status?.toLowerCase();
    if (currentStatus !== 'pending' && currentStatus !== 'po_submitted') {
      await client.query('ROLLBACK');
      logger.warn(`Invalid acceptance: Order status is not pending or PO_SUBMITTED. ID: ${id}, Current status: ${currentStatus}`);
      return res.status(400).json({
        success: false,
        message: `Only pending orders can be accepted. Current status: ${currentStatus}`
      });
    }

    // Update
    const query = `
      UPDATE manage_b_to_b_orders
      SET status = 'accepted',
          status_notes = $1,
          updated_at = CURRENT_TIMESTAMP,
          modified_by = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await client.query(query, [
      notes || 'Order accepted',
      manufacturerId,
      id
    ]);

    // Generate Invoice Automatically
    const itemsResult = await client.query(
      'SELECT * FROM manage_b_to_b_order_items WHERE order_id = $1',
      [id]
    );
    await createInvoiceInternal(
      client,
      id,
      itemsResult.rows,
      0, // gst default to 0 for now
      null, // due_date
      manufacturerId
    );

    // Insert history
    await client.query(
      `INSERT INTO manage_b_to_b_order_status_history
       (order_id, status, notes, changed_by, changed_at)
       VALUES ($1, 'accepted', $2, $3, CURRENT_TIMESTAMP)`,
      [id, notes || 'Order accepted', manufacturerId]
    );

    await client.query('COMMIT');
    logger.info(`Order accepted successfully. ID: ${id}`);
    res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Accept order error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to accept order'
    });
  } finally {
    client.release();
  }
};

// Reject order (with Transaction and Predecessor State check)
export const rejectOrder = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const { rejection_reason } = req.body;

  logger.info(`Rejecting order. ID: ${id}, Manufacturer: ${manufacturerId}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch and check order status
    const orderCheck = await client.query(
      `SELECT status FROM manage_b_to_b_orders
       WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [id, manufacturerId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn(`Order not found for rejection. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const currentStatus = orderCheck.rows[0].status?.toLowerCase();
    if (currentStatus !== 'pending' && currentStatus !== 'po_submitted') {
      await client.query('ROLLBACK');
      logger.warn(`Invalid rejection: Order status is not pending or PO_SUBMITTED. ID: ${id}, Current status: ${currentStatus}`);
      return res.status(400).json({
        success: false,
        message: `Only pending orders can be rejected. Current status: ${currentStatus}`
      });
    }

    const query = `
      UPDATE manage_b_to_b_orders
      SET status = 'rejected',
          status_notes = $1,
          updated_at = CURRENT_TIMESTAMP,
          modified_by = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await client.query(query, [rejection_reason, manufacturerId, id]);

    // Insert history
    await client.query(
      `INSERT INTO manage_b_to_b_order_status_history
       (order_id, status, notes, changed_by, changed_at)
       VALUES ($1, 'rejected', $2, $3, CURRENT_TIMESTAMP)`,
      [id, rejection_reason, manufacturerId]
    );

    await client.query('COMMIT');
    logger.info(`Order rejected successfully. ID: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Order rejected successfully',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Reject order error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to reject order'
    });
  } finally {
    client.release();
  }
};

// Mark order as shipped (with Transaction and Predecessor State check)
export const markAsShipped = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const { tracking_number, shipping_provider, notes } = req.body;

  logger.info(`Marking order as shipped. ID: ${id}, Manufacturer: ${manufacturerId}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch and check order status
    const orderCheck = await client.query(
      `SELECT status FROM manage_b_to_b_orders
       WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [id, manufacturerId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn(`Order not found for shipping. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const currentStatus = orderCheck.rows[0].status?.toLowerCase();
    if (currentStatus !== 'processing') {
      await client.query('ROLLBACK');
      logger.warn(`Invalid shipping: Order status is not processing. ID: ${id}, Current status: ${currentStatus}`);
      return res.status(400).json({
        success: false,
        message: `Only processing orders can be shipped. Current status: ${currentStatus}`
      });
    }

    const query = `
      UPDATE manage_b_to_b_orders
      SET status = 'shipped',
          tracking_number = $1,
          transporter_name = $2,
          status_notes = $3,
          dispatched_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          modified_by = $4
      WHERE id = $5
      RETURNING *
    `;

    const result = await client.query(query, [
      tracking_number || null,
      shipping_provider || null,
      notes || 'Order shipped',
      manufacturerId,
      id
    ]);

    // Insert history
    await client.query(
      `INSERT INTO manage_b_to_b_order_status_history
       (order_id, status, notes, changed_by, changed_at)
       VALUES ($1, 'shipped', $2, $3, CURRENT_TIMESTAMP)`,
      [id, `Shipped via ${shipping_provider || 'N/A'} (Tracking: ${tracking_number || 'N/A'})`, manufacturerId]
    );

    await client.query('COMMIT');
    logger.info(`Order marked as shipped successfully. ID: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Order marked as shipped successfully',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Mark as shipped error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to mark order as shipped'
    });
  } finally {
    client.release();
  }
};

// Mark order as delivered (with Transaction and Predecessor State check)
export const markAsDelivered = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const { notes } = req.body;

  logger.info(`Marking order as delivered. ID: ${id}, Manufacturer: ${manufacturerId}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch and check order status
    const orderCheck = await client.query(
      `SELECT status FROM manage_b_to_b_orders
       WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [id, manufacturerId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn(`Order not found for delivery. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const currentStatus = orderCheck.rows[0].status?.toLowerCase();
    if (currentStatus !== 'shipped') {
      await client.query('ROLLBACK');
      logger.warn(`Invalid delivery: Order status is not shipped. ID: ${id}, Current status: ${currentStatus}`);
      return res.status(400).json({
        success: false,
        message: `Only shipped orders can be marked as delivered. Current status: ${currentStatus}`
      });
    }

    const query = `
      UPDATE manage_b_to_b_orders
      SET status = 'delivered',
          status_notes = $1,

          updated_at = CURRENT_TIMESTAMP,
          modified_by = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await client.query(query, [notes || 'Order delivered', manufacturerId, id]);

    // Insert history
    await client.query(
      `INSERT INTO manage_b_to_b_order_status_history
       (order_id, status, notes, changed_by, changed_at)
       VALUES ($1, 'delivered', $2, $3, CURRENT_TIMESTAMP)`,
      [id, notes || 'Order delivered', manufacturerId]
    );

    await client.query('COMMIT');
    logger.info(`Order marked as delivered successfully. ID: ${id}`);

    // Check if the buyer is a shop and sync inventory if so
    const buyerCheck = await pool.query(`
      SELECT o.shop_id, d.business_type
      FROM manage_b_to_b_orders o
      LEFT JOIN manage_b_to_b_userdetail d ON o.distributor_id = d.id
      WHERE o.id = $1
    `, [id]);

    if (buyerCheck.rows.length > 0) {
      const { shop_id, business_type } = buyerCheck.rows[0];
      if (business_type === 'shop' || shop_id) {
        await syncManufacturerOrderToShopInventory(id, shop_id || buyerCheck.rows[0].distributor_id);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order marked as delivered successfully',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Mark as delivered error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to mark order as delivered'
    });
  } finally {
    client.release();
  }
};

// Start processing order (ACCEPTED → PROCESSING)
export const startProcessing = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const { notes, delivery_mode } = req.body;

  logger.info(`Starting order processing. ID: ${id}, Manufacturer: ${manufacturerId}, Delivery Mode: ${delivery_mode}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderCheck = await client.query(
      `SELECT status, delivery_mode FROM manage_b_to_b_orders
       WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [id, manufacturerId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = orderCheck.rows[0].status?.toLowerCase();
    if (currentStatus !== 'accepted') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Only accepted orders can enter processing. Current status: ${currentStatus}`
      });
    }

    let query, params, targetStatus;

    if (delivery_mode === 'SELF') {
      targetStatus = 'dispatched';
      query = `
        UPDATE manage_b_to_b_orders
        SET status = 'dispatched',
            delivery_mode = 'SELF',
            status_notes = $1,
            dispatched_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            modified_by = $2
        WHERE id = $3
        RETURNING *
      `;
      params = [notes || 'Order processed and self-dispatched', manufacturerId, id];
    } else {
      targetStatus = 'processing';
      query = `
        UPDATE manage_b_to_b_orders
        SET status = 'processing',
            delivery_mode = COALESCE($1, delivery_mode),
            status_notes = $2,
            updated_at = CURRENT_TIMESTAMP,
            modified_by = $3
        WHERE id = $4
        RETURNING *
      `;
      params = [delivery_mode || null, notes || 'Processing started', manufacturerId, id];
    }

    const result = await client.query(query, params);

    await client.query(
      `INSERT INTO manage_b_to_b_order_status_history
       (order_id, status, notes, changed_by, changed_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [id, targetStatus, notes || `Order status transitioned to ${targetStatus}`, manufacturerId]
    );

    await client.query('COMMIT');
    logger.info(`Order processing started successfully. ID: ${id}, Status: ${targetStatus}`);

    res.status(200).json({
      success: true,
      message: `Order status set to ${targetStatus}`,
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Start processing error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to start processing'
    });
  } finally {
    client.release();
  }
};

// Mark order as ready for dispatch (PROCESSING → READY_FOR_DISPATCH)
export const markReadyForDispatch = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const { notes } = req.body;

  logger.info(`Marking order ready for dispatch. ID: ${id}, Manufacturer: ${manufacturerId}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderCheck = await client.query(
      `SELECT status FROM manage_b_to_b_orders
       WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [id, manufacturerId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = orderCheck.rows[0].status?.toLowerCase();
    if (currentStatus !== 'processing') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Only processing orders can be marked ready for dispatch. Current status: ${currentStatus}`
      });
    }

    const query = `
      UPDATE manage_b_to_b_orders
      SET status = 'ready_for_dispatch',
          status_notes = $1,
          updated_at = CURRENT_TIMESTAMP,
          modified_by = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await client.query(query, [notes || 'Ready for dispatch', manufacturerId, id]);

    await client.query(
      `INSERT INTO manage_b_to_b_order_status_history
       (order_id, status, notes, changed_by, changed_at)
       VALUES ($1, 'ready_for_dispatch', $2, $3, CURRENT_TIMESTAMP)`,
      [id, notes || 'Order ready for dispatch', manufacturerId]
    );

    await client.query('COMMIT');
    logger.info(`Order marked ready for dispatch. ID: ${id}`);
    res.status(200).json({
      success: true,
      message: 'Order marked ready for dispatch',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Mark ready for dispatch error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to mark order ready for dispatch'
    });
  } finally {
    client.release();
  }
};

// Dispatch order (READY_FOR_DISPATCH → DISPATCHED)
export const dispatchOrder = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const {
    transporter_name, vehicle_number, tracking_number, dispatch_date, notes,
    driver_id, vehicle_id
  } = req.body;

  logger.info(`Dispatching order. ID: ${id}, Manufacturer: ${manufacturerId}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderCheck = await client.query(
      `SELECT status, delivery_mode FROM manage_b_to_b_orders
       WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [id, manufacturerId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderCheck.rows[0];
    const currentStatus = order.status?.toLowerCase();
    if (currentStatus !== 'ready_for_dispatch') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Only ready orders can be dispatched. Current status: ${currentStatus}`
      });
    }

    // Validation based on delivery_mode
    if (order.delivery_mode === 'SELF') {
      if (driver_id) {
        const drv = await client.query(`SELECT status, is_available FROM manage_b_to_b_drivers WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, [driver_id]);
        if (drv.rows.length === 0 || drv.rows[0].status !== 'active' || !drv.rows[0].is_available) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Driver is not active or not available' });
        }
      }
      if (vehicle_id) {
        const veh = await client.query(`SELECT status, is_available FROM manage_b_to_b_vehicles WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, [vehicle_id]);
        if (veh.rows.length === 0 || veh.rows[0].status !== 'active' || !veh.rows[0].is_available) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Vehicle is not active or not available' });
        }
      }
    }

    const providerName = transporter_name || (vehicle_number ? `Self-Fleet (${vehicle_number})` : null);

    const query = `
      UPDATE manage_b_to_b_orders
      SET status = 'dispatched',
          transporter_name = $1,
          tracking_number = $2,
          dispatch_date = $3,
          status_notes = $4,
          dispatched_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          modified_by = $5
      WHERE id = $6
      RETURNING *
    `;

    const result = await client.query(query, [
      providerName,
      tracking_number || null,
      dispatch_date || null,
      notes || 'Order dispatched',
      manufacturerId,
      id
    ]);

    // Update fleet availability
    if (driver_id) {
      await client.query(`UPDATE manage_b_to_b_drivers SET is_available = false WHERE id = $1`, [driver_id]);
    }
    if (vehicle_id) {
      await client.query(`UPDATE manage_b_to_b_vehicles SET is_available = false WHERE id = $1`, [vehicle_id]);
    }

    // Insert history
    let historyNotes = `Dispatched`;
    if (order.delivery_mode === 'THIRD_PARTY') {
      historyNotes = `Dispatched via ${transporter_name || 'N/A'} | Tracking: ${tracking_number || 'N/A'}`;
    } else if (order.delivery_mode === 'SELF') {
      historyNotes = `Dispatched via Internal Fleet (Driver: ${driver_id || 'N/A'}, Vehicle: ${vehicle_id || 'N/A'})`;
    }

    await client.query(
      `INSERT INTO manage_b_to_b_order_status_history
       (order_id, status, notes, changed_by, changed_at)
       VALUES ($1, 'dispatched', $2, $3, CURRENT_TIMESTAMP)`,
      [id, historyNotes, manufacturerId]
    );

    await client.query('COMMIT');
    logger.info(`Order dispatched successfully. ID: ${id}`);
    res.status(200).json({
      success: true,
      message: 'Order dispatched successfully',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Dispatch order error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to dispatch order'
    });
  } finally {
    client.release();
  }
};

// Mark order as delivered (DISPATCHED → DELIVERED)
export const markOrderDelivered = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const { notes } = req.body;

  logger.info(`Marking order delivered. ID: ${id}, Manufacturer: ${manufacturerId}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderCheck = await client.query(
      `SELECT status, distributor_id, shop_id FROM manage_b_to_b_orders
       WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [id, manufacturerId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = orderCheck.rows[0].status?.toLowerCase();
    if (currentStatus !== 'dispatched') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Only dispatched orders can be marked delivered. Current status: ${currentStatus}`
      });
    }

    const query = `
      UPDATE manage_b_to_b_orders
      SET status = 'delivered',
          status_notes = $1,

          updated_at = CURRENT_TIMESTAMP,
          modified_by = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await client.query(query, [notes || 'Order delivered', manufacturerId, id]);

    // If order was from manufacturer to distributor:
    // When marked as delivered, populate or update the distributor's inventory (distributor_products)
    const orderData = result.rows[0];
    if (orderData.distributor_id && !orderData.shop_id) {
      const distId = orderData.distributor_id;
      // Fetch order items
      const itemsRes = await client.query(
        'SELECT product_id, quantity, unit_price FROM manage_b_to_b_order_items WHERE order_id = $1',
        [id]
      );
      for (const item of itemsRes.rows) {
        const checkInv = await client.query(
          'SELECT id FROM distributor_products WHERE distributor_id = $1 AND product_id = $2',
          [distId, item.product_id]
        );
        if (checkInv.rows.length > 0) {
          await client.query(
            `UPDATE distributor_products
             SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP
             WHERE distributor_id = $2 AND product_id = $3`,
            [item.quantity, distId, item.product_id]
          );
        } else {
          await client.query(
            `INSERT INTO distributor_products (distributor_id, product_id, price, stock_quantity, is_published)
             VALUES ($1, $2, $3, $4, false)`,
            [distId, item.product_id, item.unit_price, item.quantity]
          );
        }
      }
    }

    await client.query(
      `INSERT INTO manage_b_to_b_order_status_history
       (order_id, status, notes, changed_by, changed_at)
       VALUES ($1, 'delivered', $2, $3, CURRENT_TIMESTAMP)`,
      [id, notes || 'Order delivered', manufacturerId]
    );

    await client.query('COMMIT');
    logger.info(`Order marked as delivered. ID: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Order marked as delivered',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Mark delivered error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to mark order as delivered'
    });
  } finally {
    client.release();
  }
};

// Get order statistics
export const getOrderStats = async (req, res) => {
  const manufacturerId = req.user.userId;
  try {
    logger.info(`Fetching order stats for manufacturer: ${manufacturerId}`);

    const query = `
      SELECT
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_orders,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_orders,
        COUNT(*) FILTER (WHERE status = 'ready_for_dispatch') as ready_for_dispatch_orders,
        COUNT(*) FILTER (WHERE status = 'dispatched') as dispatched_orders,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'delivered'), 0) as delivered_revenue,
        COALESCE(AVG(total_amount), 0) as average_order_value
      FROM manage_b_to_b_orders
      WHERE manufacturer_id = $1 AND deleted_at IS NULL
    `;

    const result = await pool.query(query, [manufacturerId]);

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Get order stats error', error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics'
    });
  }
};

// Get order status history
export const getOrderStatusHistory = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Fetching status history for order. ID: ${id}, Manufacturer: ${manufacturerId}`);

    // Verify order belongs to manufacturer
    const orderCheck = await pool.query(
      'SELECT id FROM manage_b_to_b_orders WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL',
      [id, manufacturerId]
    );

    if (orderCheck.rows.length === 0) {
      logger.warn(`Order not found for status history. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const query = `
      SELECT
        h.*,
        u.company_name as changed_by_name
      FROM manage_b_to_b_order_status_history h
      LEFT JOIN manage_b_to_b_userdetail u ON h.changed_by = u.id
      WHERE h.order_id = $1
      ORDER BY h.changed_at DESC
    `;

    const result = await pool.query(query, [id]);

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error(`Get status history error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status history'
    });
  }
};

// Generate invoice
export const generateInvoice = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Generating invoice data for order. ID: ${id}, Manufacturer: ${manufacturerId}`);

    // Get order details
    const orderQuery = `
      SELECT
        o.*,
        d.company_name as distributor_company_name,
        d.email as distributor_email,
        d.mobile as distributor_mobile,
        d.address as distributor_address,
        d.gst_number as distributor_gst,
        m.company_name as manufacturer_company_name,
        m.address as manufacturer_address,
        m.gst_number as manufacturer_gst
      FROM manage_b_to_b_orders o
      LEFT JOIN manage_b_to_b_userdetail d ON o.distributor_id = d.id
      LEFT JOIN manage_b_to_b_userdetail m ON o.manufacturer_id = m.id
      WHERE o.id = $1 AND o.manufacturer_id = $2 AND o.deleted_at IS NULL
    `;

    const orderResult = await pool.query(orderQuery, [id, manufacturerId]);

    if (orderResult.rows.length === 0) {
      logger.warn(`Order not found for invoice. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get order items
    const itemsQuery = `
      SELECT
        oi.*,
        p.product_name,
        (oi.quantity * oi.unit_price) as subtotal
      FROM manage_b_to_b_order_items oi
      LEFT JOIN manage_manufacturer_products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;

    const itemsResult = await pool.query(itemsQuery, [id]);

    let finalInvoiceNumber = `INV-${orderResult.rows[0].order_number}`;
    let finalInvoiceDate = new Date().toISOString();

    // Auto-create invoice in database if not exists
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const items = itemsResult.rows.map(i => ({ ...i, qty: i.quantity, price: i.unit_price }));
      const due_date = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString();
      const realInvoice = await createInvoiceInternal(client, id, items, 18, due_date, manufacturerId);
      if (realInvoice) {
        finalInvoiceNumber = realInvoice.invoice_number;
        finalInvoiceDate = realInvoice.created_at || new Date().toISOString();
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      logger.error('Error auto-creating invoice in DB', e);
    } finally {
      client.release();
    }

    // Return invoice data
    res.status(200).json({
      success: true,
      message: 'Invoice data generated successfully',
      data: {
        order: orderResult.rows[0],
        items: itemsResult.rows,
        invoice_number: finalInvoiceNumber,
        invoice_date: finalInvoiceDate
      }
    });

  } catch (error) {
    logger.error(`Generate invoice error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice'
    });
  }
};

export const generateInvoicePDF = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  try {
    const orderQuery = `
      SELECT
        o.*,
        d.company_name as distributor_company_name,
        d.email as distributor_email,
        d.mobile as distributor_mobile,
        d.address as distributor_address,
        d.gst_number as distributor_gst,
        m.company_name as manufacturer_company_name,
        m.address as manufacturer_address,
        m.gst_number as manufacturer_gst
      FROM manage_b_to_b_orders o
      LEFT JOIN manage_b_to_b_userdetail d ON o.distributor_id = d.id
      LEFT JOIN manage_b_to_b_userdetail m ON o.manufacturer_id = m.id
      WHERE o.id = $1 AND o.manufacturer_id = $2 AND o.deleted_at IS NULL
    `;
    const orderResult = await pool.query(orderQuery, [id, manufacturerId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const itemsQuery = `
      SELECT
        oi.*,
        p.product_name,
        (oi.quantity * oi.unit_price) as subtotal
      FROM manage_b_to_b_order_items oi
      LEFT JOIN manage_manufacturer_products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;
    const itemsResult = await pool.query(itemsQuery, [id]);

    const order = orderResult.rows[0];
    const subtotal = itemsResult.rows.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const gstPercent = 18;
    const gstAmount = (subtotal * gstPercent) / 100;
    const totalAmount = subtotal + gstAmount;

    let finalInvoiceNumber = `INV-${order.order_number}`;
    let finalInvoiceId = order.id;
    let finalInvoiceDate = new Date().toISOString();
    let finalDueDate = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString();

    // Auto-create invoice in database if not exists
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const items = itemsResult.rows.map(i => ({ ...i, qty: i.quantity, price: i.unit_price }));
      const realInvoice = await createInvoiceInternal(client, id, items, 18, finalDueDate, manufacturerId);
      if (realInvoice) {
        finalInvoiceNumber = realInvoice.invoice_number || finalInvoiceNumber;
        finalInvoiceId = realInvoice.id || finalInvoiceId;
        finalInvoiceDate = realInvoice.created_at ? new Date(realInvoice.created_at).toISOString() : finalInvoiceDate;
        finalDueDate = realInvoice.due_date ? new Date(realInvoice.due_date).toISOString() : finalDueDate;
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      logger.error('Error auto-creating invoice in DB for PDF', e);
    } finally {
      client.release();
    }

    const invoiceData = {
      invoice_number: finalInvoiceNumber,
      invoice_id: finalInvoiceId,
      invoice_date: finalInvoiceDate,
      due_date: finalDueDate,
      order: {
        order_number: order.order_number,
        order_date: order.order_date,
        payment_mode: order.payment_mode
      },
      manufacturer: {
        id: order.manufacturer_id,
        company_name: order.manufacturer_company_name,
        address: order.manufacturer_address,
        gst_number: order.manufacturer_gst,
        email: order.manufacturer_email,
        mobile: order.manufacturer_mobile,
        bank_details: order.manufacturer_bank_details
      },
      distributor: {
        id: order.distributor_id,
        company_name: order.distributor_company_name,
        address: order.distributor_address,
        gst_number: order.distributor_gst,
        email: order.distributor_email,
        mobile: order.distributor_mobile
      },
      items: itemsResult.rows.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name || `Product ID ${item.product_id}`,
        product_sku: item.product_sku || '-',
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.quantity) * parseFloat(item.unit_price)
      })),
      financials: {
        subtotal_amount: subtotal,
        gst_percent: gstPercent,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        total_paid: 0,
        balance_due: totalAmount
      }
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoiceData.invoice_number}.pdf`);
    await createInvoicePDFStream(invoiceData, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }
};
