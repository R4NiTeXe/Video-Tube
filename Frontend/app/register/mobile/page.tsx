"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/src/store/useAuthStore";
import { api, getApiErrorMessage } from "@/src/services/api";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { PageMeta } from "@/src/components/PageMeta";



type Step = "mobile" | "otp" | "details";

export default function MobileRegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [step, setStep] = useState<Step>("mobile");
  const [countryCode] = useState("+91");
  const [mobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
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
    return;
  }, [cooldown]);

  const handleSendOTP = async () => {
    setError("");
    const digits = mobile.replace(/\D/g, "");
    if (!digits) return setError("Mobile number is required");
    if (digits.length < 7 || digits.length > 15) return setError("Please enter a valid mobile number");

    const fullMobile = `${countryCode}${digits}`;
    setIsLoading(true);
    try {
      await api.post("/users/mobile/send-registration-otp", { mobile: fullMobile });
      setStep("otp");
      setCooldown(60);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to send OTP"));
    } finally {
      setIsLoading(false);
    }
  };

  const getFullMobile = () => `${countryCode}${mobile.replace(/\D/g, "")}`;

  const handleVerifyOTP = async () => {
    setError("");
    const otpString = otp.join("");
    if (otpString.length !== 6) return setError("Enter the 6-digit OTP");

    setIsLoading(true);
    try {
      await api.post("/users/mobile/verify-registration-otp", { mobile: getFullMobile(), otp: otpString });
      setStep("details");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "OTP verification failed"));
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
      <>
        <PageMeta title="Mobile Registration" description="Register your VideoTube account using mobile verification." noIndex />
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)", fontWeight: 500 }}>
            Checking session...
          </motion.div>
        </div>
      </>
    );
  }
  if (isAuthenticated) return null;

  return (
    <>
      <PageMeta title="Mobile Registration" description="Register your VideoTube account using mobile verification." noIndex />
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ width: "100%", maxWidth: "420px" }}>
        
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              style={{ padding: "0.7rem 1rem", backgroundColor: "var(--error-light)", color: "var(--error)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid var(--error)" }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        
        {step === "otp" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              {otp.map((digit, i) => (
                <input key={i} name={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} autoFocus={i === 0}
                  value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                  style={{ width: 48, height: 56, textAlign: "center", fontSize: "1.3rem", fontWeight: 700, borderRadius: "var(--radius-md)",
                    border: "2px solid var(--border-light)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }} />
              ))}
            </div>
            <button onClick={handleVerifyOTP} disabled={isLoading} className="btn-primary" style={{ width: "100%", padding: "0.85rem" }}>
              {isLoading ? "Verifying..." : "Verify OTP"}
            </button>
            <button onClick={handleSendOTP} disabled={cooldown > 0 || isLoading}
              style={{ background: "none", border: "none", color: cooldown > 0 ? "var(--text-muted)" : "var(--accent)", fontSize: "0.85rem", fontWeight: 600, cursor: cooldown > 0 ? "default" : "pointer" }}>
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
            </button>
          </div>
        )}

        
        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--text-primary)", fontWeight: 700, textDecoration: "underline" }}>Sign in</Link>
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            Or <Link href="/register" style={{ color: "var(--accent)", fontWeight: 600 }}>register with email</Link>
          </p>
        </div>
      </motion.div>
    </div>
      </>
  );
}
