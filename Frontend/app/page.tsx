"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageMeta } from "@/src/components/PageMeta";
import SocialLoginButtons from "@/src/components/SocialLoginButtons";
import { useAuthStore } from "@/src/store/useAuthStore";
import { api } from "@/src/services/api";
import { formatViews, formatDuration, timeAgo } from "@/src/lib/utils";

interface VideoResult {
  _id: string;
  thumbnail: string;
  videoFile: string;
  title: string;
  views: number;
  duration: number;
  createdAt: string;
  owner?: { fullName: string; avatar: string; username?: string };
}

function VideoCard({ video }: { video: VideoResult }) {
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewing, setPreviewing] = useState(false);
  const [muted, setMuted] = useState(true);
  const [previewReady, setPreviewReady] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const timeInterval = useRef<ReturnType<typeof setInterval>>(null);
  const isTouchDevice = useRef(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const startPreview = useCallback(() => {
    setPreviewing(true);
    if (videoRef.current) {
      if (videoRef.current.readyState >= 2) {
        setPreviewReady(true);
      }
      videoRef.current.play().catch(() => {});
    }
    timeInterval.current = setInterval(() => {
      if (videoRef.current) {
        const left = videoRef.current.duration - videoRef.current.currentTime;
        setRemaining(left);
        setPreviewProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
      }
    }, 200);
  }, []);

  const stopPreview = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (timeInterval.current) clearInterval(timeInterval.current);
    setPreviewing(false);
    setRemaining(0);
    setPreviewProgress(0);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setPreviewReady(false);
  }, []);

  // Desktop: hover with delay & instant query prefetch
  const handleMouseEnter = useCallback(() => {
    if (isTouchDevice.current) return;
    queryClient.prefetchQuery({
      queryKey: ["video", video._id],
      queryFn: async () => (await api.get(`/videos/${video._id}`)).data,
    });
    hoverTimer.current = setTimeout(startPreview, 500);
  }, [startPreview, queryClient, video._id]);

  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice.current) return;
    stopPreview();
  }, [stopPreview]);

  // Mobile: tap to toggle preview
  const handleTap = useCallback((_e: React.TouchEvent) => {
    isTouchDevice.current = true;
    if (previewing) {
      stopPreview();
    } else {
      startPreview();
    }
  }, [previewing, startPreview, stopPreview]);

  // Also handle click for non-touch devices that don't have hover
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isTouchDevice.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      if (timeInterval.current) clearInterval(timeInterval.current);
    };
  }, []);

  return (
    <Link
      href={`/videos/${video._id}`}
      className="video-card-premium"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTap}
      onClick={handleClick}
    >
      <div className="thumb-wrapper">
        
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect width='100%25' height='100%25' fill='%231f2937'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-size='24' font-family='sans-serif'%3EThumbnail Unavailable%3C/text%3E%3C/svg%3E";
          }}
          style={{ opacity: previewing && previewReady ? 0 : 1, transition: "opacity 0.3s" }}
        />

        
        <video
          ref={videoRef}
          src={video.videoFile}
          loop
          muted={muted}
          playsInline
          preload="none"
          onLoadedData={() => setPreviewReady(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: previewing && previewReady ? 1 : 0,
            transition: "opacity 0.3s",
            zIndex: 1,
          }}
        />

        
        {/* Buffering spinner for preview */}
        {previewing && !previewReady && (
          <div
            style={{
              position: "absolute", inset: 0, zIndex: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              style={{
                width: 28, height: 28,
                border: "2.5px solid rgba(255,255,255,0.2)",
                borderTopColor: "#fff",
                borderRadius: "50%",
              }}
            />
          </div>
        )}

        
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)",
            opacity: previewing ? 1 : 0,
            transition: "opacity 0.3s",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {/* Duration badge (hide during preview) */}
        {!previewing && (
          <span className="duration-badge">{formatDuration(video.duration)}</span>
        )}

        {/* Countdown during preview */}
        {previewing && previewReady && (
          <span className="duration-badge" style={{ background: "rgba(0,0,0,0.85)", bottom: 8, left: 8, right: "auto", zIndex: 3 }}>
            {formatTime(remaining)}
          </span>
        )}

        {/* Sound toggle (show during preview) */}
        {previewing && previewReady && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMuted(!muted);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              zIndex: 3,
              width: 32,
              height: 32,
              borderRadius: "var(--radius-full)",
              background: "rgba(0,0,0,0.7)",
              border: "none",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backdropFilter: "blur(4px)",
              transition: "background 0.2s",
            }}
          >
            {muted ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        )}

        
        {previewing && previewReady && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!videoRef.current) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              videoRef.current.currentTime = pct * videoRef.current.duration;
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 6,
              backgroundColor: "rgba(255,255,255,0.2)",
              zIndex: 3,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: `${previewProgress}%`,
                height: "100%",
                backgroundColor: "var(--accent)",
                transition: "width 0.2s linear",
                pointerEvents: "none",
              }}
            />
          </div>
        )}
      </div>

      <div className="card-info">
        <div style={{ display: "flex", gap: "var(--sp-3)", alignItems: "flex-start" }}>
          {video.owner?.avatar && !avatarError ? (
            <img
              src={video.owner.avatar}
              alt={video.owner.fullName}
              onError={() => setAvatarError(true)}
              style={{ width: 36, height: 36, borderRadius: "var(--radius-full)", flexShrink: 0, objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: "var(--radius-full)", flexShrink: 0, backgroundColor: "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: 14, fontWeight: 600 }}>
              {video.owner?.fullName?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="card-title">{video.title}</h2>
            <div className="card-meta">
              <span className="channel-name">{video.owner?.fullName}</span>
            </div>
            <div className="card-meta">
              <span>{formatViews(video.views)} views</span>
              <span>&middot;</span>
              <span>{timeAgo(video.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const searchParams = useSearchParams();

  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortType = searchParams.get("sortType") || "desc";

  const { data: videosResp, isLoading: videosLoading } = useQuery({
    queryKey: ["home-videos", isAuthenticated, sortBy, sortType],
    queryFn: async () => {
      const res = await api.get(`/videos?limit=50&sortBy=${sortBy}&sortType=${sortType}`);
      return res.data;
    },
    enabled: !!isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const videos: VideoResult[] = videosResp?.data?.docs || [];

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const msg = sessionStorage.getItem("_welcome");
      if (msg === "new") {
        setWelcomeMsg("Welcome! Your account has been created successfully.");
      } else if (msg === "back") {
        setWelcomeMsg("Welcome back!");
      }
      sessionStorage.removeItem("_welcome");
      if (msg) {
        const timer = setTimeout(() => setWelcomeMsg(""), 4000);
        return () => clearTimeout(timer);
      }
    }
    return;
  }, [authLoading, isAuthenticated]);

  if (authLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <PageMeta title="Home" description="Discover, watch, and share videos on VideoTube." />
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-primary)",
        padding: "2rem",
        position: "relative",
        overflow: "hidden",
      }}>
        
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.2, 0.9, 1.1, 0.95], opacity: [0, 0.08, 0.05, 0.08, 0.06] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
          style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", backgroundColor: "var(--accent)", filter: "blur(120px)", top: "-10%", left: "-10%", pointerEvents: "none" }}
        />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.1, 0.85, 1.05, 0.9], opacity: [0, 0.06, 0.04, 0.06, 0.05] }}
          transition={{ duration: 10, ease: "easeInOut", repeat: Infinity, repeatType: "mirror", delay: 1 }}
          style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", backgroundColor: "#FF6B6B", filter: "blur(100px)", bottom: "-15%", right: "-10%", pointerEvents: "none" }}
        />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.15, 0.8, 1.1, 0.85], opacity: [0, 0.05, 0.03, 0.05, 0.04] }}
          transition={{ duration: 12, ease: "easeInOut", repeat: Infinity, repeatType: "mirror", delay: 2 }}
          style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", backgroundColor: "#E63529", filter: "blur(80px)", top: "40%", left: "60%", pointerEvents: "none" }}
        />

        
        <motion.div
          initial={{ scale: 0, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 12, mass: 1.2 }}
          style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 40px rgba(255,59,48,0.25), 0 8px 20px rgba(255,59,48,0.15)",
            marginBottom: "1.2rem",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </motion.div>

        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: "center", marginBottom: "0.4rem" }}
        >
          <h1 style={{
            fontSize: "clamp(1.3rem, 3.5vw, 1.8rem)",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}>
            <span style={{ color: "var(--accent)" }}>Video</span>Tube
          </h1>
        </motion.div>

        
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            color: "var(--text-muted)",
            fontSize: "clamp(0.78rem, 1.4vw, 0.88rem)",
            maxWidth: 380,
            textAlign: "center",
            lineHeight: 1.5,
            marginBottom: "1.8rem",
          }}
        >
          Discover, watch, and share videos.
        </motion.p>

        
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: "100%", maxWidth: 360 }}
        >
          <SocialLoginButtons />

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "1.2rem 0" }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, var(--border), transparent)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, var(--border), transparent)" }} />
          </div>

          <Link
            href="/login"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 46,
              borderRadius: 12, fontSize: 15, fontWeight: 600, marginBottom: 10,
              background: "linear-gradient(135deg, var(--accent) 0%, #FF6B6B 100%)",
              color: "#fff", textDecoration: "none",
              boxShadow: "0 3px 16px rgba(255,59,48,0.25)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 5px 22px rgba(255,59,48,0.35)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 3px 16px rgba(255,59,48,0.25)"; }}
          >
            Sign in
          </Link>

          <Link
            href="/register"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 46,
              borderRadius: 12, fontSize: 15, fontWeight: 600,
              color: "var(--text-primary)", textDecoration: "none",
              border: "1px solid var(--border)",
              backgroundColor: "var(--card)",
              transition: "border-color 0.15s ease, background-color 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.backgroundColor = "rgba(255,59,48,0.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.backgroundColor = "var(--card)"; }}
          >
            Create account
          </Link>
        </motion.div>

        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{
            position: "absolute", bottom: "2rem",
            color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.05em",
          }}
        >
          &copy; {new Date().getFullYear()} VideoTube
        </motion.p>
      </div>
    );
  }

  return (
    <>
      <div style={{ position: "absolute", zIndex: 9999 }}>
        <AnimatePresence>
          {welcomeMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: -20, x: "-50%" }}
              transition={{ duration: 0.3 }}
              style={{
                position: "fixed", top: 20, left: "50%",
                padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600,
                backgroundColor: "var(--accent)", color: "#fff",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)", whiteSpace: "nowrap",
              }}
            >
              {welcomeMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PageMeta title="Home" description="Discover, watch, and share videos on VideoTube." />

      {videosLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.5rem", padding: "2rem" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div className="skeleton" style={{ aspectRatio: "16/9", borderRadius: "var(--radius-md)" }} />
              <div className="skeleton" style={{ width: "80%", height: 14, borderRadius: 6 }} />
              <div className="skeleton" style={{ width: "50%", height: 12, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "2rem" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>No videos yet</p>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>Upload your first video to get started</p>
        </div>
      ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem", padding: "1.5rem 2rem" }}>
            {videos.map((v) => (
              <div key={v._id}>
                <VideoCard video={v} />
              </div>
            ))}
          </div>
        )}
    </>
  );
}
