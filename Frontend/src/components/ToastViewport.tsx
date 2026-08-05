"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useToastStore } from "@/src/store/useToastStore";
import { CloseIcon, CheckIcon } from "@/src/components/icons";

const typeStyles = {
  success: { background: "var(--success)", color: "#fff" },
  error: { background: "var(--error)", color: "#fff" },
  info: { background: "var(--accent)", color: "#fff" },
} as const;

export default function ToastViewport() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      role="status"
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--sp-2)",
        pointerEvents: "none",
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const showCheck = toast.type !== "error";
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              role={toast.type === "error" ? "alert" : "status"}
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: "var(--sp-3)",
                padding: "12px 20px",
                borderRadius: "var(--radius-md)",
                ...typeStyles[toast.type ?? "info"],
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                whiteSpace: "nowrap",
                maxWidth: "min(90vw, 420px)",
              }}
            >
              {showCheck ? (
                <CheckIcon size={16} aria-hidden="true" />
              ) : (
                <button
                  aria-label="Remove"
                  style={{
                    width: 16,
                    height: 16,
                    background: "none",
                    border: "none",
                    color: "inherit",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CloseIcon size={16} aria-hidden="true" />
                </button>
              )}
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {toast.message}
              </span>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  opacity: 0.7,
                  cursor: "pointer",
                  display: "flex",
                  padding: 4,
                }}
              >
                <CloseIcon size={14} aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
