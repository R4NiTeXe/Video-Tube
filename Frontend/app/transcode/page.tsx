"use client";

import React from "react";
import PageNavDropdown from "@/src/components/PageNavDropdown";
import { motion } from "framer-motion";

export default function TranscodePage() {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <header className="glass" style={{ position: "sticky", top: 0, zIndex: 50, padding: "0.75rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <PageNavDropdown />
          <span style={{ color: "var(--border)", fontSize: "1.2rem", fontWeight: 300 }}>/</span>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Transcoding</span>
        </div>
      </header>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)", padding: "2rem" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", maxWidth: 500 }}
        >
          <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", color: "var(--accent)" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Video Transcoding</h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Adaptive streaming with multiple quality options (360p, 480p, 720p, 1080p) is being built.
          </p>
          <div style={{ display: "inline-block", padding: "0.5rem 1.25rem", borderRadius: 99, backgroundColor: "var(--accent-subtle)", color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem" }}>
            Coming Soon
          </div>
        </motion.div>
      </div>
    </main>
  );
}
