import 'dotenv/config'
import http from "http";
import cron from "node-cron";
import connectDB from "./db/index.js";
import { app } from './app.js';
import logger from './utils/logger.js';
import mongoose from 'mongoose';
import { initRedis, closeRedis } from './utils/redis.js';
import { initWebSocket, closeWebSocket } from './utils/websocket.js';

// ── Warn if NODE_ENV is not explicitly set ──
if (!process.env.NODE_ENV) {
  logger.warn("NODE_ENV is not set. Defaulting to 'development'. Set NODE_ENV=production in production.");
} else if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
  logger.warn(`Unrecognized NODE_ENV value: ${process.env.NODE_ENV}. Expected 'production', 'development', or 'test'.`);
}

// Validate LOG_LEVEL if set
if (process.env.LOG_LEVEL && !["error", "warn", "info", "debug"].includes(process.env.LOG_LEVEL)) {
  logger.warn(`Invalid LOG_LEVEL "${process.env.LOG_LEVEL}". Falling back to "info".`);
}

// ── Validate critical secrets at startup ──
const REQUIRED_SECRETS = [
  { key: "ACCESS_TOKEN_SECRET", label: "Access Token Secret" },
  { key: "REFRESH_TOKEN_SECRET", label: "Refresh Token Secret" },
];

const MIN_SECRET_LENGTH = 32;

if (!process.env.MONGODB_URI && process.env.NODE_ENV !== "test") {
  logger.error("Missing MONGODB_URI. Server cannot start.");
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === "production";

// In production, CORS_ORIGIN is required (no fallback to localhost)
if (isProduction) {
  REQUIRED_SECRETS.push({ key: "CORS_ORIGIN", label: "CORS Origin" });
  REQUIRED_SECRETS.push({ key: "FRONTEND_URL", label: "Frontend URL" });
  REQUIRED_SECRETS.push({ key: "BACKEND_URL", label: "Backend URL" });
  if (!process.env.SENTRY_DSN) {
    logger.warn("SENTRY_DSN not set — error monitoring is disabled. Recommended for production.");
  }
}

for (const { key, label } of REQUIRED_SECRETS) {
  if (!process.env[key]) {
    logger.error(`Missing ${label} (${key}). Server cannot start.`);
    process.exit(1);
  }
  if (process.env[key].length < MIN_SECRET_LENGTH) {
    logger.error(`${label} (${key}) must be at least ${MIN_SECRET_LENGTH} characters. Server cannot start.`);
    process.exit(1);
  }
}

// Validate Cloudinary credentials if any are set (all-or-nothing)
const CLOUDINARY_KEYS = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
const cloudinarySet = CLOUDINARY_KEYS.filter((k) => process.env[k]);
if (cloudinarySet.length > 0 && cloudinarySet.length < 3) {
  logger.error(`Partial Cloudinary config: set ${CLOUDINARY_KEYS.filter((k) => !process.env[k]).join(", ")} or remove all CLOUDINARY_* vars.`);
  process.exit(1);
}

// ── Warn about missing PROXY_TRUST_COUNT in production ──
if (isProduction && !process.env.PROXY_TRUST_COUNT) {
  logger.warn("PROXY_TRUST_COUNT not set. Defaulting to 1 (single reverse proxy). Set to 2 if behind CDN + nginx.");
}

// ── Warn about missing optional dev config using fallback URLs ──
if (!isProduction) {
  const OPTIONAL_CONFIG = [
    { key: "FRONTEND_URL", fallback: "http://localhost:3000" },
    { key: "BACKEND_URL", fallback: "http://localhost:8000" },
  ];
  for (const { key, fallback } of OPTIONAL_CONFIG) {
    if (!process.env[key]) {
      logger.warn(`${key} not set. Using fallback "${fallback}". Set this in production.`);
    }
  }
}

let server;
let cronJobs = [];

connectDB()
.then(async () => {
    await initRedis();

    // ── Cron: publish scheduled videos every minute ──
    const { runPublishScheduledVideos, runUpdateTrendingScores } = await import("./controllers/video/cron.controller.js");
    const publishJob = cron.schedule("* * * * *", async () => {
      try {
        await runPublishScheduledVideos();
      } catch (err) {
        logger.error("Scheduled video publishing cron failed", { error: err.message });
      }
    });
    logger.info("Scheduled video publishing cron initialized (every minute)");

    // ── Cron: recalculate trending scores every hour ──
    const trendingJob = cron.schedule("0 * * * *", async () => {
      try {
        await runUpdateTrendingScores();
      } catch (err) {
        logger.error("Trending score update cron failed", { error: err.message });
      }
    });
    logger.info("Trending score update cron initialized (every hour)");

    cronJobs = [publishJob, trendingJob];

    server = http.createServer(app);
    server.headersTimeout = 65000;
    server.requestTimeout = 60000;
    server.keepAliveTimeout = 65000;
    initWebSocket(server);

    server.listen(process.env.PORT || 8000, () => {
        logger.info(`Server is running at port : ${process.env.PORT || 8000}`);
    });
})
.catch((err) => {
    logger.error("MONGO db connection failed !!!", { error: err.message });
    process.exit(1);
});

const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    cronJobs.forEach((job) => job.stop());
    closeWebSocket();
    if (server) {
        await new Promise((resolve) => {
            const forceClose = setTimeout(() => {
                logger.warn("Forced server close after timeout");
                resolve();
            }, 10000);
            server.close(() => {
                clearTimeout(forceClose);
                logger.info("HTTP server closed");
                resolve();
            });
        });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed");
    }
    await closeRedis();
    process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err.message, stack: err.stack });
    gracefulShutdown("uncaughtException").then(() => process.exit(1));
});

process.on("unhandledRejection", (reason) => {
    const message = reason?.message || String(reason);
    logger.error("Unhandled rejection", { error: message });
    gracefulShutdown("unhandledRejection").then(() => process.exit(1));
});
