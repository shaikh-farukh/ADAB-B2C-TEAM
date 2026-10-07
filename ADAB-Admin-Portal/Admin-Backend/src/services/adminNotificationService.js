const pool = require('../../db');

exports.getNotifications = async (userId) => {
  try {
    const res = await pool.query("SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 50");
    return res.rows;
  } catch(e) {
    return []; // Return empty if table doesn't exist yet
  }
};

exports.getUnreadCount = async (userId) => {
  try {
    const res = await pool.query("SELECT count(*) as count FROM admin_notifications WHERE is_read = false");
    return parseInt(res.rows[0].count) || 0;
  } catch(e) {
    return 0;
  }
};

exports.markAsRead = async (id, userId) => {
  try {
    await pool.query("UPDATE admin_notifications SET is_read = true WHERE id = $1", [id]);
  } catch(e) {
    // ignore
  }
};
