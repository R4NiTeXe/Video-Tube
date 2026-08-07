import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SplashWrapper from "@/src/components/SplashWrapper";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/src/components/SplashScreen", () => ({
  default: () => <div>SPLASH</div>,
}));

describe("SplashWrapper", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows splash on first visit", async () => {
    render(
      <SplashWrapper>
        <div>CONTENT</div>
      </SplashWrapper>,
    );
    expect(await screen.findByText("SPLASH")).toBeInTheDocument();
    expect(screen.getByText("CONTENT")).toBeInTheDocument();
  });

  it("does not show splash when already visited", () => {
    sessionStorage.setItem("vt-splash", "1");
    render(
      <SplashWrapper>
        <div>CONTENT</div>
      </SplashWrapper>,
    );
    expect(screen.queryByText("SPLASH")).toBeNull();
    expect(screen.getByText("CONTENT")).toBeInTheDocument();
  });
});