"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, getApiErrorMessage } from "@/src/services/api";
import DonationButton from "@/src/components/DonationButton";
import LiveChat from "@/src/components/LiveChat";
import GiftOverlay from "@/src/components/GiftOverlay";

interface StreamData {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  viewerCount: number;
  totalViewers: number;
  category: string;
  tags: string[];
  isLive: boolean;
  startedAt: string;
  streamer: { _id: string; fullName: string; username: string; avatar: string; isVerified: boolean };
}

export default function LiveStreamPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.streamId as string;
  const [stream, setStream] = useState<StreamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStream = useCallback(async () => {
    try {
      const res = await api.get(`/live/${streamId}`);
      setStream(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Stream not found"));
    } finally {
      setIsLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    fetchStream();

    // Increment viewer count on mount
    api.post(`/live/${streamId}/viewer-increment`).catch(() => {});

    // Poll viewer count
    const interval = setInterval(() => {
      api.get(`/live/${streamId}`).then((res) => {
        setStream(res.data.data);
      }).catch(() => {});
    }, 5000);
    return () => {
      clearInterval(interval);
      // Decrement viewer count on unmount
      api.post(`/live/${streamId}/viewer-decrement`).catch(() => {});
    };
  }, [streamId, fetchStream]);

  if (isLoading) {
    return (
      <div style={{ width: "100%", padding: "1.5rem 2rem" }}>
        <div style={{ height: 500, backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div style={{ width: "100%", padding: "1.5rem 2rem", textAlign: "center" }}>
        <div style={{ padding: "4rem 2rem", backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-light)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📡</div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>{error || "Stream not found"}</h2>
          <Link href="/live" style={{ display: "inline-block", marginTop: "1rem", padding: "0.5rem 1.5rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--accent)", color: "white", textDecoration: "none", fontWeight: 600, fontSize: "0.85rem" }}>
            Browse streams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", padding: "1.5rem 2rem" }}>
      {/* Video player area */}
      <div style={{
        position: "relative", width: "100%", aspectRatio: "16/9",
        backgroundColor: "#000", borderRadius: "var(--radius-lg)", overflow: "hidden",
        marginBottom: "1rem",
      }}>
        {/* Gift Overlay */}
        <GiftOverlay streamId={stream._id} />

        {stream.isLive ? (
          <>
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: "1rem",
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "linear-gradient(135deg, #FF3B30, #FF6B6B)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "pulse 2s ease-in-out infinite",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg>
              </div>
              <span style={{ color: "white", fontSize: "1.1rem", fontWeight: 600 }}>Stream is live</span>
            </div>
            {/* LIVE badge */}
            <div style={{
              position: "absolute", top: 12, left: 12,
              padding: "0.3rem 0.75rem", borderRadius: "var(--radius-sm)",
              backgroundColor: "#FF3B30", color: "white",
              fontSize: "0.8rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "white", animation: "pulse 1.5s ease-in-out infinite" }} />
              LIVE
            </div>
            {/* Viewer count */}
            <div style={{
              position: "absolute", top: 12, right: 12,
              padding: "0.3rem 0.75rem", borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(0,0,0,0.7)", color: "white",
              fontSize: "0.8rem", fontWeight: 600,
            }}>
              👁 {stream.viewerCount} watching
            </div>
          </>
        ) : (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: "0.5rem", color: "#666",
          }}>
            <div style={{ fontSize: "3rem" }}>📡</div>
            <span>Stream has ended</span>
            <Link href="/live" style={{ color: "var(--accent)", textDecoration: "none", fontSize: "0.85rem" }}>Browse other streams</Link>
          </div>
        )}
      </div>

      {/* Stream info */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
        <img
          src={stream.streamer.avatar}
          alt=""
          style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            {stream.title}
          </h1>
          <Link
            href={`/channel/${stream.streamer.username}`}
            style={{ fontSize: "0.9rem", color: "var(--text-muted)", textDecoration: "none", fontWeight: 600 }}
          >
            {stream.streamer.fullName}
            {stream.streamer.isVerified && <span style={{ marginLeft: 4 }}>✓</span>}
          </Link>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0.5rem 0 0" }}>
            {stream.description || "No description"}
          </p>
          {stream.category && (
            <div style={{
              marginTop: "0.5rem", display: "inline-block",
              padding: "0.2rem 0.6rem", borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--bg-secondary)", fontSize: "0.75rem",
              color: "var(--text-muted)",
            }}>
              {stream.category}
            </div>
          )}
          {stream.tags?.length > 0 && (
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              {stream.tags.map((tag) => (
                <span key={tag} style={{
                  padding: "0.15rem 0.5rem", borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-secondary)", fontSize: "0.7rem", color: "var(--text-muted)",
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <DonationButton
          recipientId={stream.streamer._id}
          recipientName={stream.streamer.fullName}
          videoId={stream._id}
        />
      </div>

      {/* Live Chat */}
      <div style={{ marginTop: "1.5rem" }}>
        <LiveChat streamId={stream._id} />
      </div>

      {/* Stats */}
      <div style={{
        marginTop: "1rem", padding: "0.75rem 1rem",
        borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border-light)",
        display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: "var(--text-muted)",
      }}>
        <span>👁 {stream.totalViewers} total views</span>
        <span>Started {stream.startedAt ? new Date(stream.startedAt).toLocaleString() : "N/A"}</span>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
