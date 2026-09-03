"use client";

import React, { useEffect } from "react";
import { api, setCsrfToken } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useSSE } from "@/src/hooks/useSSE";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { login, logout, setLoading } = useAuthStore();
  useSSE();

  useEffect(() => {
    const init = async () => {
      let hasSession: boolean | null = null;
      try {
        const res = await api.get("/csrf-token");
        if (res.data?.csrfToken) {
          setCsrfToken(res.data.csrfToken);
        }
        // authenticated reflects presence of accessToken/refreshToken cookies
        hasSession = Boolean(res.data?.authenticated);
      } catch {
        /* non-fatal — fall through to try current-user anyway */
        hasSession = null;
      }

      const checkAuth = async () => {
        setLoading(true);
        if (hasSession === false) {
          logout();
          setLoading(false);
          return;
        }
        try {
          const response = await api.get("/users/current-user");
          login(response.data.data);
        } catch {
          // Only clear local state; api interceptor handles refresh/redirect for 401
          // hasSession null + current-user failure means no valid session
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
