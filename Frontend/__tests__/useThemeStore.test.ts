import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "@/src/store/useThemeStore";

describe("useThemeStore", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    useThemeStore.setState({ theme: "dark", hydrated: false });
  });

  it("defaults to dark theme", () => {
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("hydrate reads stored preference and sets attribute", () => {
    localStorage.setItem("vt-theme", "light");
    useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().theme).toBe("light");
    expect(useThemeStore.getState().hydrated).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("toggleTheme toggles between themes and persists", () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("light");
    expect(localStorage.getItem("vt-theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("dark");
    expect(localStorage.getItem("vt-theme")).toBe("dark");
  });

  it("setTheme sets and persists the given theme", () => {
    useThemeStore.getState().setTheme("light");
    expect(useThemeStore.getState().theme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});