"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/src/services/api";
import Link from "next/link";
import dynamic from "next/dynamic";

import { useAuthStore } from "@/src/store/useAuthStore";
import { PageMeta } from "@/src/components/PageMeta";

const MascotAnimation = dynamic(() => import("@/src/components/MascotAnimation"), { ssr: false });

const PlayLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

type Step = "identifier" | "otp" | "choice" | "password" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState<
    "identifier" | "otp" | "password" | "none"
  >("none");

  const detectInputType = (value: string): "email" | "mobile" => {
    const trimmed = value.trim();
    if (/^\+?\d{10,15}$/.test(trimmed.replace(/\s/g, ""))) return "mobile";
    return "email";
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setSuccess("");
    const trimmed = identifier.trim();
    if (!trimmed) return setError("Email or mobile number is required");
    setIsLoading(true);
    try {
      await api.post("/users/send-forgot-otp", { identifier: trimmed });
      const type = detectInputType(trimmed);
      setSuccess(`OTP sent via ${type === "email" ? "email" : "WhatsApp"}.`);
      setStep("otp");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to send OTP."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    try {
      const response = await api.post("/users/verify-forgot-otp", {
        identifier: identifier.trim(),
        otp,
      });
      setResetToken(response.data.data.resetToken);
      setStep("choice");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Invalid OTP."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      await api.post("/users/reset-password-token", {
        resetToken,
        newPassword,
      });
      setStep("done");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to reset password."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipAndLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      const response = await api.post("/users/skip-and-login", { resetToken });
      const { user } = response.data.data;
      login(user);
      router.push("/");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to log in."));
    } finally {
      setIsLoading(false);
    }
  };

  const inputFieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.8rem 1rem",
    borderRadius: "var(--radius-md)",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  };

  const inputFocusStyle = (target: typeof activeField): React.CSSProperties =>
    activeField === target
      ? { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-glow, rgba(99,102,241,0.15))" }
      : {};

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.85rem",
    borderRadius: "var(--radius-md)",
    border: "none",
    backgroundColor: "var(--accent)",
    color: "#fff",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "0.5rem",
    transition: "opacity 0.2s",
  };

  return (
    <>
      <PageMeta title="Forgot Password" description="Reset your VideoTube account password." noIndex />
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--bg-primary)",
          display: "flex",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "2rem 4rem",
            maxWidth: 560,
            margin: "0 auto",
            overflowY: "auto",
          }}
        >
          <div style={{ marginBottom: "2rem" }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-primary)", fontWeight: 800, fontSize: "1.25rem", textDecoration: "none", marginBottom: "1.5rem" }}>
              <PlayLogo /> VideoTube
            </Link>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {step === "password" ? "Reset your password" : step === "choice" ? "Choose action" : step === "otp" ? "Enter OTP" : "Forgot Password?"}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              {step === "password" ? "Enter your new password below" : step === "choice" ? "You verified your account. Reset password or login directly." : step === "otp" ? "Enter the verification code sent to your email/phone" : "Enter your email or phone number to receive a verification code"}
            </p>
          </div>

          {error && (
            <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", backgroundColor: "rgba(220, 38, 38, 0.1)", border: "1px solid var(--error)", color: "var(--error)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", backgroundColor: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--success)", color: "var(--success)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              {success}
            </div>
          )}

          {step === "identifier" && (
            <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Email or mobile number
                </label>
                <input
                  type="text"
                  required
                  placeholder="Email or phone"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onFocus={() => setActiveField("identifier")}
                  onBlur={() => setActiveField("none")}
                  style={{ ...inputFieldStyle, ...inputFocusStyle("identifier") }}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !identifier}
                style={{ ...buttonStyle, opacity: isLoading || !identifier ? 0.6 : 1, cursor: isLoading || !identifier ? "not-allowed" : "pointer" }}
              >
                {isLoading ? "Sending OTP..." : "Continue"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Verification Code (OTP)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  onFocus={() => setActiveField("otp")}
                  onBlur={() => setActiveField("none")}
                  style={{ ...inputFieldStyle, ...inputFocusStyle("otp") }}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !otp}
                style={{ ...buttonStyle, opacity: isLoading || !otp ? 0.6 : 1, cursor: isLoading || !otp ? "not-allowed" : "pointer" }}
              >
                {isLoading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}

          {step === "choice" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setStep("password")}
                style={{ ...buttonStyle, marginTop: 0 }}
              >
                Reset Password
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleSkipAndLogin}
                style={{ ...buttonStyle, backgroundColor: "var(--elevated)", color: "var(--text-primary)", border: "1.5px solid var(--border)", marginTop: 0, opacity: isLoading ? 0.6 : 1 }}
              >
                {isLoading ? "Logging in..." : "Skip & Login"}
              </button>
            </div>
          )}

          {step === "password" && (
            <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  New Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={() => setActiveField("password")}
                  onBlur={() => setActiveField("none")}
                  style={{ ...inputFieldStyle, ...inputFocusStyle("password") }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setActiveField("password")}
                  onBlur={() => setActiveField("none")}
                  style={{ ...inputFieldStyle, ...inputFocusStyle("password") }}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                style={{ ...buttonStyle, opacity: isLoading || !newPassword ? 0.6 : 1, cursor: isLoading ? "not-allowed" : "pointer" }}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          {step === "done" && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "var(--success-subtle)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success, #16a34a)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Password Reset Complete</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Redirecting to login...</p>
            </div>
          )}

          {step === "identifier" && (
            <p style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Remember your password?{" "}
              <Link href="/login" style={{ color: "var(--text-primary)", fontWeight: 700, textDecoration: "underline" }}>
                Sign in
              </Link>
            </p>
          )}
        </div>

        <div style={{ flex: 1.2, backgroundColor: "var(--elevated)", borderLeft: "1px solid var(--border)" }} className="mascot-panel">
          <MascotAnimation
            activeField={activeField === "otp" || activeField === "identifier" ? "email" : activeField}
            isPasswordVisible={showPassword}
            isLoading={isLoading}
          />
        </div>
      </div>
    </>
  );
}
