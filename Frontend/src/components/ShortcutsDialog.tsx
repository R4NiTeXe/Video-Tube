"use client";

import { useState, useEffect, useRef } from "react";
import { DEFAULT_SHORTCUTS } from "@/src/hooks/useKeyboardShortcuts";

export default function ShortcutsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      )
        return;

      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const prevFocused = document.activeElement as HTMLElement | null;
    dialog
      ?.querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
      ?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialog) return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        )
      );
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    dialog?.addEventListener("keydown", handleTab);
    return () => {
      dialog?.removeEventListener("keydown", handleTab);
      prevFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
      onClick={() => setIsOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--elevated)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-light)",
          padding: "1.5rem",
          maxWidth: "420px",
          width: "90%",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2
            id="shortcuts-dialog-title"
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close shortcuts dialog"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "1.2rem",
              padding: "0.25rem",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {DEFAULT_SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.5rem 0",
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              <span
                style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}
              >
                {shortcut.description}
              </span>
              <kbd
                style={{
                  padding: "0.2rem 0.5rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-light)",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                }}
              >
                {"shift" in shortcut && shortcut.shift ? "Shift + " : ""}
                {shortcut.key === "/" ? "/" : shortcut.key.toUpperCase()}
              </kbd>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: "1rem",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          Press{" "}
          <kbd
            style={{
              padding: "0.1rem 0.3rem",
              borderRadius: 3,
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-light)",
            }}
          >
            Shift + ?
          </kbd>{" "}
          to toggle this dialog
        </p>
      </div>
    </div>
  );
}
