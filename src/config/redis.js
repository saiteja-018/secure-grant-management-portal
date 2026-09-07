const Redis = require('ioredis');
require('dotenv').config();

let redisClient = null;
const inMemoryCache = new Map();

// In test environment, immediately use the fast in-memory cache
if (process.env.NODE_ENV !== 'test') {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 2) {
          return null; // Stop retrying if Redis is not running
        }
        return Math.min(times * 100, 500);
      },
      lazyConnect: true
    });

    redisClient.connect().then(() => {
      console.log('Connected to Redis cache successfully');
    }).catch((err) => {
      console.warn('Redis unavailable, using in-memory cache fallback:', err.message);
      redisClient = null;
    });

    redisClient.on('error', (err) => {
      console.warn('Redis client error (falling back to memory):', err.message);
    });
  } catch (e) {
    console.warn('Could not initialize Redis, using in-memory cache fallback:', e.message);
    redisClient = null;
  }
}

const cacheService = {
  async get(key) {
    try {
      if (redisClient && redisClient.status === 'ready') {
        const val = await redisClient.get(key);
        return val ? JSON.parse(val) : null;
      }
    } catch (e) {
      // Fallback
    }
    const item = inMemoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      inMemoryCache.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key, value, ttlSeconds = 300) {
    try {
      if (redisClient && redisClient.status === 'ready') {
        await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return true;
      }
    } catch (e) {
      // Fallback
    }
    inMemoryCache.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null
    });
    return true;
  },

  async del(key) {
    try {
      if (redisClient && redisClient.status === 'ready') {
        await redisClient.del(key);
        return true;
      }
    } catch (e) {
      // Fallback
    }
    inMemoryCache.delete(key);
    return true;
  },

  async ping() {
    if (redisClient && redisClient.status === 'ready') {
      return await redisClient.ping();
    }
    return 'PONG';
  },

  getClient() {
    return redisClient;
  }
};

module.exports = cacheService;
