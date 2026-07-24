"use client";

import { useState, useRef, useEffect } from "react";
import { api, getApiErrorMessage } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";

type ModalAction = "add" | "edit" | "delete";
type TargetType = "email" | "mobile";

export default function ContactDetailsManager() {
  const { user, login } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [action, setAction] = useState<ModalAction>("add");
  const [targetType, setTargetType] = useState<TargetType>("email");
  const [step, setStep] = useState<"input" | "otp">("input");
  
  const [inputValue, setInputValue] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasEmail = !!user?.email;
  const hasMobile = !!user?.mobile;

  const openModal = (act: ModalAction, type: TargetType) => {
    setAction(act);
    setTargetType(type);
    setStep(act === "delete" ? "otp" : "input");
    setInputValue("");
    setOtp(Array(6).fill(""));
    setError("");
    setSuccess("");
    setModalOpen(true);

    if (act === "delete") {
      handleSendOTP(act, type, type); // For delete, the identifier parameter is the targetType
    }
  };

  const handleSendOTP = async (currentAction: ModalAction, currentTarget: TargetType, value: string) => {
    setError("");
    setLoading(true);
    try {
      await api.post("/users/update-identifier/send-otp", {
        action: currentAction,
        identifier: value,
      });
      if (currentAction !== "delete") {
        setStep("otp");
      }
      setSuccess("OTP sent successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to send OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setError("");
    setLoading(true);
    try {
      if (action === "delete") {
        const res = await api.post("/users/update-identifier/verify-delete", {
          targetType,
          verificationIdentifier: targetType === "email" ? user?.mobile : user?.email,
          otp: otpValue,
        });
        login(res.data.data.user);
        setSuccess(`${targetType} deleted successfully!`);
      } else {
        const res = await api.post("/users/update-identifier/verify-add", {
          identifier: inputValue,
          otp: otpValue,
        });
        login(res.data.data.user);
        setSuccess(`${targetType} updated successfully!`);
      }
      setTimeout(() => {
        setModalOpen(false);
        setSuccess("");
      }, 1500);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to verify OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      const next = Array(6).fill("");
      pasted.split("").forEach((char, i) => { next[i] = char; });
      setOtp(next);
      const focusIndex = Math.min(pasted.length, 5);
      otpRefs.current[focusIndex]?.focus();
    }
  };

  if (!user) return null;

  return (
    <div className="form-card" style={{ padding: "1.5rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.3rem" }}>Contact Details</h2>
      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Manage your email address and mobile number. OTP verification is required for any changes.</p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        
        {/* Email Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.2rem" }}>Email Address</div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>{hasEmail ? user.email : "Not added"}</div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {hasEmail ? (
              <>
                <button type="button" onClick={() => openModal("edit", "email")} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>Edit</button>
                <button type="button" onClick={() => openModal("delete", "email")} className="btn" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", backgroundColor: "var(--accent-warm-light)", color: "var(--accent-warm)", border: "1px solid rgba(244,63,94,0.2)" }}>Delete</button>
              </>
            ) : (
              <button type="button" onClick={() => openModal("add", "email")} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>Add Email</button>
            )}
          </div>
        </div>

        {/* Mobile Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.2rem" }}>Mobile Number</div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>{hasMobile ? user.mobile : "Not added"}</div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {hasMobile ? (
              <>
                <button type="button" onClick={() => openModal("edit", "mobile")} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>Edit</button>
                <button type="button" onClick={() => openModal("delete", "mobile")} className="btn" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", backgroundColor: "var(--accent-warm-light)", color: "var(--accent-warm)", border: "1px solid rgba(244,63,94,0.2)" }}>Delete</button>
              </>
            ) : (
              <button type="button" onClick={() => openModal("add", "mobile")} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>Add Mobile</button>
            )}
          </div>
        </div>

      </div>

      <AnimatePresence>
        {modalOpen && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ backgroundColor: "var(--bg-primary)", padding: "2rem", borderRadius: "var(--radius-lg)", maxWidth: 400, width: "100%", border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
              
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
                {action === "add" ? `Add ${targetType}` : action === "edit" ? `Edit ${targetType}` : `Delete ${targetType}`}
              </h3>
              
              {error && <div style={{ padding: "0.6rem", backgroundColor: "var(--accent-warm-light)", color: "var(--accent-warm)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem" }}>{error}</div>}
              {success && <div style={{ padding: "0.6rem", backgroundColor: "var(--accent-subtle)", color: "var(--accent)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem" }}>{success}</div>}

              {step === "input" && (
                <div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                    Enter your new {targetType} below. We'll send an OTP to verify it.
                  </p>
                  <input 
                    type="text" 
                    placeholder={targetType === "email" ? "hello@example.com" : "+1234567890"}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", marginBottom: "1rem" }}
                  />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => setModalOpen(false)} className="btn btn-secondary" style={{ flex: 1, padding: "0.75rem" }}>Cancel</button>
                    <button onClick={() => handleSendOTP(action, targetType, inputValue)} disabled={loading || !inputValue} className="btn btn-primary" style={{ flex: 1, padding: "0.75rem" }}>
                      {loading ? "Sending..." : "Send OTP"}
                    </button>
                  </div>
                </div>
              )}

              {step === "otp" && (
                <div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                    {action === "delete" 
                      ? `We sent an OTP to your ${targetType === "email" ? "mobile number" : "email"} to verify this deletion.`
                      : `Enter the OTP sent to ${inputValue}`
                    }
                  </p>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onPaste={handleOtpPaste}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !digit && i > 0) otpRefs.current[i - 1]?.focus();
                        }}
                        style={{ width: "100%", aspectRatio: "1", textAlign: "center", fontSize: "1.25rem", fontWeight: 700, backgroundColor: "var(--bg-secondary)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => setModalOpen(false)} className="btn btn-secondary" style={{ flex: 1, padding: "0.75rem" }}>Cancel</button>
                    <button onClick={handleVerify} disabled={loading || otp.join("").length !== 6} className="btn btn-primary" style={{ flex: 1, padding: "0.75rem" }}>
                      {loading ? "Verifying..." : "Verify & Save"}
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
