import { describe, it, expect, afterEach, vi } from "vitest";

const REAL_ENV = () => ({ ...process.env });

const setEnv = (values: Record<string, string | undefined>) => {
  Object.assign(process.env, values);
};

const setNodeEnv = (value: string | undefined) => {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
};

afterEach(() => {
  Object.keys(process.env).forEach((k) => delete process.env[k]);
  Object.assign(process.env, REAL_ENV());
  vi.resetModules();
});

describe("config", () => {
  it("falls back to dev URL when no env var is set (non-production)", async () => {
    setNodeEnv("development");
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    const { API_BASE_URL, API_FULL_URL } = await import(
      "@/src/services/config"
    );
    expect(API_BASE_URL).toBe("http://localhost:8000/api/v1");
    expect(API_FULL_URL).toBe("http://localhost:8000/api/v1");
  });

  it("uses configured URL and strips trailing slashes", async () => {
    setNodeEnv("development");
    setEnv({ NEXT_PUBLIC_API_BASE_URL: "https://api.example.com/api/v1/" });
    const { API_BASE_URL, API_FULL_URL } = await import(
      "@/src/services/config"
    );
    expect(API_BASE_URL).toBe("https://api.example.com/api/v1");
    expect(API_FULL_URL).toBe("https://api.example.com/api/v1");
  });

  it("throws in production when NEXT_PUBLIC_API_BASE_URL is missing", async () => {
    setNodeEnv("production");
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    await expect(import("@/src/services/config")).rejects.toThrow(
      "NEXT_PUBLIC_API_BASE_URL is required",
    );
  });
});