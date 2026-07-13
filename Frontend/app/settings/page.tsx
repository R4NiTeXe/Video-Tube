"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useThemeStore } from "@/src/store/useThemeStore";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  KeyIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  VideoIcon,
  HeartIcon,
  DownloadIcon,
} from "@/src/components/icons";

function PasswordInput({ value, onChange, placeholder, minLength = 6, blockPaste = false }: { value: string; onChange: (v: string) => void; placeholder?: string; minLength?: number; blockPaste?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        className="input"
        style={{ width: "100%", boxSizing: "border-box", paddingRight: "2.5rem" }}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={blockPaste ? (e) => e.preventDefault() : undefined}
        onCopy={blockPaste ? (e) => e.preventDefault() : undefined}
        onCut={blockPaste ? (e) => e.preventDefault() : undefined}
        placeholder={placeholder}
        minLength={minLength}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.2rem", display: "flex" }}
      >
        {show ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        )}
      </button>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const colors = ["#dc2626", "#f97316", "#eab308", "#22c55e", "#16a34a"];
  const level = Math.min(score, 4);

  if (!password) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <div style={{ display: "flex", gap: "3px" }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, backgroundColor: i <= level ? colors[level] : "var(--elevated)", transition: "background-color 0.2s" }} />
        ))}
      </div>
      <span style={{ fontSize: "0.72rem", color: colors[level], fontWeight: 500 }}>{labels[level]}</span>
    </div>
  );
}

const LANGUAGES = ["English", "Spanish", "French", "Hindi", "Japanese", "Korean", "Portuguese", "German", "Chinese", "Arabic"];

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  // Password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changePasswordOtp, setChangePasswordOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtpSending, setForgotOtpSending] = useState(false);
  const [changePasswordChannel, setChangePasswordChannel] = useState<"email" | "whatsapp">("email");
  const [forgotChannel, setForgotChannel] = useState<"email" | "whatsapp">("email");

  // Notifications
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifReplies, setNotifReplies] = useState(true);
  const [notifSubscribers, setNotifSubscribers] = useState(true);
  const [notifMentions, setNotifMentions] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifLoaded, setNotifLoaded] = useState(false);

  // Privacy
  const [privateSubs, setPrivateSubs] = useState(false);
  const [showSubsList, setShowSubsList] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyMsg, setPrivacyMsg] = useState("");

  // Language
  const [language, setLanguage] = useState("English");
  const [langSaving, setLangSaving] = useState(false);
  const [langMsg, setLangMsg] = useState("");

  // Content defaults
  const [defaultVisibility, setDefaultVisibility] = useState("public");
  const [defaultCategory, setDefaultCategory] = useState("General");
  const [defaultsSaving, setDefaultsSaving] = useState(false);
  const [defaultsMsg, setDefaultsMsg] = useState("");

  // Sessions
  const [sessions, setSessions] = useState<Array<{ _id: string; deviceName: string; location: string; lastActiveAt: string; isCurrent: boolean }>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");

  // OTP Usage
  const [otpUsage, setOtpUsage] = useState<{ dailyLimit: number; usedToday: number; remaining: number; resetAt: string } | null>(null);
  const [otpUsageLoading, setOtpUsageLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const refreshOtpUsage = () => {
    api.get("/otp/usage").then((res) => setOtpUsage(res.data.data)).catch(() => {});
  };

  // Delete
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteStep, setDeleteStep] = useState<1 | 2 | 3>(1);
  const [deleteOtp, setDeleteOtp] = useState("");
  const [deleteOtpSent, setDeleteOtpSent] = useState(false);
  const [deleteOtpSending, setDeleteOtpSending] = useState(false);
  const [deleteChannel, setDeleteChannel] = useState<"email" | "whatsapp">("email");

  const ProfileCard = () => user ? (
    <div className="form-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", border: "2px solid var(--accent)", padding: 2, flexShrink: 0 }}>
          <img src={user.avatar} alt={user.fullName} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>{user.fullName}</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>@{user.username}</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{user.email}</p>
        </div>
      </div>
    </div>
  ) : null;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      api.get("/sessions").then((res) => setSessions(res.data.data || [])).catch(() => setSessions([])).finally(() => setSessionsLoading(false));
      api.get("/users/notification-prefs").then((res) => {
        const prefs = res.data.data;
        if (prefs) {
          setNotifLikes(prefs.likes ?? true);
          setNotifComments(prefs.comments ?? true);
          setNotifReplies(prefs.replies ?? true);
          setNotifSubscribers(prefs.subscriptions ?? true);
          setNotifMentions(prefs.mentions ?? true);
        }
      }).catch(() => {});
      api.get("/otp/usage").then((res) => setOtpUsage(res.data.data)).catch(() => {}).finally(() => setOtpUsageLoading(false));
    }
  }, [isAuthenticated]);

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ color: "var(--text-muted)", fontWeight: 500 }}>Loading...</motion.div>
      </div>
    );
  }

  // ── Change Password (with password) ──
  const handleSendChangePasswordOtp = async () => {
    setPasswordError(""); setPasswordSuccess("");
    if (!oldPassword) { setPasswordError("Please enter your current password first."); return; }
    setOtpSending(true);
    try {
      await api.post("/users/send-change-password-otp", { oldPassword, channel: changePasswordChannel });
      setOtpSent(true);
      setPasswordSuccess(`OTP sent to your ${changePasswordChannel === "whatsapp" ? "WhatsApp" : "email"}.`);
      refreshOtpUsage();
    } catch (err: unknown) {
      setPasswordError(getApiErrorMessage(err, "Failed to send OTP."));
    } finally {
      setOtpSending(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(""); setPasswordSuccess("");
    if (newPassword !== confirmPassword) { setPasswordError("New passwords do not match."); return; }
    if (newPassword.length < 6) { setPasswordError("New password must be at least 6 characters."); return; }
    if (!changePasswordOtp || changePasswordOtp.length !== 6) { setPasswordError("Please enter the 6-digit OTP."); return; }
    setPasswordSaving(true);
    try {
      await api.post("/users/verify-change-password", { oldPassword, newPassword, otp: changePasswordOtp, channel: changePasswordChannel });
      setPasswordSuccess("Password changed successfully! Please log in again.");
      setOldPassword(""); setNewPassword(""); setConfirmPassword(""); setChangePasswordOtp("");
      setOtpSent(false); setOtpVerified(false);
      setTimeout(() => { logout(); router.push("/login"); }, 2000);
    } catch (err: unknown) { setPasswordError(getApiErrorMessage(err, "Failed to change password.")); }
    finally { setPasswordSaving(false); }
  };

  // ── Forgot Password (no old password) ──
  const handleSendForgotOtp = async () => {
    setPasswordError(""); setPasswordSuccess("");
    setForgotOtpSending(true);
    try {
      await api.post("/users/send-forgot-password-change-otp", { channel: forgotChannel });
      setForgotOtpSent(true);
      setPasswordSuccess(`OTP sent to your ${forgotChannel === "whatsapp" ? "WhatsApp" : "email"}.`);
      refreshOtpUsage();
    } catch (err: unknown) {
      setPasswordError(getApiErrorMessage(err, "Failed to send OTP."));
    } finally {
      setForgotOtpSending(false);
    }
  };

  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(""); setPasswordSuccess("");
    if (newPassword !== confirmPassword) { setPasswordError("New passwords do not match."); return; }
    if (newPassword.length < 6) { setPasswordError("New password must be at least 6 characters."); return; }
    if (!changePasswordOtp || changePasswordOtp.length !== 6) { setPasswordError("Please enter the 6-digit OTP."); return; }
    setPasswordSaving(true);
    try {
      await api.post("/users/verify-and-reset-password-via-otp", { newPassword, otp: changePasswordOtp, channel: forgotChannel });
      setPasswordSuccess("Password reset successfully! Please log in again.");
      setNewPassword(""); setConfirmPassword(""); setChangePasswordOtp("");
      setForgotOtpSent(false); setForgotPasswordMode(false);
      setTimeout(() => { logout(); router.push("/login"); }, 2000);
    } catch (err: unknown) { setPasswordError(getApiErrorMessage(err, "Failed to reset password.")); }
    finally { setPasswordSaving(false); }
  };

  // ── Delete Account ──
  const handleDeleteStep1 = () => {
    setDeleteError("");
    if (!deletePassword) { setDeleteError("Please enter your password."); return; }
    setDeleteStep(2);
  };

  const handleSendDeleteOtp = async () => {
    setDeleteError("");
    setDeleteOtpSending(true);
    try {
      await api.post("/users/send-delete-account-otp", { password: deletePassword, channel: deleteChannel });
      setDeleteOtpSent(true);
      refreshOtpUsage();
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err, "Failed to send OTP."));
    } finally {
      setDeleteOtpSending(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    if (deleteConfirm !== "DELETE") return;
    if (!deleteOtp || deleteOtp.length !== 6) { setDeleteError("Please enter the 6-digit OTP."); return; }
    setDeleting(true);
    try {
      await api.post("/users/verify-and-delete-account", { password: deletePassword, otp: deleteOtp, channel: deleteChannel });
      logout();
      router.push("/login");
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err, "Failed to delete account."));
      setDeleting(false);
    }
  };

  // ── Notification Preferences ──
  const handleSaveNotificationPrefs = async () => {
    setNotifSaving(true);
    try {
      await api.patch("/users/notification-prefs", {
        likes: notifLikes,
        comments: notifComments,
        replies: notifReplies,
        subscriptions: notifSubscribers,
        mentions: notifMentions,
      });
    } catch {
      // silent
    } finally {
      setNotifSaving(false);
    }
  };

  // ── Data Export ──
  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await api.get("/users/export");
      const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-tube-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  };

  // ── Privacy ──
  const handleSavePrivacy = async () => {
    setPrivacyMsg(""); setPrivacySaving(true);
    try { await api.patch("/users/privacy", { privateSubs, showSubsList }); setPrivacyMsg("Saved"); } catch { setPrivacyMsg("Failed to save"); }
    finally { setPrivacySaving(false); setTimeout(() => setPrivacyMsg(""), 3000); }
  };

  // ── Language ──
  const handleSaveLanguage = async () => {
    setLangMsg(""); setLangSaving(true);
    try { await api.patch("/users/language", { language }); setLangMsg("Saved"); } catch { setLangMsg("Failed to save"); }
    finally { setLangSaving(false); setTimeout(() => setLangMsg(""), 3000); }
  };

  // ── Content Defaults ──
  const handleSaveDefaults = async () => {
    setDefaultsMsg(""); setDefaultsSaving(true);
    try { await api.patch("/users/content-defaults", { defaultVisibility, defaultCategory }); setDefaultsMsg("Saved"); } catch { setDefaultsMsg("Failed to save"); }
    finally { setDefaultsSaving(false); setTimeout(() => setDefaultsMsg(""), 3000); }
  };

  // ── Sessions ──
  const handleRevokeSession = async (sessionId: string) => {
    setSessionError("");
    try {
      await api.delete(`/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
    } catch {
      setSessionError("Failed to revoke session.");
    }
  };

  const handleRevokeAllSessions = async () => {
    setSessionError("");
    try {
      await api.delete("/sessions");
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch {
      setSessionError("Failed to revoke sessions.");
    }
  };

  const SectionHeader = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
      <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>{title}</h2>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>{description}</p>
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%", padding: "2rem" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.5rem" }}>Settings</h1>

        <ProfileCard />

        <div style={{ flex: 1, minWidth: 0 }}>
            <style dangerouslySetInnerHTML={{__html: `
              .settings-grid { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }
              @media (min-width: 768px) { .settings-grid { grid-template-columns: 1fr 1fr; } }
              .settings-grid .card-full { grid-column: 1 / -1; }
              .form-card { border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-primary); }
            `}} />

            <div className="settings-grid">

          {/* 1. Change Password */}
          <div className="form-card" style={{ padding: "1.5rem" }}>
            <SectionHeader
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
              title="Change Password"
              description="Keep your account secure with a strong password"
            />
            {passwordError && <div style={{ padding: "0.7rem 1rem", backgroundColor: "var(--accent-warm-light)", color: "var(--accent-warm)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid rgba(244,63,94,0.15)" }}>{passwordError}</div>}
            {passwordSuccess && <div style={{ padding: "0.7rem 1rem", backgroundColor: "var(--accent-subtle)", color: "var(--accent)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid var(--border-focus)" }}>{passwordSuccess}</div>}

            {forgotPasswordMode ? (
              <form onSubmit={handleForgotPasswordReset} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>We&apos;ll send an OTP to your email. No current password needed.</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>New Password</label>
                  <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="New password" />
                  <PasswordStrength password={newPassword} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Confirm New Password</label>
                  <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" blockPaste />
                  {confirmPassword && newPassword !== confirmPassword && <span style={{ fontSize: "0.72rem", color: "var(--accent-warm)" }}>Passwords do not match</span>}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Verification OTP</label>
                  {!forgotOtpSent ? (
                    <>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="button" onClick={() => setForgotChannel("email")}
                          style={{ flex: 1, padding: "0.5rem", borderRadius: "var(--radius-md)", fontSize: "0.82rem", fontWeight: 600, backgroundColor: forgotChannel === "email" ? "var(--accent)" : "var(--bg-secondary)", color: forgotChannel === "email" ? "#fff" : "var(--text-muted)", border: `1px solid ${forgotChannel === "email" ? "var(--accent)" : "var(--border)"}`, cursor: "pointer", transition: "all 0.2s" }}>
                          📧 Email
                        </button>
                        <button type="button" onClick={() => setForgotChannel("whatsapp")}
                          style={{ flex: 1, padding: "0.5rem", borderRadius: "var(--radius-md)", fontSize: "0.82rem", fontWeight: 600, backgroundColor: forgotChannel === "whatsapp" ? "#25D366" : "var(--bg-secondary)", color: forgotChannel === "whatsapp" ? "#fff" : "var(--text-muted)", border: `1px solid ${forgotChannel === "whatsapp" ? "#25D366" : "var(--border)"}`, cursor: "pointer", transition: "all 0.2s" }}>
                          💬 WhatsApp
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleSendForgotOtp}
                        disabled={forgotOtpSending}
                        style={{
                          padding: "0.65rem 1rem",
                          borderRadius: "var(--radius-md)",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          backgroundColor: "var(--bg-secondary)",
                          color: "var(--accent)",
                          border: "1px solid var(--accent)",
                          cursor: !forgotOtpSending ? "pointer" : "not-allowed",
                          transition: "all 0.2s",
                        }}
                      >
                        {forgotOtpSending ? "Sending OTP..." : `Send OTP via ${forgotChannel === "whatsapp" ? "WhatsApp" : "Email"}`}
                      </button>
                    </>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="000000"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        inputMode="numeric"
                        value={changePasswordOtp}
                        onChange={(e) => setChangePasswordOtp(e.target.value.replace(/\D/g, ""))}
                        style={{ letterSpacing: "0.4em", textAlign: "center", fontSize: "1rem", fontWeight: 600 }}
                      />
                      <button
                        type="button"
                        onClick={handleSendForgotOtp}
                        disabled={forgotOtpSending}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", textAlign: "left", padding: 0 }}
                      >
                        {forgotOtpSending ? "Sending..." : "Resend OTP"}
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                  <button type="button" onClick={() => { setForgotPasswordMode(false); setForgotOtpSent(false); setChangePasswordOtp(""); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); setPasswordSuccess(""); }}
                    style={{ padding: "0.65rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem", fontWeight: 600, backgroundColor: "var(--elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer" }}>
                    Back to Password
                  </button>
                  <button type="submit" className="btn btn-primary"
                    disabled={passwordSaving || !forgotOtpSent || changePasswordOtp.length !== 6}
                    style={{
                      padding: "0.65rem 1.5rem",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.9rem",
                      opacity: passwordSaving || !forgotOtpSent || changePasswordOtp.length !== 6 ? 0.6 : 1,
                      cursor: passwordSaving || !forgotOtpSent || changePasswordOtp.length !== 6 ? "not-allowed" : "pointer",
                    }}>
                    {passwordSaving ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Current Password</label>
                  <PasswordInput value={oldPassword} onChange={setOldPassword} placeholder="••••••••" />
                  <button type="button" onClick={() => { setForgotPasswordMode(true); setPasswordError(""); setPasswordSuccess(""); setOldPassword(""); }}
                    style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", textAlign: "left", padding: 0, marginTop: "-0.2rem" }}>
                    Forgot your password?
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>New Password</label>
                  <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="New password" />
                  <PasswordStrength password={newPassword} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Confirm New Password</label>
                  <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" blockPaste />
                  {confirmPassword && newPassword !== confirmPassword && <span style={{ fontSize: "0.72rem", color: "var(--accent-warm)" }}>Passwords do not match</span>}
                </div>

              {/* OTP Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Verification OTP</label>
                {!otpSent ? (
                  <>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button type="button" onClick={() => setChangePasswordChannel("email")}
                        style={{ flex: 1, padding: "0.5rem", borderRadius: "var(--radius-md)", fontSize: "0.82rem", fontWeight: 600, backgroundColor: changePasswordChannel === "email" ? "var(--accent)" : "var(--bg-secondary)", color: changePasswordChannel === "email" ? "#fff" : "var(--text-muted)", border: `1px solid ${changePasswordChannel === "email" ? "var(--accent)" : "var(--border)"}`, cursor: "pointer", transition: "all 0.2s" }}>
                        📧 Email
                      </button>
                      <button type="button" onClick={() => setChangePasswordChannel("whatsapp")}
                        style={{ flex: 1, padding: "0.5rem", borderRadius: "var(--radius-md)", fontSize: "0.82rem", fontWeight: 600, backgroundColor: changePasswordChannel === "whatsapp" ? "#25D366" : "var(--bg-secondary)", color: changePasswordChannel === "whatsapp" ? "#fff" : "var(--text-muted)", border: `1px solid ${changePasswordChannel === "whatsapp" ? "#25D366" : "var(--border)"}`, cursor: "pointer", transition: "all 0.2s" }}>
                        💬 WhatsApp
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendChangePasswordOtp}
                      disabled={otpSending || !oldPassword}
                      style={{
                        padding: "0.65rem 1rem",
                        borderRadius: "var(--radius-md)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--accent)",
                        border: "1px solid var(--accent)",
                        cursor: oldPassword && !otpSending ? "pointer" : "not-allowed",
                        transition: "all 0.2s",
                      }}
                    >
                      {otpSending ? "Sending OTP..." : `Send OTP via ${changePasswordChannel === "whatsapp" ? "WhatsApp" : "Email"}`}
                    </button>
                  </>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="000000"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        inputMode="numeric"
                        value={changePasswordOtp}
                        onChange={(e) => setChangePasswordOtp(e.target.value.replace(/\D/g, ""))}
                        style={{ letterSpacing: "0.4em", textAlign: "center", fontSize: "1rem", fontWeight: 600 }}
                      />
                      <button
                        type="button"
                        onClick={handleSendChangePasswordOtp}
                        disabled={otpSending}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", textAlign: "left", padding: 0 }}
                      >
                        {otpSending ? "Sending..." : "Resend OTP"}
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={passwordSaving || !otpSent || changePasswordOtp.length !== 6}
                    style={{
                      padding: "0.65rem 1.5rem",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.9rem",
                      opacity: passwordSaving || !otpSent || changePasswordOtp.length !== 6 ? 0.6 : 1,
                      cursor: passwordSaving || !otpSent || changePasswordOtp.length !== 6 ? "not-allowed" : "pointer",
                    }}
                  >
                    {passwordSaving ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 2. Appearance */}
          <div className="form-card" style={{ padding: "1.5rem" }}>
            <SectionHeader
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>}
              title="Appearance"
              description="Customize how VideoTube looks on your device"
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0" }}>
              <div>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>Dark Mode</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Currently using {theme} mode</p>
              </div>
              <button onClick={toggleTheme}
                style={{ width: 52, height: 28, borderRadius: 99, backgroundColor: theme === "dark" ? "var(--accent)" : "var(--elevated)", border: `2px solid ${theme === "dark" ? "var(--accent)" : "var(--border)"}`, cursor: "pointer", position: "relative", transition: "all 0.3s", flexShrink: 0 }}>
                <motion.div animate={{ x: theme === "dark" ? 24 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#fff", position: "absolute", top: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
          </div>

          {/* 3. Notifications */}
          <div className="form-card" style={{ padding: "1.5rem" }}>
            <SectionHeader
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
              title="Notifications"
              description="Choose what notifications you receive"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { label: "Likes on my videos", desc: "Get notified when someone likes your video", checked: notifLikes, onChange: setNotifLikes },
                { label: "Comments on my videos", desc: "Get notified when someone comments", checked: notifComments, onChange: setNotifComments },
                { label: "Replies to my comments", desc: "Get notified when someone replies to you", checked: notifReplies, onChange: setNotifReplies },
                { label: "New subscribers", desc: "Get notified when someone subscribes", checked: notifSubscribers, onChange: setNotifSubscribers },
                { label: "Mentions", desc: "Get notified when someone mentions you", checked: notifMentions, onChange: setNotifMentions },
              ].map((item) => (
                <label key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</p>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{item.desc}</p>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input type="checkbox" checked={item.checked} onChange={(e) => item.onChange(e.target.checked)} style={{ display: "none" }} />
                    <div onClick={() => item.onChange(!item.checked)}
                      style={{ width: 40, height: 22, borderRadius: 99, backgroundColor: item.checked ? "var(--accent)" : "var(--elevated)", border: `2px solid ${item.checked ? "var(--accent)" : "var(--border)"}`, cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
                      <motion.div animate={{ x: item.checked ? 18 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#fff", position: "absolute", top: 3, boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }} />
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button onClick={handleSaveNotificationPrefs} disabled={notifSaving}
                style={{ padding: "0.55rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 600, backgroundColor: "var(--elevated)", color: "var(--accent)", border: "1px solid var(--accent)", cursor: notifSaving ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
                {notifSaving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>

          {/* 4. Privacy */}
          <div className="form-card" style={{ padding: "1.5rem" }}>
            <SectionHeader
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
              title="Privacy"
              description="Control who can see your activity and subscriptions"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { label: "Keep subscriptions private", desc: "Others won't see which channels you subscribe to", checked: privateSubs, onChange: setPrivateSubs },
                { label: "Show subscriptions list on channel", desc: "Display your subscriptions on your channel page", checked: showSubsList, onChange: setShowSubsList },
              ].map((item) => (
                <label key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</p>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{item.desc}</p>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input type="checkbox" checked={item.checked} onChange={(e) => item.onChange(e.target.checked)} style={{ display: "none" }} />
                    <div onClick={() => item.onChange(!item.checked)}
                      style={{ width: 40, height: 22, borderRadius: 99, backgroundColor: item.checked ? "var(--accent)" : "var(--elevated)", border: `2px solid ${item.checked ? "var(--accent)" : "var(--border)"}`, cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
                      <motion.div animate={{ x: item.checked ? 18 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#fff", position: "absolute", top: 3, boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }} />
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {privacyMsg && <p style={{ fontSize: "0.78rem", color: privacyMsg === "Saved" ? "var(--accent)" : "var(--accent-warm)", marginTop: "0.5rem" }}>{privacyMsg}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
              <button onClick={handleSavePrivacy} disabled={privacySaving} style={{ padding: "0.55rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 600, backgroundColor: "var(--elevated)", color: "var(--accent)", border: "1px solid var(--accent)", cursor: privacySaving ? "not-allowed" : "pointer" }}>
                {privacySaving ? "Saving..." : "Save Privacy"}
              </button>
            </div>
          </div>

          {/* 5. Language */}
          <div className="form-card" style={{ padding: "1.5rem" }}>
            <SectionHeader
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
              title="Language"
              description="Select your preferred language for the interface"
            />
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              className="input" style={{ width: "100%", boxSizing: "border-box", cursor: "pointer" }}>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            {langMsg && <p style={{ fontSize: "0.78rem", color: langMsg === "Saved" ? "var(--accent)" : "var(--accent-warm)", marginTop: "0.5rem" }}>{langMsg}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
              <button onClick={handleSaveLanguage} disabled={langSaving} style={{ padding: "0.55rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 600, backgroundColor: "var(--elevated)", color: "var(--accent)", border: "1px solid var(--accent)", cursor: langSaving ? "not-allowed" : "pointer" }}>
                {langSaving ? "Saving..." : "Save Language"}
              </button>
            </div>
          </div>

          {/* 6. Content Defaults */}
          <div className="form-card" style={{ padding: "1.5rem" }}>
            <SectionHeader
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>}
              title="Content Defaults"
              description="Set default options for new uploads"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Default Upload Visibility</label>
                <select value={defaultVisibility} onChange={(e) => setDefaultVisibility(e.target.value)}
                  className="input" style={{ width: "100%", boxSizing: "border-box", cursor: "pointer" }}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Default Category</label>
                <select value={defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)}
                  className="input" style={{ width: "100%", boxSizing: "border-box", cursor: "pointer" }}>
                  {["General", "Gaming", "Music", "Education", "Entertainment", "Sports", "News", "Technology", "Science", "Travel", "Food", "Fashion", "Art", "Podcasts"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {defaultsMsg && <p style={{ fontSize: "0.78rem", color: defaultsMsg === "Saved" ? "var(--accent)" : "var(--accent-warm)", marginTop: "0.5rem" }}>{defaultsMsg}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
              <button onClick={handleSaveDefaults} disabled={defaultsSaving} style={{ padding: "0.55rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 600, backgroundColor: "var(--elevated)", color: "var(--accent)", border: "1px solid var(--accent)", cursor: defaultsSaving ? "not-allowed" : "pointer" }}>
                {defaultsSaving ? "Saving..." : "Save Defaults"}
              </button>
            </div>
          </div>

          {/* 7. Session Management */}
          <div className="form-card" style={{ padding: "1.5rem" }}>
            <SectionHeader
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
              title="Active Sessions"
              description="Manage devices where you're logged in"
            />
            {sessionError && <div style={{ padding: "0.7rem 1rem", backgroundColor: "var(--accent-warm-light)", color: "var(--accent-warm)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid rgba(244,63,94,0.15)" }}>{sessionError}</div>}
            {sessionsLoading ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Loading sessions...</p>
            ) : sessions.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No active sessions found.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {sessions.map((session) => {
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(session.lastActiveAt).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return "Active now";
                    if (mins < 60) return `${mins}m ago`;
                    const hours = Math.floor(mins / 60);
                    if (hours < 24) return `${hours}h ago`;
                    const days = Math.floor(hours / 24);
                    return `${days}d ago`;
                  })();

                  return (
                    <div key={session._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.7rem 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", backgroundColor: session.isCurrent ? "var(--accent-subtle)" : "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: session.isCurrent ? "var(--accent)" : "var(--text-muted)" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                        </div>
                        <div>
                          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{session.deviceName}</p>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{session.location} &middot; {timeAgo}</p>
                        </div>
                      </div>
                      {session.isCurrent ? (
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--accent)", padding: "0.25rem 0.6rem", backgroundColor: "var(--accent-subtle)", borderRadius: "2rem" }}>This device</span>
                      ) : (
                        <button onClick={() => handleRevokeSession(session._id)}
                          style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--accent-warm)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                          Log out
                        </button>
                      )}
                    </div>
                  );
                })}
                {sessions.length > 1 && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                    <button onClick={handleRevokeAllSessions}
                      style={{ padding: "0.55rem 1.2rem", borderRadius: "var(--radius-md)", fontSize: "0.82rem", fontWeight: 600, backgroundColor: "var(--elevated)", color: "var(--accent-warm)", border: "1px solid var(--accent-warm)", cursor: "pointer", transition: "all 0.2s" }}>
                      Log out all other devices
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 8. Delete Account */}
          <div className="form-card card-full" style={{ padding: "1.5rem", border: "1px solid rgba(244,63,94,0.25)" }}>
            <SectionHeader
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warm)" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>}
              title="Delete Account"
              description="Permanently delete your account and all data"
            />
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.5 }}>
              This action is <strong style={{ color: "var(--accent-warm)" }}>permanent and irreversible</strong>. All your data, videos, subscribers, and settings will be permanently deleted.
            </p>

            {deleteError && <div style={{ padding: "0.7rem 1rem", backgroundColor: "var(--accent-warm-light)", color: "var(--accent-warm)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid rgba(244,63,94,0.15)" }}>{deleteError}</div>}

            {/* Step 1: Password */}
            {deleteStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "var(--accent-warm)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>1</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--accent-warm)" }}>Enter your password</span>
                </div>
                <PasswordInput value={deletePassword} onChange={setDeletePassword} placeholder="Password" />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={handleDeleteStep1} disabled={!deletePassword}
                    style={{ padding: "0.65rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem", fontWeight: 600, backgroundColor: "var(--elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: deletePassword ? "pointer" : "not-allowed" }}>
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {deleteStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "var(--accent-warm)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>2</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--accent-warm)" }}>Verify with OTP</span>
                </div>
                {!deleteOtpSent ? (
                  <>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button type="button" onClick={() => setDeleteChannel("email")}
                        style={{ flex: 1, padding: "0.5rem", borderRadius: "var(--radius-md)", fontSize: "0.82rem", fontWeight: 600, backgroundColor: deleteChannel === "email" ? "var(--accent)" : "var(--bg-secondary)", color: deleteChannel === "email" ? "#fff" : "var(--text-muted)", border: `1px solid ${deleteChannel === "email" ? "var(--accent)" : "var(--border)"}`, cursor: "pointer", transition: "all 0.2s" }}>
                        📧 Email
                      </button>
                      <button type="button" onClick={() => setDeleteChannel("whatsapp")}
                        style={{ flex: 1, padding: "0.5rem", borderRadius: "var(--radius-md)", fontSize: "0.82rem", fontWeight: 600, backgroundColor: deleteChannel === "whatsapp" ? "#25D366" : "var(--bg-secondary)", color: deleteChannel === "whatsapp" ? "#fff" : "var(--text-muted)", border: `1px solid ${deleteChannel === "whatsapp" ? "#25D366" : "var(--border)"}`, cursor: "pointer", transition: "all 0.2s" }}>
                        💬 WhatsApp
                      </button>
                    </div>
                    <button onClick={handleSendDeleteOtp} disabled={deleteOtpSending}
                      style={{
                        padding: "0.65rem 1rem",
                        borderRadius: "var(--radius-md)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--accent)",
                        border: "1px solid var(--accent)",
                        cursor: !deleteOtpSending ? "pointer" : "not-allowed",
                        transition: "all 0.2s",
                      }}>
                      {deleteOtpSending ? "Sending OTP..." : `Send OTP via ${deleteChannel === "whatsapp" ? "WhatsApp" : "Email"}`}
                    </button>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="000000"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      inputMode="numeric"
                      value={deleteOtp}
                      onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, ""))}
                      style={{ letterSpacing: "0.4em", textAlign: "center", fontSize: "1rem", fontWeight: 600 }}
                    />
                    <button type="button" onClick={handleSendDeleteOtp} disabled={deleteOtpSending}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", textAlign: "left", padding: 0 }}>
                      {deleteOtpSending ? "Sending..." : "Resend OTP"}
                    </button>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                  <button onClick={() => { setDeleteStep(1); setDeleteOtpSent(false); setDeleteOtp(""); }}
                    style={{ padding: "0.65rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem", fontWeight: 600, backgroundColor: "var(--elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer" }}>
                    Back
                  </button>
                  <button onClick={() => { if (!deleteOtp || deleteOtp.length !== 6) return; setDeleteStep(3); }}
                    disabled={!deleteOtpSent || deleteOtp.length !== 6}
                    style={{ padding: "0.65rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem", fontWeight: 600, backgroundColor: deleteOtpSent && deleteOtp.length === 6 ? "var(--accent-warm)" : "var(--elevated)", color: deleteOtpSent && deleteOtp.length === 6 ? "#fff" : "var(--text-muted)", border: `1px solid ${deleteOtpSent && deleteOtp.length === 6 ? "var(--accent-warm)" : "var(--border)"}`, cursor: deleteOtpSent && deleteOtp.length === 6 ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Type DELETE */}
            {deleteStep === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "var(--accent-warm)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>3</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--accent-warm)" }}>Type DELETE to confirm</span>
                </div>
                <input type="text" className="input" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder='Type DELETE'
                  style={{ borderColor: deleteConfirm === "DELETE" ? "var(--accent-warm)" : undefined }} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                  <button onClick={() => { setDeleteStep(2); setDeleteConfirm(""); }} style={{ padding: "0.65rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem", fontWeight: 600, backgroundColor: "var(--elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer" }}>
                    Back
                  </button>
                  <button onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE" || deleting}
                    style={{ padding: "0.65rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem", fontWeight: 600, backgroundColor: deleteConfirm === "DELETE" ? "var(--accent-warm)" : "var(--elevated)", color: deleteConfirm === "DELETE" ? "#fff" : "var(--text-muted)", border: `1px solid ${deleteConfirm === "DELETE" ? "var(--accent-warm)" : "var(--border)"}`, cursor: deleteConfirm === "DELETE" && !deleting ? "pointer" : "not-allowed", opacity: deleting ? 0.7 : 1, transition: "all 0.2s" }}>
                    {deleting ? "Deleting..." : "Delete Account Permanently"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* OTP Usage */}
          <div className="form-card card-full" style={{ padding: "1.5rem" }}>
            <SectionHeader
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
              title="OTP Usage"
              description="Track your daily OTP limit and remaining requests"
            />
            {otpUsageLoading ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Loading OTP usage...</div>
            ) : otpUsage ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
                  <div style={{ padding: "1rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>{otpUsage.dailyLimit}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.25rem" }}>Daily Limit</div>
                  </div>
                  <div style={{ padding: "1rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-warm)", lineHeight: 1.2 }}>{otpUsage.usedToday}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.25rem" }}>Used Today</div>
                  </div>
                  <div style={{ padding: "1rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)", lineHeight: 1.2 }}>{otpUsage.remaining}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.25rem" }}>Remaining</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", backgroundColor: "var(--accent-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-focus)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  <div style={{ fontSize: "0.82rem", color: "var(--accent)", lineHeight: 1.5 }}>
                    <strong>Daily OTP Limit:</strong> {otpUsage.dailyLimit} per day across all OTP actions (login, password reset, email verification, etc.). Resets at midnight UTC.
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    Resets at <strong>{new Date(otpUsage.resetAt).toLocaleString()}</strong> (your local time)
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                Unable to load OTP usage data
              </div>
            )}
          </div>

          {/* Data Export */}
          <div className="form-card card-full" style={{ padding: "1.5rem" }}>
            <SectionHeader
              icon={<DownloadIcon size={18} />}
              title="Export Your Data"
              description="Download all your data including profile, videos, comments, and playlists"
            />
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.5 }}>
              Get a complete JSON export of your account data. This includes your profile information, all uploaded videos, comments, and playlists.
            </p>
            <button onClick={handleExportData} disabled={exporting}
              style={{
                padding: "0.65rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem", fontWeight: 600,
                backgroundColor: "var(--elevated)", color: "var(--text-primary)", border: "1px solid var(--border)",
                cursor: exporting ? "not-allowed" : "pointer", transition: "all 0.2s",
              }}>
              {exporting ? "Exporting..." : "Export My Data"}
            </button>
          </div>

          </div>{/* end settings-grid */}
        </div>{/* end content area */}
        </motion.div>
      </div>
    );
  }
