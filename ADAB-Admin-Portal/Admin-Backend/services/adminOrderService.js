const pool = require('../db');

/**
 * Service for Admin Order Management
 */

async function getAdminOrders({ search = '', status = '', payment_status = '', exceptions = false, page = 1, limit = 20 }) {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const pageLimit = parseInt(limit, 10);

  let whereClauses = [];
  let queryParams = [];
  let paramIdx = 1;

  if (search && search.trim() !== '') {
    const term = `%${search.trim()}%`;
    whereClauses.push(`(o.order_number ILIKE $${paramIdx} OR u.full_name ILIKE $${paramIdx} OR u.phone ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
    queryParams.push(term);
    paramIdx++;
  }

  if (status && status.trim() !== '') {
    whereClauses.push(`o.order_status = $${paramIdx}`);
    queryParams.push(status.trim());
    paramIdx++;
  }

  if (payment_status && payment_status.trim() !== '') {
    whereClauses.push(`o.payment_status = $${paramIdx}`);
    queryParams.push(payment_status.trim());
    paramIdx++;
  }

  if (exceptions === true || exceptions === 'true') {
    whereClauses.push(`(o.order_status IN ('CANCELLED', 'RETURNED') OR o.payment_status IN ('FAILED', 'PENDING'))`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) as total
    FROM orders o
    LEFT JOIN users u ON o.customer_id = u.id
    ${whereSql}
  `;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0]?.total || 0, 10);

  const listQuery = `
    SELECT 
      o.id,
      o.order_number,
      o.customer_id,
      o.delivery_address,
      o.delivery_mode,
      o.total_mrp,
      o.total_discount,
      o.delivery_fee,
      o.grand_total,
      o.payment_method,
      o.payment_status,
      o.order_status,
      o.eta_minutes,
      o.created_at,
      o.updated_at,
      u.full_name as customer_name,
      u.phone as customer_phone,
      u.email as customer_email,
      (SELECT COUNT(*) FROM seller_orders so WHERE so.parent_order_id = o.id) as seller_count,
      (SELECT COUNT(*) FROM order_items oi JOIN seller_orders so2 ON oi.seller_order_id = so2.id WHERE so2.parent_order_id = o.id) as item_count
    FROM orders o
    LEFT JOIN users u ON o.customer_id = u.id
    ${whereSql}
    ORDER BY o.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const listResult = await pool.query(listQuery, [...queryParams, pageLimit, offset]);

  return {
    data: listResult.rows,
    pagination: {
      page: parseInt(page, 10),
      limit: pageLimit,
      total,
      totalPages: Math.ceil(total / pageLimit) || 1
    }
  };
}

async function getAdminOrderById(orderId) {
  // Query Order main info with user
  const orderQuery = `
    SELECT 
      o.*,
      u.full_name as customer_name,
      u.phone as customer_phone,
      u.email as customer_email
    FROM orders o
    LEFT JOIN users u ON o.customer_id = u.id
    WHERE o.id::text = $1 OR o.order_number = $1
  `;
  const orderRes = await pool.query(orderQuery, [orderId]);
  if (orderRes.rows.length === 0) {
    return null;
  }
  const order = orderRes.rows[0];

  // Query Seller Orders & Items
  const sellerOrdersQuery = `
    SELECT 
      so.*,
      s.store_name,
      s.phone as store_phone
    FROM seller_orders so
    LEFT JOIN stores s ON so.store_id = s.id
    WHERE so.parent_order_id = $1
    ORDER BY so.created_at ASC
  `;
  const sellerOrdersRes = await pool.query(sellerOrdersQuery, [order.id]);
  const sellerOrders = sellerOrdersRes.rows;

  const sellerOrderIds = sellerOrders.map(so => so.id);
  let items = [];
  let shipments = [];

  if (sellerOrderIds.length > 0) {
    const itemsQuery = `
      SELECT 
        oi.*,
        so.store_id,
        s.store_name
      FROM order_items oi
      JOIN seller_orders so ON oi.seller_order_id = so.id
      LEFT JOIN stores s ON so.store_id = s.id
      WHERE oi.seller_order_id = ANY($1::uuid[])
      ORDER BY oi.id ASC
    `;
    const itemsRes = await pool.query(itemsQuery, [sellerOrderIds]);
    items = itemsRes.rows;

    const shipmentsQuery = `
      SELECT sh.*
      FROM shipments sh
      WHERE sh.seller_order_id = ANY($1::uuid[])
      ORDER BY sh.created_at DESC
    `;
    const shipmentsRes = await pool.query(shipmentsQuery, [sellerOrderIds]);
    shipments = shipmentsRes.rows;
  }

  // Query Status History
  const historyQuery = `
    SELECT 
      osh.*,
      u.full_name as changed_by_name
    FROM order_status_history osh
    LEFT JOIN users u ON osh.changed_by_user_id = u.id
    WHERE osh.order_id = $1
    ORDER BY osh.created_at DESC
  `;
  const historyRes = await pool.query(historyQuery, [order.id]);

  // Query Tracking Events
  const trackingQuery = `
    SELECT 
      te.*,
      u.full_name as driver_name
    FROM tracking_events te
    LEFT JOIN users u ON te.driver_id = u.id
    WHERE te.order_id = $1
    ORDER BY te.timestamp DESC
  `;
  const trackingRes = await pool.query(trackingQuery, [order.id]);

  // Query Payments & Transactions
  const paymentsQuery = `
    SELECT *
    FROM payments
    WHERE order_id = $1
    ORDER BY created_at DESC
  `;
  const paymentsRes = await pool.query(paymentsQuery, [order.id]);

  const transactionsQuery = `
    SELECT *
    FROM payment_transactions
    WHERE order_id = $1
    ORDER BY created_at DESC
  `;
  const transactionsRes = await pool.query(transactionsQuery, [order.id]);

  return {
    ...order,
    seller_orders: sellerOrders,
    items,
    status_history: historyRes.rows,
    shipments,
    tracking_events: trackingRes.rows,
    payments: paymentsRes.rows,
    payment_transactions: transactionsRes.rows
  };
}

async function updateOrderStatus(orderId, { new_status, notes = '', user_id = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const selectRes = await client.query(`SELECT order_status FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
    if (selectRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Order not found' };
    }

    const previousStatus = selectRes.rows[0].order_status;

    await client.query(
      `UPDATE orders SET order_status = $1, updated_at = NOW() WHERE id = $2`,
      [new_status, orderId]
    );

    await client.query(
      `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [orderId, previousStatus, new_status, user_id, notes]
    );

    await client.query('COMMIT');
    return { success: true, previous_status: previousStatus, new_status };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus
};
