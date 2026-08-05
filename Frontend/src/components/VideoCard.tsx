"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { formatViews, formatDuration, timeAgo } from "@/src/lib/utils";
import ChannelLink from "@/src/components/ChannelLink";

export interface VideoCardData {
  _id: string;
  thumbnail: string;
  videoFile?: string;
  title: string;
  views: number;
  duration: number;
  createdAt?: string;
  owner?: { fullName: string; avatar: string; username?: string };
}

interface VideoCardProps {
  video: VideoCardData;
  variant?: "premium" | "compact";
}

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

function PremiumCard({ video }: { video: VideoCardData }) {
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewing, setPreviewing] = useState(false);
  const [muted, setMuted] = useState(true);
  const [previewReady, setPreviewReady] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const timeInterval = useRef<ReturnType<typeof setInterval>>(null);
  const isTouchDevice = useRef(false);
  const reduceMotion = useReducedMotion();

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
        setPreviewProgress(
          (videoRef.current.currentTime / videoRef.current.duration) * 100,
        );
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
    if (reduceMotion) return;
    hoverTimer.current = setTimeout(startPreview, 500);
  }, [startPreview, queryClient, video._id, reduceMotion]);

  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice.current) return;
    stopPreview();
  }, [stopPreview]);

  // Mobile: tap to navigate to video page
  const handleTap = useCallback(() => {
    isTouchDevice.current = true;
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
    >
      <div className="thumb-wrapper">
        {thumbError ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-secondary)",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            Thumbnail Unavailable
          </div>
        ) : (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            sizes="(max-width: 480px) 100vw, (max-width: 900px) 50vw, 300px"
            loading="lazy"
            decoding="async"
            onError={() => setThumbError(true)}
            style={{
              opacity: previewing && previewReady ? 0 : 1,
              transition: "opacity 0.3s",
            }}
          />
        )}

        {video.videoFile && (
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
        )}

        {previewing && !previewReady && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              style={{
                width: 28,
                height: 28,
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
            background:
              "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)",
            opacity: previewing ? 1 : 0,
            transition: "opacity 0.3s",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {!previewing && (
          <span className="duration-badge">
            {formatDuration(video.duration)}
          </span>
        )}

        {previewing && previewReady && (
          <span
            className="duration-badge"
            style={{
              background: "rgba(0,0,0,0.85)",
              bottom: 8,
              left: 8,
              right: "auto",
              zIndex: 3,
            }}
          >
            {formatTime(remaining)}
          </span>
        )}

        {previewing && previewReady && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMuted(!muted);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            aria-label={muted ? "Unmute preview" : "Mute preview"}
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
        <div
          style={{
            display: "flex",
            gap: "var(--sp-3)",
            alignItems: "flex-start",
          }}
        >
          <ChannelLink username={video.owner?.username}>
            {video.owner?.avatar && !avatarError ? (
              <Image
                src={video.owner.avatar}
                alt={video.owner.fullName}
                onError={() => setAvatarError(true)}
                width={36}
                height={36}
                style={{
                  borderRadius: "var(--radius-full)",
                  flexShrink: 0,
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-full)",
                  flexShrink: 0,
                  backgroundColor: "var(--accent-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {video.owner?.fullName?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </ChannelLink>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="card-title">{video.title}</h2>
            <div className="card-meta">
              <ChannelLink username={video.owner?.username}>
                <span className="channel-name">{video.owner?.fullName}</span>
              </ChannelLink>
            </div>
            <div className="card-meta">
              <span>{formatViews(video.views)} views</span>
              {video.createdAt && (
                <>
                  <span>&middot;</span>
                  <span>{timeAgo(video.createdAt)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CompactCard({ video }: { video: VideoCardData }) {
  const [thumbError, setThumbError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  return (
    <Link
      href={`/videos/${video._id}`}
      className="video-card"
      style={{ textDecoration: "none" }}
    >
      <div className="thumb-wrapper">
        {thumbError ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-secondary)",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            Thumbnail Unavailable
          </div>
        ) : (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            sizes="(max-width: 480px) 100vw, (max-width: 900px) 50vw, 280px"
            loading="lazy"
            decoding="async"
            onError={() => setThumbError(true)}
          />
        )}
        <span className="duration-badge">
          {formatDuration(video.duration)}
        </span>
      </div>
      <div className="card-info" style={{ marginTop: "0.75rem" }}>
        <div
          style={{
            display: "flex",
            gap: "var(--sp-3)",
            alignItems: "flex-start",
          }}
        >
          <ChannelLink username={video.owner?.username}>
            {video.owner?.avatar && !avatarError ? (
              <Image
                src={video.owner.avatar}
                alt={video.owner.fullName}
                onError={() => setAvatarError(true)}
                width={36}
                height={36}
                style={{
                  borderRadius: "var(--radius-full)",
                  flexShrink: 0,
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-full)",
                  flexShrink: 0,
                  backgroundColor: "var(--accent-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {video.owner?.fullName?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </ChannelLink>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="card-title">{video.title}</h2>
            <div className="card-meta">
              <ChannelLink username={video.owner?.username}>
                <span className="channel-name">{video.owner?.fullName}</span>
              </ChannelLink>
              <span>&middot;</span>
              <span>{formatViews(video.views)} views</span>
              {video.createdAt && (
                <>
                  <span>&middot;</span>
                  <span>{timeAgo(video.createdAt)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function VideoCard({ video, variant = "compact" }: VideoCardProps) {
  return variant === "premium" ? (
    <PremiumCard video={video} />
  ) : (
    <CompactCard video={video} />
  );
}