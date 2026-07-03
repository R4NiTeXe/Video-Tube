import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import passport from "passport";
import logger from "./utils/logger.js";
import { apiLimiter } from "./middlewares/rateLimiter.middleware.js";
import { configurePassport } from "./config/passport.js";

const app = express();

// ── Passport ──
configurePassport();
app.use(passport.initialize());

// ── Security headers ──
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ── HTTP request logging ──
app.use(
  morgan("short", {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// ── CORS ──
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// ── Body parsing ──
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

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
  // req.query is getter-only in Express 5 — sanitize via proxy trick
  if (req.query && typeof req.query === "object") {
    sanitizeTarget(req.query);
  }
  next();
});

// ── Global rate limiter ──
app.use("/api", apiLimiter);

// ── Security headers (custom) ──
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// ── Routes ──
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import reportRouter from "./routes/report.routes.js";
import pollRouter from "./routes/poll.routes.js";
import adminRouter from "./routes/admin.routes.js";
import captionRouter from "./routes/caption.routes.js";
import liveStreamRouter from "./routes/liveStream.routes.js";
import donationRouter from "./routes/donation.routes.js";
import chatRouter from "./routes/chat.routes.js";
import communityPostRouter from "./routes/communityPost.routes.js";
import endScreenRouter from "./routes/endScreen.routes.js";
import sseRouter from "./routes/sse.routes.js";
import oauthRouter from "./routes/oauth.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/auth", oauthRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/reports", reportRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/captions", captionRouter);
app.use("/api/v1/live", liveStreamRouter);
app.use("/api/v1/donations", donationRouter);
app.use("/api/v1/polls", pollRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/community", communityPostRouter);
app.use("/api/v1/end-screens", endScreenRouter);
app.use("/api/v1/sse", sseRouter);

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

// ── Error handler ──
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Log server errors
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl}`, {
      statusCode,
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${statusCode}`, {
      message: err.message,
    });
  }

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message:
      statusCode >= 500 && process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message || "Internal Server Error",
    errors: err.errors || [],
  });
});

export { app };
