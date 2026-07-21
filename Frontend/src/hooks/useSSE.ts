"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/src/store/useAuthStore";
import { API_BASE_URL } from "@/src/services/config";

const MAX_RETRIES = 10;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

// Simple logger for client-side
const logger = {
  warn: (msg: string) => console.warn(`[SSE] ${msg}`),
  error: (msg: string, err?: unknown) => console.error(`[SSE] ${msg}`, err),
};

export function useSSE() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY);
  const isMountedRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!isMountedRef.current || !isAuthenticated) return;

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const url = `${API_BASE_URL}/sse/notifications`;
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

      // Exponential backoff with jitter
      const delay = Math.min(retryDelayRef.current, MAX_RETRY_DELAY);
      const jitter = Math.random() * 0.5 * delay;
      const nextDelay = Math.min(delay * 2 + jitter, MAX_RETRY_DELAY);

      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        retryDelayRef.current = nextDelay;
        reconnectRef.current = setTimeout(connect, delay);
      } else {
        // Max retries reached - stop attempting
        logger?.warn?.("SSE max retries reached, stopping reconnection attempts");
      }
    };
  }, [isAuthenticated, queryClient]);

  // Handle page visibility - reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isAuthenticated && !isConnected) {
        retryCountRef.current = 0;
        retryDelayRef.current = INITIAL_RETRY_DELAY;
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isAuthenticated, isConnected, connect]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!isAuthenticated) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    connect();

    return () => {
      isMountedRef.current = false;
      if (esRef.current) esRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [isAuthenticated, connect]);

  return { isConnected };
}
