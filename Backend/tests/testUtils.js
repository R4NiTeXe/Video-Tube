import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app.js";
import { User } from "../src/models/user.model.js";
import { Video } from "../src/models/video.model.js";
import { Like } from "../src/models/like.model.js";
import { Subscription } from "../src/models/subscription.model.js";
import { Comment } from "../src/models/comment.model.js";
import { Playlist } from "../src/models/playlist.model.js";
import { CommunityPost } from "../src/models/communityPost.model.js";
import { Notification } from "../src/models/notification.model.js";
import { Session } from "../src/models/session.model.js";

let mongod;
let server;
let dbName;

export const startTestServer = async (customDbName = `videotube_test_${Date.now()}_${Math.random().toString(36).slice(2)}`) => {
  dbName = customDbName;
  mongod = await MongoMemoryServer.create({
    instance: {
      dbName,
    },
  });
  const baseUri = mongod.getUri();
  const uri = `${baseUri}${dbName}`;

  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = "test";
  process.env.ACCESS_TOKEN_SECRET = "test-access-secret-32-characters-long";
  process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret-32-characters-long";
  process.env.ACCESS_TOKEN_EXPIRY = "1d";
  process.env.REFRESH_TOKEN_EXPIRY = "10d";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.FRONTEND_URL = "http://localhost:3000";
  process.env.BACKEND_URL = "http://localhost:8000";

  await mongoose.connect(uri);
  server = app.listen(0);
  return server;
};

export const stopTestServer = async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
      setTimeout(() => reject(new Error("Server close timeout")), 5000);
    });
  }
  try {
    await mongoose.disconnect();
  } catch (e) {
    // Ignore disconnect errors
  }
  if (mongod) {
    await mongod.stop();
  }
};

export const clearDatabase = async () => {
  const collections = [
    User, Video, Like, Subscription, Comment,
    Playlist, CommunityPost, Notification, Session,
  ];
  await Promise.all(collections.map((c) => c.deleteMany({})));
};

export const dropDatabase = async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
};

export const createTestUser = async (overrides = {}) => {
  const uniqueId = Date.now() + Math.random().toString(36).slice(2);
  const user = await User.create({
    fullName: "Test User",
    username: `testuser_${uniqueId}`,
    email: `test_${uniqueId}@example.com`,
    password: "Test@1234",
    isEmailVerified: true,
    avatar: "http://cloudinary.com/avatar/default.jpg",
    ...overrides,
  });
  return user;
};

export const loginTestUser = async (userOrEmail, password = "Test@1234") => {
  let email;
  if (typeof userOrEmail === "object" && userOrEmail.email) {
    email = userOrEmail.email;
  } else if (typeof userOrEmail === "string") {
    email = userOrEmail;
  } else {
    const user = await createTestUser();
    email = user.email;
  }
  
  const res = await request(app)
    .post("/api/v1/users/login")
    .send({
      email,
      password,
    });
  
  // Parse set-cookie headers to extract just the key=value pairs
  const setCookie = res.headers["set-cookie"] || [];
  const cookiePairs = setCookie
    .map(c => c.split(";")[0]) // Get just the key=value part before first semicolon
    .filter(Boolean);
  
  // Find the user by email to return it
  const user = await User.findOne({ email });
  return { user, cookies: cookiePairs };
};

export const createTestVideo = async (ownerId, overrides = {}) => {
  const video = await Video.create({
    title: "Test Video",
    description: "Test description",
    videoFile: "http://cloudinary.com/video/test.mp4",
    thumbnail: "http://cloudinary.com/thumb/test.jpg",
    duration: 300,
    owner: ownerId,
    isPublished: true,
    ...overrides,
  });
  return video;
};

export const getAuthHeaders = (cookies) => ({
  Cookie: cookies?.join("; ") || "",
});

export const expectSuccess = (res, statusCode = 200) => {
  expect(res.status).toBe(statusCode);
  expect(res.body.success).toBe(true);
};

export const expectError = (res, statusCode, message) => {
  expect(res.status).toBe(statusCode);
  expect(res.body.success).toBe(false);
  if (message) expect(res.body.message).toContain(message);
};