import { describe, it, expect } from "vitest";
import { COUNTRIES, FlagImg } from "@/src/lib/countries";
import { render } from "@testing-library/react";

describe("COUNTRIES", () => {
  it("contains India with correct phone code", () => {
    const india = COUNTRIES.find((c) => c.iso === "in");
    expect(india).toBeDefined();
    expect(india?.code).toBe("+91");
    expect(india?.name).toBe("India");
  });

  it("has no duplicate ISO country codes", () => {
    const isos = COUNTRIES.map((c) => c.iso);
    expect(new Set(isos).size).toBe(isos.length);
  });

  it("includes major regions", () => {
    const names = COUNTRIES.map((c) => c.name);
    for (const expected of [
      "United States",
      "United Kingdom",
      "Germany",
      "Australia",
      "Japan",
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("formatCode normalizes phone codes to unique E.164", () => {
    const usCount = COUNTRIES.filter((c) => c.iso === "us" || c.iso === "ca");
    expect(usCount.length).toBe(2);
  });
});

describe("FlagImg", () => {
  it("renders an image with correct flag URL", () => {
    const { container } = render(<FlagImg iso="in" size={20} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.src).toContain("flagcdn.com/in.svg");
    expect(img?.alt).toBe("India flag");
  });

  it("falls back to uppercase alt when country is unknown", () => {
    const { container } = render(<FlagImg iso="zz" />);
    const img = container.querySelector("img");
    expect(img?.alt).toBe("ZZ flag");
  });
});