"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import Link from "next/link";
import { useEffect } from "react";
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

const SubscriptionsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
);

const SkeletonCard = () => (
  <div style={{ display: "flex", gap: "1rem", padding: "var(--sp-4)" }}>
    <div className="skeleton" style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0 }} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div className="skeleton" style={{ width: "60%", height: 18, borderRadius: 6 }} />
      <div className="skeleton" style={{ width: "40%", height: 14, borderRadius: 6 }} />
    </div>
  </div>
);

export default function SubscriptionsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

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

  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
          Checking session...
        </motion.div>
      </div>
    );
  }

  const subscriptions = response || [];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "var(--sp-8)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-6)" }}>
        <SubscriptionsIcon />
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>Subscriptions</h1>
      </div>

      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
      ) : subscriptions.length === 0 ? (
        <div className="empty-state">
          <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "var(--elevated)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--sp-6)", color: "var(--text-muted)" }}>
            <SubscriptionsIcon />
          </div>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--sp-2)" }}>No subscriptions yet</p>
          <p style={{ color: "var(--text-muted)", marginBottom: "var(--sp-6)", fontSize: "0.9rem" }}>
            When you subscribe to channels, their latest videos will appear here.
          </p>
          <Link href="/" className="btn btn-primary btn-pill">Browse channels</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
          {subscriptions.map((sub) => (
            <Link
              key={sub.subscribedChannel._id}
              href={`/channel/${sub.subscribedChannel.username}`}
              style={{ textDecoration: "none" }}
            >
              <motion.div
                whileHover={{ scale: 1.01 }}
                style={{
                  display: "flex",
                  gap: "var(--sp-4)",
                  padding: "var(--sp-4)",
                  borderRadius: "var(--radius-lg)",
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  transition: "all 0.2s",
                }}
              >
                <img
                  src={sub.subscribedChannel.avatar}
                  alt={sub.subscribedChannel.fullName}
                  style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "0.15rem" }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{sub.subscribedChannel.fullName}</h3>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>@{sub.subscribedChannel.username}</span>
                  </div>

                  {sub.subscribedChannel.latestVideo ? (
                    <div style={{ display: "flex", gap: "var(--sp-3)", marginTop: "var(--sp-2)" }}>
                      <div style={{ position: "relative", width: 168, flexShrink: 0 }}>
                        <img
                          src={sub.subscribedChannel.latestVideo.thumbnail}
                          alt={sub.subscribedChannel.latestVideo.title}
                          style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: "var(--radius-md)" }}
                        />
                        <span className="duration-badge" style={{ position: "absolute", bottom: 4, right: 4, fontSize: "10px" }}>
                          {formatDuration(sub.subscribedChannel.latestVideo.duration)}
                        </span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 0.25rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {sub.subscribedChannel.latestVideo.title}
                        </p>
                        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                          {formatViews(sub.subscribedChannel.latestVideo.views)} views &middot; {timeAgo(sub.subscribedChannel.latestVideo.createdAt)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "var(--sp-1)" }}>
                      No videos yet
                    </p>
                  )}
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
