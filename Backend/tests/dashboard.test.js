import { describe, it, beforeAll, afterAll, beforeEach, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app.js";
import { startTestServer, stopTestServer, clearDatabase, dropDatabase, createTestUser, loginTestUser, createTestVideo, getAuthHeaders, expectSuccess } from "./testUtils.js";
import { Video } from "../src/models/video.model.js";
import { Like } from "../src/models/like.model.js";
import { Comment } from "../src/models/comment.model.js";
import { Subscription } from "../src/models/subscription.model.js";

const TEST_DB_NAME = `videotube_dashboard_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("Dashboard Stats", () => {
  let user, cookies, video1, video2;

  beforeAll(async () => {
    await startTestServer(TEST_DB_NAME);
  });

  afterAll(async () => {
    await dropDatabase();
    await stopTestServer();
  });

  beforeEach(async () => {
    await clearDatabase();
    
    user = await createTestUser();
    const { cookies: c } = await loginTestUser({ email: user.email, password: "Test@1234" });
    cookies = c;
    
    video1 = await createTestVideo(user._id, { views: 100, title: "Video 1" });
    video2 = await createTestVideo(user._id, { views: 200, title: "Video 2" });
    
    await Like.create({ video: video1._id, likedBy: user._id });
    await Comment.create({ content: "Comment 1", video: video1._id, owner: user._id });
    await Comment.create({ content: "Comment 2", video: video1._id, owner: user._id });
    await Comment.create({ content: "Comment 3", video: video2._id, owner: user._id });
  });

  describe("GET /api/v1/dashboard/stats", () => {
    it("should return channel stats", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", cookies.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data).toHaveProperty("totalVideos", 2);
      expect(res.body.data).toHaveProperty("totalViews", 300);
      expect(res.body.data).toHaveProperty("totalLikes", 1);
      expect(res.body.data).toHaveProperty("totalComments", 3);
      expect(res.body.data).toHaveProperty("publishedVideos", 2);
      expect(res.body.data).toHaveProperty("avgViews", 150);
    });

    it("should require authentication", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/stats");

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/dashboard/videos", () => {
    it("should return paginated videos with stats", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/videos")
        .set("Cookie", cookies.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data.docs.length).toBe(2);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.docs[0]).toHaveProperty("views");
      expect(res.body.data.docs[0]).toHaveProperty("likesCount");
      expect(res.body.data.docs[0]).toHaveProperty("commentsCount");
    });

    it("should support pagination", async () => {
      for (let i = 0; i < 5; i++) {
        await createTestVideo(user._id, { title: `Extra ${i}` });
      }

      const res = await request(app)
        .get("/api/v1/dashboard/videos?page=1&limit=3")
        .set("Cookie", cookies.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data.docs.length).toBe(3);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(3);
      expect(res.body.data.total).toBe(7);
    });
  });

  describe("GET /api/v1/dashboard/analytics", () => {
    it("should return views analytics", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/analytics?period=7d")
        .set("Cookie", cookies.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data).toHaveProperty("viewsOverTime");
      expect(Array.isArray(res.body.data.viewsOverTime)).toBe(true);
    });
  });
});