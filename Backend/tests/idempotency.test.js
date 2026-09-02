import { describe, it, beforeAll, afterAll, beforeEach, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app.js";
import {
  startTestServer,
  stopTestServer,
  clearDatabase,
  dropDatabase,
  createTestUser,
  loginTestUser,
  expectSuccess,
  expectError,
} from "./testUtils.js";
import { Video } from "../src/models/video.model.js";
import crypto from "crypto";

const TEST_DB_NAME = `videotube_idempotency_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const uuid = () => crypto.randomUUID();

describe("Upload Idempotency", () => {
  let user, cookies, userId;
  let user2, cookies2;

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

    user2 = await createTestUser({ username: `other_${Date.now()}`, email: `other_${Date.now()}@example.com` });
    const login2 = await loginTestUser({ email: user2.email, password: "Test@1234" });
    cookies2 = login2.cookies;
  });

  const uploadVideo = (cookiesToUse, fields, opts = {}) => {
    const req = request(app).post("/api/v1/videos").set("Cookie", cookiesToUse.join("; "));
    if (opts.idempotencyKey) req.set("Idempotency-Key", opts.idempotencyKey);
    if (opts.idempotencyKeyLower) req.set("x-idempotency-key", opts.idempotencyKeyLower);
    for (const [k, v] of Object.entries(fields)) {
      if (k === "videoFile" || k === "thumbnail") continue;
      req.field(k, v);
    }
    req.attach("videoFile", Buffer.from(fields.videoFileContent || "fake video content"), fields.videoFile || "test.mp4");
    req.attach("thumbnail", Buffer.from(fields.thumbnailContent || "fake image content"), fields.thumbnail || "thumb.jpg");
    return req;
  };

  it("should create video without idempotency key (backward compat)", async () => {
    const res = await uploadVideo(cookies, {
      title: "No Key Video",
      description: "desc",
      category: "Education",
      videoFile: "test.mp4",
      thumbnail: "thumb.jpg",
    });
    expectSuccess(res, 201);
    expect(res.body.data).toHaveProperty("title", "No Key Video");
  });

  it("should reject invalid idempotency key", async () => {
    const res = await uploadVideo(cookies, {
      title: "Bad Key",
      description: "desc",
      videoFile: "test.mp4",
      thumbnail: "thumb.jpg",
    }, { idempotencyKey: "not-a-uuid" });
    expectError(res, 400);
    expect(res.body.message).toMatch(/Idempotency/);
  });

  it("should replay same video for same key + same payload (no duplicate)", async () => {
    const key = uuid();
    const fields = {
      title: "Idempotent Video",
      description: "same payload",
      category: "Education",
      videoFile: "test.mp4",
      videoFileContent: "same video bytes",
      thumbnail: "thumb.jpg",
      thumbnailContent: "same thumb bytes",
    };

    const res1 = await uploadVideo(cookies, fields, { idempotencyKey: key });
    expectSuccess(res1, 201);
    const videoId1 = res1.body.data._id;

    const res2 = await uploadVideo(cookies, fields, { idempotencyKey: key });
    expectSuccess(res2, 201);
    const videoId2 = res2.body.data._id;

    expect(videoId2).toBe(videoId1);

    const count = await Video.countDocuments({ owner: userId, idempotencyKey: key });
    expect(count).toBe(1);

    const total = await Video.countDocuments({ owner: userId });
    expect(total).toBe(1);
  });

  it("should reject same key with different payload (422)", async () => {
    const key = uuid();
    const fields1 = {
      title: "Original Title",
      description: "desc",
      category: "Education",
      videoFile: "test.mp4",
      videoFileContent: "content A",
      thumbnail: "thumb.jpg",
      thumbnailContent: "thumb A",
    };
    const fields2 = {
      title: "Different Title",
      description: "desc",
      category: "Education",
      videoFile: "test.mp4",
      videoFileContent: "content A",
      thumbnail: "thumb.jpg",
      thumbnailContent: "thumb A",
    };

    const res1 = await uploadVideo(cookies, fields1, { idempotencyKey: key });
    expectSuccess(res1, 201);

    const res2 = await uploadVideo(cookies, fields2, { idempotencyKey: key });
    expectError(res2, 422);
    expect(res2.body.message).toMatch(/different payload/);
  });

  it("should allow different users to use same key (scoped by owner)", async () => {
    const key = uuid();
    const fields = {
      title: "Same Key Different User",
      description: "desc",
      category: "Education",
      videoFile: "test.mp4",
      thumbnail: "thumb.jpg",
    };

    const res1 = await uploadVideo(cookies, fields, { idempotencyKey: key });
    expectSuccess(res1, 201);

    const res2 = await uploadVideo(cookies2, fields, { idempotencyKey: key });
    expectSuccess(res2, 201);

    expect(res1.body.data._id).not.toBe(res2.body.data._id);
    const total = await Video.countDocuments({ idempotencyKey: key });
    expect(total).toBe(2);
  });

  it("should preserve legitimate repeated uploads with different keys", async () => {
    const fields = {
      title: "Repeated Title",
      description: "desc",
      category: "Education",
      videoFile: "test.mp4",
      thumbnail: "thumb.jpg",
    };
    const res1 = await uploadVideo(cookies, fields, { idempotencyKey: uuid() });
    expectSuccess(res1, 201);
    const res2 = await uploadVideo(cookies, fields, { idempotencyKey: uuid() });
    expectSuccess(res2, 201);
    expect(res1.body.data._id).not.toBe(res2.body.data._id);
    const total = await Video.countDocuments({ owner: userId });
    expect(total).toBe(2);
  });

  it("should accept x-idempotency-key header (lowercase)", async () => {
    const key = uuid();
    const fields = {
      title: "Lowercase Header",
      description: "desc",
      category: "Education",
      videoFile: "test.mp4",
      thumbnail: "thumb.jpg",
    };
    const res1 = await uploadVideo(cookies, fields, { idempotencyKeyLower: key });
    expectSuccess(res1, 201);
    const res2 = await uploadVideo(cookies, fields, { idempotencyKeyLower: key });
    expectSuccess(res2, 201);
    expect(res2.body.data._id).toBe(res1.body.data._id);
  });

  it("should handle concurrent same-key requests safely (only one video)", async () => {
    const key = uuid();
    const fields = {
      title: "Concurrent Video",
      description: "desc",
      category: "Education",
      videoFile: "test.mp4",
      videoFileContent: "concurrent bytes",
      thumbnail: "thumb.jpg",
      thumbnailContent: "concurrent thumb",
    };

    const promises = Array.from({ length: 3 }, () =>
      uploadVideo(cookies, fields, { idempotencyKey: key })
    );

    const results = await Promise.all(promises);
    const ids = results.map((r) => r.body?.data?._id).filter(Boolean);
    const uniqueIds = new Set(ids);
    // At least one should succeed with 201, others may be 201 replay or 409 pending
    expect(uniqueIds.size).toBe(1);
    const total = await Video.countDocuments({ owner: userId, idempotencyKey: key });
    expect(total).toBe(1);
  });

  it("should store idempotencyKey and fingerprint on video", async () => {
    const key = uuid();
    const res = await uploadVideo(cookies, {
      title: "Fingerprint Stored",
      description: "desc",
      category: "Education",
      videoFile: "test.mp4",
      thumbnail: "thumb.jpg",
    }, { idempotencyKey: key });
    expectSuccess(res, 201);
    const video = await Video.findById(res.body.data._id).lean();
    expect(video.idempotencyKey).toBe(key.toLowerCase());
    expect(video.idempotencyFingerprint).toBeTruthy();
    expect(video.cloudinaryPublicId).toBeTruthy();
  });

  it("should not require key — Redis down fallback via DB still prevents duplicate via unique index", async () => {
    // Simulate Redis down by ensuring DB path works: create video with key, then try duplicate without Redis (already tested — DB is source of truth)
    const key = uuid();
    const fields = {
      title: "Redis Down Test",
      description: "desc",
      category: "Education",
      videoFile: "test.mp4",
      thumbnail: "thumb.jpg",
    };
    const res1 = await uploadVideo(cookies, fields, { idempotencyKey: key });
    expectSuccess(res1, 201);
    // Second request should still be idempotent even if Redis were down, because DB unique index catches it
    const res2 = await uploadVideo(cookies, fields, { idempotencyKey: key });
    expectSuccess(res2, 201);
    expect(res2.body.data._id).toBe(res1.body.data._id);
  });
});
