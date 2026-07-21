import { describe, it, beforeAll, afterAll, beforeEach, expect } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../src/app.js";
import { startTestServer, stopTestServer, clearDatabase, dropDatabase, createTestUser, loginTestUser, createTestVideo, getAuthHeaders, expectSuccess, expectError } from "./testUtils.js";
import { Video } from "../src/models/video.model.js";
import { User } from "../src/models/user.model.js";

const TEST_DB_NAME = `videotube_video_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("Video CRUD & View Count", () => {
  let user, cookies, userId;

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
    const login = await loginTestUser({ email: user.email, password: "Test@1234" });
    cookies = login.cookies;
    userId = user._id.toString();
  });

  describe("POST /api/v1/videos - Upload Video", () => {
    it("should create video with valid data", async () => {
      const res = await request(app)
        .post("/api/v1/videos")
        .set("Cookie", cookies.join("; "))
        .field("title", "My Test Video")
        .field("description", "Video description")
        .field("category", "Education")
        .field("tags", "test,video")
        .attach("videoFile", Buffer.from("fake video content"), "test.mp4")
        .attach("thumbnail", Buffer.from("fake image content"), "thumb.jpg");

      expectSuccess(res, 201);
      expect(res.body.data).toHaveProperty("title", "My Test Video");
    });

    it("should reject video without title", async () => {
      const res = await request(app)
        .post("/api/v1/videos")
        .set("Cookie", cookies.join("; "))
        .field("description", "No title")
        .attach("videoFile", Buffer.from("fake"), "test.mp4");

      expectError(res, 400);
    });
  });

  describe("GET /api/v1/videos/:videoId - Get Video by ID", () => {
    let video;

    beforeEach(async () => {
      video = await createTestVideo(userId, { title: "Existing Video", views: 10 });
    });

    it("should return video with all fields", async () => {
      const res = await request(app)
        .get(`/api/v1/videos/${video._id}`)
        .set("Cookie", cookies.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data).toHaveProperty("title", "Existing Video");
      expect(res.body.data).toHaveProperty("views", 10);
    });

    it("should increment view count on first watch (not owner)", async () => {
      const otherUser = await createTestUser({ username: "viewer", email: "viewer@example.com" });
      const login = await loginTestUser({ email: "viewer@example.com", password: "Test@1234" });
      
      const res = await request(app)
        .get(`/api/v1/videos/${video._id}`)
        .set("Cookie", login.cookies.join("; "));

      expectSuccess(res, 200);

      const updatedVideo = await Video.findById(video._id);
      expect(updatedVideo.views).toBe(11);
    });

    it("should NOT increment view count for owner", async () => {
      const res = await request(app)
        .get(`/api/v1/videos/${video._id}`)
        .set("Cookie", cookies.join("; "));

      expectSuccess(res, 200);

      const updatedVideo = await Video.findById(video._id);
      expect(updatedVideo.views).toBe(10);
    });

    it("should NOT increment view count on repeat watch", async () => {
      const otherUser = await createTestUser({ username: "viewer2", email: "viewer2@example.com" });
      const login = await loginTestUser({ email: "viewer2@example.com", password: "Test@1234" });
      
      await request(app)
        .get(`/api/v1/videos/${video._id}`)
        .set("Cookie", login.cookies.join("; "));

      const res = await request(app)
        .get(`/api/v1/videos/${video._id}`)
        .set("Cookie", login.cookies.join("; "));

      expectSuccess(res, 200);

      const updatedVideo = await Video.findById(video._id);
      expect(updatedVideo.views).toBe(11);
    });

    it("should return 404 for non-existent video", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/videos/${fakeId}`)
        .set("Cookie", cookies.join("; "));

      expectError(res, 404);
    });
  });

  describe("GET /api/v1/videos - Get All Videos", () => {
    beforeEach(async () => {
      await createTestVideo(userId, { title: "Video 1", category: "Education" });
      await createTestVideo(userId, { title: "Video 2", category: "Entertainment" });
      await createTestVideo(userId, { title: "Video 3", category: "Education", isPublished: false });
    });

    it("should return paginated published videos", async () => {
      const res = await request(app)
        .get("/api/v1/videos")
        .set("Cookie", cookies.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data.docs.length).toBe(2);
      expect(res.body.data.docs.every(v => v.isPublished)).toBe(true);
    });

    it("should filter by category", async () => {
      const res = await request(app)
        .get("/api/v1/videos?category=Education")
        .set("Cookie", cookies.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data.docs.length).toBe(1);
      expect(res.body.data.docs[0].category).toBe("Education");
    });

    it("should sort by views desc", async () => {
      await createTestVideo(userId, { title: "Popular", views: 1000 });
      
      const res = await request(app)
        .get("/api/v1/videos?sortBy=views&sortType=desc")
        .set("Cookie", cookies.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data.docs[0].title).toBe("Popular");
    });
  });

  describe("PATCH /api/v1/videos/:videoId - Update Video", () => {
    let video;

    beforeEach(async () => {
      video = await createTestVideo(userId, { title: "Original Title" });
    });

    it("should update video title", async () => {
      const res = await request(app)
        .patch(`/api/v1/videos/${video._id}`)
        .set("Cookie", cookies.join("; "))
        .send({ title: "Updated Title" });

      expectSuccess(res, 200);
      expect(res.body.data.title).toBe("Updated Title");
    });

    it("should reject update by non-owner", async () => {
      const otherUser = await createTestUser({ username: "other", email: "other@example.com" });
      const login = await loginTestUser({ email: "other@example.com", password: "Test@1234" });

      const res = await request(app)
        .patch(`/api/v1/videos/${video._id}`)
        .set("Cookie", login.cookies.join("; "))
        .send({ title: "Hacked Title" });

      expectError(res, 403);
    });
  });

  describe("DELETE /api/v1/videos/:videoId - Delete Video", () => {
    it("should delete own video", async () => {
      const video = await createTestVideo(userId, { title: "To Delete" });
      
      const res = await request(app)
        .delete(`/api/v1/videos/${video._id}`)
        .set("Cookie", cookies.join("; "));

      expectSuccess(res, 200);
      
      const deleted = await Video.findById(video._id);
      expect(deleted).toBeNull();
    });
  });
});