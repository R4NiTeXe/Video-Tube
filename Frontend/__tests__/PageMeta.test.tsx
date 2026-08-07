import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { PageMeta } from "@/src/components/PageMeta";

function clearHead() {
  document.head.querySelectorAll("title, meta, link").forEach((el) => el.remove());
}

beforeEach(clearHead);

describe("PageMeta", () => {
  it("renders default title and description", () => {
    render(<PageMeta />);
    expect(document.head.querySelector("title")?.textContent).toBe(
      "VideoTube",
    );
    const desc = document.head.querySelector('meta[name="description"]');
    expect(desc?.getAttribute("content")).toBe(
      "Watch, share, and connect on VideoTube.",
    );
  });

  it("composes title with site name", () => {
    render(<PageMeta title="My Video" />);
    expect(document.head.querySelector("title")?.textContent).toBe(
      "My Video | VideoTube",
    );
  });

  it("adds noindex when requested", () => {
    render(<PageMeta noIndex />);
    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute("content")).toBe("noindex, nofollow");
  });

  it("does not add noindex by default", () => {
    render(<PageMeta />);
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("emits canonical link when provided", () => {
    render(<PageMeta canonical="https://a.com/v" />);
    const link = document.head.querySelector('link[rel="canonical"]');
    expect(link?.getAttribute("href")).toBe("https://a.com/v");
  });

  it("injects JSON-LD when provided", () => {
    const { container } = render(<PageMeta jsonLd={{ "@type": "VideoObject" }} />);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script?.textContent).toContain('"@type":"VideoObject"');
  });
});