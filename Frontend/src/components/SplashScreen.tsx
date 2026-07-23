"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════
// TIMING — cinematic pacing (~5.2s total)
// ═══════════════════════════════════════════════
const T = {
  ambientStart:  0.0,   // ambient orbs begin breathing
  iconEntry:     0.4,   // logo icon springs in
  iconDraw:      0.9,   // play icon starts drawing itself
  orbitalStart:  1.0,   // orbiting dots begin
  shimmer:       1.2,   // shimmer line sweeps across icon
  videoWord:     1.4,   // first letter of "Video"
  tubeWord:      2.0,   // first letter of "Tube"
  tagline:       2.8,   // tagline text appears
  holdPause:     3.8,   // pause to let it all breathe
  exitStart:     4.2,   // fade-out begins
  done:          5.0,   // page content fades in
};

// ═══════════════════════════════════════════════
// Orbiting dot that circles the logo
// ═══════════════════════════════════════════════
function OrbitalDot({
  index,
  total,
  radius,
  size,
  color,
  duration,
  delay,
}: {
  index: number;
  total: number;
  radius: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}) {
  const startAngle = (index / total) * 360;

  return (
    <motion.div
      initial={{ opacity: 0, rotate: startAngle }}
      animate={{ opacity: [0, 1, 1, 0], rotate: startAngle + 360 }}
      transition={{
        opacity: { delay, duration: duration * 0.9, times: [0, 0.1, 0.85, 1] },
        rotate: { delay, duration, ease: "linear", repeat: Infinity },
      }}
      style={{
        position: "absolute",
        width: radius * 2,
        height: radius * 2,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          transform: "translateX(-50%)",
          boxShadow: `0 0 8px 2px ${color}`,
        }}
      />
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// Animated letter with 3D flip + blur + glow
// ═══════════════════════════════════════════════
function Letter({
  char,
  delay,
  accent,
}: {
  char: string;
  delay: number;
  accent?: boolean;
}) {
  return (
    <motion.span
      style={{
        display: "inline-block",
        color: accent ? "var(--accent)" : "var(--text-primary)",
        textShadow: accent ? "0 0 20px var(--accent-glow)" : "none",
      }}
      initial={{ opacity: 0, y: 40, rotateX: -90, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
      transition={{
        delay,
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {char}
    </motion.span>
  );
}

// ═══════════════════════════════════════════════
// Ambient floating orb (background atmosphere)
// ═══════════════════════════════════════════════
function AmbientOrb({
  color,
  size,
  x,
  y,
  delay,
}: {
  color: string;
  size: number;
  x: string;
  y: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{
        scale: [0.4, 1, 0.85, 1.05, 0.9],
        opacity: [0, 0.15, 0.1, 0.15, 0.12],
      }}
      transition={{
        delay,
        duration: 6,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "mirror",
      }}
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        filter: `blur(${size * 0.25}px)`,
        left: x,
        top: y,
        pointerEvents: "none",
      }}
    />
  );
}

// ═══════════════════════════════════════════════
// MAIN SPLASH SCREEN
// ═══════════════════════════════════════════════
interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<"showing" | "leaving">("showing");

  useEffect(() => {
    const leaveTimer = setTimeout(() => setPhase("leaving"), T.exitStart * 1000);
    const doneTimer = setTimeout(onDone, T.done * 1000);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  const videoChars = useMemo(() => "Video".split(""), []);
  const tubeChars = useMemo(() => "Tube".split(""), []);

  return (
    <AnimatePresence>
      {phase === "showing" && (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08, filter: "blur(12px)" }}
          transition={{ duration: 0.7 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "var(--bg-primary)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2.2rem",
            overflow: "hidden",
          }}
        >
          
          <AmbientOrb color="#FF3B30" size={500} x="15%" y="10%" delay={0} />
          <AmbientOrb color="#FF6B6B" size={350} x="60%" y="55%" delay={0.5} />
          <AmbientOrb color="#E63529" size={280} x="70%" y="5%" delay={1.0} />
          <AmbientOrb color="#FF3B30" size={200} x="5%" y="65%" delay={1.5} />

          
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 200,
              height: 200,
            }}
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: T.iconEntry, type: "spring", stiffness: 200, damping: 20 }}
              style={{
                width: 120, height: 120, borderRadius: 30,
                background: "linear-gradient(135deg, var(--accent) 0%, #b91c1c 100%)",
                boxShadow: "0 10px 25px rgba(220,38,38,0.4), inset 0 2px 10px rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="7 4 19 12 7 20 7 4" fill="rgba(255,255,255,0.2)" />
              </svg>
            </motion.div>
            
            <OrbitalDot index={0} total={3} radius={110} size={8} color="#FF6B6B" duration={4} delay={T.orbitalStart} />
            <OrbitalDot index={1} total={3} radius={110} size={5} color="#FFD166" duration={4} delay={T.orbitalStart} />
            <OrbitalDot index={2} total={3} radius={110} size={10} color="#FF3B30" duration={4} delay={T.orbitalStart} />
          </div>
            
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: "3.2rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              perspective: "900px",
              position: "relative",
            }}
          >
            {videoChars.map((c, i) => (
              <Letter key={`v-${i}`} char={c} delay={T.videoWord + i * 0.1} />
            ))}
            {tubeChars.map((c, i) => (
              <Letter key={`t-${i}`} char={c} delay={T.tubeWord + i * 0.1} accent />
            ))}
          </div>

          
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: T.tagline, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: "center" }}
          >
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.85rem",
                fontWeight: 500,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Watch · Create · Connect
            </p>
          </motion.div>

          
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 0.15 }}
            transition={{ delay: T.tagline + 0.3, duration: 1.0, ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "12%",
              width: "40%",
              height: "1px",
              background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
              transformOrigin: "center",
              pointerEvents: "none",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
