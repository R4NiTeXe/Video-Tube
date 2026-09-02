import { describe, it, beforeAll, afterAll, beforeEach, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app.js";
import {
  startTestServer,
  stopTestServer,
  clearDatabase,
  dropDatabase,
  createTestUser,
  createTestVideo,
} from "./testUtils.js";
import { Video } from "../src/models/video.model.js";

const TEST_DB_NAME = `videotube_webhook_regex_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const SECRET = "test-webhook-secret-32chars-long-regex";

describe("Cloudinary webhook regex safety", () => {
  let userId;

  beforeAll(async () => {
    await startTestServer(TEST_DB_NAME);
    process.env.WEBHOOK_SECRET = SECRET;
    const user = await createTestUser();
    userId = user._id.toString();
  });

  afterAll(async () => {
    delete process.env.WEBHOOK_SECRET;
    await dropDatabase();
    await stopTestServer();
  });

  beforeEach(async () => {
    await clearDatabase();
    const user = await createTestUser({ username: `u_${Date.now()}`, email: `u_${Date.now()}@example.com` });
    userId = user._id.toString();
  });

  it("normal public_id updates correct video", async () => {
    const video = await createTestVideo(userId, {
      title: "Normal",
      videoFile: "https://res.cloudinary.com/test/video/upload/v1/my_public_id.mp4",
      cloudinaryPublicId: "my_public_id",
      transcodingStatus: "processing",
    });
    const res = await request(app)
      .post(`/api/v1/webhooks/cloudinary?token=${SECRET}`)
      .send({ notification_type: "eager", public_id: "my_public_id" });
    expect(res.status).toBe(200);
    const after = await Video.findById(video._id).lean();
    expect(after.transcodingStatus).toBe("completed");
  });

  it(".* does not update arbitrary video", async () => {
    const v1 = await createTestVideo(userId, {
      title: "V1",
      videoFile: "https://res.cloudinary.com/test/video/upload/v1/abc123.mp4",
      cloudinaryPublicId: "abc123",
      transcodingStatus: "processing",
    });
    const v2 = await createTestVideo(userId, {
      title: "V2",
      videoFile: "https://res.cloudinary.com/test/video/upload/v1/xyz789.mp4",
      cloudinaryPublicId: "xyz789",
      transcodingStatus: "processing",
    });
    const res = await request(app)
      .post(`/api/v1/webhooks/cloudinary?token=${SECRET}`)
      .send({ notification_type: "eager", public_id: ".*" });
    expect(res.status).toBe(200);
    const after1 = await Video.findById(v1._id).lean();
    const after2 = await Video.findById(v2._id).lean();
    expect(after1.transcodingStatus).toBe("processing");
    expect(after2.transcodingStatus).toBe("processing");
  });

  it("regex metacharacters are treated literally", async () => {
    const video = await createTestVideo(userId, {
      title: "Meta",
      videoFile: "https://res.cloudinary.com/test/video/upload/v1/abc[123].mp4",
      cloudinaryPublicId: "abc[123]",
      transcodingStatus: "processing",
    });
    // Try to send public_id with regex that would match if not escaped: abc[123] as character class would match abc1 etc.
    const res = await request(app)
      .post(`/api/v1/webhooks/cloudinary?token=${SECRET}`)
      .send({ notification_type: "eager", public_id: "abc[123]" });
    expect(res.status).toBe(200);
    const after = await Video.findById(video._id).lean();
    expect(after.transcodingStatus).toBe("completed");

    // Now try a different video that would be incorrectly matched by unescaped regex: abc1 should not match abc[123] if escaped correctly
    const video2 = await createTestVideo(userId, {
      title: "Other",
      videoFile: "https://res.cloudinary.com/test/video/upload/v1/abc1.mp4",
      cloudinaryPublicId: "abc1",
      transcodingStatus: "processing",
    });
    const res2 = await request(app)
      .post(`/api/v1/webhooks/cloudinary?token=${SECRET}`)
      .send({ notification_type: "eager", public_id: "abc[123]" });
    expect(res2.status).toBe(200);
    const after2 = await Video.findById(video2._id).lean();
    // Should remain processing because public_id "abc[123]" escaped should not match "abc1"
    expect(after2.transcodingStatus).toBe("processing");
  });

  it("duplicate webhook remains idempotent", async () => {
    const video = await createTestVideo(userId, {
      title: "Dup",
      videoFile: "https://res.cloudinary.com/test/video/upload/v1/dup_id.mp4",
      cloudinaryPublicId: "dup_id",
      transcodingStatus: "processing",
    });
    const payload = { notification_type: "eager", public_id: "dup_id" };
    const res1 = await request(app).post(`/api/v1/webhooks/cloudinary?token=${SECRET}`).send(payload);
    expect(res1.status).toBe(200);
    const after1 = await Video.findById(video._id).lean();
    expect(after1.transcodingStatus).toBe("completed");
    const res2 = await request(app).post(`/api/v1/webhooks/cloudinary?token=${SECRET}`).send(payload);
    expect(res2.status).toBe(200);
    const after2 = await Video.findById(video._id).lean();
    expect(after2.transcodingStatus).toBe("completed");
  });

  it("webhook does not overwrite completed video", async () => {
    const video = await createTestVideo(userId, {
      title: "Completed",
      cloudinaryPublicId: "completed_id",
      videoFile: "https://res.cloudinary.com/test/video/upload/v1/completed_id.mp4",
      transcodingStatus: "completed",
      hlsUrl: "https://example.com/orig.m3u8",
    });
    const res = await request(app)
      .post(`/api/v1/webhooks/cloudinary?token=${SECRET}`)
      .send({ notification_type: "eager_failed", public_id: "completed_id", error: { message: "failed" } });
    expect(res.status).toBe(200);
    const after = await Video.findById(video._id).lean();
    expect(after.transcodingStatus).toBe("completed");
    expect(after.hlsUrl).toBe("https://example.com/orig.m3u8");
  });
});
