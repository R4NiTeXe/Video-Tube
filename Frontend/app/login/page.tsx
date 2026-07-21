"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/src/store/useAuthStore";
import { api, getApiErrorMessage } from "@/src/services/api";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { PageMeta } from "@/src/components/PageMeta";
import { PlayIcon, EyeIcon, EyeOffIcon, CloseIcon } from "@/src/components/icons";

const MascotAnimation = dynamic(() => import("@/src/components/MascotAnimation"), { ssr: false });

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, login } = useAuthStore();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState<"name" | "username" | "email" | "password" | "confirmPassword" | "avatar" | "cover" | "submit" | "none">("none");

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.push("/");
  }, [isAuthenticated, authLoading, router]);

  const detectInputType = (value: string): "email" | "mobile" => {
    const trimmed = value.trim();
    if (/^\+?\d{10,15}$/.test(trimmed.replace(/\s/g, ""))) return "mobile";
    if (/\S+@\S+\.\S+/.test(trimmed)) return "email";
    if (/^\d{10,15}$/.test(trimmed)) return "mobile";
    return "email";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = identifier.trim();
    if (!trimmed) return setError("Email or mobile number is required");
    if (!password) return setError("Password is required");

    setIsLoading(true);
    try {
      const inputType = detectInputType(trimmed);
      const payload =
        inputType === "mobile"
          ? { mobile: trimmed, password }
          : { email: trimmed, password };
      const response = await api.post("/users/login", payload);
      const { user } = response.data.data;
      login(user);
      router.push("/");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Login failed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-body" style={{ color: "var(--text-muted)", fontWeight: 500 }}>
          Checking session...
        </motion.div>
      </div>
    );
  }
  if (isAuthenticated) return null;

  return (
    <>
      <PageMeta title="Sign In" description="Sign in to your VideoTube account to access your videos, playlists, and subscriptions." noIndex />
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex", overflow: "hidden" }}>
      {/* LEFT: FORM */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 10, backgroundColor: "var(--bg-primary)", overflowY: "auto" }}>

        <header style={{ padding: "var(--sp-6) var(--sp-8)", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <div className="topnav-logo-icon">
              <PlayIcon size={16} />
            </div>
            <span className="topnav-logo-text" style={{ color: "var(--text-primary)" }}>
              Video<span style={{ color: "var(--text-muted)" }}>Tube</span>
            </span>
          </Link>
        </header>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--sp-4) var(--sp-8) var(--sp-16)" }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}
            style={{ width: "100%", maxWidth: "440px" }}
          >
            {/* Title */}
            <h1 className="text-hero" style={{ color: "var(--text-primary)", marginBottom: "var(--sp-2)" }}>
              Welcome back
            </h1>
            <p className="text-body" style={{ color: "var(--text-secondary)", marginBottom: "var(--sp-6)" }}>
              Sign in to continue to VideoTube
            </p>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div role="alert" aria-live="polite" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="card"
                  style={{
                    padding: "var(--sp-3) var(--sp-4)", backgroundColor: "var(--error-subtle)", color: "var(--error)",
                    borderRadius: "var(--radius-md)", marginBottom: "var(--sp-6)", fontSize: 13,
                    border: "1px solid rgba(239,68,68,0.20)", display: "flex", alignItems: "center", gap: "var(--sp-2)",
                  }}>
                  <CloseIcon size={14} /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
                <label htmlFor="login-email" className="text-caption" style={{ color: "var(--text-secondary)" }}>Email or Mobile</label>
                <div className="input-wrapper" onMouseEnter={() => {}} onMouseLeave={() => {}}>
                  <input
                    type="text" required
                    placeholder="Email or mobile"
                    className="input"
                    id="login-email"
                    autoComplete="email"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    onFocus={() => setActiveField("email")}
                    onBlur={() => setActiveField("none")}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label htmlFor="login-password" className="text-caption" style={{ color: "var(--text-secondary)" }}>Password</label>
                  <Link href="/forgot-password" className="text-caption" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
                    Forgot Password?
                  </Link>
                </div>
                <div className="password-field" style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Password"
                    className="input"
                    id="login-password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setActiveField("password")}
                    onBlur={() => setActiveField("none")}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(p => !p)}
                    onMouseDown={e => e.preventDefault()}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={isLoading}
                onMouseEnter={() => setActiveField("submit")}
                onMouseLeave={() => setActiveField("none")}
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "var(--sp-2)", opacity: isLoading ? 0.6 : 1, cursor: isLoading ? "not-allowed" : "pointer" }}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {/* Footer */}
            <p className="text-body" style={{ marginTop: "var(--sp-8)", textAlign: "center", color: "var(--text-muted)" }}>
              Don&apos;t have an account?{" "}
              <Link href="/register" style={{ color: "var(--text-primary)", fontWeight: 700, textDecoration: "underline" }}>
                Sign up
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* RIGHT: MASCOT */}
      <div style={{ flex: 1.2, backgroundColor: "var(--card)", borderLeft: "1px solid var(--border)" }} className="mascot-panel">
        <MascotAnimation
          activeField={activeField}
          isPasswordVisible={showPassword}
          isLoading={isLoading}
          passwordMatch="idle"
        />
      </div>

      
    </div>
    </>
  );
}
