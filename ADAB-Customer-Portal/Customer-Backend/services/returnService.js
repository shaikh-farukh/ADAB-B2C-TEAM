const pool = require('../db');
const { resolveCustomerUserId } = require('./customerService');

/**
 * Return & Refund Service
 * Manages item-level customer returns and refund state tracking
 * utilizing canonical PostgreSQL tables:
 * - returns
 * - return_items
 * - return_status_history
 * - refunds
 * - refund_items
 */

/**
 * Submit item-level return request for an order
 */
async function createOrderReturn(orderId, { customerId, reason, items, evidence_url, refund_mode = 'ORIGINAL_PAYMENT' } = {}) {
  if (!orderId) {
    const err = new Error('Order ID is required');
    err.statusCode = 400;
    throw err;
  }
  if (!reason || !reason.trim()) {
    const err = new Error('Return reason is required');
    err.statusCode = 400;
    throw err;
  }

  const userId = await resolveCustomerUserId(customerId);

  // 1. Verify order exists
  const orderRes = await pool.query(
    `SELECT * FROM orders WHERE id = $1 LIMIT 1`,
    [orderId]
  );
  if (orderRes.rows.length === 0) {
    const err = new Error(`Order #${orderId} not found`);
    err.statusCode = 404;
    throw err;
  }
  const order = orderRes.rows[0];

  // 2. Fetch existing order items and seller order
  const orderItemsRes = await pool.query(
    `SELECT oi.*, so.id as seller_order_id, so.store_id
     FROM order_items oi
     JOIN seller_orders so ON oi.seller_order_id = so.id
     WHERE so.parent_order_id = $1`,
    [orderId]
  );

  if (orderItemsRes.rows.length === 0) {
    const err = new Error(`No items found for order #${orderId}`);
    err.statusCode = 400;
    throw err;
  }

  const allOrderItems = orderItemsRes.rows;
  const primarySellerOrderId = allOrderItems[0].seller_order_id;

  // 3. Prepare items to return
  let itemsToReturn = [];
  let totalRefundAmount = 0;

  if (Array.isArray(items) && items.length > 0) {
    for (const reqItem of items) {
      const match = allOrderItems.find(
        oi => oi.id === reqItem.order_item_id || oi.listing_id === reqItem.listing_id
      );
      if (!match) {
        const err = new Error(`Order item #${reqItem.order_item_id || reqItem.listing_id} does not belong to order #${orderId}`);
        err.statusCode = 400;
        throw err;
      }

      const qty = parseInt(reqItem.quantity || 1, 10);
      if (qty <= 0 || qty > match.quantity) {
        const err = new Error(`Invalid return quantity for item "${match.product_name}". Maximum returnable is ${match.quantity}`);
        err.statusCode = 400;
        throw err;
      }

      const unitPrice = parseFloat(match.unit_price) || 0;
      const itemRefund = parseFloat((unitPrice * qty).toFixed(2));
      totalRefundAmount += itemRefund;

      itemsToReturn.push({
        order_item_id: match.id,
        quantity: qty,
        refund_amount: itemRefund,
        reason: (reqItem.reason || reason).trim(),
        item_condition: (reqItem.item_condition || 'SEALED').trim()
      });
    }
  } else {
    // If no specific item array passed, default to all items in the order
    for (const match of allOrderItems) {
      const qty = parseInt(match.quantity, 10) || 1;
      const unitPrice = parseFloat(match.unit_price) || 0;
      const itemRefund = parseFloat((unitPrice * qty).toFixed(2));
      totalRefundAmount += itemRefund;

      itemsToReturn.push({
        order_item_id: match.id,
        quantity: qty,
        refund_amount: itemRefund,
        reason: reason.trim(),
        item_condition: 'SEALED'
      });
    }
  }

  totalRefundAmount = parseFloat(totalRefundAmount.toFixed(2));

  // 4. Insert into returns table
  const insertReturnRes = await pool.query(
    `INSERT INTO returns (
      order_id, seller_order_id, customer_id, reason, status, refund_amount, requested_at
    ) VALUES ($1, $2, $3, $4, 'REQUESTED', $5, NOW())
    RETURNING *`,
    [order.id, primarySellerOrderId, userId, reason.trim(), totalRefundAmount]
  );
  const createdReturn = insertReturnRes.rows[0];

  // 5. Insert into return_items table
  const createdItems = [];
  for (const item of itemsToReturn) {
    const itemRes = await pool.query(
      `INSERT INTO return_items (
        return_id, order_item_id, quantity, refund_amount, reason, item_condition, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [
        createdReturn.id,
        item.order_item_id,
        item.quantity,
        item.refund_amount,
        item.reason,
        item.item_condition
      ]
    );
    createdItems.push(itemRes.rows[0]);
  }

  // 6. Record in return_status_history table
  const historyNotes = evidence_url
    ? `Return requested by customer. Reason: ${reason.trim()} | Evidence: ${evidence_url.trim()}`
    : `Return requested by customer. Reason: ${reason.trim()}`;

  const historyRes = await pool.query(
    `INSERT INTO return_status_history (
      return_id, previous_status, new_status, notes, changed_at
    ) VALUES ($1, 'NONE', 'REQUESTED', $2, NOW())
    RETURNING *`,
    [createdReturn.id, historyNotes]
  );

  // 7. Track initial refund state in refunds & refund_items tables
  const validRefundMode = ['ORIGINAL_PAYMENT', 'WALLET', 'CREDIT_OFFSET'].includes(refund_mode)
    ? refund_mode
    : 'ORIGINAL_PAYMENT';

  const refundRes = await pool.query(
    `INSERT INTO refunds (
      order_id, return_id, amount, refund_mode, status, created_at
    ) VALUES ($1, $2, $3, $4, 'INITIATED', NOW())
    RETURNING *`,
    [order.id, createdReturn.id, totalRefundAmount, validRefundMode]
  );
  const createdRefund = refundRes.rows[0];

  for (const item of createdItems) {
    await pool.query(
      `INSERT INTO refund_items (
        refund_id, order_item_id, amount
      ) VALUES ($1, $2, $3)`,
      [createdRefund.id, item.order_item_id, item.refund_amount]
    );
  }

  // 8. Generate customer notification
  try {
    await pool.query(
      `INSERT INTO notifications (
        user_id, title, message, type, is_read, action_url, created_at
      ) VALUES ($1, $2, $3, 'ORDER_STATUS', false, '/returns', NOW())`,
      [
        userId,
        `Return Requested: #${order.order_number}`,
        `Your return request for ₹${totalRefundAmount} has been registered and is under review.`,
      ]
    );
  } catch (notifErr) {
    console.warn('Non-blocking notification error on return creation:', notifErr.message);
  }

  return {
    ...createdReturn,
    items: createdItems,
    status_history: [historyRes.rows[0]],
    refund: createdRefund
  };
}

/**
 * List all return requests for the authenticated customer
 */
async function getCustomerReturns(customerId, { limit = 50, offset = 0 } = {}) {
  const userId = await resolveCustomerUserId(customerId);

  const returnsRes = await pool.query(
    `SELECT r.*, o.order_number, o.created_at as order_created_at,
            s.store_name, s.id as store_id
     FROM returns r
     JOIN orders o ON r.order_id = o.id
     LEFT JOIN seller_orders so ON r.seller_order_id = so.id
     LEFT JOIN stores s ON so.store_id = s.id
     WHERE r.customer_id = $1
     ORDER BY r.requested_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const returns = [];
  for (const ret of returnsRes.rows) {
    const itemsRes = await pool.query(
      `SELECT ri.*, oi.product_name, oi.unit_price
       FROM return_items ri
       JOIN order_items oi ON ri.order_item_id = oi.id
       WHERE ri.return_id = $1`,
      [ret.id]
    );

    const refundRes = await pool.query(
      `SELECT * FROM refunds WHERE return_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [ret.id]
    );

    returns.push({
      ...ret,
      items: itemsRes.rows,
      refund: refundRes.rows[0] || null
    });
  }

  return returns;
}

/**
 * Get detailed return status and item breakdown by ID
 */
async function getReturnById(returnId, customerId) {
  if (!returnId) {
    const err = new Error('Return ID is required');
    err.statusCode = 400;
    throw err;
  }

  const userId = await resolveCustomerUserId(customerId);

  const returnRes = await pool.query(
    `SELECT r.*, o.order_number, o.created_at as order_created_at, o.delivery_address,
            s.store_name, s.id as store_id, s.phone as store_phone
     FROM returns r
     JOIN orders o ON r.order_id = o.id
     LEFT JOIN seller_orders so ON r.seller_order_id = so.id
     LEFT JOIN stores s ON so.store_id = s.id
     WHERE r.id = $1 AND r.customer_id = $2
     LIMIT 1`,
    [returnId, userId]
  );

  if (returnRes.rows.length === 0) {
    // Check if return exists globally for clear error message
    const existsRes = await pool.query(`SELECT id FROM returns WHERE id = $1`, [returnId]);
    if (existsRes.rows.length === 0) {
      const err = new Error(`Return #${returnId} not found`);
      err.statusCode = 404;
      throw err;
    } else {
      const err = new Error(`Unauthorized access to return #${returnId}`);
      err.statusCode = 403;
      throw err;
    }
  }

  const returnRecord = returnRes.rows[0];

  // Fetch return items
  const itemsRes = await pool.query(
    `SELECT ri.*, oi.product_name, oi.unit_price, oi.listing_id
     FROM return_items ri
     JOIN order_items oi ON ri.order_item_id = oi.id
     WHERE ri.return_id = $1`,
    [returnId]
  );

  // Fetch status history timeline
  const historyRes = await pool.query(
    `SELECT * FROM return_status_history
     WHERE return_id = $1
     ORDER BY changed_at ASC`,
    [returnId]
  );

  // Fetch refund tracking state
  const refundRes = await pool.query(
    `SELECT ref.*,
            (SELECT json_agg(rfi.*) FROM refund_items rfi WHERE rfi.refund_id = ref.id) as items
     FROM refunds ref
     WHERE ref.return_id = $1
     ORDER BY ref.created_at DESC
     LIMIT 1`,
    [returnId]
  );

  return {
    ...returnRecord,
    items: itemsRes.rows,
    status_history: historyRes.rows,
    refund: refundRes.rows[0] || null
  };
}

/**
 * Cancel an active return request
 */
async function cancelReturn(returnId, customerId) {
  if (!returnId) {
    const err = new Error('Return ID is required');
    err.statusCode = 400;
    throw err;
  }

  const userId = await resolveCustomerUserId(customerId);

  const returnRes = await pool.query(
    `SELECT * FROM returns WHERE id = $1 AND customer_id = $2 LIMIT 1`,
    [returnId, userId]
  );

  if (returnRes.rows.length === 0) {
    const err = new Error(`Return #${returnId} not found`);
    err.statusCode = 404;
    throw err;
  }

  const currentReturn = returnRes.rows[0];

  // Disallow cancellation if already completed or picked up
  if (['COMPLETED', 'ITEM_PICKED'].includes(currentReturn.status)) {
    const err = new Error(`Cannot cancel return in '${currentReturn.status}' status`);
    err.statusCode = 400;
    throw err;
  }

  if (currentReturn.status === 'REJECTED') {
    return currentReturn; // Already cancelled/rejected
  }

  // Update return status to REJECTED with cancellation note
  const updateRes = await pool.query(
    `UPDATE returns
     SET status = 'REJECTED',
         rejection_reason = 'Cancelled by customer',
         resolved_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [returnId]
  );

  // Record in return_status_history
  await pool.query(
    `INSERT INTO return_status_history (
      return_id, previous_status, new_status, notes, changed_at
    ) VALUES ($1, $2, 'REJECTED', 'Cancelled by customer', NOW())`,
    [returnId, currentReturn.status]
  );

  // Update linked refund status to FAILED if pending
  await pool.query(
    `UPDATE refunds
     SET status = 'FAILED'
     WHERE return_id = $1 AND status = 'INITIATED'`,
    [returnId]
  );

  return updateRes.rows[0];
}

/**
 * Attach photo/document evidence URL to return request
 */
async function attachReturnEvidence(returnId, customerId, { evidence_url, notes = 'Evidence uploaded by customer' } = {}) {
  if (!returnId) {
    const err = new Error('Return ID is required');
    err.statusCode = 400;
    throw err;
  }

  if (!evidence_url || !evidence_url.trim()) {
    const err = new Error('evidence_url is required');
    err.statusCode = 400;
    throw err;
  }

  const userId = await resolveCustomerUserId(customerId);

  const returnRes = await pool.query(
    `SELECT * FROM returns WHERE id = $1 AND customer_id = $2 LIMIT 1`,
    [returnId, userId]
  );

  if (returnRes.rows.length === 0) {
    const err = new Error(`Return #${returnId} not found`);
    err.statusCode = 404;
    throw err;
  }

  const currentReturn = returnRes.rows[0];

  const evidenceNote = `Evidence URL: ${evidence_url.trim()} | Note: ${(notes || '').trim()}`;

  const historyRes = await pool.query(
    `INSERT INTO return_status_history (
      return_id, previous_status, new_status, notes, changed_at
    ) VALUES ($1, $2, $2, $3, NOW())
    RETURNING *`,
    [returnId, currentReturn.status, evidenceNote]
  );

  return {
    return_id: returnId,
    status: currentReturn.status,
    evidence_url: evidence_url.trim(),
    history_entry: historyRes.rows[0]
  };
}

/**
 * List all refund statuses for customer
 */
async function getCustomerRefunds(customerId, { limit = 50, offset = 0 } = {}) {
  const userId = await resolveCustomerUserId(customerId);

  const refundsRes = await pool.query(
    `SELECT ref.*, o.order_number, o.created_at as order_created_at,
            r.reason as return_reason, r.status as return_status
     FROM refunds ref
     JOIN orders o ON ref.order_id = o.id
     LEFT JOIN returns r ON ref.return_id = r.id
     WHERE o.customer_id = $1
     ORDER BY ref.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const refunds = [];
  for (const ref of refundsRes.rows) {
    const itemsRes = await pool.query(
      `SELECT rfi.*, oi.product_name, oi.unit_price, oi.quantity
       FROM refund_items rfi
       JOIN order_items oi ON rfi.order_item_id = oi.id
       WHERE rfi.refund_id = $1`,
      [ref.id]
    );

    refunds.push({
      ...ref,
      items: itemsRes.rows
    });
  }

  return refunds;
}

/**
 * Get specific refund details by ID
 */
async function getRefundById(refundId, customerId) {
  if (!refundId) {
    const err = new Error('Refund ID is required');
    err.statusCode = 400;
    throw err;
  }

  const userId = await resolveCustomerUserId(customerId);

  const refundRes = await pool.query(
    `SELECT ref.*, o.order_number, o.created_at as order_created_at, o.payment_method,
            r.reason as return_reason, r.status as return_status, r.requested_at as return_requested_at
     FROM refunds ref
     JOIN orders o ON ref.order_id = o.id
     LEFT JOIN returns r ON ref.return_id = r.id
     WHERE ref.id = $1 AND o.customer_id = $2
     LIMIT 1`,
    [refundId, userId]
  );

  if (refundRes.rows.length === 0) {
    const existsRes = await pool.query(`SELECT id FROM refunds WHERE id = $1`, [refundId]);
    if (existsRes.rows.length === 0) {
      const err = new Error(`Refund #${refundId} not found`);
      err.statusCode = 404;
      throw err;
    } else {
      const err = new Error(`Unauthorized access to refund #${refundId}`);
      err.statusCode = 403;
      throw err;
    }
  }

  const refund = refundRes.rows[0];

  const itemsRes = await pool.query(
    `SELECT rfi.*, oi.product_name, oi.unit_price, oi.quantity
     FROM refund_items rfi
     JOIN order_items oi ON rfi.order_item_id = oi.id
     WHERE rfi.refund_id = $1`,
    [refundId]
  );

  return {
    ...refund,
    items: itemsRes.rows
  };
}

module.exports = {
  createOrderReturn,
  getCustomerReturns,
  getReturnById,
  cancelReturn,
  attachReturnEvidence,
  getCustomerRefunds,
  getRefundById
};
