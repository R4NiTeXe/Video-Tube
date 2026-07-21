import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import passport from "passport";
import helmet from "helmet";
import compression from "compression";
import crypto from "crypto";
import * as Sentry from "@sentry/node";
import logger, { runWithCorrelationId } from "./utils/logger.js";
import { apiLimiter } from "./middlewares/rateLimiter.middleware.js";
import { csrfMiddleware, csrfTokenHandler } from "./middlewares/csrf.middleware.js";
import { configurePassport } from "./config/passport.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import { trackRequest, incrementConnections, decrementConnections, metricsHandler, initMetrics } from "./utils/metrics.js";

const app = express();

// Trust proxy — required when behind nginx/reverse proxy for correct IP detection.
// Set PROXY_TRUST_COUNT to the number of reverse proxies between client and app.
//   - 1 (default): behind nginx only
//   - 2: behind CDN (e.g. Cloudflare) + nginx
//   - true: trust all (less secure — only if proxies strip external X-Forwarded-For)
const proxyTrustCount = (() => {
  const raw = process.env.PROXY_TRUST_COUNT;
  if (!raw) return 1;
  if (raw.toLowerCase() === "true") return true;
  const num = Number(raw);
  if (Number.isInteger(num) && num > 0) return num;
  logger.warn(`Invalid PROXY_TRUST_COUNT "${raw}". Falling back to 1.`);
  return 1;
})();
app.set("trust proxy", proxyTrustCount);

initMetrics();

// ── Sentry (conditional — only if SENTRY_DSN is set) ──
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || `videotube@${process.env.npm_package_version || "unknown"}`,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    maxBreadcrumbs: 50,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["cookie"];
        delete event.request.headers["authorization"];
        delete event.request.headers["x-csrf-token"];
      }
      if (event.request?.data) {
        if (typeof event.request.data === "string") {
          try { event.request.data = JSON.parse(event.request.data); } catch {
            // Keep the original payload if it is not JSON.
          }
        }
        if (event.request.data?.password) event.request.data.password = "[REDACTED]";
        if (event.request.data?.token) event.request.data.token = "[REDACTED]";
        if (event.request.data?.refreshToken) event.request.data.refreshToken = "[REDACTED]";
      }
      return event;
    },
  });
  app.use(Sentry.Handlers.requestHandler());
  logger.info("Sentry error monitoring initialized", { release: process.env.SENTRY_RELEASE || "unknown" });
} else {
  logger.info("Sentry not configured — set SENTRY_DSN to enable error monitoring");
}

// ── Correlation ID middleware ──
app.use((req, res, next) => {
  const correlationId = req.headers["x-correlation-id"] || req.headers["x-request-id"] || crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);
  runWithCorrelationId(correlationId, next);
});

// ── Prometheus metrics tracking middleware ──
app.use((req, res, next) => {
  if (req.path === "/metrics") return next();
  const start = Date.now();
  incrementConnections();
  res.on("finish", () => {
    decrementConnections();
    trackRequest(req.method, req.route?.path || req.path, res.statusCode, Date.now() - start);
  });
  next();
});

// ── Passport ──
configurePassport();
app.use(passport.initialize());

// ── Security headers (helmet) ──
const isDev = process.env.NODE_ENV !== "production";
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://res.cloudinary.com", ...(isDev ? ["'unsafe-eval'"] : [])],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://res.cloudinary.com", "https://*.cloudinary.com", "https://api.cloudinary.com"],
      mediaSrc: ["'self'", "https://res.cloudinary.com", "https://*.cloudinary.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

// ── HTTP request logging ──
app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// ── Response compression ──
app.use(compression({ level: 6, threshold: 1024 }));

// ── CORS ──

// Collect allowed origins from CORS_ORIGIN (comma-separated) and FRONTEND_URL
const rawOrigins = [
  ...(process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean) || []),
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : []),
];

// In development, include common localhost variants so developers aren't blocked
const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

const corsOrigins = rawOrigins.length > 0 ? [...new Set(rawOrigins)] : (process.env.NODE_ENV === "production" ? [] : DEV_ORIGINS);

// Guard: wildcard '*' is incompatible with credentials (browser spec violation)
if (corsOrigins.includes("*")) {
  logger.error("CORS_ORIGIN contains '*' — wildcard origins are incompatible with credentials: true. Remove '*' from CORS_ORIGIN.");
  process.exit(1);
}

// Convert origin patterns to regexes for subdomain wildcard support
// "https://*.example.com" → /^https:\/\/[^.]+\.example\.com$/
const originPatterns = corsOrigins.map((origin) => {
  if (origin.includes("*")) {
    const escaped = origin.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace("\\*", "[^.]+");
    return new RegExp(`^${escaped}$`);
  }
  return origin;
});

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (server-to-server, webhooks, health checks, oEmbed, Prometheus)
      if (!origin) return callback(null, true);

      const allowed = originPatterns.some((pattern) =>
        typeof pattern === "string" ? pattern === origin : pattern.test(origin)
      );

      if (allowed) return callback(null, true);

      logger.warn("CORS blocked origin", { origin, allowedOrigins: corsOrigins });
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    maxAge: 86400,
  })
);

// ── Body parsing ──
app.use(cookieParser());
app.use(express.json({ limit: "16kb", depth: 10 }));
app.use(express.urlencoded({ extended: true, limit: "16kb", parameterLimit: 1000 }));
app.use(express.static("public"));

// ── CSRF Protection ──
app.use(csrfMiddleware);
app.get("/api/v1/csrf-token", csrfTokenHandler);

// ── NoSQL injection sanitization (custom, Express 5 compatible) ──
const sanitizeTarget = (obj, replaceWith = "_") => {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.startsWith("__")) {
      obj[replaceWith + key.slice(1)] = obj[key];
      delete obj[key];
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeTarget(obj[key], replaceWith);
    }
  }
};

app.use((req, res, next) => {
  ["body", "params"].forEach((key) => {
    if (req[key] && typeof req[key] === "object") {
      sanitizeTarget(req[key]);
    }
  });
  // req.query is a getter in Express 5 — clone and sanitize
  try {
    const queryCopy = { ...req.query };
    sanitizeTarget(queryCopy);
    Object.defineProperty(req, "query", { value: queryCopy, configurable: true });
  } catch (err) {
    logger.warn("Could not redefine req.query", { error: err.message });
  }
  next();
});

// ── Global rate limiter ──
app.use("/api", apiLimiter);

// ── Health check endpoints ──
app.get("/health/live", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/health/ready", async (req, res) => {
  try {
    const { default: mongoose } = await import("mongoose");
    const { checkCloudinaryConnection } = await import("./utils/cloudinary.js");
    const { isRedisAvailable } = await import("./utils/redis.js");
    await mongoose.connection.db.admin().ping();
    const cloudinary = await checkCloudinaryConnection();
    const redisOk = isRedisAvailable();
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memOK = memMB < 512;
    const healthy = cloudinary.connected && memOK; // Redis is optional so we don't fail if down
    res.status(healthy ? 200 : 503).json({
      status: healthy ? "ready" : "degraded",
      database: "connected",
      cloudinary: cloudinary.connected ? "ok" : "error",
      redis: redisOk ? "connected" : "disconnected",
      memory: { heapUsedMB: `${memMB}MB`, status: memOK ? "ok" : "high" },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn("Health check failed", { error: err.message });
    res.status(503).json({ status: "not ready", database: "disconnected", error: "health check failed", uptime: process.uptime(), timestamp: new Date().toISOString() });
  }
});

// ── Prometheus metrics ──
app.get("/metrics", metricsHandler);

// ── Swagger API Documentation (disabled in production) ──
if (process.env.NODE_ENV !== "production") {
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #ef4444; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 1rem; border-radius: 0.5rem; }
  `,
  customSiteTitle: "VideoTube API Documentation",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
}));

app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});
}

// ── Cloudinary webhook (secured by shared secret) ──
app.post("/api/v1/webhooks/cloudinary", async (req, res) => {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const token = req.query?.token || req.headers["x-webhook-token"];
      const tokenValue = Array.isArray(token) ? token[0] : token;
      const tokenBuffer = Buffer.from(String(tokenValue || ""));
      const secretBuffer = Buffer.from(webhookSecret);
      if (!tokenValue || tokenBuffer.length !== secretBuffer.length || !crypto.timingSafeEqual(tokenBuffer, secretBuffer)) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }
    const { notification_type, public_id } = req.body || {};
    if (notification_type === "upload" || notification_type === "eager") {
      const { default: VideoMod } = await import("./models/video.model.js");
      await VideoMod.findOneAndUpdate(
        { videoFile: { $regex: public_id, $options: "i" } },
        { transcodingStatus: "completed" }
      );
    }
    res.status(200).json({ received: true });
  } catch (err) {
    logger.error("Webhook handler error", { error: err.message });
    res.status(200).json({ received: true });
  }
});

// ── Routes ──
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import adminRouter from "./routes/admin.routes.js";
import communityPostRouter from "./routes/communityPost.routes.js";
import sseRouter from "./routes/sse.routes.js";
import oauthRouter from "./routes/oauth.routes.js";
import sessionRouter from "./routes/session.routes.js";
import otpRouter from "./routes/otp.routes.js";
import reportRouter from "./routes/report.routes.js";
import pollRouter from "./routes/poll.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/auth", oauthRouter);
app.use("/api/v1/sessions", sessionRouter);
app.use("/api/v1/otp", otpRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/community", communityPostRouter);
app.use("/api/v1/sse", sseRouter);
app.use("/api/v1/reports", reportRouter);
app.use("/api/v1/polls", pollRouter);

// ── oEmbed endpoint ──
app.get("/api/v1/oembed", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const videoIdMatch = url.match(/\/videos\/([a-fA-F0-9]+)/);
    if (!videoIdMatch) return res.status(404).json({ error: "Invalid video URL" });

    const { default: Video } = await import("./models/video.model.js");
    const video = await Video.findById(videoIdMatch[1])
      .select("title description thumbnail videoFile views")
      .populate("owner", "fullName username")
      .lean();

    if (!video) return res.status(404).json({ error: "Video not found" });

    return res.json({
      type: "video",
      version: "1.0",
      title: video.title,
      description: video.description,
      thumbnail_url: video.thumbnail,
      author_name: video.owner?.fullName || video.owner?.username,
      author_url: `/channel/${video.owner?.username}`,
      width: 640,
      height: 360,
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Error handlers ──
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
