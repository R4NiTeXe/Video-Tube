"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/src/store/useAuthStore";
import { api, getApiErrorMessage } from "@/src/services/api";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { PageMeta } from "@/src/components/PageMeta";
import { COUNTRIES } from "@/src/lib/countries";
import SocialLoginButtons from "@/src/components/SocialLoginButtons";

const MascotAnimation = dynamic(() => import("@/src/components/MascotAnimation"), { ssr: false });


const UploadImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
  </svg>
);

type Step = "details" | "otp" | "done";
type ActiveField = "name" | "username" | "email" | "password" | "confirmPassword" | "avatar" | "cover" | "submit" | "none";

const OTP_LENGTH = 6;
const COOLDOWN_SECONDS = 60;



function PasswordStrengthBar({ password }: { password: string }) {
  let score = 0;
  const checks = [
    { label: "8-16 characters", pass: password.length >= 8 && password.length <= 16 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "Lowercase letter", pass: /[a-z]/.test(password) },
    { label: "Number", pass: /[0-9]/.test(password) },
    { label: "Special character", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  checks.forEach((c) => { if (c.pass) score++; });
  const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const colors = ["#dc2626", "#f97316", "#eab308", "#22c55e", "#16a34a"];
  const level = Math.min(score, 4);
  if (!password) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <div style={{ display: "flex", gap: "3px" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, backgroundColor: i < score ? colors[level] : "var(--elevated)", transition: "background-color 0.2s" }} />
        ))}
      </div>
      <span style={{ fontSize: "0.72rem", color: colors[level], fontWeight: 600 }}>{labels[level]}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem 0.6rem" }}>
        {checks.map((c) => (
          <span key={c.label} style={{ fontSize: "0.68rem", color: c.pass ? "var(--success)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
            {c.pass ? "✓" : "×"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const avatarRef = useRef<HTMLInputElement>(null);


  const [step, setStep] = useState<Step>("details");

  
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    mobile: "",
    countryCode: "+91",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarName, setAvatarName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile] = useState<File | null>(null);

  
  const [emailOtp, setEmailOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [mobileOtp, setMobileOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [verifyChannel, setVerifyChannel] = useState<"email" | "whatsapp" | null>(null);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [mobileCooldown, setMobileCooldown] = useState(0);
  const [emailOtpError, setEmailOtpError] = useState("");
  const [mobileOtpError, setMobileOtpError] = useState("");
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [mobileVerifying, setMobileVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const emailOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const mobileOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  
  const [activeField, setActiveField] = useState<ActiveField>("none");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const fullMobile = `${formData.countryCode}${formData.mobile}`;

  
  useEffect(() => {
    if (!authLoading && isAuthenticated) router.push("/");
  }, [isAuthenticated, authLoading, router]);

  
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setTimeout(() => setEmailCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailCooldown]);

  useEffect(() => {
    if (mobileCooldown <= 0) return;
    const t = setTimeout(() => setMobileCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [mobileCooldown]);

  
  const passwordMatch: "idle" | "match" | "mismatch" =
    confirmPassword.length === 0
      ? "idle"
      : formData.password === confirmPassword
        ? "match"
        : "mismatch";

  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarName(file.name); setAvatarPreview(URL.createObjectURL(file)); setAvatarFile(file); }
  };


  
  const handleOtpChange = (
    index: number,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    isEmail: boolean,
  ) => {
    if (value.length > 1) return;
    const next = [...(isEmail ? emailOtp : mobileOtp)];
    next[index] = value;
    setter(next);
    if (value && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    _setter: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    isEmail: boolean,
  ) => {
    if (e.key === "Backspace" && !(isEmail ? emailOtp : mobileOtp)[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pasted.length > 0) {
      const next = Array(OTP_LENGTH).fill("");
      for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
      setter(next);
      refs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    }
  };

  
  const sendOtps = useCallback(async (channel?: "email" | "whatsapp") => {
    setSendingOtp(true);
    setError("");
    try {
      await api.post("/users/send-registration-otp", {
        email: formData.email,
        mobile: fullMobile,
        channel: channel || "email",
      });
      if (channel === "whatsapp") {
        setMobileCooldown(COOLDOWN_SECONDS);
      } else {
        setEmailCooldown(COOLDOWN_SECONDS);
      }
      setTimeout(() => {
        if (channel === "whatsapp") mobileOtpRefs.current[0]?.focus();
        else emailOtpRefs.current[0]?.focus();
      }, 100);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to send OTP."));
    } finally {
      setSendingOtp(false);
    }
  }, [formData.email, fullMobile]);

  
  const verifyOtp = async (identifier: string, otp: string, isEmail: boolean) => {
    if (isEmail) setEmailVerifying(true);
    else setMobileVerifying(true);

    if (isEmail) setEmailOtpError("");
    else setMobileOtpError("");

    try {
      await api.post("/users/verify-registration-otp", { identifier, otp });
      if (isEmail) setEmailVerified(true);
      else setMobileVerified(true);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, "Invalid OTP.");
      if (isEmail) setEmailOtpError(msg);
      else setMobileOtpError(msg);
    } finally {
      if (isEmail) setEmailVerifying(false);
      else setMobileVerifying(false);
    }
  };

  
  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 8 || formData.password.length > 16) {
      setError("Password must be 8-16 characters.");
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[a-z]/.test(formData.password)) {
      setError("Password must contain at least one lowercase letter.");
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError("Password must contain at least one number.");
      return;
    }
    if (!/[^A-Za-z0-9]/.test(formData.password)) {
      setError("Password must contain at least one special character.");
      return;
    }
    if (!avatarFile) {
      setError("Profile photo is required.");
      return;
    }
    if (!formData.mobile.match(/^\d{7,15}$/)) {
      setError("Please enter a valid mobile number.");
      return;
    }

    setStep("otp");
  };

  
  const bothVerified = emailVerified || mobileVerified;

  const handleFinalRegister = async () => {
    if (!bothVerified) return;
    setIsLoading(true);
    setError("");
    setStatusText("Uploading your images...");

    if (!avatarFile) {
      setError("Profile photo is required.");
      setIsLoading(false);
      return;
    }

    const data = new FormData();
    data.append("fullName", formData.fullName);
    data.append("username", formData.username.toLowerCase());
    data.append("email", formData.email);
    data.append("mobile", fullMobile);
    data.append("password", formData.password);
    data.append("avatar", avatarFile);
    if (coverFile) data.append("coverImage", coverFile);

    try {
      const response = await api.post("/users/register-unified", data, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (evt.total && evt.loaded >= evt.total) setStatusText("Creating your account...");
        },
      });
      const { user } = response.data.data;
      const { login } = useAuthStore.getState();
      login(user);
      setStep("done");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Registration failed."));
      setIsLoading(false);
      setStatusText("");
    }
  };

  
  useEffect(() => {
    if (step === "done") {
      const t = setTimeout(() => router.push("/"), 2500);
      return () => clearTimeout(t);
    }
    return;
  }, [step, router]);

  
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


  const confirmBorderClass =
    passwordMatch === "match" ? "input input-success" :
    passwordMatch === "mismatch" ? "input input-error" : "input";

  
  const stepNumber = step === "details" ? 1 : step === "otp" ? 2 : 3;
  const stepTitle = step === "details"
    ? "Create an account"
    : step === "otp"
      ? "Verify your identity"
      : "Welcome aboard!";
  const stepSub = step === "details"
    ? "Join VideoTube today — it is free"
    : step === "otp"
      ? "We sent a code to your email and phone"
      : "Your account is ready. Redirecting...";

  return (
    <>
      <PageMeta title="Create Account" description="Join VideoTube today — create your account and start sharing videos." noIndex />
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "2rem 4rem", maxWidth: 560, margin: "0 auto", overflowY: "auto" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Step {stepNumber} of 3
            </span>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.25rem" }}>
              {stepTitle}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              {stepSub}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SocialLoginButtons />

                <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", margin: "var(--sp-3) 0" }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
                  <span className="text-caption" style={{ color: "var(--text-muted)" }}>or register with</span>
                  <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
                </div>

                <form onSubmit={handleDetailsSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                    <label htmlFor="reg-fullname" className="text-caption" style={{ color: "var(--text-secondary)" }}>Full Name <span style={{ color: "var(--accent)" }}>*</span></label>
                    <input type="text" required placeholder="Full name" className="input" id="reg-fullname"
                      value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      onFocus={() => setActiveField("name")} onBlur={() => setActiveField("none")} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                    <label htmlFor="reg-username" className="text-caption" style={{ color: "var(--text-secondary)" }}>Username <span style={{ color: "var(--accent)" }}>*</span></label>
                    <input type="text" required placeholder="Username" className="input" id="reg-username"
                      value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      onFocus={() => setActiveField("username")} onBlur={() => setActiveField("none")} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                    <label htmlFor="reg-email" className="text-caption" style={{ color: "var(--text-secondary)" }}>Email Address <span style={{ color: "var(--accent)" }}>*</span></label>
                    <input type="email" required placeholder="Email address" className="input" id="reg-email"
                      value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      onFocus={() => setActiveField("email")} onBlur={() => setActiveField("none")} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                    <label htmlFor="reg-mobile" className="text-caption" style={{ color: "var(--text-secondary)" }}>Mobile Number <span style={{ color: "var(--accent)" }}>*</span></label>
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                      <select value={formData.countryCode} onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })} className="input" style={{ width: "110px", flexShrink: 0 }}>
                        {COUNTRIES.map((c) => (
                          <option key={`${c.code}-${c.iso}`} value={c.code}>{c.iso.toUpperCase()} {c.code}</option>
                        ))}
                      </select>
                      <input type="tel" required placeholder="Mobile number" className="input" id="reg-mobile" style={{ flex: 1 }}
                        value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        onFocus={() => setActiveField("name")} onBlur={() => setActiveField("none")} />
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                    <label htmlFor="reg-password" className="text-caption" style={{ color: "var(--text-secondary)" }}>Password <span style={{ color: "var(--accent)" }}>*</span></label>
                    <div className="password-field" style={{ position: "relative" }}>
                      <input type={showPassword ? "text" : "password"} required placeholder="Password" className="input" id="reg-password" autoComplete="new-password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        onFocus={() => setActiveField("password")} onBlur={() => setActiveField("none")}
                        style={{ paddingRight: "var(--sp-12)" }} />
                      <button type="button" className="password-toggle" onClick={() => setShowPassword((p) => !p)} onMouseDown={(e) => e.preventDefault()}
                        aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                    <PasswordStrengthBar password={formData.password} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                    <label htmlFor="reg-confirm" className="text-caption" style={{ color: "var(--text-secondary)" }}>Confirm Password <span style={{ color: "var(--accent)" }}>*</span></label>
                    <div className="password-field" style={{ position: "relative" }}>
                      <input type={showConfirmPassword ? "text" : "password"} required placeholder="Confirm Password" className={confirmBorderClass} id="reg-confirm" autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onFocus={() => setActiveField("confirmPassword")} onBlur={() => setActiveField("none")}
                        style={{ paddingRight: "var(--sp-12)" }} />
                      <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((p) => !p)} onMouseDown={(e) => e.preventDefault()}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                        {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                    <label className="text-caption" style={{ color: "var(--text-secondary)" }}>
                      Profile Photo <span style={{ color: "var(--accent)" }}>*</span>
                    </label>
                    <div className={`upload-zone ${avatarPreview ? "has-file" : ""}`}
                      onClick={() => avatarRef.current?.click()}
                      onMouseEnter={() => setActiveField("avatar")} onMouseLeave={() => setActiveField("none")}
                      style={{ flexDirection: "row", gap: "var(--sp-3)", padding: "var(--sp-3)", justifyContent: "flex-start", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1.5px dashed var(--border)", cursor: "pointer", transition: "all 0.2s" }}>
                      <input type="file" ref={avatarRef} accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar preview" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <UploadImageIcon />
                      )}
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {avatarName || "Choose profile image"}
                      </span>
                    </div>
                  </div>

                  {error && <p style={{ color: "var(--error)", fontSize: "0.82rem" }}>{error}</p>}

                  <button type="submit" className="btn btn-primary" style={{ padding: "0.85rem", marginTop: "var(--sp-2)" }}>
                    Continue to Verification
                  </button>

                  <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "var(--sp-2)" }}>
                    Already have an account?{" "}
                    <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>Sign in</Link>
                  </p>
                </form>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <form style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                  {!verifyChannel && !emailVerified && !mobileVerified && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
                    >
                      <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", textAlign: "center", marginBottom: "0.5rem" }}>
                        Choose how to verify your account:
                      </p>
                      <button
                        type="button"
                        onClick={() => { setVerifyChannel("email"); sendOtps("email"); }}
                        disabled={sendingOtp}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.75rem",
                          padding: "1rem 1.2rem",
                          borderRadius: "var(--radius-md)",
                          border: "1.5px solid var(--border)",
                          backgroundColor: "var(--bg-secondary)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.backgroundColor = "var(--accent-subtle)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.backgroundColor = "var(--bg-secondary)"; }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                          <MailIcon />
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>Verify via Email</p>
                          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>OTP sent to {formData.email}</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setVerifyChannel("whatsapp"); sendOtps("whatsapp"); }}
                        disabled={sendingOtp}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.75rem",
                          padding: "1rem 1.2rem",
                          borderRadius: "var(--radius-md)",
                          border: "1.5px solid var(--border)",
                          backgroundColor: "var(--bg-secondary)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.backgroundColor = "var(--accent-subtle)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.backgroundColor = "var(--bg-secondary)"; }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                          <PhoneIcon />
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>Verify via WhatsApp</p>
                          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>OTP sent to {fullMobile}</p>
                        </div>
                      </button>
                    </motion.div>
                  )}

                  {verifyChannel === "email" && !emailVerified && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: "1.2rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--bg-secondary)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div style={{ color: "var(--accent)", display: "flex" }}><MailIcon /></div>
                        <div>
                          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>Email OTP</p>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formData.email}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1rem" }}>
                        {emailOtp.map((digit, i) => (
                          <input key={i} ref={(el) => { emailOtpRefs.current[i] = el; }}
                            type="text" inputMode="numeric" maxLength={1} value={digit}
                            aria-label={`OTP digit ${i + 1}`}
                            onChange={(e) => handleOtpChange(i, e.target.value, setEmailOtp, emailOtpRefs, true)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e, setEmailOtp, emailOtpRefs, true)}
                            onPaste={(e) => handleOtpPaste(e, setEmailOtp, emailOtpRefs)}
                            style={{ width: 44, height: 48, textAlign: "center", fontSize: "1.15rem", fontWeight: 700, borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", outline: "none" }} />
                        ))}
                      </div>
                      {emailOtpError && <p style={{ fontSize: "0.78rem", color: "var(--error)", textAlign: "center", marginBottom: "0.75rem" }}>{emailOtpError}</p>}
                      <div style={{ display: "flex", gap: "0.6rem" }}>
                        <button type="button" disabled={emailVerifying || emailOtp.join("").length < OTP_LENGTH}
                          onClick={() => verifyOtp(formData.email, emailOtp.join(""), true)}
                          className="btn btn-primary" style={{ flex: 1, padding: "0.7rem", fontSize: "0.82rem" }}>
                          {emailVerifying ? "Verifying..." : "Verify Email"}
                        </button>
                        <button type="button" disabled={emailCooldown > 0 || sendingOtp}
                          onClick={() => { sendOtps("email"); setEmailOtp(Array(OTP_LENGTH).fill("")); setEmailOtpError(""); }}
                          style={{ padding: "0.7rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", backgroundColor: "var(--bg-secondary)", color: emailCooldown > 0 ? "var(--text-muted)" : "var(--text-primary)", fontSize: "0.78rem", fontWeight: 600, cursor: emailCooldown > 0 ? "not-allowed" : "pointer" }}>
                          {emailCooldown > 0 ? `${emailCooldown}s` : "Resend"}
                        </button>
                      </div>
                      <button type="button" onClick={() => setVerifyChannel(null)}
                        style={{ marginTop: "0.75rem", background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", width: "100%", textAlign: "center" }}>
                        Use a different method
                      </button>
                    </motion.div>
                  )}

                  {verifyChannel === "whatsapp" && !mobileVerified && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: "1.2rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--bg-secondary)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div style={{ color: "#25D366", display: "flex" }}><PhoneIcon /></div>
                        <div>
                          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>WhatsApp OTP</p>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{fullMobile}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1rem" }}>
                        {mobileOtp.map((digit, i) => (
                          <input key={i} ref={(el) => { mobileOtpRefs.current[i] = el; }}
                            type="text" inputMode="numeric" maxLength={1} value={digit}
                            aria-label={`OTP digit ${i + 1}`}
                            onChange={(e) => handleOtpChange(i, e.target.value, setMobileOtp, mobileOtpRefs, false)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e, setMobileOtp, mobileOtpRefs, false)}
                            onPaste={(e) => handleOtpPaste(e, setMobileOtp, mobileOtpRefs)}
                            style={{ width: 44, height: 48, textAlign: "center", fontSize: "1.15rem", fontWeight: 700, borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", outline: "none" }} />
                        ))}
                      </div>
                      {mobileOtpError && <p style={{ fontSize: "0.78rem", color: "var(--error)", textAlign: "center", marginBottom: "0.75rem" }}>{mobileOtpError}</p>}
                      <div style={{ display: "flex", gap: "0.6rem" }}>
                        <button type="button" disabled={mobileVerifying || mobileOtp.join("").length < OTP_LENGTH}
                          onClick={() => verifyOtp(fullMobile, mobileOtp.join(""), false)}
                          className="btn btn-primary" style={{ flex: 1, padding: "0.7rem", fontSize: "0.82rem", backgroundColor: "#25D366" }}>
                          {mobileVerifying ? "Verifying..." : "Verify WhatsApp"}
                        </button>
                        <button type="button" disabled={mobileCooldown > 0 || sendingOtp}
                          onClick={() => { sendOtps("whatsapp"); setMobileOtp(Array(OTP_LENGTH).fill("")); setMobileOtpError(""); }}
                          style={{ padding: "0.7rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", backgroundColor: "var(--bg-secondary)", color: mobileCooldown > 0 ? "var(--text-muted)" : "var(--text-primary)", fontSize: "0.78rem", fontWeight: 600, cursor: mobileCooldown > 0 ? "not-allowed" : "pointer" }}>
                          {mobileCooldown > 0 ? `${mobileCooldown}s` : "Resend"}
                        </button>
                      </div>
                      <button type="button" onClick={() => setVerifyChannel(null)}
                        style={{ marginTop: "0.75rem", background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", width: "100%", textAlign: "center" }}>
                        Use a different method
                      </button>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {(emailVerified || mobileVerified) && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", padding: "0.9rem", borderRadius: "var(--radius-md)", backgroundColor: "rgba(34, 197, 94, 0.06)", border: "1.5px solid var(--success)" }}>
                        <ShieldCheckIcon />
                        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--success)" }}>
                          {emailVerified && mobileVerified ? "Both verified!" : emailVerified ? "Email verified!" : "Mobile verified!"}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button type="button" disabled={!(emailVerified || mobileVerified) || isLoading}
                    onClick={handleFinalRegister} className="btn btn-primary"
                    whileHover={(emailVerified || mobileVerified) && !isLoading ? { scale: 1.01 } : {}}
                    whileTap={(emailVerified || mobileVerified) && !isLoading ? { scale: 0.98 } : {}}
                    style={{ width: "100%", padding: "0.85rem", opacity: (emailVerified || mobileVerified) && !isLoading ? 1 : 0.5, cursor: (emailVerified || mobileVerified) && !isLoading ? "pointer" : "not-allowed" }}>
                    {isLoading ? statusText || "Processing..." : "Create Account"}
                  </motion.button>

                  <button type="button" onClick={() => { setStep("details"); setVerifyChannel(null); }}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.82rem", cursor: "pointer", textAlign: "center", width: "100%" }}>
                    ← Back to details
                  </button>
                </form>
              </motion.div>
            )}

            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: "center", padding: "2rem 0" }}
              >
                <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "var(--success-subtle)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", color: "var(--success)" }}>
                  <ShieldCheckIcon />
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Account Created!</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Redirecting to home page...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ flex: 1.2, backgroundColor: "var(--elevated)", borderLeft: "1px solid var(--border-medium)" }} className="mascot-panel">
          <MascotAnimation
            activeField={activeField}
            isPasswordVisible={showPassword}
            isLoading={isLoading || step === "done"}
            passwordMatch={passwordMatch}
          />
        </div>
      </div>
    </>
  );
}
