import { describe, it, expect, vi, afterEach } from "vitest";
import { generateIdempotencyKey, UUID_V4_REGEX } from "@/src/lib/idempotency";

describe("idempotency fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates valid UUIDv4 via crypto.randomUUID when available", () => {
    const key = generateIdempotencyKey();
    expect(UUID_V4_REGEX.test(key)).toBe(true);
    const c14 = key[14];
    const c19 = key[19];
    expect(c14).toBe("4");
    expect(c19).toBeDefined();
    if (c19 !== undefined) {
      expect(["8", "9", "a", "b"].includes(c19.toLowerCase())).toBe(true);
    }
  });

  it("fallback generates valid UUIDv4 when randomUUID unavailable", () => {
    const mockGetRandomValues = vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    });
    vi.stubGlobal("crypto", {
      getRandomValues: mockGetRandomValues,
    } as Pick<Crypto, "getRandomValues">);
    const key = generateIdempotencyKey();
    expect(UUID_V4_REGEX.test(key)).toBe(true);
    const c14b = key[14];
    expect(c14b).toBe("4");
    vi.unstubAllGlobals();
  });

  it("fallback via Math.random still generates valid UUIDv4", () => {
    vi.stubGlobal("crypto", undefined);
    const key = generateIdempotencyKey();
    expect(UUID_V4_REGEX.test(key)).toBe(true);
    const c14c = key[14];
    expect(c14c).toBe("4");
    vi.unstubAllGlobals();
  });

  it("old fallback would fail validation", () => {
    const oldFallback = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
    expect(UUID_V4_REGEX.test(oldFallback)).toBe(false);
  });
});
