import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect, jest } from "@jest/globals";
import request from "supertest";
import crypto from "crypto";
import { app } from "../src/app.js";
import {
  startTestServer,
  stopTestServer,
  clearDatabase,
  dropDatabase,
  createTestUser,
  loginTestUser,
} from "./testUtils.js";
import { Video } from "../src/models/video.model.js";
import { __testSetMockClient, __testSetRedisAvailable } from "../src/utils/redis.js";

const TEST_DB_NAME = `videotube_fix_val_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const uuid = () => crypto.randomUUID();

describe("Post-Fix Validation — Idempotency + Lock + Index", () => {
  let user, cookies, userId;
  let mockStore;
  let mockClient;

  beforeAll(async () => {
    await startTestServer(TEST_DB_NAME);
  });

  afterAll(async () => {
    await dropDatabase();
    await stopTestServer();
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    await clearDatabase();
    user = await createTestUser();
    const login = await loginTestUser({ email: user.email, password: "Test@1234" });
    cookies = login.cookies;
    userId = user._id.toString();

    // Setup in-memory Redis mock
    mockStore = new Map();
    mockClient = {
      get: jest.fn(async (key) => {
        const entry = mockStore.get(key);
        if (!entry) return null;
        if (typeof entry === "string") return entry;
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          mockStore.delete(key);
          return null;
        }
        return entry.token || entry;
      }),
      set: jest.fn(async (key, value, nx, ex, ttl) => {
        if (nx === "NX") {
          const existing = mockStore.get(key);
          if (existing) {
            if (typeof existing === "string") {
              try {
                const parsed = JSON.parse(existing);
                if (parsed && parsed.status) {
                  return null;
                }
              } catch (_e) {
                void _e;
              }
              return null;
            }
            if (existing.expiresAt && Date.now() > existing.expiresAt) {
              mockStore.delete(key);
            } else if (mockStore.has(key)) {
              return null;
            }
          }
        }
        if (key.startsWith("lock:")) {
          mockStore.set(key, { token: value, expiresAt: Date.now() + ttl * 1000 });
        } else {
          mockStore.set(key, value);
        }
        return "OK";
      }),
      setex: jest.fn(async (key, ttl, value) => {
        mockStore.set(key, value);
        return "OK";
      }),
      eval: jest.fn(async (script, numKeys, key, token) => {
        const entry = mockStore.get(key);
        let current = null;
        if (entry) {
          if (typeof entry === "string") {
            try {
              const parsed = JSON.parse(entry);
              current = parsed.token || parsed;
            } catch (_e) {
              void _e;
              current = entry;
            }
          } else {
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
              mockStore.delete(key);
              current = null;
            } else {
              current = entry.token;
            }
          }
        }
        if (current === token) {
          mockStore.delete(key);
          return 1;
        }
        return 0;
      }),
      del: jest.fn(async (key) => {
        return mockStore.delete(key) ? 1 : 0;
      }),
    };

    __testSetMockClient(mockClient);
    __testSetRedisAvailable(true);
  });

  afterEach(async () => {
    __testSetMockClient(null);
    __testSetRedisAvailable(false);
    mockStore.clear();
  });

  const uploadVideo = (cookiesToUse, fields, opts = {}) => {
    const req = request(app).post("/api/v1/videos").set("Cookie", cookiesToUse.join("; "));
    if (opts.idempotencyKey) req.set("Idempotency-Key", opts.idempotencyKey);
    for (const [k, v] of Object.entries(fields)) {
      if (k === "videoFile" || k === "thumbnail" || k === "videoFileContent" || k === "thumbnailContent") continue;
      req.field(k, v);
    }
    req.attach("videoFile", Buffer.from(fields.videoFileContent || "fake video content"), fields.videoFile || "test.mp4");
    req.attach("thumbnail", Buffer.from(fields.thumbnailContent || "fake image content"), fields.thumbnail || "thumb.jpg");
    return req;
  };

  it("A1: Redis pending + DB exists + matching fingerprint → 201 fresh replay (not 409)", async () => {
    const key = uuid();
    const fields = {
      title: "A1 Video",
      description: "desc",
      category: "Education",
      videoFile: "test.mp4",
      videoFileContent: "content A1",
      thumbnail: "thumb.jpg",
      thumbnailContent: "thumb A1",
    };
    // First upload creates DB doc and Redis completed
    const res1 = await uploadVideo(cookies, fields, { idempotencyKey: key });
    expect(res1.status).toBe(201);
    const videoId = res1.body.data._id;

    // Simulate crash: overwrite Redis completed with pending (same fingerprint) with fresh timestamp
    const redisKey = `idem:upload:${userId}:${key}`;
    const completedStr = mockStore.get(redisKey);
    const completed = JSON.parse(completedStr);
    const pending = { status: "pending", fingerprint: completed.fingerprint, createdAt: Date.now() - 5000 };
    mockStore.set(redisKey, JSON.stringify(pending));

    // Retry same payload — should detect DB exists and replay 201, not 409
    const res2 = await uploadVideo(cookies, fields, { idempotencyKey: key });
    expect(res2.status).toBe(201);
    expect(res2.body.data._id).toBe(videoId);
    expect(res2.body.data.title).toBe("A1 Video");
  });

  it("A1: Redis pending + no DB + age <30s → 409", async () => {
    const key = uuid();
    const redisKey = `idem:upload:${userId}:${key}`;
    const fakeFingerprint = crypto.createHash("sha256").update("test").digest("hex");
    // Create pending with no DB doc, fresh
    const pending = { status: "pending", fingerprint: fakeFingerprint, createdAt: Date.now() - 5000 };
    mockStore.set(redisKey, JSON.stringify(pending));

    // Compute fingerprint for our request to match the pending's fingerprint
    // Instead, we make request and let middleware compute fingerprint, but we set pending fingerprint to what request will compute
    // To ensure match, we first compute expected fingerprint by making a dummy request and capturing?
    // Simpler: set pending fingerprint to unknown, then request will have different fingerprint → 422, not 409
    // So we need to know request fingerprint. We'll instead test 409 via actual concurrent pending: make first request pending and second immediate retry
    // Alternative: directly test via API with same key but no DB and fresh pending should be 409 when second request arrives while first is pending
    // Simulate by setting pending with no DB and then making request with same payload that will compute same fingerprint as pending
    // We need to set pending fingerprint to the fingerprint that the next request will compute.
    // Let's compute it by replicating middleware logic for this payload
    const fields = { title: "Pending409", description: "desc", category: "Education", videoFile: "test.mp4", videoFileContent: "pending409", thumbnail: "thumb.jpg", thumbnailContent: "thumb409" };
    // Compute expected fingerprint using same logic as middleware
    const title = fields.title, desc = fields.description, cat = fields.category;
    const videoSize = Buffer.from(fields.videoFileContent).length;
    const thumbSize = Buffer.from(fields.thumbnailContent).length;
    const videoMeta = `${fields.videoFile}:${videoSize}:video/mp4`;
    const thumbMeta = `${fields.thumbnail}:${thumbSize}:image/jpeg`;
    const videoHash = crypto.createHash("sha256").update(Buffer.from(fields.videoFileContent)).digest("hex").slice(0,16);
    const thumbHash = crypto.createHash("sha256").update(Buffer.from(fields.thumbnailContent)).digest("hex").slice(0,16);
    const payload = `${title}|${desc}|${cat}||||${videoMeta}:${videoHash}|${thumbMeta}:${thumbHash}`;
    const expectedFp = crypto.createHash("sha256").update(payload).digest("hex");

    const pending2 = { status: "pending", fingerprint: expectedFp, createdAt: Date.now() - 5000 };
    mockStore.set(redisKey, JSON.stringify(pending2));

    const res = await uploadVideo(cookies, fields, { idempotencyKey: key });
    expect(res.status).toBe(409);
  });

  it("A1: Redis pending + no DB + age >=30s → cleared and upload proceeds", async () => {
    const key = uuid();
    const redisKey = `idem:upload:${userId}:${key}`;
    const fakeFp = "old-fingerprint";
    const pending = { status: "pending", fingerprint: fakeFp, createdAt: Date.now() - 31 * 1000 };
    mockStore.set(redisKey, JSON.stringify(pending));

    const fields = { title: "StalePending", description: "desc", category: "Education", videoFile: "test.mp4", thumbnail: "thumb.jpg" };
    const res = await uploadVideo(cookies, fields, { idempotencyKey: key });
    // Should not be 409, should be 201 (pending was stale and cleared)
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("StalePending");
  });

  it("A2: Redis completed + DB updated after cache → replay contains latest hlsUrl", async () => {
    const key = uuid();
    const fields = { title: "A2 Video", description: "desc", category: "Education", videoFile: "test.mp4", thumbnail: "thumb.jpg" };
    const res1 = await uploadVideo(cookies, fields, { idempotencyKey: key });
    expect(res1.status).toBe(201);
    const videoId = res1.body.data._id;

    // Update DB directly to simulate transcoding completed
    await Video.findByIdAndUpdate(videoId, { $set: { hlsUrl: "https://example.com/new.m3u8", transcodingStatus: "completed" } });

    // Retry same key — should return fresh DB doc with new hlsUrl, not stale cached body
    const res2 = await uploadVideo(cookies, fields, { idempotencyKey: key });
    expect(res2.status).toBe(201);
    expect(res2.body.data._id).toBe(videoId);
    expect(res2.body.data.hlsUrl).toBe("https://example.com/new.m3u8");
  });

  it("A2: Redis completed + missing DB → cache invalidated and request handled", async () => {
    const key = uuid();
    const fields = { title: "OrphanCache", description: "desc", category: "Education", videoFile: "test.mp4", thumbnail: "thumb.jpg" };
    const res1 = await uploadVideo(cookies, fields, { idempotencyKey: key });
    expect(res1.status).toBe(201);
    const videoId = res1.body.data._id;

    // Delete DB doc but keep Redis completed
    await Video.findByIdAndDelete(videoId);
    expect(await Video.findById(videoId)).toBeNull();
    // Redis still has completed
    const redisKey = `idem:upload:${userId}:${key}`;
    expect(mockStore.has(redisKey)).toBe(true);

    // Retry same key — should invalidate cache and create new video
    const res2 = await uploadVideo(cookies, fields, { idempotencyKey: key });
    expect(res2.status).toBe(201);
    expect(res2.body.data._id).not.toBe(videoId);
    expect(await Video.countDocuments({ owner: userId, idempotencyKey: key })).toBe(1);
  });

  it("A3: lock token ownership — A expires, B acquires, A release cannot delete B", async () => {
    const { acquireLock } = await import("../src/utils/redis.js");
    const releaseA = await acquireLock("test:ownership-fix", 1);
    expect(releaseA).not.toBeNull();
    const tokenA = releaseA.token;
    // Simulate expiry
    const entry = mockStore.get("lock:test:ownership-fix");
    if (entry) entry.expiresAt = Date.now() - 1000;

    const releaseB = await acquireLock("test:ownership-fix", 10);
    expect(releaseB).not.toBeNull();
    expect(releaseB.token).not.toBe(tokenA);

    const resA = await releaseA();
    expect(resA).toBe(0);
    expect(mockStore.has("lock:test:ownership-fix")).toBe(true);

    const resB = await releaseB();
    expect(resB).toBe(1);
    expect(mockStore.has("lock:test:ownership-fix")).toBe(false);

    // Direct release without token should fail safely
    const releaseC = await acquireLock("test:no-token", 10);
    expect(releaseC).not.toBeNull();
    const { releaseLock } = await import("../src/utils/redis.js");
    const noTokenRes = await releaseLock("test:no-token");
    expect(noTokenRes).toBe(0);
    expect(mockStore.has("lock:test:no-token")).toBe(true);
    await releaseC(); // clean up with correct token
  });
});
