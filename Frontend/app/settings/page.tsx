"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api, getApiErrorMessage, refreshCsrfToken } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { PageMeta } from "@/src/components/PageMeta";
import { motion } from "framer-motion";

function PasswordInput({
  value,
  onChange,
  placeholder,
  minLength = 8,
  blockPaste = false,
  id,
  autoComplete,
  matchState,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minLength?: number;
  blockPaste?: boolean;
  id?: string;
  autoComplete?: string;
  matchState?: "idle" | "match" | "mismatch";
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        className="input"
        style={{
          width: "100%",
          boxSizing: "border-box",
          paddingRight: "2.5rem",
          borderColor:
            matchState === "match"
              ? "var(--success)"
              : matchState === "mismatch"
                ? "var(--error)"
                : undefined,
        }}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={blockPaste ? (e) => e.preventDefault() : undefined}
        onCopy={blockPaste ? (e) => e.preventDefault() : undefined}
        onCut={blockPaste ? (e) => e.preventDefault() : undefined}
        placeholder={placeholder}
        minLength={minLength}
        id={id}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{
          position: "absolute",
          right: "0.6rem",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          padding: "0.2rem",
          display: "flex",
        }}
      >
        {show ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
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
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 99,
              backgroundColor: i <= level ? colors[level] : "var(--elevated)",
              transition: "background-color 0.2s",
            }}
          />
        ))}
      </div>
      <span
        style={{ fontSize: "0.72rem", color: colors[level], fontWeight: 500 }}
      >
        {labels[level]}
      </span>
    </div>
  );
}

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Hindi",
  "Japanese",
  "Korean",
  "Portuguese",
  "German",
  "Chinese",
  "Arabic",
];

function SettingsProfileCard({
  user,
}: {
  user: NonNullable<ReturnType<typeof useAuthStore.getState>["user"]> | null;
}) {
  if (!user) return null;
  return (
    <div
      className="form-card"
      style={{ padding: "1.5rem", marginBottom: "1.5rem" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            border: "2px solid var(--accent)",
            padding: 2,
            flexShrink: 0,
          }}
        >
          <Image
            src={user.avatar}
            alt={user.fullName}
            width={64}
            height={64}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {user.fullName}
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            @{user.username}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {user.email}
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsSectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        marginBottom: "1.25rem",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent)",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            marginTop: "0.1rem",
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    logout,
  } = useAuthStore();
  // Password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [changePasswordOtp, setChangePasswordOtp] = useState<string[]>(
    Array(6).fill(""),
  );
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...changePasswordOtp];
    next[index] = value.slice(-1);
    setChangePasswordOtp(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !changePasswordOtp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted) {
      const next = Array(6).fill("");
      pasted.split("").forEach((char, i) => {
        next[i] = char;
      });
      setChangePasswordOtp(next);
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleDeleteOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...deleteOtp];
    next[index] = value.slice(-1);
    setDeleteOtp(next);
    if (value && index < 5) {
      deleteOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleDeleteOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !deleteOtp[index] && index > 0) {
      deleteOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleDeleteOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted) {
      const next = Array(6).fill("");
      pasted.split("").forEach((char, i) => {
        next[i] = char;
      });
      setDeleteOtp(next);
      deleteOtpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [changePasswordOtpError, setChangePasswordOtpError] = useState("");
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtpSending, setForgotOtpSending] = useState(false);
  const [forgotOtpError, setForgotOtpError] = useState("");
  const [changePasswordChannel, setChangePasswordChannel] = useState<
    "email" | "whatsapp"
  >("email");
  const [forgotChannel, setForgotChannel] = useState<"email" | "whatsapp">(
    "email",
  );

  // Notifications
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifReplies, setNotifReplies] = useState(true);
  const [notifSubscribers, setNotifSubscribers] = useState(true);
  const [notifMentions, setNotifMentions] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  // Language
  const [language, setLanguage] = useState("English");
  const [langSaving, setLangSaving] = useState(false);
  const [langMsg, setLangMsg] = useState("");

  // Sessions
  const [sessions, setSessions] = useState<
    Array<{
      _id: string;
      deviceName: string;
      location: string;
      timezone: string;
      lastActiveAt: string;
      isCurrent: boolean;
    }>
  >([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");

  // OTP Usage
  const [otpUsage, setOtpUsage] = useState<{
    dailyLimit: number;
    usedToday: number;
    remaining: number;
    resetAt: string;
  } | null>(null);
  const [otpUsageLoading, setOtpUsageLoading] = useState(true);

  // Delete Account
  const [deleteOtp, setDeleteOtp] = useState<string[]>(Array(6).fill(""));
  const deleteOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [deleteOtpSent, setDeleteOtpSent] = useState(false);
  const [deleteOtpSending, setDeleteOtpSending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const isOAuthUser = Boolean(
    user &&
      (user as unknown as { socialAccounts?: Record<string, unknown> })
        ?.socialAccounts &&
      Object.keys(
        (user as unknown as { socialAccounts?: Record<string, unknown> })
          .socialAccounts!
      ).length > 0
  );

  const refreshOtpUsage = () => {
    api
      .get("/otp/usage")
      .then((res) => setOtpUsage(res.data.data))
      .catch(() => {});
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      api
        .get("/sessions")
        .then((res) => setSessions(res.data.data || []))
        .catch(() => setSessions([]))
        .finally(() => setSessionsLoading(false));
      api
        .get("/users/notification-prefs")
        .then((res) => {
          const prefs = res.data.data;
          if (prefs) {
            setNotifLikes(prefs.likes ?? true);
            setNotifComments(prefs.comments ?? true);
            setNotifReplies(prefs.replies ?? true);
            setNotifSubscribers(prefs.subscriptions ?? true);
            setNotifMentions(prefs.mentions ?? true);
          }
        })
        .catch(() => {});
      api
        .get("/otp/usage")
        .then((res) => setOtpUsage(res.data.data))
        .catch(() => {})
        .finally(() => setOtpUsageLoading(false));
    }
  }, [isAuthenticated]);

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ color: "var(--text-muted)", fontWeight: 500 }}
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  const handleSendChangePasswordOtp = async () => {
    if (!oldPassword) {
      return;
    }
    setChangePasswordOtpError("");
    setOtpSending(true);
    try {
      await refreshCsrfToken();
      await api.post("/users/send-change-password-otp", {
        oldPassword,
        channel: changePasswordChannel,
        ...(changePasswordChannel === "email" && user?.email
          ? { email: user.email }
          : {}),
        ...(changePasswordChannel === "whatsapp" && user?.mobile
          ? { mobile: user.mobile }
          : {}),
      });
      setOtpSent(true);
      refreshOtpUsage();
    } catch (err: unknown) {
      setChangePasswordOtpError(getApiErrorMessage(err, "Failed to send OTP."));
    } finally {
      setOtpSending(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");
    if (newPassword !== confirmPassword) {
      setChangePasswordError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setChangePasswordError("Password must be at least 6 characters.");
      return;
    }
    if (!changePasswordOtp || changePasswordOtp.join("").length !== 6) {
      setChangePasswordError("Please enter the complete 6-digit OTP.");
      return;
    }
    setPasswordSaving(true);
    try {
      await api.post("/users/verify-change-password", {
        oldPassword,
        newPassword,
        otp: changePasswordOtp.join(""),
        channel: changePasswordChannel,
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangePasswordOtp(Array(6).fill(""));
      setOtpSent(false);
      setTimeout(() => {
        logout();
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      setChangePasswordError(
        getApiErrorMessage(err, "Failed to change password. Please try again."),
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSendForgotOtp = async () => {
    setForgotOtpError("");
    setForgotOtpSending(true);
    try {
      await refreshCsrfToken();
      await api.post("/users/send-forgot-password-change-otp", {
        channel: forgotChannel,
        ...(forgotChannel === "email" && user?.email
          ? { email: user.email }
          : {}),
        ...(forgotChannel === "whatsapp" && user?.mobile
          ? { mobile: user.mobile }
          : {}),
      });
      setForgotOtpSent(true);
      refreshOtpUsage();
    } catch (err: unknown) {
      setForgotOtpError(getApiErrorMessage(err, "Failed to send OTP."));
    } finally {
      setForgotOtpSending(false);
    }
  };

  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordError("");
    if (newPassword !== confirmPassword) {
      setForgotPasswordError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setForgotPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (!changePasswordOtp || changePasswordOtp.join("").length !== 6) {
      setForgotPasswordError("Please enter the complete 6-digit OTP.");
      return;
    }
    setPasswordSaving(true);
    try {
      await api.post("/users/verify-and-reset-password-via-otp", {
        newPassword,
        otp: changePasswordOtp.join(""),
        channel: forgotChannel,
      });
      setNewPassword("");
      setConfirmPassword("");
      setChangePasswordOtp(Array(6).fill(""));
      setForgotOtpSent(false);
      setForgotPasswordMode(false);
      setTimeout(() => {
        logout();
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      setForgotPasswordError(
        getApiErrorMessage(err, "Failed to reset password. Please try again."),
      );
    } finally {
      setPasswordSaving(false);
    }
  };

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
    } catch (err) {
      console.error("Failed to save notification prefs", err);
    } finally {
      setNotifSaving(false);
    }
  };

  const handleSaveLanguage = async () => {
    setLangMsg("");
    setLangSaving(true);
    try {
      await api.patch("/users/language", { language });
      setLangMsg("Saved");
    } catch (err) {
      console.error("Failed to save language", err);
      setLangMsg("Failed to save");
    } finally {
      setLangSaving(false);
      setTimeout(() => setLangMsg(""), 3000);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setSessionError("");
    try {
      await api.delete(`/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
    } catch (err) {
      console.error("Failed to revoke session", err);
      setSessionError("Failed to revoke session.");
    }
  };

  const handleRevokeAllSessions = async () => {
    setSessionError("");
    try {
      await api.delete("/sessions");
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch (err) {
      console.error("Failed to revoke all sessions", err);
      setSessionError("Failed to revoke sessions.");
    }
  };

  const handleSendDeleteOtp = async () => {
    setDeleteError("");
    if (deleteConfirmText !== "DELETE") {
      setDeleteError("Please type DELETE to confirm.");
      return;
    }
    if (!isOAuthUser && !deletePassword) {
      setDeleteError("Please enter your password.");
      return;
    }
    setDeleteOtpSending(true);
    try {
      await refreshCsrfToken();
      await api.post("/users/send-delete-account-otp", {
        ...(isOAuthUser ? {} : { password: deletePassword }),
        channel: "email",
      });
      setDeleteOtpSent(true);
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err, "Failed to send OTP."));
    } finally {
      setDeleteOtpSending(false);
    }
  };

  const handleVerifyAndDelete = async () => {
    setDeleteError("");
    if (deleteConfirmText !== "DELETE") {
      setDeleteError("Please type DELETE to confirm.");
      return;
    }
    if (!isOAuthUser && !deletePassword) {
      setDeleteError("Please enter your password.");
      return;
    }
    if (deleteOtp.join("").length !== 6) {
      setDeleteError("Please enter the 6-digit OTP.");
      return;
    }
    setDeleteLoading(true);
    try {
      await refreshCsrfToken();
      await api.post("/users/verify-and-delete-account", {
        ...(isOAuthUser ? {} : { password: deletePassword }),
        otp: deleteOtp.join(""),
        channel: "email",
      });
      logout();
      router.push("/register");
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err, "Failed to delete account."));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="content-max">
      <PageMeta
        title="Settings"
        description="Manage your VideoTube account and preferences."
        noIndex
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: "1.5rem",
          }}
        >
          Settings
        </h1>

        <SettingsProfileCard user={user} />

        <div
          className="form-card"
          style={{ padding: "1.5rem", marginBottom: "1.5rem" }}
        >
        <SettingsSectionHeader
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
            title="Change Password"
            description={
              forgotPasswordMode
                ? "Reset your password via OTP"
                : "Update your account password"
            }
          />

          {!forgotPasswordMode ? (
            <form
              onSubmit={handleChangePassword}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div className="settings-grid">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  <label
                    htmlFor="old-pw"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Current Password
                  </label>
                  <PasswordInput
                    id="old-pw"
                    value={oldPassword}
                    onChange={setOldPassword}
                    placeholder="Enter current password"
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  <label
                    htmlFor="new-pw"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    New Password
                  </label>
                  <PasswordInput
                    id="new-pw"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="Enter new password"
                  />
                  <PasswordStrength password={newPassword} />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  <label
                    htmlFor="confirm-pw"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Confirm Password
                  </label>
                  <PasswordInput
                    id="confirm-pw"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Confirm new password"
                    matchState={
                      confirmPassword.length === 0
                        ? "idle"
                        : newPassword === confirmPassword
                          ? "match"
                          : "mismatch"
                    }
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  <label
                    htmlFor="settings-otp"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Verification OTP
                  </label>
                  {changePasswordOtpError && (
                    <div
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "rgba(220,38,38,0.1)",
                        border: "1px solid var(--error)",
                        color: "var(--error)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {changePasswordOtpError}
                    </div>
                  )}
                  {!otpSent ? (
                    <>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => setChangePasswordChannel("email")}
                          style={{
                            flex: 1,
                            padding: "0.5rem",
                            borderRadius: "var(--radius-md)",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            backgroundColor:
                              changePasswordChannel === "email"
                                ? "var(--accent)"
                                : "var(--bg-secondary)",
                            color:
                              changePasswordChannel === "email"
                                ? "#fff"
                                : "var(--text-muted)",
                            border: `1px solid ${changePasswordChannel === "email" ? "var(--accent)" : "var(--border)"}`,
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          📧 Email
                        </button>
                        <button
                          type="button"
                          onClick={() => setChangePasswordChannel("whatsapp")}
                          style={{
                            flex: 1,
                            padding: "0.5rem",
                            borderRadius: "var(--radius-md)",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            backgroundColor:
                              changePasswordChannel === "whatsapp"
                                ? "#25D366"
                                : "var(--bg-secondary)",
                            color:
                              changePasswordChannel === "whatsapp"
                                ? "#fff"
                                : "var(--text-muted)",
                            border: `1px solid ${changePasswordChannel === "whatsapp" ? "#25D366" : "var(--border)"}`,
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
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
                          cursor:
                            oldPassword && !otpSending
                              ? "pointer"
                              : "not-allowed",
                          transition: "all 0.2s",
                        }}
                      >
                        {otpSending
                          ? "Sending OTP..."
                          : `Send OTP via ${changePasswordChannel === "whatsapp" ? "WhatsApp" : "Email"}`}
                      </button>
                    </>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          justifyContent: "flex-start",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {changePasswordOtp.map((digit, i) => (
                          <input
                            key={i}
                            ref={(el) => {
                              otpRefs.current[i] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            aria-label={`OTP digit ${i + 1}`}
                            onChange={(e) => handleOtpChange(i, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                            onPaste={handleOtpPaste}
                            style={{
                              width: 44,
                              height: 48,
                              textAlign: "center",
                              fontSize: "1.15rem",
                              fontWeight: 700,
                              borderRadius: "var(--radius-md)",
                              border: "1.5px solid var(--border)",
                              backgroundColor: "var(--bg-primary)",
                              color: "var(--text-primary)",
                              outline: "none",
                            }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleSendChangePasswordOtp}
                        disabled={otpSending}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                          textDecoration: "underline",
                          textAlign: "left",
                          padding: 0,
                        }}
                      >
                        {otpSending ? "Sending..." : "Resend OTP"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {changePasswordError && (
                <div
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(220,38,38,0.1)",
                    border: "1px solid var(--error)",
                    color: "var(--error)",
                    fontSize: "0.82rem",
                  }}
                >
                  {changePasswordError}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    passwordSaving ||
                    !otpSent ||
                    changePasswordOtp.join("").length !== 6
                  }
                  style={{
                    padding: "0.65rem 1.5rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.9rem",
                    opacity:
                      passwordSaving ||
                      !otpSent ||
                      changePasswordOtp.join("").length !== 6
                        ? 0.6
                        : 1,
                    cursor:
                      passwordSaving ||
                      !otpSent ||
                      changePasswordOtp.join("").length !== 6
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {passwordSaving ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleForgotPasswordReset}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div className="settings-grid">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  <label
                    htmlFor="forgot-new-pw"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    New Password
                  </label>
                  <PasswordInput
                    id="forgot-new-pw"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="Enter new password"
                  />
                  <PasswordStrength password={newPassword} />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  <label
                    htmlFor="forgot-confirm-pw"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Confirm Password
                  </label>
                  <PasswordInput
                    id="forgot-confirm-pw"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Confirm new password"
                    matchState={
                      confirmPassword.length === 0
                        ? "idle"
                        : newPassword === confirmPassword
                          ? "match"
                          : "mismatch"
                    }
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  <label
                    htmlFor="forgot-otp"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Verification OTP
                  </label>
                  {forgotOtpError && (
                    <div
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "rgba(220,38,38,0.1)",
                        border: "1px solid var(--error)",
                        color: "var(--error)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {forgotOtpError}
                    </div>
                  )}
                  {!forgotOtpSent ? (
                    <>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => setForgotChannel("email")}
                          style={{
                            flex: 1,
                            padding: "0.5rem",
                            borderRadius: "var(--radius-md)",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            backgroundColor:
                              forgotChannel === "email"
                                ? "var(--accent)"
                                : "var(--bg-secondary)",
                            color:
                              forgotChannel === "email"
                                ? "#fff"
                                : "var(--text-muted)",
                            border: `1px solid ${forgotChannel === "email" ? "var(--accent)" : "var(--border)"}`,
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          📧 Email
                        </button>
                        <button
                          type="button"
                          onClick={() => setForgotChannel("whatsapp")}
                          style={{
                            flex: 1,
                            padding: "0.5rem",
                            borderRadius: "var(--radius-md)",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            backgroundColor:
                              forgotChannel === "whatsapp"
                                ? "#25D366"
                                : "var(--bg-secondary)",
                            color:
                              forgotChannel === "whatsapp"
                                ? "#fff"
                                : "var(--text-muted)",
                            border: `1px solid ${forgotChannel === "whatsapp" ? "#25D366" : "var(--border)"}`,
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
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
                        {forgotOtpSending
                          ? "Sending OTP..."
                          : `Send OTP via ${forgotChannel === "whatsapp" ? "WhatsApp" : "Email"}`}
                      </button>
                    </>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          justifyContent: "flex-start",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {changePasswordOtp.map((digit, i) => (
                          <input
                            key={i}
                            ref={(el) => {
                              otpRefs.current[i] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            aria-label={`OTP digit ${i + 1}`}
                            onChange={(e) => handleOtpChange(i, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                            onPaste={handleOtpPaste}
                            style={{
                              width: 44,
                              height: 48,
                              textAlign: "center",
                              fontSize: "1.15rem",
                              fontWeight: 700,
                              borderRadius: "var(--radius-md)",
                              border: "1.5px solid var(--border)",
                              backgroundColor: "var(--bg-primary)",
                              color: "var(--text-primary)",
                              outline: "none",
                            }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleSendForgotOtp}
                        disabled={forgotOtpSending}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                          textDecoration: "underline",
                          textAlign: "left",
                          padding: 0,
                        }}
                      >
                        {forgotOtpSending ? "Sending..." : "Resend OTP"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {forgotPasswordError && (
                <div
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(220,38,38,0.1)",
                    border: "1px solid var(--error)",
                    color: "var(--error)",
                    fontSize: "0.82rem",
                  }}
                >
                  {forgotPasswordError}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    passwordSaving ||
                    !forgotOtpSent ||
                    changePasswordOtp.join("").length !== 6
                  }
                  style={{
                    padding: "0.65rem 1.5rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.9rem",
                    opacity:
                      passwordSaving ||
                      !forgotOtpSent ||
                      changePasswordOtp.join("").length !== 6
                        ? 0.6
                        : 1,
                    cursor:
                      passwordSaving ||
                      !forgotOtpSent ||
                      changePasswordOtp.join("").length !== 6
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {passwordSaving ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: "1rem" }}>
            <button
              onClick={() => setForgotPasswordMode(!forgotPasswordMode)}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
                padding: 0,
              }}
            >
              {forgotPasswordMode
                ? "Back to Change Password"
                : "Forgot Password?"}
            </button>
          </div>
        </div>

        <div className="form-card" style={{ padding: "1.5rem" }}>
        <SettingsSectionHeader
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            }
            title="Notifications"
            description="Choose which notifications to receive"
          />
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {[
              {
                label: "Likes on my videos",
                desc: "Someone liked your video",
                checked: notifLikes,
                onChange: setNotifLikes,
              },
              {
                label: "Comments on my videos",
                desc: "Someone commented on your video",
                checked: notifComments,
                onChange: setNotifComments,
              },
              {
                label: "Replies to my comments",
                desc: "Someone replied to your comment",
                checked: notifReplies,
                onChange: setNotifReplies,
              },
              {
                label: "New subscribers",
                desc: "Someone subscribed to your channel",
                checked: notifSubscribers,
                onChange: setNotifSubscribers,
              },
              {
                label: "Mentions",
                desc: "Someone mentioned you",
                checked: notifMentions,
                onChange: setNotifMentions,
              },
            ].map((item) => (
              <label
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.6rem 0",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {item.label}
                  </p>
                  <p
                    style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}
                  >
                    {item.desc}
                  </p>
                </div>
                <button
                  onClick={() => item.onChange(!item.checked)}
                  role="switch"
                  aria-checked={item.checked}
                  aria-label={`Toggle ${item.label.toLowerCase()}`}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 99,
                    backgroundColor: item.checked
                      ? "var(--accent)"
                      : "var(--elevated)",
                    border: `2px solid ${item.checked ? "var(--accent)" : "var(--border)"}`,
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.2s",
                  }}
                >
                  <motion.div
                    animate={{ x: item.checked ? 18 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      backgroundColor: "#fff",
                      position: "absolute",
                      top: 3,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                    }}
                  />
                </button>
              </label>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "1rem",
            }}
          >
            <button
              onClick={handleSaveNotificationPrefs}
              disabled={notifSaving}
              style={{
                padding: "0.55rem 1.5rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                fontWeight: 600,
                backgroundColor: "var(--elevated)",
                color: "var(--accent)",
                border: "1px solid var(--accent)",
                cursor: notifSaving ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {notifSaving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </div>

        <div className="form-card" style={{ padding: "1.5rem" }}>
        <SettingsSectionHeader
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            }
            title="Language"
            description="Select your preferred language"
          />
          <select
            id="settings-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="input"
            style={{
              width: "100%",
              boxSizing: "border-box",
              cursor: "pointer",
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {langMsg && (
            <p
              role="alert"
              style={{
                fontSize: "0.78rem",
                color:
                  langMsg === "Saved" ? "var(--accent)" : "var(--accent-warm)",
                marginTop: "0.5rem",
              }}
            >
              {langMsg}
            </p>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "0.75rem",
            }}
          >
            <button
              onClick={handleSaveLanguage}
              disabled={langSaving}
              style={{
                padding: "0.55rem 1.5rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                fontWeight: 600,
                backgroundColor: "var(--elevated)",
                color: "var(--accent)",
                border: "1px solid var(--accent)",
                cursor: langSaving ? "not-allowed" : "pointer",
              }}
            >
              {langSaving ? "Saving..." : "Save Language"}
            </button>
          </div>
        </div>

        <div className="form-card" style={{ padding: "1.5rem" }}>
        <SettingsSectionHeader
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            }
            title="Active Sessions"
            description="Manage your active sessions"
          />
          {sessionError && (
            <div
              style={{
                padding: "0.7rem 1rem",
                backgroundColor: "var(--accent-warm-light)",
                color: "var(--accent-warm)",
                borderRadius: "var(--radius-md)",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                border: "1px solid rgba(244,63,94,0.15)",
              }}
            >
              {sessionError}
            </div>
          )}
          {sessionsLoading ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Loading sessions...
            </p>
          ) : sessions.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              No active sessions found.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {sessions.map((session) => {
                const timeAgo = (() => {
                  const diff =
                    Date.now() - new Date(session.lastActiveAt).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 1) return "Active now";
                  if (mins < 60) return `${mins}m ago`;
                  const hours = Math.floor(mins / 60);
                  if (hours < 24) return `${hours}h ago`;
                  const days = Math.floor(hours / 24);
                  return `${days}d ago`;
                })();

                return (
                  <div
                    key={session._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.7rem 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: session.isCurrent
                            ? "var(--accent-subtle)"
                            : "var(--bg-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: session.isCurrent
                            ? "var(--accent)"
                            : "var(--text-muted)",
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="2"
                            y="3"
                            width="20"
                            height="14"
                            rx="2"
                            ry="2"
                          />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {session.deviceName}
                        </p>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {session.location}
                          {session.timezone
                            ? ` \u00b7 ${session.timezone}`
                            : ""}{" "}
                          &middot;{" "}
                          {session.isCurrent
                            ? new Date(session.lastActiveAt).toLocaleString(
                                "en-GB",
                                { timeZone: session.timezone || undefined },
                              )
                            : timeAgo}
                        </p>
                      </div>
                    </div>
                    {session.isCurrent ? (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--accent)",
                          padding: "0.25rem 0.6rem",
                          backgroundColor: "var(--accent-subtle)",
                          borderRadius: "2rem",
                        }}
                      >
                        This device
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRevokeSession(session._id)}
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 500,
                          color: "var(--accent-warm)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Log out
                      </button>
                    )}
                  </div>
                );
              })}
              {sessions.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "0.5rem",
                  }}
                >
                  <button
                    onClick={handleRevokeAllSessions}
                    style={{
                      padding: "0.55rem 1.2rem",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      backgroundColor: "var(--elevated)",
                      color: "var(--accent-warm)",
                      border: "1px solid var(--accent-warm)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    Log out all other devices
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-card card-full" style={{ padding: "1.5rem" }}>
        <SettingsSectionHeader
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
            title="OTP Usage"
            description="Track your daily OTP usage"
          />
          {otpUsageLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "var(--text-muted)",
              }}
            >
              Loading OTP usage...
            </div>
          ) : otpUsage ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "var(--bg-secondary)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      lineHeight: 1.2,
                    }}
                  >
                    {otpUsage.dailyLimit}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: "0.25rem",
                    }}
                  >
                    Daily Limit
                  </div>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "var(--bg-secondary)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: "var(--accent-warm)",
                      lineHeight: 1.2,
                    }}
                  >
                    {otpUsage.usedToday}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: "0.25rem",
                    }}
                  >
                    Used Today
                  </div>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "var(--bg-secondary)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: "var(--accent)",
                      lineHeight: 1.2,
                    }}
                  >
                    {otpUsage.remaining}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: "0.25rem",
                    }}
                  >
                    Remaining
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  backgroundColor: "var(--accent-subtle)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-focus)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  style={{ flexShrink: 0 }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--accent)",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Daily OTP Limit:</strong> {otpUsage.dailyLimit} per
                  day across all OTP actions (login, password reset, email
                  verification, etc.).
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-muted)"
                  strokeWidth="2"
                  style={{ flexShrink: 0 }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {(() => {
                    if (otpUsage.resetAt) {
                      const resetDate = new Date(otpUsage.resetAt);
                      const now = new Date();
                      const diffMs = resetDate.getTime() - now.getTime();
                      if (diffMs <= 0)
                        return (
                          <>
                            Resets <strong>now</strong>
                          </>
                        );
                      const diffHrs = Math.floor(diffMs / 3600000);
                      const diffMins = Math.floor((diffMs % 3600000) / 60000);
                      if (diffHrs < 1) {
                        return (
                          <>
                            Resets in <strong>{diffMins} minutes</strong>
                          </>
                        );
                      }
                      return (
                        <>
                          Resets in{" "}
                          <strong>
                            {diffHrs}h {diffMins}m
                          </strong>
                        </>
                      );
                    }
                    const now = new Date();
                    const nextMidnight = new Date(now);
                    nextMidnight.setDate(nextMidnight.getDate() + 1);
                    nextMidnight.setHours(0, 0, 0, 0);
                    const diffMs = nextMidnight.getTime() - now.getTime();
                    const diffHrs = Math.floor(diffMs / 3600000);
                    const diffMins = Math.floor((diffMs % 3600000) / 60000);
                    if (diffHrs < 1) {
                      return (
                        <>
                          Resets in <strong>{diffMins} minutes</strong> (12:00
                          AM local time)
                        </>
                      );
                    }
                    return (
                      <>
                        Resets in{" "}
                        <strong>
                          {diffHrs}h {diffMins}m
                        </strong>{" "}
                        (12:00 AM local time)
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "var(--text-muted)",
                }}
              >
                Unable to load OTP usage data
              </div>
            )}
          </div>

          <div
            className="form-card"
            style={{
              padding: "1.5rem",
              border: "1px solid rgba(239,68,68,0.3)",
              backgroundColor: "rgba(239,68,68,0.03)",
            }}
          >
            <SettingsSectionHeader
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              }
              title="Danger Zone"
              description="Permanently delete your account and all associated data"
            />
            {!showDeleteConfirm ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem",
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    Delete Account
                  </p>
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      marginTop: "0.2rem",
                    }}
                  >
                    Once deleted, all videos, likes and history are gone forever.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    padding: "0.6rem 1.2rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    backgroundColor: "var(--error)",
                    color: "#fff",
                    border: "1px solid var(--error)",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  padding: "1rem",
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  This action <strong style={{ color: "var(--error)" }}>cannot be undone</strong>. Type{" "}
                  <code
                    style={{
                      padding: "0.15rem 0.35rem",
                      backgroundColor: "var(--elevated)",
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    DELETE
                  </code>{" "}
                  and enter the OTP sent to your email.
                </p>
                <input
                  type="text"
                  placeholder="Type DELETE to confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
                {isOAuthUser ? (
                  <div
                    style={{
                      padding: "0.7rem 1rem",
                      backgroundColor: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.82rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Social login account — no password required. OTP will still be sent to your email for verification.
                  </div>
                ) : (
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    autoComplete="current-password"
                  />
                )}
                {!deleteOtpSent ? (
                  <button
                    onClick={handleSendDeleteOtp}
                    disabled={deleteOtpSending || deleteConfirmText !== "DELETE" || (!isOAuthUser && !deletePassword)}
                    style={{
                      padding: "0.65rem 1rem",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--error)",
                      border: "1px solid var(--error)",
                      cursor:
                        deleteConfirmText === "DELETE" && (isOAuthUser || deletePassword) && !deleteOtpSending
                          ? "pointer"
                          : "not-allowed",
                      opacity: deleteConfirmText === "DELETE" && (isOAuthUser || deletePassword) ? 1 : 0.5,
                    }}
                  >
                    {deleteOtpSending ? "Sending OTP..." : "Send OTP to Email"}
                  </button>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        justifyContent: "flex-start",
                      }}
                    >
                      {deleteOtp.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            deleteOtpRefs.current[i] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          aria-label={`OTP digit ${i + 1}`}
                          onChange={(e) => handleDeleteOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleDeleteOtpKeyDown(i, e)}
                          onPaste={handleDeleteOtpPaste}
                          style={{
                            width: 44,
                            height: 48,
                            textAlign: "center",
                            fontSize: "1.15rem",
                            fontWeight: 700,
                            borderRadius: "var(--radius-md)",
                            border: "1.5px solid var(--border)",
                            backgroundColor: "var(--bg-primary)",
                            color: "var(--text-primary)",
                            outline: "none",
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteOtpSent(false);
                          setDeleteOtp(Array(6).fill(""));
                          setDeleteConfirmText("");
                          setDeleteError("");
                        }}
                        disabled={deleteLoading}
                        style={{
                          flex: 1,
                          padding: "0.65rem 1rem",
                          borderRadius: "var(--radius-md)",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          backgroundColor: "var(--bg-primary)",
                          color: "var(--text-muted)",
                          border: "1px solid var(--border)",
                          cursor: deleteLoading ? "not-allowed" : "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleVerifyAndDelete}
                        disabled={deleteLoading || deleteOtp.join("").length !== 6}
                        style={{
                          flex: 1,
                          padding: "0.65rem 1rem",
                          borderRadius: "var(--radius-md)",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          backgroundColor: "var(--error)",
                          color: "#fff",
                          border: "1px solid var(--error)",
                          cursor:
                            deleteLoading || deleteOtp.join("").length !== 6
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            deleteLoading || deleteOtp.join("").length !== 6 ? 0.6 : 1,
                        }}
                      >
                        {deleteLoading ? "Deleting..." : "Permanently Delete"}
                      </button>
                    </div>
                    <button
                      onClick={handleSendDeleteOtp}
                      disabled={deleteOtpSending}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        textDecoration: "underline",
                        textAlign: "left",
                        padding: 0,
                      }}
                    >
                      {deleteOtpSending ? "Sending..." : "Resend OTP"}
                    </button>
                  </>
                )}
                {deleteError && (
                  <div
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "rgba(220,38,38,0.1)",
                      border: "1px solid var(--error)",
                      color: "var(--error)",
                      fontSize: "0.82rem",
                    }}
                  >
                    {deleteError}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }
