const pool = require('../../db');

class NotificationRepository {
  /**
   * Get paginated notifications for a seller, with total count.
   * Enforces user_id scoping to prevent IDOR.
   */
  async getNotifications(userId, limit = 50, offset = 0) {
    const query = `
      SELECT id, user_id, title, message, type, is_read, created_at, action_url
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications
      WHERE user_id = $1
    `;
    const [dataRes, countRes] = await Promise.all([
      pool.query(query, [userId, limit, offset]),
      pool.query(countQuery, [userId])
    ]);
    return {
      notifications: dataRes.rows,
      total: parseInt(countRes.rows[0].total, 10)
    };
  }

  /**
   * Get unread count for a seller. Scoped by user_id.
   */
  async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `;
    const res = await pool.query(query, [userId]);
    return { unread_count: parseInt(res.rows[0].unread_count, 10) };
  }

  /**
   * Mark a single notification as read.
   * Scoped by user_id to prevent cross-seller access (IDOR prevention).
   */
  async markAsRead(userId, notificationId) {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1 AND user_id = $2
      RETURNING id, is_read
    `;
    const res = await pool.query(query, [notificationId, userId]);
    return res.rows[0];
  }

  /**
   * Mark ALL unread notifications as read for a seller.
   * Returns the count of notifications marked.
   */
  async markAllAsRead(userId) {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1 AND is_read = false
      RETURNING id
    `;
    const res = await pool.query(query, [userId]);
    return { marked_count: res.rowCount };
  }

  /**
   * Create a new notification. Persisted to DB before any real-time delivery.
   * The PostgreSQL trigger on this table handles Socket.IO broadcast.
   */
  async createNotification(userId, title, message, type = 'GENERAL', actionUrl = null) {
    const query = `
      INSERT INTO notifications (user_id, title, message, type, action_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, title, message, type, is_read, created_at, action_url
    `;
    const res = await pool.query(query, [userId, title, message, type, actionUrl]);
    return res.rows[0];
  }

  /**
   * Get notifications created after a specific timestamp.
   * Used for reconnection recovery — catches notifications missed while offline.
   * Scoped by user_id.
   */
  async getNotificationsSince(userId, sinceTimestamp) {
    const query = `
      SELECT id, user_id, title, message, type, is_read, created_at, action_url
      FROM notifications
      WHERE user_id = $1 AND created_at >= $2
      ORDER BY created_at ASC
    `;
    const res = await pool.query(query, [userId, sinceTimestamp]);
    return res.rows;
  }
}

module.exports = new NotificationRepository();
