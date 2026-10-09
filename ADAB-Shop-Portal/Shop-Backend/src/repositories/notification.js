const pool = require('../../db');

class NotificationRepository {
  async getNotifications(userId, limit = 50, offset = 0) {
    const query = `
      SELECT id, title, message, type, is_read, created_at, action_url
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const res = await pool.query(query, [userId, limit, offset]);
    return res.rows;
  }

  async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `;
    const res = await pool.query(query, [userId]);
    return { unread_count: parseInt(res.rows[0].unread_count, 10) };
  }

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

  async createNotification(userId, title, message, type = 'GENERAL', actionUrl = null) {
    const query = `
      INSERT INTO notifications (user_id, title, message, type, action_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, message, type, is_read, created_at, action_url
    `;
    const res = await pool.query(query, [userId, title, message, type, actionUrl]);
    return res.rows[0];
  }
}

module.exports = new NotificationRepository();
