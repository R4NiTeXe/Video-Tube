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
  createTestVideo,
} from "./testUtils.js";
import { Video } from "../src/models/video.model.js";
import { runReconcileTranscoding } from "../src/controllers/video/cron.controller.js";

const TEST_DB_NAME = `videotube_transcoding_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("Transcoding Recovery", () => {
  let user, userId;

  beforeAll(async () => {
    await startTestServer(TEST_DB_NAME);
    process.env.WEBHOOK_SECRET = "test-webhook-secret-32chars-long-secret";
  });

  afterAll(async () => {
    delete process.env.WEBHOOK_SECRET;
    await dropDatabase();
    await stopTestServer();
  });

  beforeEach(async () => {
    await clearDatabase();
    user = await createTestUser();
    await loginTestUser({ email: user.email, password: "Test@1234" });
    userId = user._id.toString();
  });

  it("should recover stale pending video", async () => {
    const tenMinsAgo = new Date(Date.now() - 11 * 60 * 1000);
    const video = await Video.create({
      title: "Stale Pending",
      description: "desc",
      videoFile: "https://res.cloudinary.com/test/video/upload/v123/test.mp4",
      thumbnail: "https://res.cloudinary.com/test/image/upload/v123/thumb.jpg",
      duration: 300,
      owner: userId,
      transcodingStatus: "pending",
      cloudinaryPublicId: "test",
      transcodingAttempts: 0,
      createdAt: tenMinsAgo,
      updatedAt: tenMinsAgo,
    });
    // Force old timestamps bypassing auto timestamps
    await Video.collection.updateOne({ _id: video._id }, { $set: { createdAt: tenMinsAgo, updatedAt: tenMinsAgo } });

    const before = await Video.findById(video._id).lean();
    expect(before.transcodingStatus).toBe("pending");

    await runReconcileTranscoding();

    const after = await Video.findById(video._id).lean();
    expect(after.transcodingStatus).toBe("completed");
    expect(after.transcodingAttempts).toBe(1);
    expect(after.hlsUrl).toBeTruthy();
    expect(after.qualities.length).toBeGreaterThan(0);
  });

  it("should recover stale processing video", async () => {
    const sixMinsAgo = new Date(Date.now() - 6 * 60 * 1000);
    const video = await createTestVideo(userId, {
      title: "Stale Processing",
      transcodingStatus: "processing",
      cloudinaryPublicId: "test",
      transcodingAttempts: 1,
      transcodingLastAttemptAt: sixMinsAgo,
    });
    await Video.collection.updateOne({ _id: video._id }, { $set: { updatedAt: sixMinsAgo } });

    await runReconcileTranscoding();

    const after = await Video.findById(video._id).lean();
    expect(after.transcodingStatus).toBe("completed");
    expect(after.transcodingAttempts).toBe(2);
  });

  it("should mark failed after max attempts", async () => {
    const sixMinsAgo = new Date(Date.now() - 6 * 60 * 1000);
    const video = await createTestVideo(userId, {
      title: "Exhausted",
      transcodingStatus: "processing",
      cloudinaryPublicId: null,
      videoFile: "https://invalid-url-without-public-id",
      transcodingAttempts: 2,
      transcodingLastAttemptAt: sixMinsAgo,
    });
    // Make publicId unparsable so reconciliation will fail to determine publicId
    await Video.collection.updateOne(
      { _id: video._id },
      { $set: { cloudinaryPublicId: null, videoFile: "not-a-url", updatedAt: sixMinsAgo, transcodingAttempts: 2 } }
    );

    await runReconcileTranscoding();

    const after = await Video.findById(video._id).lean();
    expect(after.transcodingStatus).toBe("failed");
    expect(after.transcodingAttempts).toBe(3);
  });

  it("should not touch fresh pending/processing (not stale)", async () => {
    const video = await createTestVideo(userId, {
      title: "Fresh Pending",
      transcodingStatus: "pending",
      transcodingAttempts: 0,
    });

    await runReconcileTranscoding();

    const after = await Video.findById(video._id).lean();
    expect(after.transcodingStatus).toBe("pending");
    expect(after.transcodingAttempts).toBe(0);
  });

  it("should not overwrite completed status via webhook", async () => {
    const video = await createTestVideo(userId, {
      title: "Completed Video",
      transcodingStatus: "completed",
      cloudinaryPublicId: "test_completed",
      hlsUrl: "https://example.com/completed.m3u8",
      videoFile: "https://res.cloudinary.com/test/video/upload/test_completed.mp4",
    });

    const res = await request(app)
      .post("/api/v1/webhooks/cloudinary?token=test-webhook-secret-32chars-long-secret")
      .send({ notification_type: "eager", public_id: "test_completed" });

    expect(res.status).toBe(200);
    const after = await Video.findById(video._id).lean();
    expect(after.transcodingStatus).toBe("completed");
    expect(after.hlsUrl).toBe("https://example.com/completed.m3u8");
  });

  it("should handle duplicate webhook delivery idempotently", async () => {
    const video = await createTestVideo(userId, {
      title: "Webhook Dup",
      transcodingStatus: "processing",
      cloudinaryPublicId: "dup_test",
      videoFile: "https://res.cloudinary.com/test/video/upload/dup_test.mp4",
    });

    const payload = { notification_type: "eager", public_id: "dup_test" };
    const res1 = await request(app)
      .post("/api/v1/webhooks/cloudinary?token=test-webhook-secret-32chars-long-secret")
      .send(payload);
    expect(res1.status).toBe(200);

    const after1 = await Video.findById(video._id).lean();
    expect(after1.transcodingStatus).toBe("completed");

    const res2 = await request(app)
      .post("/api/v1/webhooks/cloudinary?token=test-webhook-secret-32chars-long-secret")
      .send(payload);
    expect(res2.status).toBe(200);

    const after2 = await Video.findById(video._id).lean();
    expect(after2.transcodingStatus).toBe("completed");
  });

  it("should not overwrite completed with stale cron retry", async () => {
    const video = await createTestVideo(userId, {
      title: "Completed Protected",
      transcodingStatus: "completed",
      cloudinaryPublicId: "protected",
      hlsUrl: "https://example.com/orig.m3u8",
      transcodingAttempts: 1,
    });
    // Even if we try to reconcile, completed should be ignored (not in candidates)
    await runReconcileTranscoding();
    const after = await Video.findById(video._id).lean();
    expect(after.transcodingStatus).toBe("completed");
    expect(after.hlsUrl).toBe("https://example.com/orig.m3u8");
  });

  it("should respect bounded batch size (20)", async () => {
    const stale = new Date(Date.now() - 11 * 60 * 1000);
    const promises = [];
    for (let i = 0; i < 25; i++) {
      promises.push(
        Video.create({
          title: `Batch ${i}`,
          description: "desc",
          videoFile: "https://res.cloudinary.com/test/video/upload/v123/test.mp4",
          thumbnail: "https://res.cloudinary.com/test/image/upload/v123/thumb.jpg",
          duration: 100,
          owner: userId,
          transcodingStatus: "pending",
          cloudinaryPublicId: "test",
          transcodingAttempts: 0,
          createdAt: stale,
          updatedAt: stale,
        }).then((v) => Video.collection.updateOne({ _id: v._id }, { $set: { createdAt: stale, updatedAt: stale } }))
      );
    }
    await Promise.all(promises);

    const pendingBefore = await Video.countDocuments({ transcodingStatus: "pending" });
    expect(pendingBefore).toBe(25);

    await runReconcileTranscoding();

    const pendingAfter = await Video.countDocuments({ transcodingStatus: "pending" });
    const completedAfter = await Video.countDocuments({ transcodingStatus: "completed" });
    // First batch of 20 should be completed, 5 remain pending
    expect(completedAfter).toBe(20);
    expect(pendingAfter).toBe(5);
  });
});
