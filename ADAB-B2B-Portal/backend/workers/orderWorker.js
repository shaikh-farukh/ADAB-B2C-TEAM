import { getChannel } from '../Config/rabbitmq.js';
import pool from '../Config/database.js';
import logger from '../utils/logger.js';

export const startOrderWorker = async () => {
  try {
    const channel = getChannel();
    const queue = 'ORDER_CREATED_QUEUE';

    await channel.assertQueue(queue, { durable: true });

    logger.info(`[*] Waiting for messages in ${queue}. To exit press CTRL+C`);

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(`[x] Received order task for order ID: ${content.order_id}`);

          const items = content.items || [];

          // Begin transaction
          const client = await pool.connect();
          try {
            await client.query('BEGIN');

            // Deduct stock
            for (const item of items) {
              await client.query(
                `UPDATE manage_manufacturer_products SET warehouse_stock = warehouse_stock - $1 WHERE id = $2 AND warehouse_stock >= $1`,
                [item.quantity, item.product_id]
              );
            }

            // Simulate Invoice PDF Generation
            logger.info(`[v] Invoice PDF generated for order ID: ${content.order_id}`);

            await client.query('COMMIT');
            channel.ack(msg);
          } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
          } finally {
            client.release();
          }

        } catch (err) {
          logger.error('Failed to process order task:', err);
          // Reject and requeue
          channel.nack(msg, false, true);
        }
      }
    });
  } catch (error) {
    logger.error('Failed to start order worker:', error);
  }
};
