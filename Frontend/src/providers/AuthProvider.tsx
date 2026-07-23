"use client";

import React, { useEffect } from "react";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useThemeStore } from "@/src/store/useThemeStore";
import { useSSE } from "@/src/hooks/useSSE";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, setLoading, isAuthenticated } = useAuthStore();
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  useSSE();

  useEffect(() => {
    hydrateTheme();
    const checkAuth = async () => {
      // If already authenticated from persisted session, verify silently in background
      // without setting isLoading=true (avoids page flash on navigation)
      if (!isAuthenticated) {
        setLoading(true);
      }
      try {
        const response = await api.get("/users/current-user");
        login(response.data.data);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
