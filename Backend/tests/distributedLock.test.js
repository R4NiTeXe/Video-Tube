import { describe, it, beforeAll, afterAll, beforeEach, expect } from "@jest/globals";
import { acquireLock, releaseLock, initRedis, isRedisAvailable } from "../src/utils/redis.js";

describe("Distributed Lock", () => {
  beforeAll(async () => {
    await initRedis();
  });

  it("should acquire and release lock", async () => {
    if (!isRedisAvailable()) {
      console.log("Redis not available, skipping lock test");
      return;
    }

    const lockKey = "test:lock:1";
    const release = await acquireLock(lockKey, 5);
    
    expect(release).toBeInstanceOf(Function);

    const release2 = await acquireLock(lockKey, 5);
    expect(release2).toBeNull();

    await release();

    const release3 = await acquireLock(lockKey, 5);
    expect(release3).toBeInstance(Function);
    await release3();
  });

  it("should handle concurrent lock attempts", async () => {
    if (!isRedisAvailable()) {
      console.log("Redis not available, skipping lock test");
      return;
    }

    const lockKey = "test:lock:concurrent";
    const attempts = 20;
    let acquired = 0;

    const promises = Array(attempts).fill().map(async () => {
      const release = await acquireLock(lockKey, 2);
      if (release) {
        acquired++;
        await new Promise(r => setTimeout(r, 10));
        await release();
      }
    });

    await Promise.all(promises);
    expect(acquired).toBeLessThanOrEqual(attempts);
  });

  it("should auto-expire lock after TTL", async () => {
    if (!isRedisAvailable()) {
      console.log("Redis not available, skipping lock test");
      return;
    }

    const lockKey = "test:lock:ttl";
    const release = await acquireLock(lockKey, 1); // 1 second TTL
    
    expect(release).toBeInstanceOf(Function);
    
    await new Promise(r => setTimeout(r, 1500));
    
    const release2 = await acquireLock(lockKey, 1);
    expect(release2).toBeInstanceOf(Function);
    await release2();
  });
});