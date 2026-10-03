import { getChannel } from '../Config/rabbitmq.js';
import logger from '../utils/logger.js';

export const startEmailWorker = async () => {
  try {
    const channel = getChannel();
    const queue = 'email_notifications';

    await channel.assertQueue(queue, { durable: true });

    logger.info(`[*] Waiting for messages in ${queue}. To exit press CTRL+C`);

    channel.consume(queue, (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(`[x] Received email notification task:`, content);

          // Simulate email sending logic
          setTimeout(() => {
            logger.info(`[v] Email sent to ${content.to}`);
            channel.ack(msg);
          }, 1000);

        } catch (err) {
          logger.error('Failed to process email task:', err);
          // Reject and do not requeue if unparseable
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    logger.error('Failed to start email worker:', error);
  }
};
