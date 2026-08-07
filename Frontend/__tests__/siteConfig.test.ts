import { describe, it, expect, afterEach, vi } from "vitest";

const REAL_ENV = () => ({ ...process.env });

const setNodeEnv = (value: string | undefined) => {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
};

afterEach(() => {
  Object.keys(process.env).forEach((k) => delete process.env[k]);
  Object.assign(process.env, REAL_ENV());
  vi.resetModules();
});

describe("siteConfig", () => {
  it("falls back to default site URL outside production", async () => {
    setNodeEnv("development");
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const { SITE_URL } = await import("@/src/services/siteConfig");
    expect(SITE_URL).toBe("https://videotube.app");
  });

  it("parses configured URL origin", async () => {
    setNodeEnv("development");
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.example.com/with/path";
    const { SITE_URL } = await import("@/src/services/siteConfig");
    expect(SITE_URL).toBe("https://www.example.com");
  });

  it("throws in production when site url is missing", async () => {
    setNodeEnv("production");
    delete process.env.NEXT_PUBLIC_SITE_URL;
    await expect(import("@/src/services/siteConfig")).rejects.toThrow(
      "NEXT_PUBLIC_SITE_URL is required",
    );
  });

  it("throws in production when not https and not localhost", async () => {
    setNodeEnv("production");
    process.env.NEXT_PUBLIC_SITE_URL = "http://plain-http.example.com";
    await expect(import("@/src/services/siteConfig")).rejects.toThrow(
      "must use HTTPS",
    );
  });

  it("allows localhost in production", async () => {
    setNodeEnv("production");
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    const { SITE_URL } = await import("@/src/services/siteConfig");
    expect(SITE_URL).toBe("http://localhost:3000");
  });
});