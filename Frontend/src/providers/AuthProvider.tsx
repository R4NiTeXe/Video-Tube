"use client";

import React, { useEffect } from "react";
import { api, setCsrfToken } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useSSE } from "@/src/hooks/useSSE";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, setLoading } = useAuthStore();
  useSSE();

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get("/csrf-token");
        if (res.data?.csrfToken) {
          setCsrfToken(res.data.csrfToken);
        }
      } catch { /* non-fatal */ }

      const checkAuth = async () => {
        setLoading(true);
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
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
