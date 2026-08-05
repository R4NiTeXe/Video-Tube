import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getRedis, isRedisAvailable } from "../utils/redis.js";
import logger from "../utils/logger.js";

const sseClients = new Map();
const NOTIFICATION_CHANNEL = "sse:notifications";

const instanceId = crypto.randomUUID();

let sseSubscriber = null;
let subscriptionStarted = false;

const ensureCrossInstanceSubscription = async () => {
  if (subscriptionStarted || !isRedisAvailable()) return;
  subscriptionStarted = true;
  try {
    const { default: Redis } = await import("ioredis");
    sseSubscriber = new Redis(
      process.env.REDIS_URL || "redis://localhost:6379",
      {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        retryStrategy(times) {
          return Math.min(times * 200, 2000);
        },
      }
    );
    await sseSubscriber.connect();
    await sseSubscriber.subscribe(NOTIFICATION_CHANNEL);
    sseSubscriber.on("message", (channel, message) => {
      if (channel !== NOTIFICATION_CHANNEL) return;
      try {
        const { instanceId: fromInstance, userId, notification } =
          JSON.parse(message);
        if (fromInstance === instanceId) return;
        deliverToLocalClients(userId, notification);
      } catch (err) {
        logger.warn("Invalid SSE pub/sub message", { error: err.message });
      }
    });
    logger.info("SSE cross-instance subscription started");
  } catch (err) {
    subscriptionStarted = false;
    logger.warn("SSE cross-instance subscription unavailable", {
      error: err.message,
    });
  }
};

export const streamNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  ensureCrossInstanceSubscription();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  sseClients.get(userId).add(res);

  const cleanup = () => {
    const clients = sseClients.get(userId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(userId);
    }
  };

  req.on("close", cleanup);

  // Auto-disconnect zombie connections after 5 minutes
  const timeout = setTimeout(() => {
    cleanup();
    try {
      res.end();
    } catch {
      // The response may already be closed by the client.
    }
  }, 300000);

  req.on("close", () => clearTimeout(timeout));

  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on("close", () => clearInterval(heartbeat));
});

const deliverToLocalClients = (userId, notification) => {
  const clients = sseClients.get(userId.toString());
  if (!clients) return;
  const data = `data: ${JSON.stringify({ type: "notification", data: notification })}\n\n`;
  clients.forEach((client) => {
    try {
      client.write(data);
    } catch {
      clients.delete(client);
    }
  });
};

export const sendSSENotification = async (userId, notification) => {
  deliverToLocalClients(userId, notification);
  if (!isRedisAvailable()) return;
  try {
    await getRedis().publish(
      NOTIFICATION_CHANNEL,
      JSON.stringify({
        instanceId,
        userId: userId.toString(),
        notification,
      })
    );
  } catch (err) {
    logger.warn("SSE publish failed", { error: err.message });
  }
};
