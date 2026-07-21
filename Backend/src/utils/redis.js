import Redis from "ioredis";
import logger from "./logger.js";
import { trackCacheHit } from "./metrics.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redis = null;
let isAvailable = false;

const initRedis = async () => {
  if (redis) return redis;
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });
    await redis.connect();
    isAvailable = true;
    logger.info("Redis connected");
  } catch (err) {
    logger.warn("Redis unavailable — caching disabled", { error: err.message });
    redis = null;
    isAvailable = false;
  }
  return redis;
};

const getRedis = () => redis;

const isRedisAvailable = () => isAvailable && redis?.status === "ready";

const cacheGet = async (key) => {
  if (!isRedisAvailable()) return null;
  try {
    const data = await redis.get(key);
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
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn("Redis cacheSet failed", { key, error: err.message });
  }
};

const cacheDel = async (pattern) => {
  if (!isRedisAvailable()) return;
  try {
    const stream = redis.scanStream({ match: pattern, count: 100 });
    const keys = [];
    for await (const key of stream) {
      keys.push(key);
    }
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    logger.warn("Redis cacheDel failed", { pattern, error: err.message });
  }
};

const blacklistToken = async (token, ttlSeconds = 86400) => {
  if (!isRedisAvailable()) return;
  try {
    await redis.setex(`blacklist:${token}`, ttlSeconds, "1");
  } catch (err) {
    logger.warn("Redis blacklistToken failed", { error: err.message });
  }
};

const isTokenBlacklisted = async (token) => {
  if (!isRedisAvailable()) return false;
  try {
    const val = await redis.get(`blacklist:${token}`);
    return val === "1";
  } catch (err) {
    logger.warn("Redis isTokenBlacklisted failed", { error: err.message });
    return false;
  }
};

// ── Distributed lock (SET NX + EX) ──
const acquireLock = async (lockKey, ttlSeconds = 10) => {
  if (!isRedisAvailable()) return null;
  try {
    const result = await redis.set(`lock:${lockKey}`, "1", "NX", "EX", ttlSeconds);
    return result === "OK" ? () => releaseLock(lockKey) : null;
  } catch (err) {
    logger.warn("Redis acquireLock failed", { lockKey, error: err.message });
    return null;
  }
};

const releaseLock = async (lockKey) => {
  if (!isRedisAvailable()) return;
  try {
    await redis.del(`lock:${lockKey}`);
  } catch (err) {
    logger.warn("Redis releaseLock failed", { lockKey, error: err.message });
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
  initRedis, getRedis, isRedisAvailable, closeRedis,
  cacheGet, cacheSet, cacheDel,
  blacklistToken, isTokenBlacklisted,
  acquireLock, releaseLock,
};
