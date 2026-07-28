"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/src/store/useAuthStore";
import { API_BASE_URL } from "@/src/services/config";

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 2000;
const MAX_RETRY_DELAY = 30000;

const logger = {
  warn: (msg: string) => console.warn(`[SSE] ${msg}`),
  error: (msg: string, err?: unknown) => console.error(`[SSE] ${msg}`, err),
};

export function useSSE() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY);
  const isMountedRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!isMountedRef.current || !authRef.current) return;

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const url = `${API_BASE_URL}/sse/notifications${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      if (!isMountedRef.current) {
        es.close();
        return;
      }
      setIsConnected(true);
      retryCountRef.current = 0;
      retryDelayRef.current = INITIAL_RETRY_DELAY;
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "notification") {
          queryClient.invalidateQueries({ queryKey: ["unreadNotifications"] });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      es.close();

      // If authentication was lost, stop retrying immediately
      if (!authRef.current) {
        logger?.warn?.("SSE stopped — not authenticated");
        return;
      }

      // Check session validity before retrying — the cookie may have an expired token
      // even though the store says we're authenticated (stale Bearer token in localStorage).
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        const delay = Math.min(retryDelayRef.current, MAX_RETRY_DELAY);
        const jitter = Math.random() * 0.5 * delay;
        retryDelayRef.current = Math.min(delay * 2 + jitter, MAX_RETRY_DELAY);

        reconnectRef.current = setTimeout(async () => {
          if (!isMountedRef.current || !authRef.current) return;

          try {
            const sessionToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
            const sessionUrl = `${API_BASE_URL}/users/current-user${sessionToken ? `?token=${encodeURIComponent(sessionToken)}` : ""}`;
            const res = await fetch(sessionUrl, {
              credentials: "include",
            });
            if (res.ok && isMountedRef.current) {
              connect();
            } else if (isMountedRef.current) {
              logger?.warn?.("SSE stopped — session check failed");
              retryCountRef.current = MAX_RETRIES;
            }
          } catch {
            if (isMountedRef.current) connect();
          }
        }, delay);
      } else {
        logger?.warn?.("SSE max retries reached, stopping reconnection attempts");
      }
    };
  }, [queryClient]);

  // Handle page visibility - reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && authRef.current && !isConnected) {
        retryCountRef.current = 0;
        retryDelayRef.current = INITIAL_RETRY_DELAY;
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isConnected, connect]);

  useEffect(() => {
    isMountedRef.current = true;

    // Don't connect until AuthProvider has verified the session
    if (isLoading || !authRef.current) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setIsConnected(false);
      retryCountRef.current = MAX_RETRIES;
      return;
    }

    connect();

    return () => {
      isMountedRef.current = false;
      if (esRef.current) esRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [isAuthenticated, isLoading, connect]);

  return { isConnected };
}
