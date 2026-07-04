"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/src/store/useAuthStore";
import { api, getApiErrorMessage } from "@/src/services/api";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import SocialLoginButtons from "@/src/components/SocialLoginButtons";

const PlayLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.push("/");
  }, [isAuthenticated, authLoading, router]);

  const detectInputType = (value: string): "email" | "mobile" => {
    const trimmed = value.trim();
    if (/^\+?\d{10,15}$/.test(trimmed.replace(/\s/g, ""))) return "mobile";
    if (/\S+@\S+\.\S+/.test(trimmed)) return "email";
    if (/^\d{10,15}$/.test(trimmed)) return "mobile";
    return "email";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = identifier.trim();
    if (!trimmed) return setError("Email or mobile number is required");
    if (!password) return setError("Password is required");

    setIsLoading(true);
    try {
      const inputType = detectInputType(trimmed);
      const payload =
        inputType === "mobile"
          ? { mobile: trimmed, password }
          : { email: trimmed, password };
      const response = await api.post("/users/login", payload);
      const { user } = response.data.data;
      const { login } = useAuthStore.getState();
      login(user);
      router.push("/");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Login failed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#050505" }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "#6B7280", fontWeight: 500, fontSize: 14 }}>
          Checking session...
        </motion.div>
      </div>
    );
  }
  if (isAuthenticated) return null;

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#050505",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background curves */}
      <div style={{
        position: "absolute",
        top: "-20%",
        right: "-10%",
        width: "60vw",
        height: "60vw",
        background: "radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(60px)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        bottom: "-30%",
        left: "-15%",
        width: "50vw",
        height: "50vw",
        background: "radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(80px)",
        pointerEvents: "none",
      }} />
      {/* Subtle curved shape */}
      <svg style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", opacity: 0.03, pointerEvents: "none" }} viewBox="0 0 800 1200" preserveAspectRatio="none">
        <path d="M800,0 Q600,300 700,600 Q800,900 600,1200 L800,1200 Z" fill="white" />
      </svg>
      <svg style={{ position: "absolute", top: 0, left: 0, width: "40%", height: "100%", opacity: 0.02, pointerEvents: "none" }} viewBox="0 0 600 1200" preserveAspectRatio="none">
        <path d="M0,0 Q200,400 100,800 Q0,1000 200,1200 L0,1200 Z" fill="white" />
      </svg>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 440, padding: "0 24px", position: "relative", zIndex: 10 }}
      >
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.05)",
          }}>
            <PlayLogo />
          </div>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", textAlign: "center", marginBottom: 8, letterSpacing: "-0.02em" }}>
          Welcome back
        </h1>
        <p style={{ color: "#A1A1AA", fontSize: 15, textAlign: "center", marginBottom: 32 }}>
          Sign in to continue to VideoTube
        </p>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              style={{
                padding: "10px 14px", backgroundColor: "rgba(239,68,68,0.10)", color: "#EF4444",
                borderRadius: 12, marginBottom: 24, fontSize: 13,
                border: "1px solid rgba(239,68,68,0.20)", display: "flex", alignItems: "center", gap: 8,
              }}>
              <XIcon /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Social Login */}
        <SocialLoginButtons />

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#A1A1AA" }}>Email or Mobile</label>
            <input
              type="text" required
              placeholder="alan.turing@example.com"
              className="input-field"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#A1A1AA" }}>Password</label>
              <Link href="/forgot-password" style={{ fontSize: 12, color: "#A1A1AA", fontWeight: 500, textDecoration: "none" }}>
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)", paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                onMouseDown={e => e.preventDefault()}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  color: "#6B7280", display: "flex", alignItems: "center",
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                }}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={isLoading}
            style={{
              width: "100%", height: 48, borderRadius: 14,
              backgroundColor: isLoading ? "rgba(255,69,58,0.5)" : "#FF453A",
              color: "#fff", fontSize: 14, fontWeight: 600,
              border: "none", cursor: isLoading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease", marginTop: 8,
            }}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Footer */}
        <p style={{ marginTop: 32, textAlign: "center", fontSize: 14, color: "#6B7280" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "#fff", fontWeight: 600, textDecoration: "none" }}>
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
