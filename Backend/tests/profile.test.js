import {
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  expect,
} from "@jest/globals";
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

const TEST_DB_NAME = `videotube_profile_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("User Profile & Settings", () => {
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

  describe("Auth middleware", () => {
    it("should reject protected routes without a token", async () => {
      const res = await request(app).get("/api/v1/users/current-user");
      expectError(res, 401);
    });

    it("should reject protected routes with an invalid token", async () => {
      const res = await request(app)
        .get("/api/v1/users/current-user")
        .set("Cookie", "accessToken=not-a-valid-token");
      expectError(res, 401);
    });
  });

  describe("GET /api/v1/users/current-user", () => {
    it("should return the authenticated user", async () => {
      const { cookies } = await loginTestUser();
      const res = await request(app)
        .get("/api/v1/users/current-user")
        .set("Cookie", cookies.join("; "));
      expectSuccess(res, 200);
      expect(res.body.data).toHaveProperty("username");
    });
  });

  describe("PATCH /api/v1/users/update-account", () => {
    it("should update fullName", async () => {
      const { cookies } = await loginTestUser();
      const res = await request(app)
        .patch("/api/v1/users/update-account")
        .set("Cookie", cookies.join("; "))
        .send({ fullName: "Updated Name" });
      expectSuccess(res, 200);
      expect(res.body.data.fullName).toBe("Updated Name");
    });

    it("should reject empty update payload", async () => {
      const { cookies } = await loginTestUser();
      const res = await request(app)
        .patch("/api/v1/users/update-account")
        .set("Cookie", cookies.join("; "))
        .send({});
      expectError(res, 400);
    });
  });

  describe("POST /api/v1/users/change-password", () => {
    it("should change password with valid old password", async () => {
      const user = await createTestUser({
        username: "chpass",
        email: "chpass@example.com",
        password: "Test@1234",
      });
      const { cookies } = await loginTestUser(user.email);
      const res = await request(app)
        .post("/api/v1/users/change-password")
        .set("Cookie", cookies.join("; "))
        .send({
          oldPassword: "Test@1234",
          newPassword: "NewPass@567",
          confirmPassword: "NewPass@567",
        });
      expectSuccess(res, 200);
    });

    it("should reject change with wrong old password", async () => {
      const user = await createTestUser({
        username: "chpass2",
        email: "chpass2@example.com",
      });
      const { cookies } = await loginTestUser(user.email);
      const res = await request(app)
        .post("/api/v1/users/change-password")
        .set("Cookie", cookies.join("; "))
        .send({
          oldPassword: "Wrong@123",
          newPassword: "NewPass@567",
          confirmPassword: "NewPass@567",
        });
      expectError(res, 401);
    });
  });

  describe("PATCH /api/v1/users/profile", () => {
    it("should update profile bio and location", async () => {
      const { cookies } = await loginTestUser();
      const res = await request(app)
        .patch("/api/v1/users/profile")
        .set("Cookie", cookies.join("; "))
        .send({ bio: "Hello world", location: "Mumbai" });
      expectSuccess(res, 200);
    });
  });

  describe("PATCH /api/v1/users/language", () => {
    it("should update language", async () => {
      const { cookies } = await loginTestUser();
      const res = await request(app)
        .patch("/api/v1/users/language")
        .set("Cookie", cookies.join("; "))
        .send({ language: "en" });
      expectSuccess(res, 200);
      expect(res.body.data.language).toBe("en");
    });

    it("should reject empty language", async () => {
      const { cookies } = await loginTestUser();
      const res = await request(app)
        .patch("/api/v1/users/language")
        .set("Cookie", cookies.join("; "))
        .send({ language: "" });
      expectError(res, 400);
    });
  });

  describe("PATCH /api/v1/users/content-defaults", () => {
    it("should update default visibility", async () => {
      const { cookies } = await loginTestUser();
      const res = await request(app)
        .patch("/api/v1/users/content-defaults")
        .set("Cookie", cookies.join("; "))
        .send({ defaultVisibility: "private" });
      expectSuccess(res, 200);
      expect(res.body.data.defaultVisibility).toBe("private");
    });

    it("should reject empty content defaults payload", async () => {
      const { cookies } = await loginTestUser();
      const res = await request(app)
        .patch("/api/v1/users/content-defaults")
        .set("Cookie", cookies.join("; "))
        .send({});
      expectError(res, 400);
    });
  });

  describe("PATCH /api/v1/users/privacy", () => {
    it("should toggle private mode", async () => {
      const { cookies } = await loginTestUser();
      const res = await request(app)
        .patch("/api/v1/users/privacy")
        .set("Cookie", cookies.join("; "))
        .send({ isPrivate: true });
      expectSuccess(res, 200);
    });
  });

  describe("GET /api/v1/users/profile/:username", () => {
    it("should return a user profile by username", async () => {
      const user = await createTestUser({
        username: "profiled_username",
        email: "profile_get@example.com",
      });
      const { cookies } = await loginTestUser();
      const res = await request(app)
        .get(`/api/v1/users/profile/${user.username}`)
        .set("Cookie", cookies.join("; "));
      expectSuccess(res, 200);
    });
  });

  describe("Notification preferences", () => {
    it("should get default notification prefs", async () => {
      const { cookies } = await loginTestUser();
      const res = await request(app)
        .get("/api/v1/users/notification-prefs")
        .set("Cookie", cookies.join("; "));
      expectSuccess(res, 200);
    });

    it("should update notification prefs", async () => {
      const { cookies } = await loginTestUser();
      const res = await request(app)
        .patch("/api/v1/users/notification-prefs")
        .set("Cookie", cookies.join("; "))
        .send({ likes: false, comments: true });
      expectSuccess(res, 200);
    });
  });

  describe("Cookie security attributes", () => {
    it("should set httpOnly cookies on login", async () => {
      await createTestUser({
        username: "cookieuser",
        email: "cookie@example.com",
      });
      const res = await request(app).post("/api/v1/users/login").send({
        email: "cookie@example.com",
        password: "Test@1234",
      });
      const setCookie = res.headers["set-cookie"] || [];
      expect(cookiesAreHttpOnly(setCookie)).toBe(true);
    });
  });
});

function cookiesAreHttpOnly(setCookie) {
  const serialized = (setCookie || []).join("; ");
  return /accessToken=[^;]+;.*httponly/i.test(serialized);
}