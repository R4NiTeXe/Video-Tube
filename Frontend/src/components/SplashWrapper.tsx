"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import SplashScreen from "@/src/components/SplashScreen";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  // Start as false so server and first client render are identical (no hydration mismatch)
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Only runs on the client after hydration — safe to use sessionStorage here
    try {
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
      {/* 
        SplashScreen is position:fixed z-index:9999 — it overlays the children.
        We wrap AnimatePresence in a div to isolate it from the Next.js {children} routing slot.
        This fixes the Framer Motion "removeChild" crash on client-side navigation.
      */}
      <div style={{ position: "relative", zIndex: 9999 }}>
        <AnimatePresence mode="wait">
          {showSplash && <SplashScreen key="splash" onDone={handleDone} />}
        </AnimatePresence>
      </div>
      {/* Children render immediately on server and client — no opacity wrapper = no mismatch */}
      {children}
    </>
  );
}

