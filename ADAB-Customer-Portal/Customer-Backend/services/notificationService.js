const pool = require('../db');
const { resolveCustomerUserId } = require('./customerService');

const VALID_NOTIFICATION_TYPES = [
  'ORDER_STATUS',
  'KYC_UPDATE',
  'CREDIT_APPROVAL',
  'PRICE_ALERT',
  'GENERAL'
];

/**
 * Core notification publisher
 * Inserts a persistent notification record in PostgreSQL notifications table
 */
async function createNotification(rawUserId, {
  title,
  message,
  type = 'ORDER_STATUS',
  action_url = '/orders'
} = {}) {
  if (!title || !title.trim()) {
    throw new Error('Notification title is required');
  }
  if (!message || !message.trim()) {
    throw new Error('Notification message is required');
  }

  const userId = await resolveCustomerUserId(rawUserId);
  const normalizedType = VALID_NOTIFICATION_TYPES.includes(type) ? type : 'GENERAL';

  const res = await pool.query(
    `INSERT INTO notifications (
      user_id, title, message, type, is_read, action_url, created_at
    ) VALUES ($1, $2, $3, $4, false, $5, NOW())
    RETURNING *`,
    [userId, title.trim(), message.trim(), normalizedType, action_url]
  );

  return res.rows[0];
}

/**
 * Event Trigger: Order Confirmed / Placed (ORDER_PLACED)
 */
async function notifyOrderPlaced(userId, order) {
  const orderNumber = order.order_number || order.id;
  const grandTotal = order.grand_total || order.total || '0.00';
  return createNotification(userId, {
    title: `Order Placed: #${orderNumber}`,
    message: `Your order #${orderNumber} for ₹${grandTotal} has been successfully placed and is confirmed.`,
    type: 'ORDER_STATUS',
    action_url: `/orders`
  });
}

/**
 * Event Trigger: Shipment status change (OUT_FOR_DELIVERY, DELIVERED, etc.)
 */
async function notifyShipmentStatus(userId, {
  orderNumber,
  status,
  courierName = 'our delivery partner',
  trackingNumber
}) {
  const normStatus = (status || '').toUpperCase();
  let title = `Order Update: #${orderNumber}`;
  let message = `Your order #${orderNumber} status is now ${normStatus}.`;

  if (normStatus === 'OUT_FOR_DELIVERY') {
    title = `Order Out For Delivery: #${orderNumber}`;
    message = `Your order #${orderNumber} is out for delivery with ${courierName}. Real-time tracking is now live!`;
  } else if (normStatus === 'DELIVERED') {
    title = `Order Delivered: #${orderNumber}`;
    message = `Your order #${orderNumber} has been delivered successfully. Thank you for shopping with ADAB!`;
  } else if (normStatus === 'CONFIRMED' || normStatus === 'ACCEPTED') {
    title = `Order Confirmed: #${orderNumber}`;
    message = `Seller has accepted and confirmed your order #${orderNumber}.`;
  } else if (normStatus === 'PREPARING' || normStatus === 'PACKED') {
    title = `Order Packed: #${orderNumber}`;
    message = `Your order #${orderNumber} has been packed and is ready for dispatch.`;
  }

  return createNotification(userId, {
    title,
    message,
    type: 'ORDER_STATUS',
    action_url: `/orders`
  });
}

/**
 * Event Trigger: Return status change or refund credited (REFUND_PROCESSED)
 */
async function notifyReturnRefundStatus(userId, {
  orderNumber,
  status,
  refundAmount,
  rejectionReason
}) {
  const normStatus = (status || '').toUpperCase();
  let title = `Return Update: #${orderNumber}`;
  let message = `Your return request for order #${orderNumber} status is now ${normStatus}.`;

  if (normStatus === 'REQUESTED') {
    title = `Return Requested: #${orderNumber}`;
    message = `Your return request for ₹${refundAmount} has been registered and is under review.`;
  } else if (normStatus === 'APPROVED' || normStatus === 'PROCESSED') {
    title = `Refund Processed: #${orderNumber}`;
    message = `Your return for ₹${refundAmount} has been approved and refund of ₹${refundAmount} has been credited to your payment method.`;
  } else if (normStatus === 'ITEM_PICKED') {
    title = `Return Item Picked Up: #${orderNumber}`;
    message = `Courier has picked up your returned item(s) for order #${orderNumber}.`;
  } else if (normStatus === 'COMPLETED') {
    title = `Return Completed: #${orderNumber}`;
    message = `Your return for order #${orderNumber} has been fully completed and settled.`;
  } else if (normStatus === 'REJECTED') {
    title = `Return Rejected: #${orderNumber}`;
    message = `Your return request was not approved: ${rejectionReason || 'Does not meet return policy criteria.'}`;
  }

  return createNotification(userId, {
    title,
    message,
    type: 'ORDER_STATUS',
    action_url: `/returns`
  });
}

/**
 * Event Trigger: Reward Points Earned (POINTS_EARNED)
 */
async function notifyPointsEarned(userId, { points, newBalance, reason = 'your purchase' }) {
  return createNotification(userId, {
    title: `Points Earned: +${points} Pts`,
    message: `Congratulations! You earned ${points} reward points for ${reason}. Your new points balance is ${newBalance} pts.`,
    type: 'GENERAL',
    action_url: `/rewards`
  });
}

/**
 * Event Trigger: Reward Points Redeemed (POINTS_REDEEMED)
 */
async function notifyPointsRedeemed(userId, { points, newBalance, discountAmount }) {
  const discountText = discountAmount ? `(₹${Number(discountAmount).toFixed(2)} discount)` : '';
  return createNotification(userId, {
    title: `Points Redeemed: -${points} Pts`,
    message: `You successfully redeemed ${points} reward points ${discountText} on your order. Remaining points balance: ${newBalance} pts.`,
    type: 'GENERAL',
    action_url: `/rewards`
  });
}

/**
 * Fetch real-time unread notifications count
 * GET /api/v1/customers/me/notifications/unread-count
 */
async function getUnreadNotificationCount(rawUserId) {
  const userId = await resolveCustomerUserId(rawUserId);
  const res = await pool.query(
    `SELECT COUNT(*)::int as unread_count 
     FROM notifications 
     WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return res.rows[0]?.unread_count || 0;
}

/**
 * Fetch chronological customer notifications list
 * GET /api/v1/customers/me/notifications
 */
async function getCustomerNotifications(rawUserId, { limit = 50, offset = 0 } = {}) {
  const userId = await resolveCustomerUserId(rawUserId);
  let res = await pool.query(
    `SELECT * FROM notifications 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  if (res.rows.length === 0) {
    const ordersRes = await pool.query(
      `SELECT id, order_number, order_status, grand_total FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 3`,
      [userId]
    );

    if (ordersRes.rows.length > 0) {
      for (const ord of ordersRes.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, is_read, action_url, created_at)
           VALUES ($1, $2, $3, 'ORDER_STATUS', false, $4, NOW())`,
          [
            userId,
            `Order #${ord.order_number} ${ord.order_status}`,
            `Your order #${ord.order_number} for ₹${ord.grand_total} is currently ${ord.order_status}.`,
            `/orders`
          ]
        );
      }
    } else {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, action_url, created_at)
         VALUES ($1, 'Welcome to ADAB!', 'Start exploring local stores in your neighborhood with fast 14-45 min delivery.', 'GENERAL', false, '/stores', NOW())`,
        [userId]
      );
    }

    res = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }

  return res.rows;
}

/**
 * Mark a single notification as read
 */
async function markNotificationRead(rawUserId, notificationId) {
  const userId = await resolveCustomerUserId(rawUserId);
  const res = await pool.query(
    `UPDATE notifications 
     SET is_read = true 
     WHERE id = $1 AND user_id = $2 
     RETURNING *`,
    [notificationId, userId]
  );
  if (res.rows.length === 0) {
    const notifCheck = await pool.query(`SELECT id FROM notifications WHERE id = $1`, [notificationId]);
    if (notifCheck.rows.length === 0) {
      const err = new Error(`Notification #${notificationId} not found`);
      err.statusCode = 404;
      throw err;
    }
  }
  return res.rows[0] || { id: notificationId, is_read: true };
}

/**
 * Mark all notifications as read for a customer
 */
async function markAllNotificationsRead(rawUserId) {
  const userId = await resolveCustomerUserId(rawUserId);
  const res = await pool.query(
    `UPDATE notifications 
     SET is_read = true 
     WHERE user_id = $1 AND is_read = false 
     RETURNING id`,
    [userId]
  );
  return { updated_count: res.rows.length };
}

module.exports = {
  createNotification,
  notifyOrderPlaced,
  notifyShipmentStatus,
  notifyReturnRefundStatus,
  notifyPointsEarned,
  notifyPointsRedeemed,
  getUnreadNotificationCount,
  getCustomerNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
