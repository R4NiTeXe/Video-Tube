"use client";

import React, { useState } from "react";
import { api, getApiErrorMessage } from "@/src/services/api";

interface DonationProps {
  recipientId: string;
  recipientName: string;
  videoId?: string;
}

const PRESET_AMOUNTS = [1, 5, 10, 25, 50];

export default function DonationButton({ recipientId, recipientName, videoId }: DonationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(5);
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleDonate = async () => {
    if (amount < 1) return;
    setIsLoading(true);
    setError("");

    try {
      await api.post("/donations", {
        recipientId,
        videoId,
        amount,
        message,
        isAnonymous,
      });
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setAmount(5);
        setMessage("");
      }, 2000);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to send tip"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.5rem 1rem",
          borderRadius: "var(--radius-md)",
          border: "none",
          background: "linear-gradient(135deg, #FFD700, #FFA500)",
          color: "#000",
          cursor: "pointer",
          fontSize: "0.85rem",
          fontWeight: 700,
          transition: "transform 0.2s",
        }}
      >
        💰 Tip
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-light)",
              padding: "1.5rem",
              maxWidth: "380px",
              width: "90%",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            {success ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎉</div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Tip sent!
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  Thank you for supporting {recipientName}
                </p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                  Send a tip to {recipientName}
                </h3>

                {/* Preset amounts */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset)}
                      style={{
                        padding: "0.4rem 0.8rem",
                        borderRadius: "var(--radius-md)",
                        border: amount === preset ? "2px solid var(--accent)" : "1px solid var(--border-light)",
                        backgroundColor: amount === preset ? "var(--accent-light)" : "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: amount === preset ? 700 : 500,
                      }}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div style={{ position: "relative", marginBottom: "0.75rem" }}>
                  <span style={{
                    position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)",
                    color: "var(--text-muted)", fontWeight: 600,
                  }}>$</span>
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="input-field"
                    style={{ paddingLeft: "1.75rem" }}
                  />
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message (optional)"
                  maxLength={500}
                  className="input-field"
                  style={{ width: "100%", minHeight: 60, resize: "vertical", marginBottom: "0.75rem", fontSize: "0.85rem" }}
                />

                {/* Anonymous */}
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  Send anonymously
                </label>

                {error && (
                  <div style={{ padding: "0.5rem", marginBottom: "0.75rem", backgroundColor: "var(--accent-light)", color: "var(--accent)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem" }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => setIsOpen(false)}
                    style={{
                      flex: 1, padding: "0.6rem", borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-light)", backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)", cursor: "pointer", fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDonate}
                    disabled={isLoading || amount < 1}
                    style={{
                      flex: 1, padding: "0.6rem", borderRadius: "var(--radius-md)",
                      border: "none", background: "linear-gradient(135deg, #FFD700, #FFA500)",
                      color: "#000", cursor: "pointer", fontWeight: 700, opacity: isLoading || amount < 1 ? 0.6 : 1,
                    }}
                  >
                    {isLoading ? "Sending..." : `Send $${amount}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
