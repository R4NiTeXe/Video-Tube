"use client";


import { motion } from "framer-motion";
import Link from "next/link";
import { PageMeta } from "@/src/components/PageMeta";

export default function LiveStreamingPage() {
  return (
    <>
      <PageMeta title="Live Streaming" description="Go live on VideoTube with HLS & DASH adaptive bitrate streaming." noIndex />
      <main style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: "center", maxWidth: 520, padding: "2rem" }}
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 88, height: 88, borderRadius: "50%",
            backgroundColor: "rgba(255,59,48,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </motion.div>

        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Live Streaming
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginBottom: "0.25rem", lineHeight: 1.6 }}>
          Go live with HLS & DASH adaptive bitrate streaming.
        </p>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "2rem", lineHeight: 1.5 }}>
          Real-time broadcasting with ultra-low latency, built-in chat, and automatic transcoding — coming soon.
        </p>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          padding: "0.5rem 1.25rem", borderRadius: 99,
          backgroundColor: "var(--accent-subtle)", color: "var(--accent)",
          fontWeight: 700, fontSize: "0.85rem", marginBottom: "2rem",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--accent)", display: "inline-block" }} />
          Coming Soon
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
          <Link href="/" className="btn btn-primary" style={{ borderRadius: 99, padding: "0.7rem 1.75rem", fontSize: "0.9rem", textDecoration: "none" }}>
            Back to Home
          </Link>
          <Link href="/studio" className="btn btn-secondary" style={{ borderRadius: 99, padding: "0.7rem 1.75rem", fontSize: "0.9rem", textDecoration: "none" }}>
            Go to Studio
          </Link>
        </div>
      </motion.div>
    </main>
    </>
  );
}
