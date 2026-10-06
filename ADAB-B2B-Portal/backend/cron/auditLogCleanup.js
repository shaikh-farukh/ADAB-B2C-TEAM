import cron from 'node-cron';
import pool from '../Config/database.js';
import logger from '../utils/logger.js';

// Schedule job to run at 2:00 AM every Sunday
cron.schedule('0 2 * * 0', async () => {
  logger.info('Running cron job: Audit Log Cleanup (deleting logs older than 4 months)');

  try {
    const result = await pool.query(`
      DELETE FROM manage_b_to_b_audit_logs
      WHERE created_at < NOW() - INTERVAL '4 months'
    `);

    logger.info(`Audit Log Cleanup: Deleted ${result.rowCount} old records.`);
  } catch (error) {
    logger.error(`Error in Audit Log Cleanup cron job: ${error.message}`);
  }
});
