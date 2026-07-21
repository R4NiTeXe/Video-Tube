import { describe, it, beforeAll, afterAll, beforeEach, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app.js";
import { startTestServer, stopTestServer, clearDatabase, dropDatabase, createTestUser, loginTestUser, createTestVideo, getAuthHeaders, expectSuccess, expectError } from "./testUtils.js";
import { Like } from "../src/models/like.model.js";
import { Video } from "../src/models/video.model.js";
import { Comment } from "../src/models/comment.model.js";

const TEST_DB_NAME = `videotube_like_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("Like System", () => {
  let user1, user2, video, cookies1, cookies2;

  beforeAll(async () => {
    await startTestServer(TEST_DB_NAME);
  });

  afterAll(async () => {
    await dropDatabase();
    await stopTestServer();
  });

  beforeEach(async () => {
    await clearDatabase();
    
    user1 = await createTestUser();
    user2 = await createTestUser();
    
    const { cookies: c1 } = await loginTestUser({ email: user1.email, password: "Test@1234" });
    const { cookies: c2 } = await loginTestUser({ email: user2.email, password: "Test@1234" });
    
    video = await createTestVideo(user1._id);
    
    cookies1 = c1;
    cookies2 = c2;
  });

  describe("POST /api/v1/likes/toggle/v/:videoId", () => {
    it("should like a video", async () => {
      const res = await request(app)
        .post(`/api/v1/likes/toggle/v/${video._id}`)
        .set("Cookie", cookies1.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data).toHaveProperty("isLiked", true);
      expect(res.body.data.likesCount).toBe(1);
    });

    it("should unlike a video", async () => {
      await request(app)
        .post(`/api/v1/likes/toggle/v/${video._id}`)
        .set("Cookie", cookies1.join("; "));

      const res = await request(app)
        .post(`/api/v1/likes/toggle/v/${video._id}`)
        .set("Cookie", cookies1.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data).toHaveProperty("isLiked", false);
      expect(res.body.data.likesCount).toBe(0);
    });

    it("should increment likesCount atomically under concurrent likes", async () => {
      const numUsers = 10;
      const users = [];
      
      for (let i = 0; i < numUsers; i++) {
        const u = await createTestUser({ username: `concurrent${i}`, email: `concurrent${i}@example.com` });
        const { cookies } = await loginTestUser({ email: u.email, password: "Test@1234" });
        users.push({ user: u, cookies });
      }

      const promises = users.map(({ cookies }) =>
        request(app)
          .post(`/api/v1/likes/toggle/v/${video._id}`)
          .set("Cookie", cookies.join("; "))
      );

      await Promise.all(promises);

      const videoDoc = await Video.findById(video._id);
      expect(videoDoc.likesCount).toBe(numUsers);

      const likeCount = await Like.countDocuments({ video: video._id });
      expect(likeCount).toBe(numUsers);
    });

    it("should not allow duplicate likes from same user", async () => {
      await request(app)
        .post(`/api/v1/likes/toggle/v/${video._id}`)
        .set("Cookie", cookies1.join("; "));

      const res = await request(app)
        .post(`/api/v1/likes/toggle/v/${video._id}`)
        .set("Cookie", cookies1.join("; "));

      expect(res.body.data.isLiked).toBe(false);
      expect(res.body.data.likesCount).toBe(0);
    });
  });

  describe("POST /api/v1/likes/toggle/c/:commentId", () => {
    it("should like and unlike a comment", async () => {
      const { Comment } = await import("../src/models/comment.model.js");
      const comment = await Comment.create({
        content: "Test comment",
        video: video._id,
        owner: user1._id,
      });

      const res = await request(app)
        .post(`/api/v1/likes/toggle/c/${comment._id}`)
        .set("Cookie", cookies2.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data.isLiked).toBe(true);

      const unlikeRes = await request(app)
        .post(`/api/v1/likes/toggle/c/${comment._id}`)
        .set("Cookie", cookies2.join("; "));

      expectSuccess(unlikeRes, 200);
      expect(unlikeRes.body.data.isLiked).toBe(false);
    });
  });
});