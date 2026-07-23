"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/src/store/useAuthStore";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageMeta } from "@/src/components/PageMeta";


export default function MobileLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.push("/");
  }, [isAuthenticated, authLoading, router]);


  if (authLoading) {
    return (
      <>
        <PageMeta title="Mobile Login" description="Login to VideoTube using your mobile number and OTP." noIndex />
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)", fontWeight: 500 }}>
            Checking session...
          </motion.div>
        </div>
      </>
    );
  }
  if (isAuthenticated) return null;

  return (
    <>
      <PageMeta title="Mobile Login" description="Login to VideoTube using your mobile number and OTP." noIndex />
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ width: "100%", maxWidth: "420px" }}>
        
        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "var(--text-primary)", fontWeight: 700, textDecoration: "underline" }}>Sign up</Link>
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            Or <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>login with email</Link>
          </p>
        </div>
      </motion.div>
    </div>
      </>
  );
}
