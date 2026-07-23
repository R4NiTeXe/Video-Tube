import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedis, isRedisAvailable } from "../utils/redis.js";
import logger from "../utils/logger.js";

const isTest = process.env.NODE_ENV === "test";

let warnedMemoryStore = false;

const createLimiter = (options) => {
  if (isTest) {
    return (req, res, next) => next();
  }
  
  if (process.env.REDIS_URL) {
    options.store = new RedisStore({
      sendCommand: (...args) => getRedis().call(...args),
    });
  } else if (process.env.NODE_ENV === "production" && !warnedMemoryStore) {
    logger.warn("Using in-memory rate limiter in production. Rate limits will not be shared across instances.");
    warnedMemoryStore = true;
  }

  return rateLimit(options);
};

export const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    statusCode: 429,
    message: "Too many requests, please try again later.",
    success: false,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    statusCode: 429,
    message: "Too many authentication attempts, please try again later.",
    success: false,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    statusCode: 429,
    message: "Too many OTP requests, please try again later.",
    success: false,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    statusCode: 429,
    message: "Too many uploads, please try again later.",
    success: false,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const searchLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    statusCode: 429,
    message: "Too many search requests, please slow down.",
    success: false,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const viewLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    statusCode: 429,
    message: "Too many requests, please slow down.",
    success: false,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});