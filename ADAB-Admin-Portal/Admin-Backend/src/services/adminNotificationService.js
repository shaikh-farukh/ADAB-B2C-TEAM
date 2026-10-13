const pool = require('../../db');

exports.getNotifications = async (userId) => {
  try {
    const res = await pool.query(`
      SELECT id, title, message, type, is_read, action_url, created_at 
      FROM notifications 
      ORDER BY created_at DESC 
      LIMIT 50
    `);
    return res.rows;
  } catch(e) {
    try {
      const res2 = await pool.query("SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 50");
      return res2.rows;
    } catch(err) {
      return [];
    }
  }
};

exports.getUnreadCount = async (userId) => {
  try {
    const res = await pool.query("SELECT count(*) as count FROM notifications WHERE is_read = false");
    return parseInt(res.rows[0].count) || 0;
  } catch(e) {
    try {
      const res2 = await pool.query("SELECT count(*) as count FROM admin_notifications WHERE is_read = false");
      return parseInt(res2.rows[0].count) || 0;
    } catch(err) {
      return 0;
    }
  }
};

exports.markAsRead = async (id, userId) => {
  try {
    await pool.query("UPDATE notifications SET is_read = true WHERE id::text = $1", [id]);
  } catch(e) {
    try {
      await pool.query("UPDATE admin_notifications SET is_read = true WHERE id::text = $1", [id]);
    } catch(err) {
      // ignore
    }
  }
};

