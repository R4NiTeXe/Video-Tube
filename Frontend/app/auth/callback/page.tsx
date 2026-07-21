"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/src/store/useAuthStore";
import { api } from "@/src/services/api";
import { PageMeta } from "@/src/components/PageMeta";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const error = searchParams.get("error");
    const isNew = searchParams.get("isNew") === "true";

    if (error) {
      router.replace(`/login?error=${error}`);
      return;
    }

    if (isNew) sessionStorage.setItem("_welcome", "new");
    else sessionStorage.setItem("_welcome", "back");

    const fetchUser = async () => {
      try {
        const response = await api.get("/users/current-user");
        login(response.data.data);
        router.replace("/");
      } catch {
        router.replace("/login?error=auth_failed");
      }
    };
    fetchUser();
  }, [searchParams, login, router]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <p style={{ color: "var(--text-muted)" }}>Completing sign-in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <>
      <PageMeta title="Authenticating..." description="Completing your sign-in to VideoTube." noIndex />
      <Suspense fallback={
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--bg-primary)" }}>
          <p style={{ color: "var(--text-muted)" }}>Completing sign-in...</p>
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </>
  );
}
