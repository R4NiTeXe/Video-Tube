import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  hydrated: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  hydrate: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "light",
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("vt-theme") as Theme | null;
      const theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", theme);
      set({ theme, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  toggleTheme: () =>
    set((state) => {
      const next: Theme = state.theme === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        localStorage.setItem("vt-theme", next);
        document.documentElement.setAttribute("data-theme", next);
      }
      return { theme: next };
    }),

  setTheme: (theme: Theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("vt-theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    }
    set({ theme });
  },
}));
