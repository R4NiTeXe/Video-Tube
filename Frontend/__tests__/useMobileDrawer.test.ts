import { describe, it, expect, beforeEach } from "vitest";
import { useMobileDrawer } from "@/src/store/useMobileDrawer";

describe("useMobileDrawer", () => {
  beforeEach(() => {
    useMobileDrawer.setState({ isOpen: false });
  });

  it("starts closed", () => {
    expect(useMobileDrawer.getState().isOpen).toBe(false);
  });

  it("opens the drawer", () => {
    useMobileDrawer.getState().open();
    expect(useMobileDrawer.getState().isOpen).toBe(true);
  });

  it("closes the drawer", () => {
    useMobileDrawer.getState().open();
    useMobileDrawer.getState().close();
    expect(useMobileDrawer.getState().isOpen).toBe(false);
  });

  it("toggles the drawer state", () => {
    useMobileDrawer.getState().toggle();
    expect(useMobileDrawer.getState().isOpen).toBe(true);
    useMobileDrawer.getState().toggle();
    expect(useMobileDrawer.getState().isOpen).toBe(false);
  });
});