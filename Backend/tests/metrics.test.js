import { describe, it, beforeAll, afterAll, beforeEach, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app.js";
import { startTestServer, stopTestServer, clearDatabase, dropDatabase } from "./testUtils.js";
import { register } from "../src/utils/metrics.js";

const TEST_DB_NAME = `videotube_metrics_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("Prometheus Metrics", () => {
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

  it("should expose /metrics endpoint", async () => {
    const res = await request(app).get("/metrics");
    
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
  });

  it("should track HTTP requests", async () => {
    await request(app).get("/health/live");
    
    const metrics = await register.metrics();
    expect(metrics).toContain("videotube_http_requests_total");
  });

  it("should track request duration", async () => {
    await request(app).get("/health/live");
    
    const metrics = await register.metrics();
    expect(metrics).toContain("videotube_http_request_duration_seconds");
  });

  it("should increment request counter per request", async () => {
    await request(app).get("/health/live");
    await request(app).get("/health/ready");
    
    const metrics = await register.metrics();
    expect(metrics).toContain("videotube_http_requests_total");
  });

  it("should track active connections gauge", async () => {
    await request(app).get("/health/live");
    
    const metrics = await register.metrics();
    expect(metrics).toContain("videotube_active_connections");
  });
});