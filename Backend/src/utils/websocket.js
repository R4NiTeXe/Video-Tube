import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import logger from "./logger.js";

let wss = null;

const rooms = new Map();

export const initWebSocket = (server) => {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const token = new URL(req.url, "http://localhost").searchParams.get("token");
    if (!token) {
      ws.close(4001, "Authentication required");
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      ws.userId = decoded._id;
    } catch {
      ws.close(4001, "Invalid token");
      return;
    }

    ws.rooms = new Set();

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data);
        handleMessage(ws, msg);
      } catch {
        // ignore invalid messages
      }
    });

    ws.on("close", () => {
      for (const room of ws.rooms) {
        const clients = rooms.get(room);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) rooms.delete(room);
        }
      }
    });
  });

  logger.info("WebSocket server initialized on /ws");
  return wss;
};

const handleMessage = (ws, msg) => {
  switch (msg.type) {
    case "join:video":
      joinRoom(ws, `video:${msg.videoId}`);
      break;
    case "leave:video":
      leaveRoom(ws, `video:${msg.videoId}`);
      break;
    case "comment:new":
      broadcast(`video:${msg.videoId}`, { type: "comment:new", comment: msg.comment });
      break;
    case "typing:start":
      broadcast(`video:${msg.videoId}`, { type: "typing:start", userId: ws.userId, username: msg.username }, ws);
      break;
    case "typing:stop":
      broadcast(`video:${msg.videoId}`, { type: "typing:stop", userId: ws.userId }, ws);
      break;
  }
};

const joinRoom = (ws, room) => {
  ws.rooms.add(room);
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room).add(ws);
};

const leaveRoom = (ws, room) => {
  ws.rooms.delete(room);
  const clients = rooms.get(room);
  if (clients) {
    clients.delete(ws);
    if (clients.size === 0) rooms.delete(room);
  }
};

const broadcast = (room, message, exclude = null) => {
  const clients = rooms.get(room);
  if (!clients) return;
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client !== exclude && client.readyState === 1) {
      client.send(data);
    }
  }
};

export const sendToRoom = (room, message) => {
  broadcast(room, message);
};

export const closeWebSocket = () => {
  if (wss) {
    for (const client of wss.clients) {
      client.close(1001, "Server shutting down");
    }
    wss.close();
    wss = null;
  }
};
