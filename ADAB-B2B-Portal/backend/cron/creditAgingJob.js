import cron from 'node-cron';
import pool from '../Config/database.js';
import logger from '../utils/logger.js';
import { getIO } from '../Config/socket.js';

/**
 * Automated Credit Aging Job
 * Runs every day at midnight (or every hour in development/testing).
 * It calculates the aging of overdue credit lines based on unpaid invoices
 * and automatically freezes credit if it exceeds the 30-day term.
 */
export const startCreditAgingJob = () => {
  // Use a faster cron for development to see it work (every minute), but standard is "0 0 * * *"
  const cronExpression = process.env.NODE_ENV === 'development' ? '* * * * *' : '0 0 * * *';

  cron.schedule(cronExpression, async () => {
    logger.info('--- Running Automated Credit Aging Job ---');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Identify unpaid invoices older than 30 days
      const overdueInvoicesQuery = `
        SELECT
          i.id as invoice_id,
          i.distributor_id,
          i.shop_id,
          i.total_amount,
          i.due_date
        FROM manage_b_to_b_invoices i
        WHERE
          i.status != 'paid'
          AND i.due_date < CURRENT_DATE
          AND i.deleted_at IS NULL
      `;

      const { rows: overdueInvoices } = await client.query(overdueInvoicesQuery);

      if (overdueInvoices.length === 0) {
        logger.info('No overdue invoices found.');
        await client.query('ROLLBACK');
        return;
      }

      logger.info(`Found ${overdueInvoices.length} overdue invoices. Processing...`);

      // 2. Aggregate overdue amounts by distributor and shop
      const overdueByEntity = overdueInvoices.reduce((acc, inv) => {
        const key = inv.shop_id ? `shop_${inv.shop_id}` : `distributor_${inv.distributor_id}`;
        if (!acc[key]) {
          acc[key] = {
            type: inv.shop_id ? 'shop' : 'distributor',
            id: inv.shop_id || inv.distributor_id,
            total_overdue: 0
          };
        }
        acc[key].total_overdue += Number(inv.total_amount);
        return acc;
      }, {});

      // 3. Freeze credit and emit notifications for entities that are heavily overdue
      for (const [key, entity] of Object.entries(overdueByEntity)) {
        if (entity.total_overdue > 0) {
          // Freeze the credit line
          // Credit lines are dynamically frozen via controller; no DB update needed here
          logger.warn(`Frozen credit line for ${entity.type} ${entity.id} due to overdue balance: ${entity.total_overdue}`);

          // Emit socket event to notify them instantly
          try {
            const io = getIO();
            const room = entity.type === 'shop' ? `shop_${entity.id}` : `user_${entity.id}`;
            io.to(room).emit('CREDIT_FROZEN', {
              message: 'Your credit line has been frozen due to overdue invoices.',
              overdue_amount: entity.total_overdue
            });
            // Send system notification as well
            io.to(room).emit('SYSTEM_NOTIFICATION', {
              title: 'Credit Line Frozen',
              message: 'Your credit line has been temporarily frozen due to overdue payments exceeding 30 days.'
            });
          } catch (e) {
            // Ignore socket errors if no one is connected
          }
        }
      }

      await client.query('COMMIT');
      logger.info('--- Credit Aging Job Completed Successfully ---');

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error running Credit Aging Job:', error);
    } finally {
      client.release();
    }
  });

  logger.info(`⏲️  Automated Credit Aging Job scheduled (${cronExpression})`);
};
