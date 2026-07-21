import { describe, it, expect } from "vitest";
import { formatViews, formatDuration, timeAgo } from "@/src/lib/utils";

describe("formatViews", () => {
  it("formats numbers less than 1000", () => {
    expect(formatViews(500)).toBe("500");
    expect(formatViews(0)).toBe("0");
    expect(formatViews(999)).toBe("999");
  });

  it("formats thousands", () => {
    expect(formatViews(1500)).toBe("1.5K");
    expect(formatViews(10000)).toBe("10.0K");
    expect(formatViews(999999)).toBe("1000.0K");
  });

  it("formats millions", () => {
    expect(formatViews(1000000)).toBe("1.0M");
    expect(formatViews(2500000)).toBe("2.5M");
  });
});

describe("formatDuration", () => {
  it("formats seconds to MM:SS", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3661)).toBe("61:01");
  });
});

describe("timeAgo", () => {
  it("returns 'just now' for recent dates", () => {
    expect(timeAgo(new Date().toISOString())).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = timeAgo(fiveMinAgo);
    expect(result).toMatch(/5m ago/);
  });
});
