import pool from '../Config/database.js';
import logger from '../utils/logger.js';

export const createNotification = async (userId, title, description) => {
  try {
    const query = `
      INSERT INTO manage_notification
      (fk_manage_users, title, description, created_at, is_active, seen)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, true, false)
    `;
    await pool.query(query, [userId, title, description]);
    logger.info(`Notification created for user ${userId}: ${title}`);
  } catch (error) {
    logger.error(`Failed to create notification for user ${userId}`, error);
  }
};
