"use client";

import React, { useEffect } from "react";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useThemeStore } from "@/src/store/useThemeStore";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, setLoading } = useAuthStore();
  const hydrateTheme = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    hydrateTheme();
    const checkAuth = async () => {
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
  }, [login, logout, setLoading, hydrateTheme]);

  return <>{children}</>;
}
