"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useKeyboardShortcuts } from "@/src/hooks/useKeyboardShortcuts";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatViews, formatDuration } from "@/src/lib/utils";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import TopNav from "@/src/components/TopNav";
import PremiumSidebar from "@/src/components/PremiumSidebar";
import { PlaySmallIcon, FireIcon, PlusIcon } from "@/src/components/icons";

interface VideoOwner {
  fullName: string;
  avatar: string;
  username?: string;
}

interface Video {
  _id: string;
  thumbnail: string;
  title: string;
  description?: string;
  owner?: VideoOwner;
  views: number;
  duration: number;
  createdAt: string;
}

const SkeletonHero = () => (
  <div className="hero" style={{ pointerEvents: "none" }}>
    <div className="skeleton" style={{ position: "absolute", inset: 0, borderRadius: 0 }} />
    <div style={{ position: "relative", zIndex: 10, padding: "var(--sp-10) var(--sp-12)", width: "100%" }}>
      <div className="skeleton" style={{ width: 120, height: 28, borderRadius: 99, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: "60%", height: 36, borderRadius: 12, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: "35%", height: 18, borderRadius: 12, marginBottom: 24 }} />
      <div className="skeleton" style={{ width: 140, height: 44, borderRadius: 12 }} />
    </div>
  </div>
);

const SkeletonCard = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div className="skeleton" style={{ width: "100%", paddingTop: "56.25%", borderRadius: 12 }} />
    <div style={{ display: "flex", gap: 10, padding: "0 2px" }}>
      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="skeleton" style={{ width: "90%", height: 14, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: "60%", height: 12, borderRadius: 6 }} />
      </div>
    </div>
  </div>
);

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState("Latest Videos");
  const [activeSidebar, setActiveSidebar] = useState("home");

  useKeyboardShortcuts([
    { key: "Escape", description: "Close / Go back", action: () => {} },
    { key: "h", description: "Go home", action: () => router.push("/") },
    { key: "l", description: "Go to library", action: () => router.push("/library") },
    { key: "n", description: "Go to notifications", action: () => router.push("/notifications") },
  ]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  const { data: response, isLoading: videosLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      const res = await api.get(`/videos?${params.toString()}`);
      return res.data;
    },
    enabled: isAuthenticated,
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ color: "var(--text-secondary)", fontWeight: 500, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: 32, height: 32, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
          {authLoading ? "Loading session..." : "Redirecting to login..."}
        </motion.div>
      </div>
    );
  }

  const videos: Video[] = response?.data?.docs || [];
  const featuredVideo = videos.length > 0 ? videos[0] : null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <TopNav />

      <div className="page-layout">
        <PremiumSidebar activeSection={activeSidebar} />

        <main className="page-content content-max">
          {/* Hero */}
          {videosLoading ? (
            <SkeletonHero />
          ) : featuredVideo ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="hero"
            >
              <div className="hero-bg" style={{ backgroundImage: `url(${featuredVideo.thumbnail})` }} />
              <div className="hero-gradient" />
              <div className="hero-content">
                <div>
                  <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="hero-badge">
                    <FireIcon size={14} /> Featured
                  </motion.div>
                  <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="hero-title">
                    {featuredVideo.title}
                  </motion.h1>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="hero-meta">
                    <span>{featuredVideo.owner?.fullName}</span>
                    <span className="dot" />
                    <span>{formatViews(featuredVideo.views)} views</span>
                    <span className="dot" />
                    <span>{formatDuration(featuredVideo.duration)}</span>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Link href={`/videos/${featuredVideo._id}`} className="hero-btn">
                      <PlaySmallIcon size={14} /> Watch Now
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ) : null}

          {/* Category Chips */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }} className="scroll-hide">
            {["Latest Videos", "Trending", "Liked Videos"].map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`chip ${activeCategory === cat ? "active" : ""}`}>
                {cat}
              </button>
            ))}
          </div>

        </main>
      </div>
    </div>
  );
}
