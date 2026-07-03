"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/src/store/useAuthStore";
import { api } from "@/src/services/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const error = searchParams.get("error");

    if (error) {
      router.replace("/login?error=" + error);
      return;
    }

    if (accessToken && refreshToken) {
      const fetchUser = async () => {
        try {
          const response = await api.get("/users/current-user", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          login(response.data.data);
          router.replace("/");
        } catch {
          router.replace("/login?error=auth_failed");
        }
      };
      fetchUser();
    } else {
      router.replace("/login?error=auth_failed");
    }
  }, [searchParams, login, router]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <p style={{ color: "var(--text-muted)" }}>Completing sign-in...</p>
    </div>
  );
}
