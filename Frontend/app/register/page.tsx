"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
const UploadImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const UserCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
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
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
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
const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
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

const COUNTRIES = [
  { code: "+91", iso: "in", name: "India" },
  { code: "+1", iso: "us", name: "United States" },
  { code: "+44", iso: "gb", name: "United Kingdom" },
  { code: "+61", iso: "au", name: "Australia" },
  { code: "+81", iso: "jp", name: "Japan" },
  { code: "+82", iso: "kr", name: "South Korea" },
  { code: "+86", iso: "cn", name: "China" },
  { code: "+49", iso: "de", name: "Germany" },
  { code: "+33", iso: "fr", name: "France" },
  { code: "+39", iso: "it", name: "Italy" },
  { code: "+34", iso: "es", name: "Spain" },
  { code: "+55", iso: "br", name: "Brazil" },
  { code: "+7", iso: "ru", name: "Russia" },
  { code: "+971", iso: "ae", name: "UAE" },
  { code: "+966", iso: "sa", name: "Saudi Arabia" },
  { code: "+65", iso: "sg", name: "Singapore" },
  { code: "+60", iso: "my", name: "Malaysia" },
  { code: "+66", iso: "th", name: "Thailand" },
  { code: "+62", iso: "id", name: "Indonesia" },
  { code: "+63", iso: "ph", name: "Philippines" },
  { code: "+84", iso: "vn", name: "Vietnam" },
  { code: "+880", iso: "bd", name: "Bangladesh" },
  { code: "+94", iso: "lk", name: "Sri Lanka" },
  { code: "+977", iso: "np", name: "Nepal" },
  { code: "+92", iso: "pk", name: "Pakistan" },
  { code: "+234", iso: "ng", name: "Nigeria" },
  { code: "+27", iso: "za", name: "South Africa" },
  { code: "+52", iso: "mx", name: "Mexico" },
  { code: "+1", iso: "ca", name: "Canada" },
  { code: "+64", iso: "nz", name: "New Zealand" },
];

const FlagImg = ({ iso, size = 20 }: { iso: string; size?: number }) => (
  <img
    src={`https://flagcdn.com/w40/${iso}.png`}
    alt=""
    width={size}
    height={Math.round(size * 0.75)}
    style={{ borderRadius: 2, objectFit: "cover", flexShrink: 0 }}
  />
);

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
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, backgroundColor: i < score ? colors[level] : "var(--bg-elevated)", transition: "background-color 0.2s" }} />
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
  const coverRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("details");

  // ── Step 1 state ────────────────────────────────────────────────────────
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
  const [coverName, setCoverName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // ── Step 2 state ────────────────────────────────────────────────────────
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

  // ── Shared ──────────────────────────────────────────────────────────────
  const [activeField, setActiveField] = useState<ActiveField>("none");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const fullMobile = `${formData.countryCode}${formData.mobile}`;

  // ── Auth redirect ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && isAuthenticated) router.push("/");
  }, [isAuthenticated, authLoading, router]);

  // ── Cooldown timers ─────────────────────────────────────────────────────
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

  // ── Password match ──────────────────────────────────────────────────────
  const passwordMatch: "idle" | "match" | "mismatch" =
    confirmPassword.length === 0
      ? "idle"
      : formData.password === confirmPassword
        ? "match"
        : "mismatch";

  // ── File handlers ───────────────────────────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarName(file.name); setAvatarPreview(URL.createObjectURL(file)); setAvatarFile(file); }
  };
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setCoverName(file.name); setCoverPreview(URL.createObjectURL(file)); setCoverFile(file); }
  };

  // ── OTP input handler ───────────────────────────────────────────────────
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
    setter: React.Dispatch<React.SetStateAction<string[]>>,
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

  // ── Send OTPs ───────────────────────────────────────────────────────────
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

  // ── Verify OTP ──────────────────────────────────────────────────────────
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

  // ── Step 1 → Step 2 ────────────────────────────────────────────────────
  const handleDetailsSubmit = async (e: React.FormEvent) => {
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

  // ── Step 2 → Step 3 ────────────────────────────────────────────────────
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

  // ── Step 3: auto-redirect ──────────────────────────────────────────────
  useEffect(() => {
    if (step === "done") {
      const t = setTimeout(() => router.push("/"), 2500);
      return () => clearTimeout(t);
    }
  }, [step, router]);

  // ── Loading guard ───────────────────────────────────────────────────────
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

  const matchColour = "var(--success)";
  const mismatchColour = "var(--error)";
  const confirmBorderClass =
    passwordMatch === "match" ? "input-field input-success" :
    passwordMatch === "mismatch" ? "input-field input-error" : "input-field";

  // ── Step titles ─────────────────────────────────────────────────────────
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
            style={{ width: "100%", maxWidth: "460px" }}
          >
            {/* Step indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
              {[1, 2, 3].map((s) => (
                <div key={s} style={{
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 700,
                  backgroundColor: stepNumber >= s ? "var(--accent)" : "var(--bg-elevated)",
                  color: stepNumber >= s ? "#fff" : "var(--text-muted)",
                  border: stepNumber >= s ? "none" : "1px solid var(--border-light)",
                  transition: "all 0.3s",
                }}>
                  {stepNumber > s ? <CheckIcon /> : s}
                </div>
              ))}
              <div style={{ flex: 1, height: 2, backgroundColor: "var(--border-light)", borderRadius: 1, marginLeft: "0.3rem" }}>
                <motion.div
                  animate={{ width: `${((stepNumber - 1) / 2) * 100}%` }}
                  transition={{ duration: 0.4 }}
                  style={{ height: "100%", backgroundColor: "var(--accent)", borderRadius: 1 }}
                />
              </div>
            </div>

            {/* Back button for OTP step */}
            {step === "otp" && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => { setStep("details"); setError(""); setEmailOtpError(""); setMobileOtpError(""); }}
                type="button"
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  background: "none", border: "none", color: "var(--text-muted)",
                  fontSize: "0.82rem", fontWeight: 500, cursor: "pointer",
                  marginBottom: "0.75rem", padding: 0,
                }}
              >
                <ArrowLeftIcon /> Back to details
              </motion.button>
            )}

            <h1 style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.4rem", letterSpacing: "-0.03em" }}>
              {stepTitle}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.75rem" }}>
              {stepSub}
            </p>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  style={{ padding: "0.7rem 1rem", backgroundColor: "var(--error-light)", color: "var(--error)", borderRadius: "var(--radius-md)", marginBottom: "1.25rem", fontSize: "0.85rem", border: "1px solid var(--error)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <XIcon /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* STEP 1: DETAILS                                              */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
              {step === "details" && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={handleDetailsSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                    {/* Row 1: Full Name + Username */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>Full Name</label>
                        <input type="text" required placeholder="Full name" className="input-field"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          onFocus={() => setActiveField("name")} onBlur={() => setActiveField("none")}
                          style={{ padding: "0.7rem 0.85rem", fontSize: "0.88rem" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>Username</label>
                        <input type="text" required placeholder="Username" className="input-field"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
                          onFocus={() => setActiveField("username")} onBlur={() => setActiveField("none")}
                          style={{ padding: "0.7rem 0.85rem", fontSize: "0.88rem" }} />
                      </div>
                    </div>

                    {/* Row 2: Email (full width) */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>Email</label>
                      <input type="email" required placeholder="Email" className="input-field"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        onFocus={() => setActiveField("email")} onBlur={() => setActiveField("none")}
                        style={{ padding: "0.7rem 0.85rem", fontSize: "0.88rem" }} />
                    </div>

                    {/* Row 3: Country Code + Mobile */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>Mobile Number</label>
                      <div style={{ display: "flex", gap: "0" }}>
                        <div style={{ position: "relative" }}>
                          <select
                            value={formData.countryCode}
                            onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                            style={{
                              appearance: "none",
                              WebkitAppearance: "none",
                              padding: "0.7rem 2rem 0.7rem 0.65rem",
                              fontSize: "0.88rem",
                              fontWeight: 600,
                              borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
                              border: "1.5px solid var(--border-light)",
                              borderRight: "none",
                              backgroundColor: "var(--bg-secondary)",
                              color: "var(--text-primary)",
                              cursor: "pointer",
                              outline: "none",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              lineHeight: 1,
                            }}
                          >
                            {COUNTRIES.map((c) => (
                              <option key={c.iso + c.code} value={c.code}>{c.iso.toUpperCase()} {c.code}</option>
                            ))}
                          </select>
                          <div style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted)" }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                        <div style={{ position: "relative", flex: 1 }}>
                          <div style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: "0.35rem", pointerEvents: "none" }}>
                            <FlagImg iso={COUNTRIES.find(c => c.code === formData.countryCode)?.iso || "in"} />
                          </div>
                          <input
                            type="tel" required placeholder="Mobile number"
                            className="input-field"
                            value={formData.mobile}
                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, "") })}
                            onFocus={() => setActiveField("email")} onBlur={() => setActiveField("none")}
                            style={{
                              padding: "0.7rem 0.85rem 0.7rem 3.2rem",
                              fontSize: "0.88rem",
                              borderRadius: "0 var(--radius-md) var(--radius-md) 0",
                              letterSpacing: "0.03em",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Password */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>Password</label>
                      <div style={{ position: "relative" }}>
                        <input type={showPassword ? "text" : "password"} required placeholder="Password" className="input-field"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          onFocus={() => setActiveField("password")} onBlur={() => setActiveField("none")}
                          style={{ padding: "0.7rem 0.85rem", fontSize: "0.88rem", paddingRight: "3rem" }} />
                        <button type="button" onClick={() => setShowPassword((p) => !p)} onMouseDown={(e) => e.preventDefault()}
                          style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}>
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                      <PasswordStrengthBar password={formData.password} />
                    </div>

                    {/* Row 5: Confirm Password */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>Confirm Password</label>
                      <div style={{ position: "relative" }}>
                        <input type={showConfirmPassword ? "text" : "password"} required placeholder="Confirm password"
                          className={confirmBorderClass}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pasted = e.clipboardData.getData("text");
                            setConfirmPassword(pasted);
                          }}
                          onFocus={() => setActiveField("confirmPassword")} onBlur={() => setActiveField("none")}
                          style={{ padding: "0.7rem 0.85rem", fontSize: "0.88rem", paddingRight: "3rem" }} />
                        <button type="button" onClick={() => setShowConfirmPassword((p) => !p)} onMouseDown={(e) => e.preventDefault()}
                          style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}>
                          {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                      <AnimatePresence>
                        {passwordMatch !== "idle" && (
                          <motion.p key={passwordMatch} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            style={{ fontSize: "0.78rem", fontWeight: 600, color: passwordMatch === "match" ? matchColour : mismatchColour, display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.1rem" }}>
                            {passwordMatch === "match" ? <CheckIcon /> : <XIcon />}
                            {passwordMatch === "match" ? "Passwords match" : "Passwords do not match"}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Row 6: Profile Photo */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>
                        Profile Photo <span style={{ color: "var(--accent)" }}>*</span>
                      </label>
                      <div className={`upload-zone ${avatarPreview ? "has-file" : ""}`}
                        onMouseEnter={() => setActiveField("avatar")} onMouseLeave={() => setActiveField("none")}
                        style={{ flexDirection: "row", gap: "1rem", padding: "0.85rem 1rem", justifyContent: "flex-start", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1.5px dashed var(--border-light)", cursor: "pointer", transition: "all 0.2s" }}>
                        <input type="file" accept="image/*" ref={avatarRef} onChange={handleAvatarChange} />
                        {avatarPreview
                          /* eslint-disable-next-line @next/next/no-img-element */
                          ? <img src={avatarPreview} alt="Avatar" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)", flexShrink: 0 }} />
                          : <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flexShrink: 0 }}><UserCircleIcon /></div>
                        }
                        <div style={{ textAlign: "left" }}>
                          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: avatarPreview ? "var(--success)" : "var(--text-primary)" }}>{avatarName || "Upload profile photo"}</p>
                          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>JPG, PNG, WEBP — max 5 MB</p>
                        </div>
                      </div>
                    </div>

                    {/* Row 7: Channel Banner */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>
                        Channel Banner <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
                      </label>
                      <div className={`upload-zone ${coverPreview ? "has-file" : ""}`}
                        onMouseEnter={() => setActiveField("cover")} onMouseLeave={() => setActiveField("none")}
                        style={{ padding: "0", height: 76, backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1.5px dashed var(--border-light)", cursor: "pointer", overflow: "hidden", transition: "all 0.2s" }}>
                        <input type="file" accept="image/*" ref={coverRef} onChange={handleCoverChange} />
                        {coverPreview
                          /* eslint-disable-next-line @next/next/no-img-element */
                          ? <img src={coverPreview} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "var(--radius-md)" }} />
                          : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "0.3rem" }}>
                            <div style={{ color: "var(--text-muted)" }}><UploadImageIcon /></div>
                            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>{coverName || "Upload channel banner"}</p>
                          </div>
                        }
                      </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={passwordMatch === "mismatch"}
                      onMouseEnter={() => setActiveField("submit")} onMouseLeave={() => setActiveField("none")}
                      style={{ marginTop: "0.5rem", width: "100%", padding: "0.85rem", fontSize: "0.92rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
                      Continue to Verification
                    </button>
                  </form>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.5rem 0" }}>
                    <div style={{ flex: 1, height: 1, backgroundColor: "var(--border-light)" }} />
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>or continue with</span>
                    <div style={{ flex: 1, height: 1, backgroundColor: "var(--border-light)" }} />
                  </div>

                  <SocialLoginButtons />

                  <p style={{ marginTop: "1.75rem", textAlign: "center", fontSize: "0.88rem", color: "var(--text-muted)" }}>
                    Already have an account?{" "}
                    <Link href="/login" style={{ color: "var(--text-primary)", fontWeight: 700, textDecoration: "underline" }}>
                      Sign in
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* ════════════════════════════════════════════════════════════ */}
              {/* STEP 2: OTP VERIFICATION                                   */}
              {/* ════════════════════════════════════════════════════════════ */}
              {step === "otp" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                    {/* ── Channel Picker (show when no channel selected and not verified) ── */}
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
                            border: "1.5px solid var(--border-light)",
                            backgroundColor: "var(--bg-secondary)",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.backgroundColor = "var(--accent-light)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.backgroundColor = "var(--bg-secondary)"; }}
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
                            border: "1.5px solid var(--border-light)",
                            backgroundColor: "var(--bg-secondary)",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.backgroundColor = "var(--accent-light)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.backgroundColor = "var(--bg-secondary)"; }}
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

                    {/* ── Email OTP (shown when email channel selected) ── */}
                    {verifyChannel === "email" && !emailVerified && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          padding: "1.2rem",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-light)",
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
                              onChange={(e) => handleOtpChange(i, e.target.value, setEmailOtp, emailOtpRefs, true)}
                              onKeyDown={(e) => handleOtpKeyDown(i, e, setEmailOtp, emailOtpRefs, true)}
                              onPaste={(e) => handleOtpPaste(e, setEmailOtp, emailOtpRefs)}
                              style={{ width: 44, height: 48, textAlign: "center", fontSize: "1.15rem", fontWeight: 700, borderRadius: "var(--radius-md)", border: "1.5px solid var(--border-light)", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", outline: "none" }} />
                          ))}
                        </div>
                        {emailOtpError && <p style={{ fontSize: "0.78rem", color: "var(--error)", textAlign: "center", marginBottom: "0.75rem" }}>{emailOtpError}</p>}
                        <div style={{ display: "flex", gap: "0.6rem" }}>
                          <button type="button" disabled={emailVerifying || emailOtp.join("").length < OTP_LENGTH}
                            onClick={() => verifyOtp(formData.email, emailOtp.join(""), true)}
                            className="btn-primary" style={{ flex: 1, padding: "0.7rem", fontSize: "0.82rem" }}>
                            {emailVerifying ? "Verifying..." : "Verify Email"}
                          </button>
                          <button type="button" disabled={emailCooldown > 0 || sendingOtp}
                            onClick={() => { sendOtps("email"); setEmailOtp(Array(OTP_LENGTH).fill("")); setEmailOtpError(""); }}
                            style={{ padding: "0.7rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", backgroundColor: "var(--bg-secondary)", color: emailCooldown > 0 ? "var(--text-muted)" : "var(--text-primary)", fontSize: "0.78rem", fontWeight: 600, cursor: emailCooldown > 0 ? "not-allowed" : "pointer" }}>
                            {emailCooldown > 0 ? `${emailCooldown}s` : "Resend"}
                          </button>
                        </div>
                        <button type="button" onClick={() => setVerifyChannel(null)}
                          style={{ marginTop: "0.75rem", background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", width: "100%", textAlign: "center" }}>
                          Use a different method
                        </button>
                      </motion.div>
                    )}

                    {/* ── WhatsApp OTP (shown when whatsapp channel selected) ── */}
                    {verifyChannel === "whatsapp" && !mobileVerified && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          padding: "1.2rem",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-light)",
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
                              onChange={(e) => handleOtpChange(i, e.target.value, setMobileOtp, mobileOtpRefs, false)}
                              onKeyDown={(e) => handleOtpKeyDown(i, e, setMobileOtp, mobileOtpRefs, false)}
                              onPaste={(e) => handleOtpPaste(e, setMobileOtp, mobileOtpRefs)}
                              style={{ width: 44, height: 48, textAlign: "center", fontSize: "1.15rem", fontWeight: 700, borderRadius: "var(--radius-md)", border: "1.5px solid var(--border-light)", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", outline: "none" }} />
                          ))}
                        </div>
                        {mobileOtpError && <p style={{ fontSize: "0.78rem", color: "var(--error)", textAlign: "center", marginBottom: "0.75rem" }}>{mobileOtpError}</p>}
                        <div style={{ display: "flex", gap: "0.6rem" }}>
                          <button type="button" disabled={mobileVerifying || mobileOtp.join("").length < OTP_LENGTH}
                            onClick={() => verifyOtp(fullMobile, mobileOtp.join(""), false)}
                            className="btn-primary" style={{ flex: 1, padding: "0.7rem", fontSize: "0.82rem", backgroundColor: "#25D366" }}>
                            {mobileVerifying ? "Verifying..." : "Verify WhatsApp"}
                          </button>
                          <button type="button" disabled={mobileCooldown > 0 || sendingOtp}
                            onClick={() => { sendOtps("whatsapp"); setMobileOtp(Array(OTP_LENGTH).fill("")); setMobileOtpError(""); }}
                            style={{ padding: "0.7rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", backgroundColor: "var(--bg-secondary)", color: mobileCooldown > 0 ? "var(--text-muted)" : "var(--text-primary)", fontSize: "0.78rem", fontWeight: 600, cursor: mobileCooldown > 0 ? "not-allowed" : "pointer" }}>
                            {mobileCooldown > 0 ? `${mobileCooldown}s` : "Resend"}
                          </button>
                        </div>
                        <button type="button" onClick={() => setVerifyChannel(null)}
                          style={{ marginTop: "0.75rem", background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", width: "100%", textAlign: "center" }}>
                          Use a different method
                        </button>
                      </motion.div>
                    )}

                    {/* ── Verified indicator ── */}
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

                    {/* ── Create Account button ── */}
                    <motion.button type="button" disabled={!(emailVerified || mobileVerified) || isLoading}
                      onClick={handleFinalRegister} className="btn-primary"
                      whileHover={(emailVerified || mobileVerified) && !isLoading ? { scale: 1.01 } : {}}
                      whileTap={(emailVerified || mobileVerified) && !isLoading ? { scale: 0.98 } : {}}
                      style={{ width: "100%", padding: "0.85rem", opacity: (emailVerified || mobileVerified) && !isLoading ? 1 : 0.5, cursor: (emailVerified || mobileVerified) && !isLoading ? "pointer" : "not-allowed" }}>
                      {isLoading ? statusText || "Processing..." : "Create Account"}
                    </motion.button>

                    {/* ── Back button ── */}
                    <button type="button" onClick={() => { setStep("details"); setVerifyChannel(null); }}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.82rem", cursor: "pointer", textAlign: "center", width: "100%" }}>
                      ← Back to details
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ════════════════════════════════════════════════════════════ */}
              {/* STEP 3: DONE                                                */}
              {/* ════════════════════════════════════════════════════════════ */}
              {step === "done" && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, type: "spring" }}
                  style={{ textAlign: "center", padding: "2rem 0" }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                    style={{
                      width: 80, height: 80, borderRadius: "50%",
                      backgroundColor: "rgba(34, 197, 94, 0.1)",
                      border: "2.5px solid var(--success)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 1.5rem",
                      color: "var(--success)",
                    }}
                  >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </motion.div>

                  <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                    Account created!
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    Welcome to VideoTube. Redirecting you now...
                  </p>

                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5, ease: "linear" }}
                    style={{ height: 3, backgroundColor: "var(--accent)", borderRadius: 2, marginTop: "2rem" }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* RIGHT: MASCOT */}
      <div style={{ flex: 1.2, backgroundColor: "var(--bg-elevated)", borderLeft: "1px solid var(--border-medium)" }} className="mascot-panel">
        <MascotAnimation
          activeField={activeField}
          isPasswordVisible={showPassword}
          isLoading={isLoading || step === "done"}
          passwordMatch={passwordMatch}
        />
      </div>

      <style dangerouslySetInnerHTML={{__html:`
        @media (max-width:900px)  { .mascot-panel { display:none !important; } }
        @media (min-width:901px)  { .mascot-panel { display:flex !important; } }
      `}}/>
    </div>
  );
}
