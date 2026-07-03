"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api, getApiErrorMessage } from "@/src/services/api";

interface Stream {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  viewerCount: number;
  category: string;
  tags: string[];
  streamer: { _id: string; fullName: string; username: string; avatar: string };
  createdAt: string;
}

export default function LivePage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/live/active")
      .then((res) => setStreams(res.data.data.docs || []))
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load streams")))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div style={{ width: "100%", padding: "1.5rem 2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div style={{
          width: 12, height: 12, borderRadius: "50%", backgroundColor: "#FF3B30",
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>
          Live Streams
        </h1>
      </div>

      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              borderRadius: "var(--radius-lg)", overflow: "hidden",
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-light)",
            }}>
              <div style={{ height: 180, backgroundColor: "var(--bg-secondary)", animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ padding: "0.75rem" }}>
                <div style={{ height: 16, width: "60%", backgroundColor: "var(--bg-secondary)", borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 12, width: "40%", backgroundColor: "var(--bg-secondary)", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div style={{
          padding: "2rem", textAlign: "center", color: "var(--text-muted)",
          backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-light)",
        }}>
          {error}
        </div>
      ) : streams.length === 0 ? (
        <div style={{
          padding: "4rem 2rem", textAlign: "center",
          backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-light)",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📡</div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            No live streams right now
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Check back later or start your own stream!
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {streams.map((stream) => (
            <Link
              key={stream._id}
              href={`/live/${stream._id}`}
              style={{
                borderRadius: "var(--radius-lg)", overflow: "hidden",
                backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-light)",
                textDecoration: "none", transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {/* Thumbnail */}
              <div style={{ position: "relative", height: 180, backgroundColor: "var(--bg-secondary)" }}>
                {stream.thumbnail ? (
                  <img src={stream.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    📡
                  </div>
                )}
                {/* LIVE badge */}
                <div style={{
                  position: "absolute", top: 8, left: 8,
                  padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)",
                  backgroundColor: "#FF3B30", color: "white",
                  fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em",
                  display: "flex", alignItems: "center", gap: "0.3rem",
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "white", animation: "pulse 1.5s ease-in-out infinite" }} />
                  LIVE
                </div>
                {/* Viewer count */}
                <div style={{
                  position: "absolute", bottom: 8, right: 8,
                  padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(0,0,0,0.7)", color: "white",
                  fontSize: "0.75rem", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: "0.3rem",
                }}>
                  👁 {stream.viewerCount}
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                  <img
                    src={stream.streamer.avatar}
                    alt=""
                    style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{
                      fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)",
                      margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {stream.title}
                    </h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
                      {stream.streamer.fullName}
                    </p>
                  </div>
                </div>
                {stream.category && (
                  <div style={{
                    marginTop: "0.5rem", display: "inline-block",
                    padding: "0.15rem 0.5rem", borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-secondary)", fontSize: "0.7rem",
                    color: "var(--text-muted)", fontWeight: 500,
                  }}>
                    {stream.category}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
