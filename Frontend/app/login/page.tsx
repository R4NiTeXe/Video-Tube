"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/src/store/useAuthStore";
import { api, getApiErrorMessage } from "@/src/services/api";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import MascotAnimation from "@/src/components/MascotAnimation";
import SocialLoginButtons from "@/src/components/SocialLoginButtons";

const PlayLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
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
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

type AuthMethod = "email" | "mobile";
type ActiveField = "email" | "password" | "submit" | "none";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [method, setMethod] = useState<AuthMethod>("email");
  const [activeField, setActiveField] = useState<ActiveField>("none");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpStep, setOtpStep] = useState(false);
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

  const resetForm = () => {
    setOtpStep(false);
    setEmail("");
    setPassword("");
    setMobile("");
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("Email and password are required");

    setIsLoading(true);
    try {
      const response = await api.post("/users/login", { email: email.trim(), password });
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

  const handleSendOTP = async () => {
    setError("");
    if (!mobile.trim()) return setError("Mobile number is required");
    if (!/^\+?[1-9]\d{9,14}$/.test(mobile.trim())) return setError("Use +91XXXXXXXXXX format");

    setIsLoading(true);
    try {
      await api.post("/users/mobile/send-login-otp", { mobile: mobile.trim() });
      setOtpStep(true);
      setCooldown(60);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to send OTP"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginWithOTP = async () => {
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
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex", overflow: "hidden" }}>

      {/* LEFT: FORM */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 10, backgroundColor: "var(--bg-primary)", overflowY: "auto" }}>

        <header style={{ padding: "1.75rem 2rem", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: "8px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <PlayLogo />
            </div>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
              Video<span style={{ color: "var(--text-muted)" }}>Tube</span>
            </span>
          </Link>
        </header>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem 2rem 4rem" }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}
            style={{ width: "100%", maxWidth: "400px" }}
          >
            <h1 style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.4rem", letterSpacing: "-0.03em" }}>
              Welcome back
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.75rem" }}>
              Sign in to continue to VideoTube
            </p>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  style={{ padding: "0.7rem 1rem", backgroundColor: "var(--error-light)", color: "var(--error)", borderRadius: "var(--radius-md)", marginBottom: "1.25rem", fontSize: "0.85rem", border: "1px solid var(--error)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <XIcon /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Method Toggle */}
            <div style={{ display: "flex", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", overflow: "hidden", marginBottom: "1.25rem" }}>
              <button onClick={() => { setMethod("email"); resetForm(); }}
                style={{ flex: 1, padding: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                  backgroundColor: method === "email" ? "var(--accent)" : "transparent",
                  color: method === "email" ? "#fff" : "var(--text-secondary)",
                  border: "none" }}>
                <MailIcon /> Email
              </button>
              <button onClick={() => { setMethod("mobile"); resetForm(); }}
                style={{ flex: 1, padding: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                  backgroundColor: method === "mobile" ? "var(--accent)" : "transparent",
                  color: method === "mobile" ? "#fff" : "var(--text-secondary)",
                  border: "none" }}>
                <PhoneIcon /> Mobile
              </button>
            </div>

            {/* Email Login Form */}
            {method === "email" && (
              <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Email</label>
                  <input type="email" required placeholder="you@example.com" className="input-field"
                    value={email} onChange={e => setEmail(e.target.value)}
                    onFocus={() => setActiveField("email")} onBlur={() => setActiveField("none")} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Password</label>
                    <Link href="/forgot-password" style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
                      Forgot Password?
                    </Link>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input type={showPassword ? "text" : "password"} required placeholder="Min. 8 characters" className="input-field"
                      value={password} onChange={e => setPassword(e.target.value)}
                      onFocus={() => setActiveField("password")} onBlur={() => setActiveField("none")}
                      style={{ paddingRight: "3rem" }} />
                    <button type="button" onClick={() => setShowPassword(p => !p)} onMouseDown={e => e.preventDefault()}
                      style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}>
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="btn-primary"
                  onMouseEnter={() => setActiveField("submit")} onMouseLeave={() => setActiveField("none")}
                  style={{ marginTop: "0.5rem", width: "100%", padding: "0.85rem" }}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            )}

            {/* Mobile Login */}
            {method === "mobile" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                {!otpStep ? (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Mobile Number</label>
                      <input type="tel" placeholder="+91 9876543210" className="input-field"
                        value={mobile} onChange={e => setMobile(e.target.value)}
                        onFocus={() => setActiveField("none")} onBlur={() => setActiveField("none")} autoFocus />
                    </div>
                    <button onClick={handleSendOTP} disabled={isLoading} className="btn-primary"
                      onMouseEnter={() => setActiveField("submit")} onMouseLeave={() => setActiveField("none")}
                      style={{ marginTop: "0.5rem", width: "100%", padding: "0.85rem" }}>
                      {isLoading ? "Sending..." : "Send OTP"}
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>
                      OTP sent to {mobile}
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                      {otp.map((digit, i) => (
                        <input key={i} name={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} autoFocus={i === 0}
                          value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                          onFocus={() => setActiveField("none")} onBlur={() => setActiveField("none")}
                          style={{ width: 48, height: 56, textAlign: "center", fontSize: "1.3rem", fontWeight: 700, borderRadius: "var(--radius-md)",
                            border: "2px solid var(--border-light)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }} />
                      ))}
                    </div>
                    <button onClick={handleLoginWithOTP} disabled={isLoading} className="btn-primary"
                      onMouseEnter={() => setActiveField("submit")} onMouseLeave={() => setActiveField("none")}
                      style={{ width: "100%", padding: "0.85rem" }}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </button>
                    <button onClick={handleSendOTP} disabled={cooldown > 0 || isLoading}
                      style={{ background: "none", border: "none", color: cooldown > 0 ? "var(--text-muted)" : "var(--accent)", fontSize: "0.82rem", fontWeight: 600, cursor: cooldown > 0 ? "default" : "pointer", textAlign: "center" }}>
                      {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.5rem 0" }}>
              <div style={{ flex: 1, height: 1, backgroundColor: "var(--border-light)" }} />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>or continue with</span>
              <div style={{ flex: 1, height: 1, backgroundColor: "var(--border-light)" }} />
            </div>

            <SocialLoginButtons />

            <p style={{ marginTop: "1.75rem", textAlign: "center", fontSize: "0.88rem", color: "var(--text-muted)" }}>
              Don&apos;t have an account?{" "}
              <Link href="/register" style={{ color: "var(--text-primary)", fontWeight: 700, textDecoration: "underline" }}>
                Sign up
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* RIGHT: MASCOT */}
      <div style={{ flex: 1.2, backgroundColor: "var(--bg-elevated)", borderLeft: "1px solid var(--border-medium)" }} className="mascot-panel">
        <MascotAnimation
          activeField={activeField}
          isPasswordVisible={showPassword}
          isLoading={isLoading}
          passwordMatch="idle"
        />
      </div>

      <style dangerouslySetInnerHTML={{__html:`
        @media (max-width:900px)  { .mascot-panel { display:none !important; } }
        @media (min-width:901px)  { .mascot-panel { display:flex !important; } }
      `}}/>
    </div>
  );
}
