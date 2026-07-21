import { describe, it, beforeAll, afterAll, beforeEach, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app.js";
import { startTestServer, stopTestServer, clearDatabase, dropDatabase, createTestUser, loginTestUser, getAuthHeaders, expectSuccess, expectError } from "./testUtils.js";
import { User } from "../src/models/user.model.js";

const TEST_DB_NAME = `videotube_auth_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("Auth Flow", () => {
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

  describe("POST /api/v1/users/register", () => {
    it("should register a new user with valid data", async () => {
      const res = await request(app)
        .post("/api/v1/users/register")
        .field("fullName", "John Doe")
        .field("username", "johndoe")
        .field("email", "john@example.com")
        .field("password", "Secure@123")
        .attach("avatar", Buffer.from("fake image"), "avatar.jpg");

      expectSuccess(res, 201);
      expect(res.body.data).toHaveProperty("username", "johndoe");
      expect(res.body.data).toHaveProperty("email", "john@example.com");
    });

    it("should reject registration with missing fields", async () => {
      const res = await request(app)
        .post("/api/v1/users/register")
        .field("username", "johndoe");

      expectError(res, 400);
    });

    it("should reject duplicate username", async () => {
      await createTestUser({ username: "existing", email: "existing@example.com" });
      const res = await request(app)
        .post("/api/v1/users/register")
        .field("fullName", "Another User")
        .field("username", "existing")
        .field("email", "another@example.com")
        .field("password", "Secure@123")
        .attach("avatar", Buffer.from("fake"), "avatar.jpg");

      expectError(res, 409);
    });

    it("should reject duplicate email", async () => {
      await createTestUser({ username: "user1", email: "duplicate@example.com" });
      const res = await request(app)
        .post("/api/v1/users/register")
        .field("fullName", "Another User")
        .field("username", "user2")
        .field("email", "duplicate@example.com")
        .field("password", "Secure@123")
        .attach("avatar", Buffer.from("fake"), "avatar.jpg");

      expectError(res, 409);
    });
  });

  describe("POST /api/v1/users/login", () => {
    beforeEach(async () => {
      await createTestUser({
        username: "logintest",
        email: "login@example.com",
        password: "Test@1234",
      });
    });

    it("should login with valid email and password", async () => {
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: "login@example.com",
          password: "Test@1234",
        });

      expectSuccess(res, 200);
      expect(res.body.data.user).toHaveProperty("username", "logintest");
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should login with valid username and password", async () => {
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          username: "logintest",
          password: "Test@1234",
        });

      expectSuccess(res, 200);
    });

    it("should reject login with wrong password", async () => {
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: "login@example.com",
          password: "Wrong@123",
        });

      expectError(res, 401);
    });

    it("should reject login with non-existent user", async () => {
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: "nonexistent@example.com",
          password: "Test@1234",
        });

      expectError(res, 401);
    });
  });

  describe("Account Lockout", () => {
    beforeEach(async () => {
      await createTestUser({
        username: "locktest",
        email: "lock@example.com",
        password: "Test@1234",
      });
    });

    it("should lock account after 5 failed attempts", async () => {
      // First 4 attempts return 401
      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .post("/api/v1/users/login")
          .send({
            email: "lock@example.com",
            password: "Wrong@123",
          });
        expect(res.status).toBe(401);
      }

      // 5th attempt locks the account (returns 429)
      const res = await request(app)
        .post("/api/v1/users/login")
        .send({
          email: "lock@example.com",
          password: "Wrong@123",
        });

      expectError(res, 429, "locked");
    });

    it("should unlock after successful login", async () => {
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post("/api/v1/users/login")
          .send({ email: "lock@example.com", password: "Wrong@123" });
      }

      const res = await request(app)
        .post("/api/v1/users/login")
        .send({ email: "lock@example.com", password: "Test@1234" });

      expectSuccess(res, 200);

      const user = await User.findOne({ email: "lock@example.com" });
      expect(user.loginAttempts).toBe(0);
      expect(user.lockUntil).toBeUndefined();
    });
  });

  describe("Token Refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      const { cookies } = await loginTestUser();
      
      const res = await request(app)
        .post("/api/v1/users/refresh-token")
        .set("Cookie", cookies.join("; "));

      expectSuccess(res, 200);
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.headers["set-cookie"].some(c => c.startsWith("accessToken="))).toBe(true);
    });

    it("should reject refresh with invalid token", async () => {
      const res = await request(app)
        .post("/api/v1/users/refresh-token")
        .set("Cookie", "refreshToken=invalid-token");

      expectError(res, 401);
    });
  });

  describe("POST /api/v1/users/logout", () => {
    it("should logout and clear cookies", async () => {
      const { cookies } = await loginTestUser();
      
      const res = await request(app)
        .post("/api/v1/users/logout")
        .set("Cookie", cookies.join("; "));

      expectSuccess(res, 200);
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.headers["set-cookie"].some(c => c.startsWith("accessToken="))).toBe(true);
    });
  });
});
