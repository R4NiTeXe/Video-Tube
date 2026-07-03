"use client";

import React, { useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import SplashScreen from "@/src/components/SplashScreen";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [splashDone, setSplashDone] = React.useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("vt-splash") === "1") {
      setSplashDone(true);
    }
  }, []);

  const handleDone = useCallback(() => {
    sessionStorage.setItem("vt-splash", "1");
    setSplashDone(true);
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {!splashDone && (
          <SplashScreen key="splash" onDone={handleDone} />
        )}
      </AnimatePresence>

      <div style={{ opacity: splashDone ? 1 : 0, transition: "opacity 0.5s" }}>
        {children}
      </div>
    </>
  );
}
