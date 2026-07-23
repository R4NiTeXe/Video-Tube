"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import Link from "next/link";
import { formatViews, formatDuration, timeAgo } from "@/src/lib/utils";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { PageMeta } from "@/src/components/PageMeta";

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



function VideoCard({ video, channel }: { video: LatestVideo; channel: SubscribedChannel }) {
  const [isNew, setIsNew] = useState(false);
  useEffect(() => {
    setIsNew(Date.now() - new Date(video.createdAt).getTime() < 86400000 * 2);
  }, [video.createdAt]);

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
  const activeChannel = null;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  const { data: response, isLoading } = useQuery({
    queryKey: ["subscribedChannels", user?._id],
    queryFn: async () => {
      const res = await api.get(`/subscriptions/u/${user?._id}`);
      return res.data.data.docs as SubscriptionItem[];
    },
    enabled: isAuthenticated && !!user?._id,
  });



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
        <PageMeta title="Subscriptions" description="Latest videos from channels you subscribe to on VideoTube." noIndex />
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
      <PageMeta title="Subscriptions" description="Latest videos from channels you subscribe to on VideoTube." noIndex />
      
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
