import { describe, it, beforeAll, afterAll, expect, jest } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app.js";
import { startTestServer, stopTestServer, dropDatabase } from "./testUtils.js";
import mongoose from "mongoose";

const TEST_DB_NAME = `videotube_health_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("Health readiness", () => {
  beforeAll(async () => {
    await startTestServer(TEST_DB_NAME);
  });

  afterAll(async () => {
    // No-op: next suite's startTestServer handles cleanup
  });

  it("DB healthy + Cloudinary unavailable → still ready (200)", async () => {
    const memSpy = jest.spyOn(process, "memoryUsage").mockReturnValue({
      heapUsed: 100 * 1024 * 1024,
      heapTotal: 200 * 1024 * 1024,
      external: 0,
      arrayBuffers: 0,
      rss: 0,
    });
    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body.database).toBe("connected");
    expect(res.body.status).toBe("ready");
    expect(res.body.cloudinary).toBe("degraded");
    memSpy.mockRestore();
  });

  it("DB unavailable → not ready (503)", async () => {
    const spy = jest.spyOn(mongoose.connection.db, "admin").mockReturnValue({
      ping: async () => {
        throw new Error("DB down");
      },
    });
    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("not ready");
    spy.mockRestore();
  });

  it("/health/live always 200", async () => {
    const res = await request(app).get("/health/live");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
