"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import Link from "next/link";
import { formatViews, formatDuration, timeAgo } from "@/src/lib/utils";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface LatestVideo {
  _id: string;
  title: string;
  thumbnail: string;
  videoFile: string;
  duration: number;
  views: number;
  createdAt: string;
}

interface SubscribedChannel {
  _id: string;
  fullName: string;
  username: string;
  avatar: string;
  latestVideo?: LatestVideo;
}

interface SubscriptionItem {
  subscribedChannel: SubscribedChannel;
}

const SkeletonVideoCard = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
    <div className="skeleton" style={{ width: "100%", aspectRatio: "16/9", borderRadius: "var(--radius-lg)" }} />
    <div style={{ display: "flex", gap: "0.6rem" }}>
      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <div className="skeleton" style={{ width: "90%", height: 14, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: "60%", height: 12, borderRadius: 4 }} />
      </div>
    </div>
  </div>
);

const SkeletonChannelPill = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", flexShrink: 0, width: 72 }}>
    <div className="skeleton" style={{ width: 56, height: 56, borderRadius: "50%" }} />
    <div className="skeleton" style={{ width: 56, height: 10, borderRadius: 4 }} />
  </div>
);

function VideoCard({ video, channel }: { video: LatestVideo; channel: SubscribedChannel }) {
  const isNew = Date.now() - new Date(video.createdAt).getTime() < 86400000 * 2;

  return (
    <Link href={`/videos/${video._id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          cursor: "pointer",
          transition: "transform 0.15s",
        }}
      >
        <div className="thumb-wrapper" style={{ position: "relative", overflow: "hidden", borderRadius: "var(--radius-lg)" }}>
          <img
            src={video.thumbnail}
            alt={video.title}
            loading="lazy"
            style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block", transition: "transform 0.3s" }}
          />
          <span
            style={{
              position: "absolute", bottom: 6, right: 6,
              background: "rgba(0,0,0,0.82)", color: "#fff",
              padding: "1px 5px", borderRadius: 4,
              fontSize: "11px", fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatDuration(video.duration)}
          </span>
          {isNew && (
            <span
              style={{
                position: "absolute", top: 6, left: 6,
                background: "var(--accent)", color: "#fff",
                padding: "1px 6px", borderRadius: 4,
                fontSize: "10px", fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              New
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <img
            src={channel.avatar}
            alt={channel.fullName}
            style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)",
                margin: 0, lineHeight: 1.3,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {video.title}
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
              {channel.fullName}
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
              {formatViews(video.views)} views &middot; {timeAgo(video.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SubscriptionsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const channelBarRef = useRef<HTMLDivElement>(null);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  const { data: response, isLoading } = useQuery({
    queryKey: ["subscribedChannels"],
    queryFn: async () => {
      const res = await api.get(`/subscriptions/u/${user?._id}`);
      return res.data.data as SubscriptionItem[];
    },
    enabled: isAuthenticated && !!user?._id,
  });

  const checkScroll = useCallback(() => {
    if (!channelBarRef.current) return;
    const el = channelBarRef.current;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = channelBarRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll);
    checkScroll();
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll, response]);

  const scrollBy = (dir: number) => {
    channelBarRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  const subscriptions = response || [];

  const allVideos = subscriptions
    .filter((s) => s.subscribedChannel.latestVideo)
    .map((s) => ({ video: s.subscribedChannel.latestVideo!, channel: s.subscribedChannel }));

  const filteredVideos = activeChannel
    ? allVideos.filter((v) => v.channel._id === activeChannel)
    : allVideos;

  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
          Checking session...
        </motion.div>
      </div>
    );
  }

  if (subscriptions.length === 0 && !isLoading) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--sp-8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-8)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <polyline points="17 11 19 13 23 9"/>
          </svg>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>Subscriptions</h1>
        </div>
        <div className="empty-state">
          <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "var(--elevated)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--sp-5)", color: "var(--text-muted)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <polyline points="17 11 19 13 23 9"/>
            </svg>
          </div>
          <p style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--sp-2)" }}>Don&apos;t miss new videos</p>
          <p style={{ color: "var(--text-muted)", marginBottom: "var(--sp-6)", fontSize: "0.9rem", maxWidth: 400, lineHeight: 1.5 }}>
            Subscribe to channels you like to see their latest videos here.
          </p>
          <Link href="/" className="btn btn-primary btn-pill">Find channels to subscribe</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--sp-4) var(--sp-6) var(--sp-8)" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <polyline points="17 11 19 13 23 9"/>
          </svg>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>Subscriptions</h1>
        </div>
        <Link
          href="/"
          style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          Browse
        </Link>
      </div>

      {/* Horizontal channel bar */}
      {isLoading ? (
        <div style={{ display: "flex", gap: "var(--sp-4)", marginBottom: "var(--sp-6)", paddingBottom: "var(--sp-3)", overflow: "hidden" }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonChannelPill key={i} />)}
        </div>
      ) : subscriptions.length > 0 ? (
        <div style={{ position: "relative", marginBottom: "var(--sp-5)" }}>
          {canScrollLeft && (
            <button
              onClick={() => scrollBy(-1)}
              style={{
                position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 2,
                width: 36, background: "linear-gradient(to right, var(--bg-primary), transparent)",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-start", paddingLeft: 4,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          <div
            ref={channelBarRef}
            style={{
              display: "flex", gap: "var(--sp-3)", overflowX: "auto", scrollBehavior: "smooth",
              paddingBottom: "var(--sp-2)", scrollbarWidth: "none", msOverflowStyle: "none",
            }}
          >
            <button
              onClick={() => setActiveChannel(null)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                flexShrink: 0, width: 72, cursor: "pointer",
                background: "none", border: "none", padding: 0, opacity: activeChannel === null ? 1 : 0.55,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { if (activeChannel !== null) e.currentTarget.style.opacity = "0.8"; }}
              onMouseLeave={(e) => { if (activeChannel !== null) e.currentTarget.style.opacity = "0.55"; }}
            >
              <div
                style={{
                  width: 56, height: 56, borderRadius: "50%",
                  backgroundColor: "var(--elevated)",
                  border: "2px solid var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--accent)", fontWeight: 700, fontSize: "0.95rem",
                  transition: "background 0.15s",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4v16h18V4H3zm16 14H5V8h14v10z"/></svg>
              </div>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", width: "100%", whiteSpace: "nowrap" }}>
                All
              </span>
            </button>
            {subscriptions.map((sub) => (
              <button
                key={sub.subscribedChannel._id}
                onClick={() => setActiveChannel(sub.subscribedChannel._id === activeChannel ? null : sub.subscribedChannel._id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                  flexShrink: 0, width: 72, cursor: "pointer",
                  background: "none", border: "none", padding: 0,
                  opacity: activeChannel === null || activeChannel === sub.subscribedChannel._id ? 1 : 0.55,
                  transition: "opacity 0.15s",
                  filter: activeChannel && activeChannel !== sub.subscribedChannel._id ? "grayscale(0.6)" : "none",
                }}
                onMouseEnter={(e) => { if (activeChannel !== sub.subscribedChannel._id) e.currentTarget.style.opacity = "0.8"; }}
                onMouseLeave={(e) => { if (activeChannel !== sub.subscribedChannel._id) e.currentTarget.style.opacity = "0.55"; }}
              >
                <img
                  src={sub.subscribedChannel.avatar}
                  alt={sub.subscribedChannel.fullName}
                  style={{
                    width: 56, height: 56, borderRadius: "50%", objectFit: "cover",
                    border: activeChannel === sub.subscribedChannel._id ? "2px solid var(--accent)" : "2px solid transparent",
                    transition: "border-color 0.15s",
                  }}
                />
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", width: "100%", whiteSpace: "nowrap" }}>
                  {sub.subscribedChannel.fullName}
                </span>
              </button>
            ))}
          </div>
          {canScrollRight && (
            <button
              onClick={() => scrollBy(1)}
              style={{
                position: "absolute", right: 0, top: 0, bottom: 0, zIndex: 2,
                width: 36, background: "linear-gradient(to left, var(--bg-primary), transparent)",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
        </div>
      ) : null}

      {/* Today label */}
      {filteredVideos.length > 0 && (
        <div style={{ marginBottom: "var(--sp-4)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            {activeChannel
              ? subscriptions.find((s) => s.subscribedChannel._id === activeChannel)?.subscribedChannel.fullName
              : "Latest"}
          </h2>
        </div>
      )}

      {/* Video grid */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--sp-5)" }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonVideoCard key={i} />)}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--sp-8) 0" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {activeChannel ? "No videos from this channel yet." : "No videos from your subscriptions yet."}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "var(--sp-5)",
          }}
        >
          {filteredVideos.map((item) => (
            <VideoCard key={item.video._id} video={item.video} channel={item.channel} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
