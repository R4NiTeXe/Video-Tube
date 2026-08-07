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
  getAuthHeaders,
  expectSuccess,
  expectError,
} from "./testUtils.js";
import { otpService } from "../src/services/otp.service.js";
import { OTP } from "../src/models/otp.model.js";

const TEST_DB_NAME = `videotube_otp_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("OTP Service & Endpoints", () => {
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

  describe("otpService.storeOtp", () => {
    it("should generate and store a hashed OTP", async () => {
      const { otp, otpDoc } = await otpService.storeOtp({
        identifier: "user@example.com",
        purpose: "login",
      });

      expect(otp).toMatch(/^\d{6}$/);
      expect(otpDoc.otpHash).toBe(OTP.hashOtp(otp));
      expect(otpDoc.otpHash).not.toBe(otp);
      expect(otpDoc.attempts).toBe(0);
      expect(otpDoc.verified).toBe(false);
    });

    it("should reject invalid purpose", async () => {
      await expect(
        otpService.storeOtp({
          identifier: "user@example.com",
          purpose: "not-a-purpose",
        })
      ).rejects.toThrow("Invalid OTP purpose");
    });

    it("should reject invalid channel", async () => {
      await expect(
        otpService.storeOtp({
          identifier: "user@example.com",
          purpose: "login",
          channel: "sms",
        })
      ).rejects.toThrow("Invalid OTP channel");
    });

    it("should reject when user daily limit is reached", async () => {
      const user = await createTestUser();
      const today = OTP.getStartOfDay();
      await UserFindByIdAndSetCount(user._id, 15, today);

      await expect(
        otpService.storeOtp({
          identifier: "limited@example.com",
          userId: user._id,
          purpose: "login",
        })
      ).rejects.toThrow("Daily OTP limit reached");
    });

    it("should reject when user is not found", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      await expect(
        otpService.storeOtp({
          identifier: "ghost@example.com",
          userId: fakeId,
          purpose: "login",
        })
      ).rejects.toThrow("User not found");
    });
  });

  describe("otpService.verifyOtp", () => {
    it("should verify a valid OTP and mark it used", async () => {
      const { otp } = await otpService.storeOtp({
        identifier: "verify@example.com",
        purpose: "login",
      });

      const result = await otpService.verifyOtp({
        identifier: "verify@example.com",
        otp,
        purpose: "login",
      });

      expect(result.valid).toBe(true);

      const usedAgain = await otpService.verifyOtp({
        identifier: "verify@example.com",
        otp,
        purpose: "login",
      });
      expect(usedAgain.valid).toBe(false);
      expect(usedAgain.message).toContain("already used");
    });

    it("should reject wrong OTP and decrement attempts", async () => {
      const { otp } = await otpService.storeOtp({
        identifier: "wrong@example.com",
        purpose: "login",
      });
      void otp;

      const result = await otpService.verifyOtp({
        identifier: "wrong@example.com",
        otp: "000000",
        purpose: "login",
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid");
      expect(result.attemptsRemaining).toBe(4);
    });

    it("should lock out after max attempts", async () => {
      const { otp } = await otpService.storeOtp({
        identifier: "lock@example.com",
        purpose: "login",
      });
      void otp;

      for (let i = 0; i < 5; i++) {
        await otpService.verifyOtp({
          identifier: "lock@example.com",
          otp: "111111",
          purpose: "login",
        });
      }

      const result = await otpService.verifyOtp({
        identifier: "lock@example.com",
        otp: "111111",
        purpose: "login",
      });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Too many attempts");
    });

    it("should reject expired OTP", async () => {
      const { otp, otpDoc } = await otpService.storeOtp({
        identifier: "expired@example.com",
        purpose: "login",
      });
      await OTP.updateOne(
        { _id: otpDoc._id },
        { $set: { expiresAt: new Date(Date.now() - 60000) } }
      );

      const result = await otpService.verifyOtp({
        identifier: "expired@example.com",
        otp,
        purpose: "login",
      });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("expired");
    });

    it("should return not-found for unknown identifier", async () => {
      const result = await otpService.verifyOtp({
        identifier: "never@example.com",
        otp: "123456",
        purpose: "login",
      });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("not found");
    });
  });

  describe("otpService.getUserOtpUsage", () => {
    it("should return default usage for unknown user", async () => {
      const usage = await otpService.getUserOtpUsage(
        "507f1f77bcf86cd799439011"
      );
      expect(usage.used).toBe(0);
      expect(usage.remaining).toBe(15);
    });

    it("should return remaining quota for known user", async () => {
      const user = await createTestUser();
      const usage = await otpService.getUserOtpUsage(user._id);
      expect(usage.limit).toBe(15);
      expect(usage.used).toBe(0);
      expect(usage.remaining).toBe(15);
    });
  });

  describe("otpService.cleanupExpiredOtps", () => {
    it("should delete expired OTPs and keep active ones", async () => {
      await otpService.storeOtp({
        identifier: "active@example.com",
        purpose: "login",
      });
      const expired = await OTP.create({
        identifier: "stale@example.com",
        otpHash: OTP.hashOtp("123456"),
        purpose: "login",
        channel: "email",
        expiresAt: new Date(Date.now() - 60000),
        attempts: 0,
        maxAttempts: 5,
        verified: false,
      });
      void expired;

      const deleted = await otpService.cleanupExpiredOtps();
      expect(deleted).toBe(1);

      const active = await OTP.findOne({ identifier: "active@example.com" });
      expect(active).not.toBeNull();
    });
  });

  describe("POST /api/v1/otp/send", () => {
    it("should send OTP for a valid email", async () => {
      const res = await request(app)
        .post("/api/v1/otp/send")
        .send({ identifier: "send@example.com", purpose: "login" });

      expectSuccess(res, 200);
      expect(res.body.data.expiresIn).toBe(600);
      expect(res.body.data.remainingGlobal).toBeDefined();
    });

    it("should reject invalid email format", async () => {
      const res = await request(app)
        .post("/api/v1/otp/send")
        .send({ identifier: "not-an-email", purpose: "login" });

      expectError(res, 400, "Invalid email");
    });

    it("should reject missing identifier", async () => {
      const res = await request(app)
        .post("/api/v1/otp/send")
        .send({ purpose: "login" });

      expectError(res, 400);
    });
  });

  describe("POST /api/v1/otp/verify", () => {
    it("should verify a correct OTP", async () => {
      const { otp } = await otpService.storeOtp({
        identifier: "verify-api@example.com",
        purpose: "login",
      });

      const res = await request(app)
        .post("/api/v1/otp/verify")
        .send({
          identifier: "verify-api@example.com",
          otp,
          purpose: "login",
        });

      expectSuccess(res, 200);
      expect(res.body.data.verified).toBe(true);
    });

    it("should reject an incorrect OTP with attempts remaining", async () => {
      await otpService.storeOtp({
        identifier: "wrong-api@example.com",
        purpose: "login",
      });

      const res = await request(app)
        .post("/api/v1/otp/verify")
        .send({
          identifier: "wrong-api@example.com",
          otp: "999999",
          purpose: "login",
        });

      expectError(res, 400, "Invalid");
      expect(res.body.attemptsRemaining).toBe(4);
    });

    it("should reject missing OTP field", async () => {
      const res = await request(app)
        .post("/api/v1/otp/verify")
        .send({ identifier: "x@example.com", purpose: "login" });

      expectError(res, 400);
    });
  });

  describe("POST /api/v1/otp/resend", () => {
    it("should return 404 when no previous OTP exists", async () => {
      const res = await request(app)
        .post("/api/v1/otp/resend")
        .send({ identifier: "none@example.com", purpose: "login" });

      expectError(res, 404, "No previous OTP");
    });

    it("should enforce resend cooldown", async () => {
      await otpService.storeOtp({
        identifier: "cooldown@example.com",
        purpose: "login",
      });

      const res = await request(app)
        .post("/api/v1/otp/resend")
        .send({ identifier: "cooldown@example.com", purpose: "login" });

      expectError(res, 429, "wait");
    });
  });

  describe("GET /api/v1/otp/usage", () => {
    it("should require authentication", async () => {
      const res = await request(app).get("/api/v1/otp/usage");
      expectError(res, 401);
    });

    it("should return OTP usage for authenticated user", async () => {
      const { cookies } = await loginTestUser();
      const res = await request(app)
        .get("/api/v1/otp/usage")
        .set("Cookie", cookies.join("; "));

      expectSuccess(res, 200);
      expect(res.body.data.dailyLimit).toBe(15);
      expect(res.body.data.globalDailyLimit).toBe(100);
    });
  });
});

async function UserFindByIdAndSetCount(userId, count, date) {
  const { User } = await import("../src/models/user.model.js");
  await User.findByIdAndUpdate(
    userId,
    { $set: { otpDailyCount: count, otpDailyCountDate: date } }
  );
}