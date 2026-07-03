"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import PageNavDropdown from "@/src/components/PageNavDropdown";

interface VideoOwner {
  fullName: string;
  avatar: string;
  username?: string;
}

interface Video {
  _id: string;
  thumbnail: string;
  title: string;
  owner?: VideoOwner;
  views: number;
  duration: number;
  createdAt: string;
}

interface Playlist {
  _id: string;
  name: string;
  description?: string;
  videos: string[];
  owner?: VideoOwner;
}

// ── Icons ──
const PlayLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);
const HistoryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const HeartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
);
const PlaylistIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
);
const PlaySmall = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);

// ── Skeleton Components ──
const SkeletonCard = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
    <div className="skeleton" style={{ width: "100%", paddingTop: "56.25%", borderRadius: "var(--radius-lg)" }} />
    <div style={{ display: "flex", gap: "0.75rem", paddingLeft: "0.25rem" }}>
      <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div className="skeleton" style={{ width: "90%", height: 16, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: "60%", height: 14, borderRadius: 6 }} />
      </div>
    </div>
  </div>
);

const SkeletonPlaylist = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
    <div className="skeleton" style={{ width: "100%", paddingTop: "56.25%", borderRadius: "var(--radius-lg)" }} />
    <div className="skeleton" style={{ width: "70%", height: 16, borderRadius: 6 }} />
    <div className="skeleton" style={{ width: "40%", height: 14, borderRadius: 6 }} />
  </div>
);

const formatViews = (views: number) => {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return views.toString();
};

const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

type Tab = "history" | "liked" | "playlists" | "watchLater";

export default function LibraryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("history");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  const { data: historyRes, isLoading: historyLoading } = useQuery({
    queryKey: ["user-history"],
    queryFn: async () => {
      const res = await api.get("/users/history");
      return res.data;
    },
    enabled: isAuthenticated && activeTab === "history",
  });

  const { data: likedRes, isLoading: likedLoading } = useQuery({
    queryKey: ["liked-videos"],
    queryFn: async () => {
      const res = await api.get("/likes/videos");
      return res.data;
    },
    enabled: isAuthenticated && activeTab === "liked",
  });

  const { data: playlistsRes, isLoading: playlistsLoading } = useQuery({
    queryKey: ["user-playlists", user?._id],
    queryFn: async () => {
      const res = await api.get(`/playlists/user/${user?._id}`);
      return res.data;
    },
    enabled: isAuthenticated && activeTab === "playlists" && !!user?._id,
  });

  const { data: watchLaterRes, isLoading: watchLaterLoading } = useQuery({
    queryKey: ["watch-later"],
    queryFn: async () => {
      const res = await api.get("/users/watch-later");
      return res.data;
    },
    enabled: isAuthenticated && activeTab === "watchLater",
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-secondary)", fontWeight: 500, display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: 36, height: 36, border: "3px solid var(--border-light)", borderTopColor: "var(--accent)", borderRadius: "50%" }}
          />
          {authLoading ? "Loading session..." : "Redirecting to login..."}
        </motion.div>
      </div>
    );
  }

  const videos: Video[] = activeTab === "history"
    ? historyRes?.data || []
    : activeTab === "liked"
    ? likedRes?.data || []
    : activeTab === "watchLater"
    ? watchLaterRes?.data || []
    : [];
  const playlists: Playlist[] = playlistsRes?.data || [];
  const isLoading = activeTab === "history" ? historyLoading : activeTab === "liked" ? likedLoading : activeTab === "watchLater" ? watchLaterLoading : playlistsLoading;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "history", label: "Watch History", icon: <HistoryIcon /> },
    { key: "liked", label: "Liked Videos", icon: <HeartIcon /> },
    { key: "watchLater", label: "Watch Later", icon: <PlaylistIcon /> },
    { key: "playlists", label: "Your Playlists", icon: <PlaylistIcon /> },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      {/* ── AMBIENT BACKGROUND ── */}
      <div style={{ position: "fixed", top: "5%", left: "30%", width: "50vw", height: "50vw", background: "var(--accent)", filter: "blur(250px)", opacity: 0.035, borderRadius: "50%", pointerEvents: "none", zIndex: 0 }} />

      {/* ── HEADER ── */}
      <header className="glass" style={{
        position: "sticky", top: 0, zIndex: 50,
        padding: "0.75rem 2rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <PageNavDropdown />
          <span style={{ color: "var(--border-light)", fontSize: "1.2rem", fontWeight: 300 }}>/</span>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Library</span>
        </div>
      </header>

      <div style={{ width: "100%", padding: "2rem" }}>
        {/* ── PAGE TITLE ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
            Library
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Your watch history, liked videos, and playlists</p>
        </motion.div>

        {/* ── TAB BUTTONS ── */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`chip-premium ${activeTab === tab.key ? "active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1.1rem" }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem 1.25rem" }}
            >
              {activeTab === "playlists"
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonPlaylist key={i} />)
                : Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </motion.div>
          ) : activeTab === "playlists" ? (
            <motion.div
              key="playlists"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {playlists.length === 0 ? (
                <div className="empty-state" style={{ padding: "4rem 2rem", textAlign: "center" }}>
                  <div className="empty-icon">
                    <PlaylistIcon />
                  </div>
                  <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                    No playlists yet
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Create playlists to organize your favorite videos
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
                  {playlists.map((playlist, idx) => (
                    <motion.div
                      key={playlist._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.06, 0.4), duration: 0.4 }}
                    >
                      <Link
                        href={`/playlists/${playlist._id}`}
                        className="video-card-premium"
                        style={{ display: "block" }}
                      >
                        <div className="thumb-wrapper">
                          <div style={{ width: "100%", paddingTop: "56.25%", background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center", position: "absolute", inset: 0 }}>
                            <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
                              <PlaylistIcon />
                              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{playlist.videos.length} videos</span>
                            </div>
                          </div>
                          <div className="thumb-overlay">
                            <div className="play-circle">
                              <PlaySmall />
                            </div>
                          </div>
                        </div>
                        <div className="card-info">
                          <h3 className="card-title">{playlist.name}</h3>
                          <div className="card-meta">
                            <span className="channel-name">{playlist.owner?.fullName}</span>
                            <span>·</span>
                            <span>{playlist.videos.length} videos</span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="videos"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {videos.length === 0 ? (
                <div className="empty-state" style={{ padding: "4rem 2rem", textAlign: "center" }}>
                  <div className="empty-icon">
                    {activeTab === "history" ? <HistoryIcon /> : <HeartIcon />}
                  </div>
                  <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                    {activeTab === "history" ? "No watch history yet" : "No liked videos yet"}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                    {activeTab === "history" ? "Videos you watch will appear here" : "Videos you like will appear here"}
                  </p>
                  <Link href="/" className="btn-primary" style={{ borderRadius: 99, padding: "0.7rem 1.75rem" }}>
                    Browse Videos
                  </Link>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem 1.25rem" }}>
                  {videos.map((video, idx) => (
                    <motion.div
                      key={video._id}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.06, 0.5), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link
                        href={`/videos/${video._id}`}
                        className="video-card-premium"
                      >
                        <div className="thumb-wrapper">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={video.thumbnail} alt={video.title} loading="lazy" />
                          <div className="thumb-overlay">
                            <div className="play-circle">
                              <PlaySmall />
                            </div>
                          </div>
                          <span className="duration-badge">
                            {formatDuration(video.duration)}
                          </span>
                          <div className="avatar-badge">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={video.owner?.avatar} alt={video.owner?.fullName} />
                          </div>
                        </div>
                        <div className="card-info">
                          <h3 className="card-title">{video.title}</h3>
                          <div className="card-meta">
                            <span className="channel-name">{video.owner?.fullName}</span>
                            <span>·</span>
                            <span>{formatViews(video.views)} views</span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
