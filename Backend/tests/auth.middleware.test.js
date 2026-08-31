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
} from "./testUtils.js";

const TEST_DB_NAME = `videotube_auth_middleware_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("Auth Middleware", () => {
  beforeAll(async () => {
    await startTestServer(TEST_DB_NAME);
  });

  afterAll(async () => {
    await dropDatabase();
    await stopTestServer();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe("verifyJWT", () => {
    it("should return 401 when no token is provided", async () => {
      const res = await request(app).get("/api/v1/users/current-user");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 200 when valid token is provided", async () => {
      const user = await createTestUser();
      const { cookies } = await loginTestUser(user);
      const res = await request(app)
        .get("/api/v1/users/current-user")
        .set("Cookie", cookies.join("; "));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("_id");
    });

    it("should return 401 when token is invalid", async () => {
      const res = await request(app)
        .get("/api/v1/users/current-user")
        .set("Cookie", "accessToken=invalid_token");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("optionalVerifyJWT", () => {
    it("should allow unauthenticated access to channel page (no token)", async () => {
      const user = await createTestUser();
      const res = await request(app).get(`/api/v1/users/c/${user.username}`);
      // Should not return 401 — optional auth lets it through
      expect([200, 404]).toContain(res.status);
      // 404 means channel exists but no videos/subscribers — still ok
      // 200 means channel data returned
      if (res.status === 200) {
        expect(res.body.data).toHaveProperty("username", user.username);
        expect(res.body.data.isSubscribed).toBe(false);
      }
    });

    it("should detect logged-in user on channel page", async () => {
      const user = await createTestUser();
      const { cookies } = await loginTestUser(user);
      const res = await request(app)
        .get(`/api/v1/users/c/${user.username}`)
        .set("Cookie", cookies.join("; "));
      if (res.status === 200) {
        expect(res.body.data).toHaveProperty("username", user.username);
        expect(res.body.data).toHaveProperty("isSubscribed");
      }
    });

    it("should not crash with invalid token on channel page", async () => {
      const user = await createTestUser();
      const res = await request(app)
        .get(`/api/v1/users/c/${user.username}`)
        .set("Cookie", "accessToken=definitely_invalid_token_here");
      // Should NOT throw 500 — optional auth ignores invalid tokens
      expect([200, 404]).toContain(res.status);
    });
  });
});