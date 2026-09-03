import { describe, it, beforeAll, afterAll, beforeEach, expect } from "@jest/globals";
import request from "supertest";
import fs from "fs";
import path from "path";
import { app } from "../src/app.js";
import { startTestServer, stopTestServer, clearDatabase, dropDatabase, createTestUser, loginTestUser, expectSuccess } from "./testUtils.js";

const TEST_DB_NAME = `videotube_multer_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("Multer upload-size hardening", () => {
  let user, cookies;

  beforeAll(async () => {
    await startTestServer(TEST_DB_NAME);
  });

  afterAll(async () => {
    await dropDatabase();
    await stopTestServer();
  });

  beforeEach(async () => {
    await clearDatabase();
    user = await createTestUser();
    const login = await loginTestUser({ email: user.email, password: "Test@1234" });
    cookies = login.cookies;
  });

  it("oversized video (21MB) is rejected with 413 during streaming", async () => {
    // Create a 21MB buffer (just over 20MB limit) with valid MP4 header
    const size = 21 * 1024 * 1024;
    const buf = Buffer.alloc(size);
    // Write ftyp at offset 4 to pass magic-byte check, then oversized check should still fail via Multer fileSize
    buf[4] = 0x66; buf[5] = 0x74; buf[6] = 0x79; buf[7] = 0x70;
    const res = await request(app)
      .post("/api/v1/videos")
      .set("Cookie", cookies.join("; "))
      .field("title", "Oversized")
      .field("description", "desc")
      .attach("videoFile", buf, { filename: "big.mp4", contentType: "video/mp4" })
      .attach("thumbnail", Buffer.from([0xff, 0xd8, 0xff, 0xe0]), { filename: "thumb.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
    // Ensure temp file was not left (Multer should have cleaned the truncated file)
    const tempDir = path.join(process.cwd(), "public", "temp");
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      // No file should contain our oversized payload (all temp files should be cleaned)
      const hasBig = files.some((f) => {
        try {
          const stat = fs.statSync(path.join(tempDir, f));
          return stat.size > 20 * 1024 * 1024;
        } catch { return false; }
      });
      expect(hasBig).toBe(false);
    }
  });

  it("valid video (1KB) still succeeds", async () => {
    const validMp4 = Buffer.from([0x00,0x00,0x00,0x18,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d]);
    // Pad to 1KB
    const buf = Buffer.concat([validMp4, Buffer.alloc(1012)]);
    const res = await request(app)
      .post("/api/v1/videos")
      .set("Cookie", cookies.join("; "))
      .field("title", "Valid Small")
      .field("description", "desc")
      .attach("videoFile", buf, { filename: "small.mp4", contentType: "video/mp4" })
      .attach("thumbnail", Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), { filename: "thumb.jpg", contentType: "image/jpeg" });

    expectSuccess(res, 201);
  });
});
