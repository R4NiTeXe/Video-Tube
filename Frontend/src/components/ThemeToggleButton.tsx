"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/src/store/useThemeStore";

/**
 * A fixed top-right theme toggle button that works globally across the whole app.
 * Mount it once in the layout so it's always present on every page.
 */
export default function ThemeToggleButton() {
  const { theme, toggleTheme, setTheme } = useThemeStore();

  // Sync from localStorage on first mount (client only)
  useEffect(() => {
    const saved = localStorage.getItem("vt-theme") as "light" | "dark" | null;
    if (saved) setTheme(saved);
  }, [setTheme]);

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: "fixed",
        top: "1.25rem",
        right: "1.25rem",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "0.45rem",
        padding: "0.45rem 0.85rem",
        borderRadius: "2rem",
        backgroundColor: "var(--bg-elevated)",
        border: "1.5px solid var(--border-light)",
        color: "var(--text-secondary)",
        fontSize: "0.8rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "var(--shadow-sm)",
        userSelect: "none",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.color = "var(--accent)";
        e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-glow)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-light)";
        e.currentTarget.style.color = "var(--text-secondary)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      {/* Sun / Moon SVG icon — no emoji */}
      {isDark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1"  x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1"  y1="12" x2="3"  y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
          <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
