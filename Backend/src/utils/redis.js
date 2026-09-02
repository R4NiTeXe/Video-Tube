import Redis from "ioredis";
import crypto from "crypto";
import logger from "./logger.js";
import { trackCacheHit } from "./metrics.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Instantiate synchronously. ioredis automatically queues commands until connected.
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

let isAvailable = false;
let __mockClient = null;

const initRedis = async () => {
  if (isAvailable) return redis;
  try {
    if (redis.status === "wait" || redis.status === "close") {
      await redis.connect();
    }
    isAvailable = true;
    logger.info("Redis connected");
  } catch (err) {
    if (err.message === "Redis is already connecting/connected") {
      isAvailable = true;
      logger.info("Redis connected");
    } else {
      logger.warn("Redis unavailable — caching disabled", {
        error: err.message,
      });
      isAvailable = false;
    }
  }
  return redis;
};

const getRedis = () => __mockClient || redis;
export const __testSetMockClient = (client) => {
  __mockClient = client;
};

const isRedisAvailable = () => isAvailable && redis?.status === "ready";

const cacheGet = async (key) => {
  if (!isRedisAvailable()) return null;
  try {
    const client = getRedis();
    const data = await client.get(key);
    const hit = data !== null;
    trackCacheHit(hit);
    return hit ? JSON.parse(data) : null;
  } catch (err) {
    logger.warn("Redis cacheGet failed", { key, error: err.message });
    return null;
  }
};

const cacheSet = async (key, value, ttlSeconds = 300) => {
  if (!isRedisAvailable()) return;
  try {
    const client = getRedis();
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn("Redis cacheSet failed", { key, error: err.message });
  }
};

const cacheDel = async (pattern) => {
  if (!isRedisAvailable()) return;
  try {
    const client = getRedis();
    const stream = client.scanStream({ match: pattern, count: 100 });
    const keys = [];
    for await (const key of stream) {
      keys.push(key);
    }
    if (keys.length > 0) await client.del(...keys);
  } catch (err) {
    logger.warn("Redis cacheDel failed", { pattern, error: err.message });
  }
};

const blacklistToken = async (token, ttlSeconds = 86400) => {
  if (!isRedisAvailable()) return;
  try {
    const client = getRedis();
    await client.setex(`blacklist:${token}`, ttlSeconds, "1");
  } catch (err) {
    logger.warn("Redis blacklistToken failed", { error: err.message });
  }
};

const isTokenBlacklisted = async (token) => {
  if (!isRedisAvailable()) return false;
  try {
    const client = getRedis();
    const val = await client.get(`blacklist:${token}`);
    return val === "1";
  } catch (err) {
    logger.warn("Redis isTokenBlacklisted failed", { error: err.message });
    return false;
  }
};

const acquireLock = async (lockKey, ttlSeconds = 10) => {
  if (!isRedisAvailable()) return null;
  const token = crypto.randomUUID();
  try {
    const client = getRedis();
    const result = await client.set(
      `lock:${lockKey}`,
      token,
      "NX",
      "EX",
      ttlSeconds
    );
    if (result !== "OK") return null;
    const release = async () => {
      if (!isRedisAvailable()) return 0;
      try {
        const c = getRedis();
        const res = await c.eval(
          `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
          1,
          `lock:${lockKey}`,
          token
        );
        return res;
      } catch (err) {
        logger.warn("Redis releaseLock failed", { lockKey, error: err.message });
        return 0;
      }
    };
    release.token = token;
    release.lockKey = lockKey;
    return release;
  } catch (err) {
    logger.warn("Redis acquireLock failed", { lockKey, error: err.message });
    return null;
  }
};

const releaseLock = async (lockKey, expectedToken) => {
  if (!isRedisAvailable()) return 0;
  if (!expectedToken) {
    logger.warn("releaseLock called without token — refusing to delete", { lockKey });
    return 0;
  }
  try {
    const client = getRedis();
    const res = await client.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
      1,
      `lock:${lockKey}`,
      expectedToken
    );
    return res;
  } catch (err) {
    logger.warn("Redis releaseLock failed", { lockKey, error: err.message });
    return 0;
  }
};

const closeRedis = async () => {
  if (redis) {
    try {
      await redis.quit();
      logger.info("Redis connection closed");
    } catch (err) {
      logger.warn("Error closing Redis connection", { error: err.message });
    }
  }
};

export {
  initRedis,
  getRedis,
  isRedisAvailable,
  closeRedis,
  cacheGet,
  cacheSet,
  cacheDel,
  blacklistToken,
  isTokenBlacklisted,
  acquireLock,
  releaseLock,
};

export const __testSetRedisAvailable = (val) => {
  isAvailable = val;
  if (val) {
    try {
      // @ts-ignore
      redis.status = "ready";
    } catch (_e) {
      void _e;
    }
  }
};
