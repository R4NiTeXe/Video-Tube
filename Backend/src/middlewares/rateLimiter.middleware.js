import rateLimit from "express-rate-limit";

const isDev = process.env.NODE_ENV !== "production";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 100,
  message: {
    statusCode: 429,
    message: "Too many requests, please try again later.",
    success: false,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 10,
  message: {
    statusCode: 429,
    message: "Too many authentication attempts, please try again later.",
    success: false,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 5,
  message: {
    statusCode: 429,
    message: "Too many OTP requests, please try again later.",
    success: false,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 10000 : 20,
  message: {
    statusCode: 429,
    message: "Too many uploads, please try again later.",
    success: false,
  },
  standardHeaders: true,
  legacyHeaders: false,
});