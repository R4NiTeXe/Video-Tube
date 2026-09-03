import { describe, it, beforeAll, afterAll, expect } from "@jest/globals";
import { startTestServer, stopTestServer, clearDatabase, dropDatabase } from "./testUtils.js";
import { Notification } from "../src/models/notification.model.js";
import { Session } from "../src/models/session.model.js";

const TEST_DB_NAME = `videotube_ttl_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("TTL Indexes", () => {
  beforeAll(async () => {
    await startTestServer(TEST_DB_NAME);
    await Notification.init();
    await Session.init();
  });

  afterAll(async () => {
    await dropDatabase();
    await stopTestServer();
  });

  it("Notification TTL index exists with 90-day expiration", async () => {
    const indexes = await Notification.collection.indexes();
    const ttlIndex = indexes.find(
      (idx) => idx.key.createdAt === 1 && idx.expireAfterSeconds === 7776000
    );
    expect(ttlIndex).toBeDefined();
    expect(ttlIndex.expireAfterSeconds).toBe(7776000);
    // Preserve existing indexes
    const recipientIdx = indexes.find((idx) => idx.key.recipient === 1 && idx.key.createdAt === -1);
    expect(recipientIdx).toBeDefined();
  });

  it("Session TTL index exists with 30-day expiration on lastActiveAt", async () => {
    const indexes = await Session.collection.indexes();
    const ttlIndex = indexes.find(
      (idx) => idx.key.lastActiveAt === 1 && idx.expireAfterSeconds === 2592000
    );
    expect(ttlIndex).toBeDefined();
    expect(ttlIndex.expireAfterSeconds).toBe(2592000);
    // Preserve existing indexes
    const userIdx = indexes.find((idx) => idx.key.user === 1 && idx.key.isActive === 1);
    expect(userIdx).toBeDefined();
  });

  it("active session with recent lastActiveAt remains findable", async () => {
    await clearDatabase();
    const { createTestUser } = await import("./testUtils.js");
    const user = await createTestUser();
    const session = await Session.create({
      user: user._id,
      refreshToken: "test-refresh-token-active",
      lastActiveAt: new Date(),
      isActive: true,
    });
    const found = await Session.findOne({ _id: session._id, isActive: true }).lean();
    expect(found).not.toBeNull();
    expect(found.lastActiveAt).toBeDefined();
    // Ensure TTL would not immediately delete it (30 days > 0)
    expect(found.isActive).toBe(true);
  });
});
