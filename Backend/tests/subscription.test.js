import { describe, it, beforeAll, afterAll, beforeEach, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app.js";
import { startTestServer, stopTestServer, clearDatabase, dropDatabase, createTestUser, loginTestUser, createTestVideo, getAuthHeaders, expectSuccess, expectError } from "./testUtils.js";
import { Subscription } from "../src/models/subscription.model.js";
import { Notification } from "../src/models/notification.model.js";

const TEST_DB_NAME = `videotube_sub_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("Subscription System", () => {
  let user1, user2, cookies1, cookies2;

  beforeAll(async () => {
    await startTestServer(TEST_DB_NAME);
  });

  afterAll(async () => {
    await dropDatabase();
    await stopTestServer();
  });

  beforeEach(async () => {
    await clearDatabase();
    
    user1 = await createTestUser({ username: "subscriber", email: `sub_${Date.now()}@example.com` });
    user2 = await createTestUser({ username: "creator", email: `creator_${Date.now()}@example.com` });
    
    const { cookies: c1 } = await loginTestUser({ email: user1.email, password: "Test@1234" });
    const { cookies: c2 } = await loginTestUser({ email: user2.email, password: "Test@1234" });
    
    cookies1 = c1;
    cookies2 = c2;
  });

  describe("POST /api/v1/subscriptions/c/:channelId", () => {
    it("should subscribe to a channel", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/c/${user2._id}`)
        .set("Cookie", cookies1.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data).toHaveProperty("subscribed", true);
      expect(res.body.data.subscribersCount).toBe(1);
    });

    it("should unsubscribe from a channel", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/c/${user2._id}`)
        .set("Cookie", cookies1.join("; "));

      const res = await request(app)
        .post(`/api/v1/subscriptions/c/${user2._id}`)
        .set("Cookie", cookies1.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data).toHaveProperty("subscribed", false);
      expect(res.body.data.subscribersCount).toBe(0);
    });

    it("should prevent subscribing to self", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/c/${user1._id}`)
        .set("Cookie", cookies1.join("; "));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should create notification on subscribe", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/c/${user2._id}`)
        .set("Cookie", cookies1.join("; "));

      const notifications = await Notification.find({ recipient: user2._id, type: "subscribe" });
      expect(notifications.length).toBe(1);
      expect(notifications[0].sender.toString()).toBe(user1._id.toString());
    });
  });

  describe("GET /api/v1/subscriptions/u/:subscriberId", () => {
    it("should return channels user is subscribed to", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/c/${user2._id}`)
        .set("Cookie", cookies1.join("; "));

      const res = await request(app)
        .get(`/api/v1/subscriptions/u/${user1._id}`)
        .set("Cookie", cookies1.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data.docs.length).toBe(1);
      expect(res.body.data.docs[0].username).toBe("creator");
    });
  });

  describe("GET /api/v1/subscriptions/c/:channelId", () => {
    it("should return subscribers of a channel", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/c/${user2._id}`)
        .set("Cookie", cookies1.join("; "));

      const res = await request(app)
        .get(`/api/v1/subscriptions/c/${user2._id}`)
        .set("Cookie", cookies2.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data.docs.length).toBe(1);
      expect(res.body.data.docs[0].username).toBe("subscriber");
    });
  });
});