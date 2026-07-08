import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";

let wss;

export const initWebSocket = (server) => {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(1008, "Authentication required");
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      ws.userId = decoded._id;
      ws.isAlive = true;

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          handleMessage(ws, message);
        } catch (e) {
          ws.send(
            JSON.stringify({ type: "error", message: "Invalid message format" })
          );
        }
      });

      ws.on("close", () => {});
    } catch (err) {
      ws.close(1008, "Invalid token");
    }
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));
};

const handleMessage = (ws, message) => {
  switch (message.type) {
    case "join_stream":
      ws.streamId = message.streamId;
      break;
    case "leave_stream":
      ws.streamId = null;
      break;
    case "chat_message":
      broadcastToStream(ws.streamId, {
        type: "chat_message",
        sender: ws.userId,
        content: message.content,
        timestamp: new Date().toISOString(),
      });
      break;
  }
};

export const broadcastToStream = (streamId, data) => {
  if (!wss || !streamId) return;
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.streamId === streamId) {
      client.send(JSON.stringify(data));
    }
  });
};

export const broadcastToUser = (userId, data) => {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.userId === userId) {
      client.send(JSON.stringify(data));
    }
  });
};
