import amqp from 'amqplib';
import logger from '../utils/logger.js';

let connection = null;
let channel = null;

const connectRabbitMQ = async (retries = 5) => {
  while (retries > 0) {
    try {
      const rabbitMqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      connection = await amqp.connect(rabbitMqUrl);
      channel = await connection.createChannel();
      logger.info('RabbitMQ connected successfully');

      // Assert queues
      await channel.assertQueue('email_notifications', { durable: true });
      await channel.assertQueue('ORDER_CREATED_QUEUE', { durable: true });
      return true;
    } catch (error) {
      logger.error(`RabbitMQ connection error (retries left: ${retries - 1}):`, error.message);
      retries -= 1;
      if (retries === 0) throw error;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

export const getChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel is not initialized');
  }
  return channel;
};

export const publishToQueue = async (queueName, data) => {
  try {
    const ch = getChannel();
    ch.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), { persistent: true });
    logger.info(`Message published to queue: ${queueName}`);
    return true;
  } catch (error) {
    logger.error(`Error publishing to queue ${queueName}:`, error);
    return false;
  }
};

export default connectRabbitMQ;
