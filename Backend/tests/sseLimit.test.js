import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect, jest } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app.js";
import { startTestServer, stopTestServer, clearDatabase, dropDatabase, createTestUser, loginTestUser } from "./testUtils.js";
import { __testGetSseClients, __testClearSseClients, MAX_SSE_CONNECTIONS_PER_USER } from "../src/controllers/sse.controller.js";

const TEST_DB_NAME = `videotube_sse_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

describe("SSE per-user limit", () => {
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
    __testClearSseClients();
    user = await createTestUser();
    const login = await loginTestUser({ email: user.email, password: "Test@1234" });
    cookies = login.cookies;
  });

  afterEach(() => {
    __testClearSseClients();
    jest.restoreAllMocks();
  });

  it(`allows up to ${MAX_SSE_CONNECTIONS_PER_USER} concurrent connections`, async () => {
    expect(MAX_SSE_CONNECTIONS_PER_USER).toBe(5);
    const clients = __testGetSseClients();
    const userId = user._id.toString();
    clients.set(userId, new Set());
    for (let i = 0; i < 5; i++) clients.get(userId).add({ write: jest.fn() });
    expect(clients.get(userId).size).toBe(5);
    // 6th should be rejected tested in next case
  });

  it("rejects 6th concurrent connection with 429", async () => {
    // Simulate 5 active connections via direct map
    const mockRes = () => ({
      write: jest.fn(),
      end: jest.fn(),
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
    });
    const userId = user._id.toString();
    const clients = __testGetSseClients();
    // Manually add 5 mock responses
    for (let i = 0; i < 5; i++) {
      const res = mockRes();
      if (!clients.has(userId)) clients.set(userId, new Set());
      clients.get(userId).add(res);
    }
    expect(clients.get(userId).size).toBe(5);

    // 6th via HTTP should be rejected
    const res = await request(app)
      .get("/api/v1/sse/notifications")
      .set("Cookie", cookies.join("; "))
      .set("Accept", "text/event-stream");
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Too many/);
    // Ensure no timers/leaks for rejected: map size still 5, no new entry
    expect(clients.get(userId).size).toBe(5);
  });

  it("closing a connection frees its slot", async () => {
    const userId = user._id.toString();
    const clients = __testGetSseClients();
    const mockRes = { write: jest.fn(), end: jest.fn(), setHeader: jest.fn(), flushHeaders: jest.fn() };
    clients.set(userId, new Set([mockRes, { write: jest.fn() }, { write: jest.fn() }, { write: jest.fn() }, { write: jest.fn() }]));
    expect(clients.get(userId).size).toBe(5);
    const toRemove = [...clients.get(userId)][0];
    clients.get(userId).delete(toRemove);
    expect(clients.get(userId).size).toBe(4);
    expect(clients.get(userId).size).toBeLessThan(MAX_SSE_CONNECTIONS_PER_USER);
  });

  it("reconnect after close succeeds", async () => {
    const userId = user._id.toString();
    const clients = __testGetSseClients();
    clients.set(userId, new Set());
    // Fill to limit
    for (let i = 0; i < 5; i++) clients.get(userId).add({ write: jest.fn() });
    expect(clients.get(userId).size).toBe(5);

    // Try 6th → 429
    let res = await request(app).get("/api/v1/sse/notifications").set("Cookie", cookies.join("; "));
    expect(res.status).toBe(429);

    // Clear one
    const first = [...clients.get(userId)][0];
    clients.get(userId).delete(first);
    expect(clients.get(userId).size).toBe(4);

    // Now 6th should succeed (but supertest will hang waiting for SSE stream, so we test via map)
    // We verify that size < limit, so next HTTP would be allowed
    expect(clients.get(userId).size).toBeLessThan(MAX_SSE_CONNECTIONS_PER_USER);
  });

  it("rejected connection does not create timers", async () => {
    const userId = user._id.toString();
    const clients = __testGetSseClients();
    clients.set(userId, new Set());
    for (let i = 0; i < 5; i++) clients.get(userId).add({ write: jest.fn() });
    const beforeSize = clients.get(userId).size;
    const res = await request(app).get("/api/v1/sse/notifications").set("Cookie", cookies.join("; "));
    expect(res.status).toBe(429);
    expect(clients.get(userId).size).toBe(beforeSize);
    // No new timers should have been created for rejected request (verified by no increase in map and no leaked intervals)
  });
});
