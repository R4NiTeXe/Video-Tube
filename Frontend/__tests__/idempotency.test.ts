import { describe, it, expect, vi, afterEach } from "vitest";
import { generateIdempotencyKey, UUID_V4_REGEX } from "@/src/lib/idempotency";

describe("idempotency fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates valid UUIDv4 via crypto.randomUUID when available", () => {
    const key = generateIdempotencyKey();
    expect(UUID_V4_REGEX.test(key)).toBe(true);
    // Verify version 4 and variant bits
    expect(key[14]).toBe("4");
    expect(["8", "9", "a", "b"].includes(key[19].toLowerCase())).toBe(true);
  });

  it("fallback generates valid UUIDv4 when randomUUID unavailable", () => {
    const mockGetRandomValues = vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    });
    vi.stubGlobal("crypto", {
      getRandomValues: mockGetRandomValues,
    } as any);
    const key = generateIdempotencyKey();
    expect(UUID_V4_REGEX.test(key)).toBe(true);
    expect(key[14]).toBe("4");
    vi.unstubAllGlobals();
  });

  it("fallback via Math.random still generates valid UUIDv4", () => {
    vi.stubGlobal("crypto", undefined as any);
    const key = generateIdempotencyKey();
    expect(UUID_V4_REGEX.test(key)).toBe(true);
    expect(key[14]).toBe("4");
    vi.unstubAllGlobals();
  });

  it("old fallback would fail validation", () => {
    const oldFallback = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
    expect(UUID_V4_REGEX.test(oldFallback)).toBe(false);
  });
});
