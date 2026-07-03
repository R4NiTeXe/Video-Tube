"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

// ── Types ──
interface ShortVideo {
  _id: string;
  title: string;
  videoFile: string;
  thumbnail: string;
  duration: number;
  views: number;
  likesCount: number;
  isPublished: boolean;
  owner: {
    _id: string;
    fullName: string;
    username: string;
    avatar: string;
  };
  createdAt: string;
  isLiked?: boolean;
}

// ── Utility Functions ──
const formatViews = (views: number): string => {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return views.toString();
};

// ── SVG Icons ──
const PlayLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);
const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
);
const MessageCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
);
const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
);
const VolumeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
);
const VolumeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
);

// ── Short Video Card ──
function ShortVideoCard({
  video,
  isActive,
  onLike,
  isLiked,
  isLikePending,
}: {
  video: ShortVideo;
  isActive: boolean;
  onLike: () => void;
  isLiked: boolean;
  isLikePending: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.currentTime = 0;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isActive]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/videos/${video._id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        scrollSnapAlign: "start",
        position: "relative",
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Video Player */}
      <video
        ref={videoRef}
        src={video.videoFile}
        loop
        muted={muted}
        playsInline
        preload="auto"
        onClick={() => setMuted(!muted)}
        style={{
          width: "100%",
          maxWidth: 420,
          maxHeight: "80vh",
          objectFit: "contain",
          borderRadius: "var(--radius-lg)",
          cursor: "pointer",
        }}
      />

      {/* Mute / Unmute indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: muted ? 0.8 : 0 }}
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          width: 40,
          height: 40,
          borderRadius: "50%",
          backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          pointerEvents: "none",
        }}
      >
        {muted ? <VolumeOffIcon /> : <VolumeIcon />}
      </motion.div>

      {/* Bottom Overlay: Title, Channel, Actions */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "5rem 1.25rem 2rem",
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
          display: "flex",
          gap: "0.75rem",
        }}
      >
        {/* Left: Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/channel/${video.owner.username}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={video.owner.avatar}
              alt={video.owner.fullName}
              style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)" }}
            />
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>{video.owner.fullName}</span>
          </Link>
          <Link href={`/videos/${video._id}`} style={{ display: "block" }}>
            <h2 style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginBottom: "0.3rem",
            }}>
              {video.title}
            </h2>
          </Link>
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)" }}>
            {formatViews(video.views)} views
          </p>
        </div>

        {/* Right: Action Buttons */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          paddingBottom: "0.5rem",
        }}>
          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onLike}
            disabled={isLikePending}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.2rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isLiked ? "#f43f5e" : "#fff",
            }}
          >
            <HeartIcon filled={isLiked} />
            <span style={{ fontSize: "0.72rem", fontWeight: 600 }}>{formatViews(video.likesCount + (isLiked ? 1 : 0))}</span>
          </motion.button>

          {/* Comments */}
          <Link
            href={`/videos/${video._id}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.2rem",
              color: "#fff",
              textDecoration: "none",
            }}
          >
            <MessageCircleIcon />
            <span style={{ fontSize: "0.72rem", fontWeight: 600 }}>Comments</span>
          </Link>

          {/* Share */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleShare}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.2rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: copied ? "#22c55e" : "#fff",
            }}
          >
            <ShareIcon />
            <span style={{ fontSize: "0.72rem", fontWeight: 600 }}>{copied ? "Copied!" : "Share"}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ── Progress Dots ──
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{
      position: "fixed",
      right: "0.75rem",
      top: "50%",
      transform: "translateY(-50%)",
      display: "flex",
      flexDirection: "column",
      gap: "0.4rem",
      zIndex: 100,
    }}>
      {Array.from({ length: Math.min(total, 20) }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 8 : 5,
            height: i === current ? 8 : 5,
            backgroundColor: i === current ? "#fff" : "rgba(255,255,255,0.3)",
          }}
          transition={{ duration: 0.2 }}
          style={{
            borderRadius: "50%",
          }}
        />
      ))}
    </div>
  );
}

// ── Main Page ──
export default function ShortsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  // Fetch videos
  const { data: videosRes, isLoading: videosLoading } = useQuery({
    queryKey: ["shorts-videos"],
    queryFn: async () => {
      const res = await api.get("/videos/shorts/feed?limit=20");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const videos: ShortVideo[] = videosRes?.data?.docs || [];

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (videoId: string) => {
      await api.post(`/likes/toggle/v/${videoId}`);
    },
    onSuccess: (_data, videoId) => {
      setLikedVideos((prev) => {
        const next = new Set(prev);
        if (next.has(videoId)) next.delete(videoId);
        else next.add(videoId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["shorts-videos"] });
    },
  });

  // Track visible card via IntersectionObserver
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    const idx = Math.round(scrollTop / height);
    setCurrentIndex(Math.min(idx, videos.length - 1));
  }, [videos.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Loading / Auth states
  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ color: "#fff", fontWeight: 500, display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%" }} />
          {authLoading ? "Checking session..." : "Redirecting to login..."}
        </motion.div>
      </div>
    );
  }

  if (videosLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ color: "#fff", fontWeight: 500 }}>Loading shorts...</motion.div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#000", minHeight: "100vh", position: "relative" }}>
      {/* Header */}
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0.75rem 1.25rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#fff", fontSize: "0.88rem", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
            <BackIcon /> Back
          </button>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.2rem", fontWeight: 300 }}>/</span>
          <span style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>Shorts</span>
        </div>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f43f5e", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <PlayLogo size={14} />
          </div>
          <span style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>
            Video<span style={{ color: "#f43f5e" }}>Tube</span>
          </span>
        </Link>
      </header>

      {/* Scroll Container */}
      <div
        ref={containerRef}
        style={{
          height: "100vh",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

        {videos.length === 0 ? (
          <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", padding: "2rem" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.1)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", color: "rgba(255,255,255,0.5)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            </div>
            <p style={{ fontWeight: 600, fontSize: "1.1rem", marginBottom: "0.4rem" }}>No shorts available</p>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>Check back later for new content.</p>
          </div>
        ) : (
          videos.map((video, idx) => (
            <ShortVideoCard
              key={video._id}
              video={video}
              isActive={idx === currentIndex}
              isLiked={likedVideos.has(video._id) || !!video.isLiked}
              isLikePending={likeMutation.isPending && likeMutation.variables === video._id}
              onLike={() => likeMutation.mutate(video._id)}
            />
          ))
        )}
      </div>

      {/* Progress Dots */}
      {videos.length > 0 && <ProgressDots total={videos.length} current={currentIndex} />}
    </div>
  );
}
