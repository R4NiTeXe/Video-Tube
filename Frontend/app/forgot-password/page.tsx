"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/src/services/api";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
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
  const [showPassword, setShowPassword] = useState(false);
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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-primary)",
        display: "flex",
        overflow: "hidden",
      }}
    >
      <PageMeta title="Forgot Password" description="Reset your VideoTube account password." noIndex />
      {/* LEFT SIDE: FORM */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 10,
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <header
          style={{
            padding: "2rem",
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
          }}
        >
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <PlayLogo />
            </div>
            <span
              style={{
                fontWeight: 800,
                fontSize: "1.2rem",
                letterSpacing: "-0.04em",
                color: "var(--text-primary)",
              }}
            >
              Video<span style={{ color: "var(--text-muted)" }}>Tube</span>
            </span>
          </Link>
        </header>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: "100%", maxWidth: "400px" }}
          >
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: "0.5rem",
                letterSpacing: "-0.03em",
              }}
            >
              {step === "identifier" && "Reset your password"}
              {step === "otp" && "Verify OTP"}
              {step === "choice" && "What would you like to do?"}
              {step === "password" && "Set new password"}
              {step === "done" && "All done!"}
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.95rem",
                marginBottom: "2rem",
              }}
            >
              {step === "identifier" &&
                "Enter your email or mobile number and we'll help you get back in."}
              {step === "otp" &&
                `We sent a 6-digit code to ${identifier}`}
              {step === "choice" &&
                "OTP verified! You can now reset your password or skip straight to login."}
              {step === "password" && "Enter your new password below."}
              {step === "done" && "Your password has been reset successfully."}
            </p>

            {error && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: "var(--accent-subtle)",
                  color: "var(--accent)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "1.5rem",
                  fontSize: "0.85rem",
                  border: "1px solid var(--border-focus)",
                }}
              >
                {error}
              </div>
            )}
            {success && step !== "done" && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: "var(--success-subtle)",
                  color: "var(--success, #16a34a)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "1.5rem",
                  fontSize: "0.85rem",
                  border: "1px solid var(--success, #16a34a)",
                }}
              >
                {success}
              </div>
            )}

            {/* STEP 1: Identifier */}
            {step === "identifier" && (
              <form
                onSubmit={handleSendOtp}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
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
                    style={{
                      ...inputFieldStyle,
                      ...inputFocusStyle("identifier"),
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    ...buttonStyle,
                    opacity: isLoading || !identifier ? 0.6 : 1,
                    cursor: isLoading || !identifier ? "not-allowed" : "pointer",
                  }}
                >
                  {isLoading ? "Sending OTP..." : "Continue"}
                </button>
              </form>
            )}

            {/* STEP 2: OTP */}
            {step === "otp" && (
              <form
                onSubmit={handleVerifyOtp}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    6-digit OTP
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="000000"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    onFocus={() => setActiveField("otp")}
                    onBlur={() => setActiveField("none")}
                    style={{
                      ...inputFieldStyle,
                      letterSpacing: "0.5em",
                      textAlign: "center",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      ...inputFocusStyle("otp"),
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  style={{
                    ...buttonStyle,
                    opacity: isLoading || otp.length !== 6 ? 0.6 : 1,
                    cursor: isLoading || otp.length !== 6 ? "not-allowed" : "pointer",
                  }}
                >
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={isLoading}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Resend OTP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setOtp("");
                    setStep("identifier");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Use a different email or number
                </button>
              </form>
            )}

            {/* STEP 4: Choice */}
            {step === "choice" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setStep("password")}
                  style={{
                    ...buttonStyle,
                    marginTop: 0,
                  }}
                >
                  Reset Password
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSkipAndLogin}
                  style={{
                    ...buttonStyle,
                    backgroundColor: "var(--elevated)",
                    color: "var(--text-primary)",
                    border: "1.5px solid var(--border)",
                    marginTop: 0,
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  {isLoading ? "Logging in..." : "Skip & Login"}
                </button>
              </div>
            )}

            {/* STEP 5: New Password */}
            {step === "password" && (
              <form
                onSubmit={handleResetPassword}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    New Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Password"
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onFocus={() => setActiveField("password")}
                      onBlur={() => setActiveField("none")}
                      style={{
                        ...inputFieldStyle,
                        paddingRight: "3.5rem",
                        ...inputFocusStyle("password"),
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      onMouseDown={(e) => e.preventDefault()}
                      style={{
                        position: "absolute",
                        right: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--accent)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onFocus={() => setActiveField("none")}
                    onBlur={() => setActiveField("none")}
                    style={{ ...inputFieldStyle }}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--accent-warm, #f43f5e)",
                      }}
                    >
                      Passwords do not match
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    newPassword !== confirmPassword ||
                    newPassword.length < 8
                  }
                  style={{
                    ...buttonStyle,
                    opacity:
                      isLoading ||
                      newPassword !== confirmPassword ||
                      newPassword.length < 8
                        ? 0.6
                        : 1,
                    cursor:
                      isLoading ||
                      newPassword !== confirmPassword ||
                      newPassword.length < 8
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}

            {/* STEP 6: Done */}
            {step === "done" && (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    backgroundColor: "var(--success-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.25rem",
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--success, #16a34a)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  Redirecting to login...
                </p>
              </div>
            )}

            {step === "identifier" && (
              <p
                style={{
                  marginTop: "2rem",
                  textAlign: "center",
                  fontSize: "0.9rem",
                  color: "var(--text-muted)",
                }}
              >
                Remember your password?{" "}
                <Link
                  href="/login"
                  style={{
                    color: "var(--text-primary)",
                    fontWeight: 700,
                    textDecoration: "underline",
                  }}
                >
                  Sign in
                </Link>
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {/* RIGHT SIDE: MASCOT ANIMATION */}
      <div
        style={{
          flex: 1.2,
          backgroundColor: "var(--elevated)",
          borderLeft: "1px solid var(--border)",
        }}
        className="mascot-panel"
      >
        <MascotAnimation
          activeField={
            activeField === "otp" || activeField === "identifier"
              ? "email"
              : activeField
          }
          isPasswordVisible={showPassword}
          isLoading={isLoading}
        />
      </div>

      
    </div>
  );
}
