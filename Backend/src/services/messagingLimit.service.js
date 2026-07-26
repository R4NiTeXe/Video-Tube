import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";

const GLOBAL_DAILY_LIMIT = 300;
const USER_DAILY_LIMIT = 15;

const getStartOfNextDay = () => {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0); // Midnight UTC next day
  return d;
};

const getRedisKey = (type, identifier = "") => {
  const todayDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `messaging_limit:${type}:${todayDateStr}${identifier ? `:${identifier}` : ""}`;
};

export const checkMessagingLimit = async (identifier) => {
  if (!identifier) return;
  const normalizedIdentifier = identifier.trim().toLowerCase();

  let redis;
  try {
    const redisModule = await import("../utils/redis.js");
    redis =
      redisModule.default || (redisModule.getRedis && redisModule.getRedis());
  } catch (error) {
    logger.warn("Failed to load redis module in messaging limit check", {
      error: error.message,
    });
  }

  const globalKey = getRedisKey("global");
  const userKey = getRedisKey("user", normalizedIdentifier);

  const resetTimeStr = getStartOfNextDay().toISOString();

  if (redis && redis.status === "ready") {
    const [globalCountStr, userCountStr] = await Promise.all([
      redis.get(globalKey),
      redis.get(userKey),
    ]);

    const globalCount = parseInt(globalCountStr || "0", 10);
    const userCount = parseInt(userCountStr || "0", 10);

    if (globalCount >= GLOBAL_DAILY_LIMIT) {
      throw new ApiError(
        429,
        "Our daily messaging capacity has been reached. Please try again tomorrow.",
        [{ code: "GLOBAL_EMAIL_LIMIT", resetTime: resetTimeStr }]
      );
    }
    if (userCount >= USER_DAILY_LIMIT) {
      throw new ApiError(
        429,
        `You have reached the daily limit of ${USER_DAILY_LIMIT} messages. Please try again tomorrow.`,
        [{ code: "USER_EMAIL_LIMIT", resetTime: resetTimeStr }]
      );
    }
  } else {
    const todayStr = new Date().toISOString().split("T")[0];
    global.messagingLimitFallback = global.messagingLimitFallback || {
      global: 0,
      users: new Map(),
      date: todayStr,
    };
    if (global.messagingLimitFallback.date !== todayStr) {
      global.messagingLimitFallback = {
        global: 0,
        users: new Map(),
        date: todayStr,
      };
    }
    const fallback = global.messagingLimitFallback;
    const userCount = fallback.users.get(normalizedIdentifier) || 0;
    if (fallback.global >= GLOBAL_DAILY_LIMIT) {
      throw new ApiError(
        429,
        "Our daily messaging capacity has been reached. Please try again tomorrow.",
        [{ code: "GLOBAL_EMAIL_LIMIT", resetTime: resetTimeStr }]
      );
    }
    if (userCount >= USER_DAILY_LIMIT) {
      throw new ApiError(
        429,
        `You have reached the daily limit of ${USER_DAILY_LIMIT} messages. Please try again tomorrow.`,
        [{ code: "USER_EMAIL_LIMIT", resetTime: resetTimeStr }]
      );
    }
  }
};

export const incrementMessagingLimit = async (identifier) => {
  if (!identifier) return;
  const normalizedIdentifier = identifier.trim().toLowerCase();

  let redis;
  try {
    const redisModule = await import("../utils/redis.js");
    redis =
      redisModule.default || (redisModule.getRedis && redisModule.getRedis());
  } catch (error) {
    return;
  }

  const globalKey = getRedisKey("global");
  const userKey = getRedisKey("user", normalizedIdentifier);
  const ttlSeconds = Math.ceil(
    (getStartOfNextDay().getTime() - Date.now()) / 1000
  );

  if (redis && redis.status === "ready") {
    const multi = redis.multi();
    multi.incr(globalKey);
    multi.expire(globalKey, ttlSeconds);
    multi.incr(userKey);
    multi.expire(userKey, ttlSeconds);
    await multi.exec();
  } else {
    const todayStr = new Date().toISOString().split("T")[0];
    global.messagingLimitFallback = global.messagingLimitFallback || {
      global: 0,
      users: new Map(),
      date: todayStr,
    };
    if (global.messagingLimitFallback.date !== todayStr) {
      global.messagingLimitFallback = {
        global: 0,
        users: new Map(),
        date: todayStr,
      };
    }
    const fallback = global.messagingLimitFallback;
    const userCount = fallback.users.get(normalizedIdentifier) || 0;
    fallback.global += 1;
    fallback.users.set(normalizedIdentifier, userCount + 1);
  }
};

/**
 * @deprecated Use checkMessagingLimit and incrementMessagingLimit separately.
 */
export const checkAndIncrementMessagingLimit = async (identifier) => {
  await checkMessagingLimit(identifier);
  await incrementMessagingLimit(identifier);
};
