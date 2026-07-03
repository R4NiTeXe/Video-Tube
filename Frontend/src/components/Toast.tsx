"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 3;
let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: number) => {
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType) => {
      const id = ++toastId;
      setToasts((prev) => {
        const next = [...prev, { id, message, type }];
        return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
      });
      const timer = setTimeout(() => removeToast(id), 3000);
      timers.current.set(id, timer);
    },
    [removeToast]
  );

  const toast = {
    success: (message: string) => addToast(message, "success"),
    error: (message: string) => addToast(message, "error"),
    info: (message: string) => addToast(message, "info"),
  };

  const typeStyles: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
    success: { bg: "var(--bg-secondary)", border: "var(--success)", color: "var(--success)", icon: "\u2713" },
    error: { bg: "var(--bg-secondary)", border: "var(--error)", color: "var(--error)", icon: "\u2717" },
    info: { bg: "var(--bg-secondary)", border: "var(--accent)", color: "var(--accent)", icon: "i" },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          pointerEvents: "none",
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const s = typeStyles[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 80, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={() => removeToast(t.id)}
                style={{
                  pointerEvents: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.75rem 1.1rem",
                  backgroundColor: s.bg,
                  border: `1px solid ${s.border}`,
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-md)",
                  cursor: "pointer",
                  minWidth: 260,
                  maxWidth: 380,
                }}
              >
                <span style={{ color: s.color, fontWeight: 700, fontSize: "1rem", flexShrink: 0 }}>
                  {s.icon}
                </span>
                <span style={{ color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: 500 }}>
                  {t.message}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
