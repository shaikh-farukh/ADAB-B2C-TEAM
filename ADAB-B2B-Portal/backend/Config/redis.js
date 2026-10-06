import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const MAX_RETRIES = 3;
let retryCount = 0;
let isAvailable = false;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Lazy-connect so the app starts even when Redis is offline.
// enableOfflineQueue:false makes calls fail fast instead of queuing forever.
const redisClient = new Redis(redisUrl, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > MAX_RETRIES) {
      // Stop retrying — Redis is not available in this environment
      return null;
    }
    return Math.min(times * 150, 2000);
  },
  reconnectOnError(err) {
    return err.message.includes('READONLY');
  }
});

redisClient.on('connect', () => {
  isAvailable = true;
  console.log('✅ Redis Connected (B2B)');
});

redisClient.on('ready', () => {
  isAvailable = true;
});

redisClient.on('error', (err) => {
  retryCount++;
  if (retryCount === 1) {
    // Log once to avoid console flooding during local development
    console.warn(`⚠️  Redis unavailable (B2B) — caching disabled. [${err.message}]`);
  }
  isAvailable = false;
});

redisClient.on('close', () => {
  isAvailable = false;
});

// Non-blocking initial connection attempt
redisClient.connect().catch(() => {
  // Handled gracefully by the 'error' event listener above
});

/**
 * Standardized caching service interface with graceful degradation
 */
export const redisService = {
  isReady: () => isAvailable,

  async set(key, value, ttl = 3600) {
    if (!isAvailable) return false;
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl > 0) {
        await redisClient.set(key, serialized, 'EX', ttl);
      } else {
        await redisClient.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.warn('Redis SET failed (B2B):', error.message);
      return false;
    }
  },

  async get(key) {
    if (!isAvailable) return null;
    try {
      const data = await redisClient.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      console.warn('Redis GET failed (B2B):', error.message);
      return null;
    }
  },

  async del(key) {
    if (!isAvailable) return false;
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.warn('Redis DEL failed (B2B):', error.message);
      return false;
    }
  },

  async clearPrefix(prefix) {
    if (!isAvailable) return false;
    try {
      const stream = redisClient.scanStream({ match: `${prefix}*`, count: 100 });
      stream.on('data', (keys) => {
        if (keys.length) {
          const pipeline = redisClient.pipeline();
          keys.forEach((k) => pipeline.del(k));
          pipeline.exec();
        }
      });
      return true;
    } catch (error) {
      console.warn('Redis clearPrefix failed (B2B):', error.message);
      return false;
    }
  }
};

export { redisClient };
export default redisService;
