import { asyncHandler } from "../utils/asyncHandler.js";

const sseClients = new Map();

export const streamNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();

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

  req.on("close", () => {
    const clients = sseClients.get(userId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(userId);
    }
  });

  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on("close", () => clearInterval(heartbeat));
});

export const sendSSENotification = (userId, notification) => {
  const clients = sseClients.get(userId.toString());
  if (clients) {
    const data = `data: ${JSON.stringify({ type: "notification", data: notification })}\n\n`;
    clients.forEach((client) => {
      try {
        client.write(data);
      } catch {
        clients.delete(client);
      }
    });
  }
};
