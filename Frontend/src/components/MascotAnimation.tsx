"use client";

import { useEffect, useRef } from "react";
import { motion, useSpring, useAnimationControls, AnimatePresence, type MotionValue } from "framer-motion";

interface MascotProps {
  isPasswordFocused?: boolean;
  isPasswordVisible?: boolean;
  activeField?: "name" | "username" | "email" | "password" | "confirmPassword" | "avatar" | "cover" | "submit" | "none";
  isLoading?: boolean;
  passwordMatch?: "idle" | "match" | "mismatch"; // confirm-password validation state
}


type Mood = "idle" | "typing" | "secret" | "peeking" | "excited" | "shy" | "happy" | "thinking" | "loading" | "matched" | "mismatched";

function getMood(
  activeField: MascotProps["activeField"],
  isPasswordFocused: boolean,
  isPasswordVisible: boolean,
  isLoading: boolean,
  passwordMatch: "idle" | "match" | "mismatch"
): Mood {
  if (isLoading) return "loading";
  if (activeField === "submit") return "excited";
  // Confirm password field — show match/mismatch states
  if (activeField === "confirmPassword") {
    if (passwordMatch === "match")    return "matched";
    if (passwordMatch === "mismatch") return "mismatched";
    return "secret";
  }
  if (activeField === "password") {
    if (isPasswordVisible) return "peeking";
    return "secret";
  }
  if (activeField === "email") return "thinking";
  if (activeField === "avatar" || activeField === "cover") return "happy";
  if (activeField === "name" || activeField === "username") return "typing";
  if (isPasswordFocused && !isPasswordVisible) return "secret";
  // If no field active but match state is set, keep showing it
  if (passwordMatch === "match")    return "matched";
  if (passwordMatch === "mismatch") return "mismatched";
  return "idle";
}


const moodConfig: Record<Mood, {
  label: string; sub: string;
  eyeScale: number; eyeShape: number;
  pupilOffset: [number, number];
  headTilt: number; headBob: number;
  blushOpacity: number;
  mouthType: "smile" | "grin" | "oh" | "flat" | "uwu" | "dots" | "giggle";
  bodyScale: number; bodySquish: [number, number];
  antennaBlink: boolean;
  sparkles: boolean;
  sweat: boolean;
  eyebrowY: number;
}> = {
  idle:        { label: "Ready to binge?",        sub: "Sign in and lets roll",         eyeScale:1,    eyeShape:26, pupilOffset:[0,0],   headTilt:0,  headBob:1,    blushOpacity:0,   mouthType:"smile",  bodyScale:1,    bodySquish:[1,1],       antennaBlink:false, sparkles:false, sweat:false, eyebrowY:0   },
  typing:      { label: "Ooh, who are you?",       sub: "Tell me your name",              eyeScale:1.08, eyeShape:24, pupilOffset:[0,-2],  headTilt:-3, headBob:1.1,  blushOpacity:0.4, mouthType:"grin",   bodyScale:0.98, bodySquish:[1.02,0.98], antennaBlink:true,  sparkles:true,  sweat:false, eyebrowY:-3  },
  secret:      { label: "Hehe, not looking!",      sub: "La la la, cant see",             eyeScale:1,    eyeShape:26, pupilOffset:[0,0],   headTilt:-4, headBob:1.1,  blushOpacity:0.8, mouthType:"giggle", bodyScale:0.98, bodySquish:[1.02,0.98], antennaBlink:false, sparkles:false, sweat:false, eyebrowY:-2  },
  peeking:     { label: "Oh my!",                  sub: "I see you typed it",             eyeScale:1.4,  eyeShape:22, pupilOffset:[0,2],   headTilt:5,  headBob:1,    blushOpacity:0.9, mouthType:"oh",     bodyScale:1.05, bodySquish:[0.95,1.05], antennaBlink:true,  sparkles:false, sweat:false, eyebrowY:-5  },
  excited:     { label: "Lets go!!",               sub: "Click that button",              eyeScale:1.3,  eyeShape:20, pupilOffset:[0,-3],  headTilt:-2, headBob:1.3,  blushOpacity:0.6, mouthType:"grin",   bodyScale:1.08, bodySquish:[0.92,1.08], antennaBlink:true,  sparkles:true,  sweat:false, eyebrowY:-6  },
  shy:         { label: "H-hello!",                sub: "Nice to meet you",               eyeScale:0.85, eyeShape:26, pupilOffset:[-4,3],  headTilt:8,  headBob:0.9,  blushOpacity:1,   mouthType:"uwu",    bodyScale:0.94, bodySquish:[1.04,0.96], antennaBlink:false, sparkles:false, sweat:false, eyebrowY:5   },
  happy:       { label: "Ooh, a photo!",           sub: "Looking good already",           eyeScale:1.15, eyeShape:22, pupilOffset:[0,-1],  headTilt:-4, headBob:1.2,  blushOpacity:0.5, mouthType:"smile",  bodyScale:1.02, bodySquish:[0.98,1.02], antennaBlink:false, sparkles:true,  sweat:false, eyebrowY:-3  },
  thinking:    { label: "Hmm...",                  sub: "Email looks important",          eyeScale:0.9,  eyeShape:26, pupilOffset:[6,-2],  headTilt:6,  headBob:0.95, blushOpacity:0.1, mouthType:"flat",   bodyScale:0.97, bodySquish:[1,1],       antennaBlink:false, sparkles:false, sweat:false, eyebrowY:-2  },
  loading:     { label: "Creating magic",          sub: "Almost there",                   eyeScale:1,    eyeShape:26, pupilOffset:[0,0],   headTilt:0,  headBob:1.4,  blushOpacity:0.3, mouthType:"dots",   bodyScale:1,    bodySquish:[1,1],       antennaBlink:true,  sparkles:true,  sweat:false, eyebrowY:0   },
  matched:     { label: "Passwords match!",        sub: "Great job, looking good",        eyeScale:1.3,  eyeShape:20, pupilOffset:[0,-3],  headTilt:-5, headBob:1.4,  blushOpacity:0.7, mouthType:"grin",   bodyScale:1.06, bodySquish:[0.94,1.06], antennaBlink:true,  sparkles:true,  sweat:false, eyebrowY:-5  },
  mismatched:  { label: "Hmm, that does not match",sub: "Check your password again",      eyeScale:0.85, eyeShape:26, pupilOffset:[0,3],   headTilt:6,  headBob:0.85, blushOpacity:0.3, mouthType:"flat",   bodyScale:0.95, bodySquish:[1.03,0.97], antennaBlink:false, sparkles:false, sweat:true,  eyebrowY:5   },
};

export default function RobotMascot({
  isPasswordFocused = false,
  isPasswordVisible = false,
  activeField = "none",
  isLoading = false,
  passwordMatch = "idle",
}: MascotProps) {
  const mood = getMood(activeField, isPasswordFocused, isPasswordVisible, isLoading, passwordMatch);
  const cfg  = moodConfig[mood];

  
  const soft   = { damping: 14, stiffness: 90,  mass: 0.7 };
  const bouncy = { damping: 10, stiffness: 120, mass: 0.5 };
  const snappy = { damping: 20, stiffness: 260, mass: 0.35 };

  const bodyY      = useSpring(0,  { damping: 9, stiffness: 55, mass: 1.1 });
  const headTilt   = useSpring(0,  soft);
  const bodyScaleX = useSpring(1,  bouncy);
  const bodyScaleY = useSpring(1,  bouncy);
  const pupilX     = useSpring(0,  snappy);
  const pupilY     = useSpring(0,  snappy);
  const eyeScaleY  = useSpring(1,  snappy);
  // 0 = eyes open, 1 = eyes fully closed (lid slides down)
  const eyeClose   = useSpring(0,  { damping: 11, stiffness: 85, mass: 0.6 });
  // small side-to-side nervous shake when password focused
  const nervousX   = useSpring(0,  { damping: 8,  stiffness: 200, mass: 0.3 });

  // Blink controller
  const leftEye  = useAnimationControls();
  const rightEye = useAnimationControls();
  const isMounted = useRef(false);

  const floatRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const wiggleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMood  = useRef<Mood>("idle");

  
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (mood === "secret") { pupilX.set(0); pupilY.set(0); return; }
      const nx = (e.clientX / window.innerWidth)  * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      pupilX.set(nx * 8);
      pupilY.set(ny * 6);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mood, pupilX, pupilY]);

  
  useEffect(() => {
    const amp   = cfg.headBob * 8;
    const vals  = [0, -amp, 0, amp * 0.5, 0];
    let i = 0;
    floatRef.current = setInterval(() => { bodyY.set(vals[i++ % vals.length] ?? 0); }, 800);
    return () => { if (floatRef.current) clearInterval(floatRef.current); };
  }, [mood, bodyY, cfg.headBob]);

  
  useEffect(() => {
    eyeClose.set(mood === "secret" ? 1 : 0);
  }, [mood, eyeClose]);

  
  useEffect(() => {
    if (wiggleRef.current) clearInterval(wiggleRef.current);
    if (mood === "secret") {
      // gentle happy side-to-side sway, not a nervous shake
      const seq = [0, -3, 0, 3, 0, -2, 0, 2, 0];
      let wi = 0;
      wiggleRef.current = setInterval(() => {
        nervousX.set(seq[wi % seq.length] ?? 0);
        wi++;
      }, 220);
    } else {
      nervousX.set(0);
    }
    return () => { if (wiggleRef.current) clearInterval(wiggleRef.current); };
  }, [mood, nervousX]);

  
  const doBlink = () => {
    // Don't blink when eyes are already closed or not mounted
    if (mood === "secret" || !isMounted.current) return;
    const anim = { scaleY:[1,0.06,1] as number[], transition:{ duration:0.16, times:[0,0.5,1] } };
    leftEye.start(anim);
    rightEye.start(anim);
  };
  useEffect(() => {
    isMounted.current = true;
    doBlink();
    blinkRef.current = setInterval(() => {
      doBlink();
      if (Math.random() > 0.65) setTimeout(doBlink, 320);
    }, 2800 + Math.random() * 1600);
    return () => { isMounted.current = false; if (blinkRef.current) clearInterval(blinkRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood]);

  
  useEffect(() => {
    if (prevMood.current !== mood) {
      prevMood.current = mood;
      bodyScaleX.set(cfg.bodySquish[0]);
      bodyScaleY.set(cfg.bodySquish[1]);
      headTilt.set(cfg.headTilt);
      eyeScaleY.set(cfg.eyeScale);
      pupilX.set(cfg.pupilOffset[0]);
      pupilY.set(cfg.pupilOffset[1]);
      // bounce back
      setTimeout(() => { bodyScaleX.set(1); bodyScaleY.set(1); }, 180);
    }
  }, [mood, cfg, bodyScaleX, bodyScaleY, headTilt, eyeScaleY, pupilX, pupilY]);

  
  const C = {
    body:   "#111118",
    mid:    "#1a1a24",
    light:  "#22222e",
    border: "#2a2a38",
    accent: "#dc2626",
    glow:   "rgba(220,38,38,0.7)",
  };

  const eyeW = 40;
  const eyeH = 48;

  return (
    <div style={{
      position:"relative", width:"100%", height:"100%",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      overflow:"hidden",
      background:"radial-gradient(ellipse at 50% 38%, #1c1c2e 0%, #0d0d14 58%, #000 100%)",
    }}>
      
        <motion.div style={{ rotate:headTilt, scaleX:bodyScaleX, scaleY:bodyScaleY, x:nervousX, zIndex: 10 }}>
          <div style={{
            width: 150, height: 116, borderRadius: "64px 64px 44px 44px",
            background: `linear-gradient(180deg, ${C.light} 0%, ${C.mid} 100%)`,
            border: `3px solid ${C.border}`,
            boxShadow: `inset 0 4px 12px rgba(255,255,255,0.04), 0 12px 24px rgba(0,0,0,0.4)`,
            display: "flex", flexDirection: "column", alignItems: "center",
            position: "relative", zIndex: 10,
          }}>
            <div style={{ display:"flex", gap:26, marginTop:14, position:"relative", zIndex:5 }}>
                {[0,1].map(i=>(
                  <motion.div key={i}
                    animate={{ y: mood === "secret" ? 4 : 0 }}
                    style={{ width: 16, height: 4, borderRadius: 2, background: C.border }}
                  />
                ))}
              </div>
              <div style={{ display:"flex", gap:24, marginTop:6, position:"relative", zIndex:4 }}>
                {[leftEye, rightEye].map((ctrl, i) => (
                  <Eye
                    key={i}
                    ctrl={ctrl}
                    eyeW={eyeW}
                    eyeH={eyeH}
                    eyeShape={cfg.eyeShape}
                    pupilX={pupilX}
                    pupilY={pupilY}
                    mood={mood}
                  />
                ))}
              </div>

              
              <motion.div animate={{ opacity: cfg.blushOpacity }} transition={{ duration:0.4 }}
                style={{ display:"flex", gap:52, marginTop:4 }}>
                {[0,1].map(i=>(
                  <div key={i} style={{ width:22, height:12, borderRadius:"50%",
                    background:"radial-gradient(ellipse, rgba(255,100,100,0.7) 0%, transparent 70%)",
                    filter:"blur(4px)" }} />
                ))}
              </motion.div>

              
              <div style={{ marginTop:4, display:"flex", alignItems:"center", justifyContent:"center", height:22, position:"relative" }}>
                <MouthShape type={cfg.mouthType} accent={C.accent} />
              </div>

            
            {cfg.sweat && (
              <motion.div
                initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:10 }}
                transition={{ duration:0.6, repeat:Infinity, repeatType:"loop" }}
                style={{ position:"absolute", right:8, top:10, width:7, height:10,
                  borderRadius:"50% 50% 50% 50% / 60% 60% 40% 40%",
                  background:"linear-gradient(to bottom, #60a5fa, #3b82f6)",
                  opacity:0.85 }} />
            )}
          </div>
        </motion.div>
        
        <div style={{ width:28, height:10, background:`linear-gradient(to bottom,${C.border},${C.mid})`,
          borderRadius:"0 0 6px 6px", margin:"-2px 0", zIndex:6 }} />

        
        <motion.div
          animate={{ scaleY:[1,0.985,1] }}
          transition={{ duration:2.4, repeat:Infinity, ease:"easeInOut" }}
          style={{
            width:120, height:96,
            borderRadius:34,
            background:`linear-gradient(180deg,${C.mid} 0%,${C.body} 60%,#080809 100%)`,
            border:`2.5px solid ${C.border}`,
            boxShadow:`inset 0 2px 5px rgba(255,255,255,0.04),inset 0 -6px 14px rgba(0,0,0,0.6),0 10px 28px rgba(0,0,0,0.45)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            position:"relative",
          }}>
          
        <motion.div
          animate={{ scaleX:[1,1.07,1], opacity:[0.3,0.16,0.3] }}
          transition={{ duration:2.6, repeat:Infinity, ease:"easeInOut" }}
          style={{ width:130, height:18, borderRadius:"50%",
            background:"rgba(0,0,0,0.5)", filter:"blur(12px)", marginTop:8 }}
        />
      </motion.div>


      <AnimatePresence mode="wait">
        <motion.div key={mood}
          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
          transition={{ duration:0.3 }}
          style={{ position:"absolute", bottom:"9%", textAlign:"center", pointerEvents:"none", padding:"0 1rem" }}>
          <p style={{ color:"rgba(255,255,255,0.92)", fontWeight:800, fontSize:"1.1rem",
            letterSpacing:"-0.02em", marginBottom:"0.2rem",
            textShadow:"0 0 16px rgba(255,255,255,0.22)" }}>
            {cfg.label}
          </p>
          <p style={{ color:"rgba(255,255,255,0.42)", fontSize:"0.8rem", fontWeight:500 }}>
            {cfg.sub}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}



// Eye: renders open (with pupil) OR closed (smooth lid arc) based on eyeClose spring
function Eye({
  ctrl, eyeW, eyeH, eyeShape, pupilX, pupilY, mood,
}: {
  ctrl: ReturnType<typeof useAnimationControls>;
  eyeW: number; eyeH: number; eyeShape: number;
  pupilX: MotionValue<number>; pupilY: MotionValue<number>;
  mood: Mood;
}) {
  // Lid slides down from top: height goes from 0 → eyeH driven by eyeClose
  const lidH = useSpring(0, { damping: 11, stiffness: 85, mass: 0.6 });
  useEffect(() => {
    lidH.set(mood === "secret" ? eyeH + 4 : mood === "peeking" ? eyeH * 0.35 : 0);
  }, [mood, lidH, eyeH]);

  return (
    <motion.div
      animate={ctrl}
      style={{
        width: eyeW, height: eyeH,
        borderRadius: eyeShape,
        background: "radial-gradient(circle at 50% 38%, #fff 0%, #eee 100%)",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.35)",
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        transformOrigin: "center",
        position: "relative",
      }}
    >
      <motion.div
        style={{
          width: 14, height: 14, borderRadius: "50%", background: "#0d0d14",
          x: pupilX, y: pupilY, position: "relative",
          boxShadow: "0 0 4px rgba(0,0,0,0.8)",
        }}
      >
        <div style={{ width:4, height:4, borderRadius:"50%", background:"#fff", position:"absolute", top:2, left:2 }} />
      </motion.div>
      <motion.div
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          background: "#1c1c2e",
          height: lidH,
          borderBottom: "2px solid #000",
          zIndex: 10,
        }}
      />
    </motion.div>
  );
}

function MouthShape({ type, accent }: { type: string; accent: string }) {
  if (type === "smile") return (
    <svg width="40" height="22" viewBox="0 0 40 22" fill="none">
      {/* Main wide smile curve */}
      <path d="M3 6 Q20 22 37 6" stroke={accent} strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Cute little tooth hints */}
      <line x1="14" y1="17" x2="14" y2="20" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      <line x1="20" y1="19" x2="20" y2="22" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      <line x1="26" y1="17" x2="26" y2="20" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      {/* Dimple dots at corners */}
      <circle cx="4"  cy="8" r="2" fill={accent} opacity="0.6"/>
      <circle cx="36" cy="8" r="2" fill={accent} opacity="0.6"/>
    </svg>
  );
  if (type === "dots") return (
    <div style={{ display:"flex", gap:5, alignItems:"center" }}>
      {[0,1,2].map(i=>(
        <motion.div key={i}
          animate={{ y:[0,-5,0] }}
          transition={{ duration:0.6, repeat:Infinity, delay:i*0.15, ease:"easeInOut" }}
          style={{ width:5, height:5, borderRadius:"50%", background:accent,
            boxShadow:`0 0 6px rgba(220,38,38,0.6)` }} />
      ))}
    </div>
  );
  return null;
}


