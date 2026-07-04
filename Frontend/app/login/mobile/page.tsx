"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/src/store/useAuthStore";
import { api, getApiErrorMessage } from "@/src/services/api";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const PlayLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);

export default function MobileLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.push("/");
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendOTP = async () => {
    setError("");
    if (!mobile.trim()) return setError("Mobile number is required");
    if (!/^\+?[1-9]\d{9,14}$/.test(mobile.trim())) return setError("Invalid mobile number format");

    setIsLoading(true);
    try {
      await api.post("/users/mobile/send-login-otp", { mobile: mobile.trim() });
      setOtpSent(true);
      setCooldown(60);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to send OTP"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setError("");
    const otpString = otp.join("");
    if (otpString.length !== 6) return setError("Enter the 6-digit OTP");

    setIsLoading(true);
    try {
      const response = await api.post("/users/mobile/login", { mobile: mobile.trim(), otp: otpString });
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

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.querySelector(`input[name="otp-${index - 1}"]`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)", fontWeight: 500 }}>
          Checking session...
        </motion.div>
      </div>
    );
  }
  if (isAuthenticated) return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ width: "100%", maxWidth: "420px" }}>
        {/* Header */}
        <header style={{ marginBottom: "2rem", textAlign: "center" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem", marginBottom: "1rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: "8px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <PlayLogo />
            </div>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
              Video<span style={{ color: "var(--text-muted)" }}>Tube</span>
            </span>
          </Link>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.3rem" }}>
            {otpSent ? "Enter OTP" : "Login with Mobile"}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            {otpSent ? `Code sent to ${mobile}` : "We'll send you a verification code"}
          </p>
        </header>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              style={{ padding: "0.7rem 1rem", backgroundColor: "var(--error-light)", color: "var(--error)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid var(--error)" }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Input */}
        {!otpSent && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Mobile Number</label>
              <input type="tel" placeholder="Phone number" className="input-field" value={mobile}
                onChange={e => setMobile(e.target.value)} autoFocus />
            </div>
            <button onClick={handleSendOTP} disabled={isLoading} className="btn-primary" style={{ width: "100%", padding: "0.85rem" }}>
              {isLoading ? "Sending..." : "Send OTP"}
            </button>
          </div>
        )}

        {/* OTP Input */}
        {otpSent && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              {otp.map((digit, i) => (
                <input key={i} name={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} autoFocus={i === 0}
                  value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                  style={{ width: 48, height: 56, textAlign: "center", fontSize: "1.3rem", fontWeight: 700, borderRadius: "var(--radius-md)",
                    border: "2px solid var(--border-light)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }} />
              ))}
            </div>
            <button onClick={handleLogin} disabled={isLoading} className="btn-primary" style={{ width: "100%", padding: "0.85rem" }}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
            <button onClick={handleSendOTP} disabled={cooldown > 0 || isLoading}
              style={{ background: "none", border: "none", color: cooldown > 0 ? "var(--text-muted)" : "var(--accent)", fontSize: "0.85rem", fontWeight: 600, cursor: cooldown > 0 ? "default" : "pointer" }}>
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
            </button>
          </div>
        )}

        {/* Footer */}
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
  );
}
