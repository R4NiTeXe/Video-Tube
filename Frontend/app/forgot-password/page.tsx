"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/src/services/api";
import Link from "next/link";
import { motion } from "framer-motion";
import MascotAnimation from "@/src/components/MascotAnimation";

const PlayLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
);

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState<"email" | "otp" | "password" | "none">("none");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setIsLoading(true);
    try {
      await api.post("/users/forgot-password-otp", { email });
      setSuccess("OTP sent to your email address.");
      setStep("otp");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to send OTP."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setIsLoading(true);
    try {
      const response = await api.post("/users/verify-reset-otp", { email, otp });
      setResetToken(response.data.data.resetToken);
      setSuccess("OTP verified. Please enter your new password.");
      setStep("password");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Invalid OTP."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      await api.post("/users/reset-password-otp", { resetToken, newPassword });
      setSuccess("Password reset successfully! Redirecting to login...");
      setStep("done");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to reset password."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex", overflow: "hidden" }}>

      {/* LEFT SIDE: FORM */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 10, backgroundColor: "var(--bg-primary)" }}>

        <header style={{ padding: "2rem", display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: "8px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
              <PlayLogo />
            </div>
            <span style={{ fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
              Video<span style={{ color: "var(--text-muted)" }}>Tube</span>
            </span>
          </Link>
        </header>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
            style={{ width: "100%", maxWidth: "400px" }}
          >
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem", letterSpacing: "-0.03em" }}>
              {step === "email" && "Reset your password"}
              {step === "otp" && "Verify OTP"}
              {step === "password" && "Set new password"}
              {step === "done" && "All done!"}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "2rem" }}>
              {step === "email" && "Enter your email and we'll send you a verification code."}
              {step === "otp" && `We sent a 6-digit code to ${email}`}
              {step === "password" && "Enter your new password below."}
              {step === "done" && "Your password has been reset successfully."}
            </p>

            {error && (
              <div style={{ padding: "0.75rem 1rem", backgroundColor: "var(--accent-light)", color: "var(--accent)", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", fontSize: "0.85rem", border: "1px solid var(--border-focus)" }}>
                {error}
              </div>
            )}
            {success && step !== "done" && (
              <div style={{ padding: "0.75rem 1rem", backgroundColor: "var(--success-light, #dcfce7)", color: "var(--success, #16a34a)", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", fontSize: "0.85rem", border: "1px solid var(--success, #16a34a)" }}>
                {success}
              </div>
            )}

            {/* STEP 1: Email */}
            {step === "email" && (
              <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Email address</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setActiveField("email")}
                    onBlur={() => setActiveField("none")}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading}
                  style={{ marginTop: "0.5rem", width: "100%", padding: "0.85rem" }}
                >
                  {isLoading ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>
            )}

            {/* STEP 2: OTP */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>6-digit OTP</label>
                  <input
                    type="text"
                    required
                    placeholder="000000"
                    className="input-field"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    onFocus={() => setActiveField("otp")}
                    onBlur={() => setActiveField("none")}
                    style={{ letterSpacing: "0.5em", textAlign: "center", fontSize: "1.25rem", fontWeight: 700 }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading || otp.length !== 6}
                  style={{ marginTop: "0.5rem", width: "100%", padding: "0.85rem" }}
                >
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }}
                >
                  Resend OTP
                </button>
              </form>
            )}

            {/* STEP 3: New Password */}
            {step === "password" && (
              <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>New Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Min. 8 characters"
                      className="input-field"
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onFocus={() => setActiveField("password")}
                      onBlur={() => setActiveField("none")}
                      style={{ paddingRight: "3.5rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      onMouseDown={(e) => e.preventDefault()}
                      style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--accent)", fontSize: "0.85rem", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Confirm Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Re-enter your password"
                    className="input-field"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setActiveField("none")}
                    onBlur={() => setActiveField("none")}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <span style={{ fontSize: "0.78rem", color: "var(--accent-warm, #f43f5e)" }}>Passwords do not match</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading || newPassword !== confirmPassword || newPassword.length < 8}
                  style={{ marginTop: "0.5rem", width: "100%", padding: "0.85rem" }}
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}

            {/* STEP 4: Done */}
            {step === "done" && (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "var(--success-light, #dcfce7)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success, #16a34a)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Redirecting to login...</p>
              </div>
            )}

            <p style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Remember your password?{" "}
              <Link href="/login" style={{ color: "var(--text-primary)", fontWeight: 700, textDecoration: "underline" }}>
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* RIGHT SIDE: MASCOT ANIMATION */}
      <div style={{ flex: 1.2, backgroundColor: "var(--bg-elevated)", borderLeft: "1px solid var(--border-light)" }} className="mascot-panel">
        <MascotAnimation activeField={activeField === "otp" ? "email" : activeField} isPasswordVisible={showPassword} isLoading={isLoading} />
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 900px) { .mascot-panel { display: none !important; } }
        @media (min-width: 901px) { .mascot-panel { display: flex !important; } }
      `}} />
    </div>
  );
}
