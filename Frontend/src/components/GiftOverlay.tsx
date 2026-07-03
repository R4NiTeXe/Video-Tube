"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/services/api";

interface Donation {
  _id: string;
  sender: { fullName: string; username: string; avatar: string } | null;
  amount: number;
  message?: string;
  isAnonymous: boolean;
  createdAt: string;
}

interface GiftOverlayProps {
  streamId: string;
}

export default function GiftOverlay({ streamId }: GiftOverlayProps) {
  const [activeGifts, setActiveGifts] = useState<Donation[]>([]);

  const { data: donationsRes } = useQuery({
    queryKey: ["stream-donations", streamId],
    queryFn: async () => {
      const res = await api.get(`/donations/stream/${streamId}`);
      return res.data;
    },
    refetchInterval: 5000,
  });

  const donations: Donation[] = donationsRes?.data || [];

  // Show new donations as animated gifts
  useEffect(() => {
    if (donations.length === 0) return;

    const latestDonation = donations[donations.length - 1];
    const fiveSecsAgo = new Date(Date.now() - 5000);

    if (new Date(latestDonation.createdAt) > fiveSecsAgo) {
      setActiveGifts((prev) => {
        if (prev.some((g) => g._id === latestDonation._id)) return prev;
        return [...prev.slice(-4), latestDonation];
      });
    }
  }, [donations]);

  // Auto-remove gifts after animation
  useEffect(() => {
    if (activeGifts.length === 0) return;
    const timer = setTimeout(() => {
      setActiveGifts((prev) => prev.slice(1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeGifts]);

  if (activeGifts.length === 0) return null;

  const getGiftColor = (amount: number) => {
    if (amount >= 50) return { bg: "linear-gradient(135deg, #fbbf24, #f59e0b)", border: "#d97706", emoji: "💎" };
    if (amount >= 20) return { bg: "linear-gradient(135deg, #a78bfa, #8b5cf6)", border: "#7c3aed", emoji: "🎁" };
    if (amount >= 10) return { bg: "linear-gradient(135deg, #60a5fa, #3b82f6)", border: "#2563eb", emoji: "⭐" };
    return { bg: "linear-gradient(135deg, #34d399, #10b981)", border: "#059669", emoji: "💰" };
  };

  return (
    <div style={{
      position: "absolute", top: "1rem", right: "1rem",
      display: "flex", flexDirection: "column", gap: "0.5rem",
      zIndex: 100, pointerEvents: "none",
    }}>
      {activeGifts.map((gift) => {
        const colors = getGiftColor(gift.amount);
        const senderName = gift.isAnonymous ? "Anonymous" : (gift.sender?.fullName || "Someone");

        return (
          <div
            key={gift._id}
            style={{
              padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
              background: colors.bg, border: `2px solid ${colors.border}`,
              color: "white", minWidth: 200, maxWidth: 300,
              animation: "giftSlideIn 0.5s ease-out, giftPulse 2s ease-in-out infinite",
              boxShadow: `0 4px 20px ${colors.border}66`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "1.2rem" }}>{colors.emoji}</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                {senderName}
              </span>
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
              ${gift.amount}
            </div>
            {gift.message && (
              <p style={{ fontSize: "0.75rem", margin: "0.25rem 0 0", opacity: 0.9 }}>
                &quot;{gift.message}&quot;
              </p>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes giftSlideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes giftPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
