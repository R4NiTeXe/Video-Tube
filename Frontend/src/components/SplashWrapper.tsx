"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import SplashScreen from "@/src/components/SplashScreen";

export default function SplashWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    try {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReducedMotion) return;
      if (sessionStorage.getItem("vt-splash") !== "1") {
        setShowSplash(true);
      }
    } catch {
      // sessionStorage unavailable (e.g. private browsing with strict settings)
    }
  }, []);

  const handleDone = useCallback(() => {
    try {
      sessionStorage.setItem("vt-splash", "1");
    } catch {}
    setShowSplash(false);
  }, []);

  return (
    <>
      <div style={{ position: "relative", zIndex: 9999 }}>
        <AnimatePresence mode="wait">
          {showSplash && <SplashScreen key="splash" onDone={handleDone} />}
        </AnimatePresence>
      </div>
      {children}
    </>
  );
}
