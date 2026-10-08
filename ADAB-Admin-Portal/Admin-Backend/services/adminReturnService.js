const pool = require('../db');

/**
 * Service for Admin Return Management & Canonical Return Resolution Flow
 */

async function getAdminReturns({ search = '', status = '', exceptions = false, page = 1, limit = 20 }) {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const pageLimit = parseInt(limit, 10);

  let whereClauses = [];
  let queryParams = [];
  let paramIdx = 1;

  if (search && search.trim() !== '') {
    const term = `%${search.trim()}%`;
    whereClauses.push(`(o.order_number ILIKE $${paramIdx} OR u.full_name ILIKE $${paramIdx} OR r.id::text ILIKE $${paramIdx})`);
    queryParams.push(term);
    paramIdx++;
  }

  if (status && status.trim() !== '') {
    whereClauses.push(`r.status = $${paramIdx}`);
    queryParams.push(status.trim());
    paramIdx++;
  }

  if (exceptions === true || exceptions === 'true') {
    whereClauses.push(`r.status IN ('REQUESTED', 'REJECTED')`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) as total
    FROM returns r
    LEFT JOIN orders o ON r.order_id = o.id
    LEFT JOIN users u ON r.customer_id = u.id
    ${whereSql}
  `;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0]?.total || 0, 10);

  const listQuery = `
    SELECT 
      r.id,
      r.order_id,
      r.seller_order_id,
      r.customer_id,
      r.reason,
      r.status,
      r.refund_amount,
      r.rejection_reason,
      r.requested_at,
      r.resolved_at,
      o.order_number,
      u.full_name as customer_name,
      u.phone as customer_phone,
      u.email as customer_email,
      s.store_name,
      (SELECT COUNT(*) FROM return_items ri WHERE ri.return_id = r.id) as item_count,
      rf.status as refund_status
    FROM returns r
    LEFT JOIN orders o ON r.order_id = o.id
    LEFT JOIN users u ON r.customer_id = u.id
    LEFT JOIN seller_orders so ON r.seller_order_id = so.id
    LEFT JOIN stores s ON so.store_id = s.id
    LEFT JOIN refunds rf ON rf.return_id = r.id
    ${whereSql}
    ORDER BY r.requested_at DESC
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

async function getAdminReturnById(returnId) {
  const returnQuery = `
    SELECT 
      r.*,
      o.order_number,
      o.grand_total as order_total,
      o.payment_method,
      o.payment_status,
      u.full_name as customer_name,
      u.phone as customer_phone,
      u.email as customer_email,
      s.store_name,
      s.phone as store_phone
    FROM returns r
    LEFT JOIN orders o ON r.order_id = o.id
    LEFT JOIN users u ON r.customer_id = u.id
    LEFT JOIN seller_orders so ON r.seller_order_id = so.id
    LEFT JOIN stores s ON so.store_id = s.id
    WHERE r.id::text = $1
  `;
  const returnRes = await pool.query(returnQuery, [returnId]);
  if (returnRes.rows.length === 0) {
    return null;
  }
  const returnData = returnRes.rows[0];

  // Fetch Return Items
  const itemsQuery = `
    SELECT 
      ri.*,
      oi.product_name,
      oi.unit_price,
      oi.quantity as original_order_quantity
    FROM return_items ri
    LEFT JOIN order_items oi ON ri.order_item_id = oi.id
    WHERE ri.return_id = $1
    ORDER BY ri.created_at ASC
  `;
  const itemsRes = await pool.query(itemsQuery, [returnData.id]);

  // Fetch Status History
  const historyQuery = `
    SELECT *
    FROM return_status_history
    WHERE return_id = $1
    ORDER BY changed_at DESC
  `;
  const historyRes = await pool.query(historyQuery, [returnData.id]);

  // Fetch Refunds
  const refundsQuery = `
    SELECT *
    FROM refunds
    WHERE return_id = $1 OR order_id = $2
    ORDER BY created_at DESC
  `;
  const refundsRes = await pool.query(refundsQuery, [returnData.id, returnData.order_id]);

  return {
    ...returnData,
    items: itemsRes.rows,
    status_history: historyRes.rows,
    refunds: refundsRes.rows
  };
}

async function resolveReturn(returnId, { action, rejection_reason = '', notes = '', admin_id = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const checkQuery = `SELECT * FROM returns WHERE id = $1 FOR UPDATE`;
    const checkRes = await client.query(checkQuery, [returnId]);
    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Return request not found' };
    }

    const currentReturn = checkRes.rows[0];
    const previousStatus = currentReturn.status;
    let newStatus = previousStatus;

    if (action === 'approve') {
      newStatus = 'APPROVED';
      await client.query(
        `UPDATE returns SET status = $1, resolved_at = NOW() WHERE id = $2`,
        [newStatus, returnId]
      );

      // Create Refund record if not already created
      const existingRefund = await client.query(`SELECT id FROM refunds WHERE return_id = $1`, [returnId]);
      if (existingRefund.rows.length === 0) {
        await client.query(
          `INSERT INTO refunds (order_id, return_id, amount, refund_mode, status, processed_at, created_at)
           VALUES ($1, $2, $3, 'ORIGINAL_PAYMENT', 'PROCESSED', NOW(), NOW())`,
          [currentReturn.order_id, returnId, currentReturn.refund_amount]
        );
      }
    } else if (action === 'reject') {
      newStatus = 'REJECTED';
      await client.query(
        `UPDATE returns SET status = $1, rejection_reason = $2, resolved_at = NOW() WHERE id = $3`,
        [newStatus, rejection_reason || notes || 'Rejected by Admin', returnId]
      );
    } else {
      await client.query('ROLLBACK');
      return { success: false, message: 'Invalid resolution action. Must be approve or reject.' };
    }

    // Insert Return status history log
    await client.query(
      `INSERT INTO return_status_history (return_id, previous_status, new_status, notes, changed_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [returnId, previousStatus, newStatus, notes || (action === 'approve' ? 'Return approved by Admin' : rejection_reason)]
    );

    await client.query('COMMIT');
    return {
      success: true,
      return_id: returnId,
      previous_status: previousStatus,
      new_status: newStatus,
      message: `Return ${returnId} resolved successfully as ${newStatus}`
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getAdminReturns,
  getAdminReturnById,
  resolveReturn
};
