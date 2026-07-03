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

type ActiveField = "name" | "username" | "email" | "password" | "confirmPassword" | "avatar" | "cover" | "submit" | "none";

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [avatarName, setAvatarName] = useState("");
  const [coverName, setCoverName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");

  const [formData, setFormData] = useState({ fullName: "", username: "", email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [activeField, setActiveField] = useState<ActiveField>("none");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.push("/");
  }, [isAuthenticated, authLoading, router]);

  const passwordMatch: "idle" | "match" | "mismatch" =
    confirmPassword.length === 0
      ? "idle"
      : formData.password === confirmPassword
        ? "match"
        : "mismatch";

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarName(file.name); setAvatarPreview(URL.createObjectURL(file)); }
  };
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setCoverName(file.name); setCoverPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (formData.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const avatarFile = avatarRef.current?.files?.[0];
    if (!avatarFile) return setError("Profile photo is required.");

    const data = new FormData();
    data.append("fullName", formData.fullName);
    data.append("username", formData.username.toLowerCase());
    data.append("email", formData.email);
    data.append("password", formData.password);
    data.append("avatar", avatarFile);
    const coverFile = coverRef.current?.files?.[0];
    if (coverFile) data.append("coverImage", coverFile);

    setIsLoading(true);
    setStatusText("Uploading your images...");
    try {
      await api.post("/users/register", data, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (evt.total && evt.loaded >= evt.total) setStatusText("Registering your account...");
        },
      });
      router.push("/login");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Registration failed."));
      setIsLoading(false);
      setStatusText("");
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

  const matchColour = "var(--success)";
  const mismatchColour = "var(--error)";
  const confirmBorderClass =
    passwordMatch === "match" ? "input-field input-success" :
    passwordMatch === "mismatch" ? "input-field input-error" : "input-field";

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
            <h1 style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.4rem", letterSpacing: "-0.03em" }}>
              Create an account
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.75rem" }}>
              Join VideoTube today — it is free
            </p>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  style={{ padding: "0.7rem 1rem", backgroundColor: "var(--error-light)", color: "var(--error)", borderRadius: "var(--radius-md)", marginBottom: "1.25rem", fontSize: "0.85rem", border: "1px solid var(--error)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <XIcon /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Full Name</label>
                  <input type="text" required placeholder="John Doe" className="input-field"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    onFocus={() => setActiveField("name")} onBlur={() => setActiveField("none")} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Username</label>
                  <input type="text" required placeholder="johndoe" className="input-field"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
                    onFocus={() => setActiveField("username")} onBlur={() => setActiveField("none")} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Email</label>
                <input type="email" required placeholder="you@example.com" className="input-field"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  onFocus={() => setActiveField("email")} onBlur={() => setActiveField("none")} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPassword ? "text" : "password"} required placeholder="Min. 8 characters" className="input-field"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    onFocus={() => setActiveField("password")} onBlur={() => setActiveField("none")}
                    style={{ paddingRight: "3rem" }} />
                  <button type="button" onClick={() => setShowPassword(p => !p)} onMouseDown={e => e.preventDefault()}
                    style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showConfirmPassword ? "text" : "password"} required placeholder="Re-enter your password"
                    className={confirmBorderClass}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    onFocus={() => setActiveField("confirmPassword")} onBlur={() => setActiveField("none")}
                    style={{ paddingRight: "3rem" }} />
                  <button type="button" onClick={() => setShowConfirmPassword(p => !p)} onMouseDown={e => e.preventDefault()}
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

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Profile Photo <span style={{ color: "var(--accent)" }}>*</span>
                </label>
                <div className={`upload-zone ${avatarPreview ? "has-file" : ""}`}
                  onMouseEnter={() => setActiveField("avatar")} onMouseLeave={() => setActiveField("none")}
                  style={{ flexDirection: "row", gap: "1rem", padding: "0.9rem 1.2rem", justifyContent: "flex-start", backgroundColor: "var(--bg-secondary)" }}>
                  <input type="file" accept="image/*" ref={avatarRef} required onChange={handleAvatarChange} />
                  {avatarPreview
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={avatarPreview} alt="Avatar" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)", flexShrink: 0 }} />
                    : <div className="upload-zone-icon" style={{ width: 38, height: 38 }}><UserCircleIcon /></div>
                  }
                  <div style={{ textAlign: "left" }}>
                    <p className="upload-zone-label" style={{ fontSize: "0.85rem" }}>{avatarName || "Upload profile photo"}</p>
                    <p className="upload-zone-hint">JPG, PNG, WEBP — max 5 MB</p>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Channel Banner <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
                </label>
                <div className={`upload-zone ${coverPreview ? "has-file" : ""}`}
                  onMouseEnter={() => setActiveField("cover")} onMouseLeave={() => setActiveField("none")}
                  style={{ padding: "0", height: 80, backgroundColor: "var(--bg-secondary)" }}>
                  <input type="file" accept="image/*" ref={coverRef} onChange={handleCoverChange} />
                  {coverPreview
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={coverPreview} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "var(--radius-md)" }} />
                    : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", padding: "1rem" }}>
                      <div className="upload-zone-icon" style={{ width: 30, height: 30 }}><UploadImageIcon /></div>
                      <p className="upload-zone-label" style={{ fontSize: "0.85rem" }}>{coverName || "Upload channel banner"}</p>
                    </div>
                  }
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={isLoading || passwordMatch === "mismatch"}
                onMouseEnter={() => setActiveField("submit")} onMouseLeave={() => setActiveField("none")}
                style={{ marginTop: "0.5rem", width: "100%", padding: "0.85rem" }}>
                {isLoading ? statusText || "Processing..." : "Create Account"}
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
        </div>
      </div>

      {/* RIGHT: MASCOT */}
      <div style={{ flex: 1.2, backgroundColor: "var(--bg-elevated)", borderLeft: "1px solid var(--border-medium)" }} className="mascot-panel">
        <MascotAnimation
          activeField={activeField}
          isPasswordVisible={showPassword}
          isLoading={isLoading}
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
