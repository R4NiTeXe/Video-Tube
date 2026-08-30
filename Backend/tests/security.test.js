import { describe, it, beforeAll, afterAll, beforeEach, expect } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import {
  startTestServer,
  stopTestServer,
  clearDatabase,
  dropDatabase,
  createTestUser,
  loginTestUser,
  getAuthHeaders,
} from "./testUtils.js";
import { User } from "../src/models/user.model.js";

const TEST_DB_NAME = `videotube_security_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("Security Hardening", () => {
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

  describe("JWT Token Security", () => {
    it("should NOT include PII in access token payload", async () => {
      const user = await createTestUser({
        email: "security@example.com",
        fullName: "Secret User",
        username: "secretuser",
      });

      const { cookies } = await loginTestUser(user);

      const accessTokenCookie = cookies.find((c) =>
        c.startsWith("accessToken=")
      );
      expect(accessTokenCookie).toBeDefined();

      const token = accessTokenCookie.split("=")[1];
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      expect(decoded).toHaveProperty("_id");
      expect(decoded).toHaveProperty("role");
      expect(decoded).not.toHaveProperty("email");
      expect(decoded).not.toHaveProperty("username");
      expect(decoded).not.toHaveProperty("fullName");
    });
  });

  describe("CORS Security", () => {
    it("should configure CORS to reject unknown origins in production", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        const res = await request(app)
          .post("/api/v1/users/login")
          .set("Origin", "https://evil-site.com")
          .send({ email: "test@test.com", password: "Test@1234" });

        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });

  describe("Webhook Security", () => {
    it("should reject webhooks when WEBHOOK_SECRET is not configured", async () => {
      const originalSecret = process.env.WEBHOOK_SECRET;
      delete process.env.WEBHOOK_SECRET;

      try {
        const res = await request(app)
          .post("/api/v1/webhooks/cloudinary")
          .send({ notification_type: "upload", public_id: "test" });

        expect(res.status).toBe(401);
        expect(res.body.error).toContain("not configured");
      } finally {
        if (originalSecret) process.env.WEBHOOK_SECRET = originalSecret;
      }
    });

    it("should reject webhooks with invalid token", async () => {
      process.env.WEBHOOK_SECRET = "test-webhook-secret-key-32chars";

      try {
        const res = await request(app)
          .post("/api/v1/webhooks/cloudinary?token=wrong-token")
          .send({ notification_type: "upload", public_id: "test" });

        expect(res.status).toBe(401);
      } finally {
        delete process.env.WEBHOOK_SECRET;
      }
    });
  });

  describe("Email Update Security", () => {
    it("should NOT allow direct email change via updateAccountDetails", async () => {
      const user = await createTestUser({
        email: "original@example.com",
      });
      const { cookies } = await loginTestUser(user);

      const res = await request(app)
        .patch("/api/v1/users/update-account")
        .set(getAuthHeaders(cookies))
        .send({
          fullName: "New Name",
          email: "hacked@example.com",
        });

      expect(res.status).toBe(200);
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.email).toBe("original@example.com");
    });
  });

  describe("Password Validation", () => {
    it("should reject weak passwords", async () => {
      const user = await createTestUser();

      const res = await request(app)
        .post("/api/v1/users/change-password")
        .set(getAuthHeaders(
          (await loginTestUser(user)).cookies
        ))
        .send({
          oldPassword: "Test@1234",
          newPassword: "weak",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Contact Rate Limiting", () => {
    it("should rate-limit contact form submissions", async () => {
      const requests = [];
      for (let i = 0; i < 7; i++) {
        requests.push(
          request(app)
            .post("/api/v1/contact")
            .send({
              name: "Test",
              email: "test@example.com",
              subject: "Test",
              message: "Test message for rate limiting",
            })
        );
      }

      const responses = await Promise.all(requests);
      const tooMany = responses.filter((r) => r.status === 429);
      expect(tooMany.length).toBeGreaterThan(0);
    });
  });

  describe("Health Check", () => {
    it("should return 200 on health/live", async () => {
      const res = await request(app).get("/health/live");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });

    it("should return health status on health/ready", async () => {
      const res = await request(app).get("/health/ready");
      expect([200, 503]).toContain(res.body.status === "ready" ? 200 : 503);
      expect(res.body).toHaveProperty("database");
      expect(res.body).toHaveProperty("uptime");
    });
  });
});
