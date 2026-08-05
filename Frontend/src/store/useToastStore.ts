import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  type?: "success" | "error" | "info";
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, type?: Toast["type"]) => void;
  dismiss: (id: number) => void;
}

let _nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, type = "info") => {
    const id = _nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
