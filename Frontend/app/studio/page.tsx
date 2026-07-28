"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  LayoutDashboard, Eye, Users, Heart, Clapperboard, Clock3,
  UploadCloud, Plus, MessageCircle, TrendingUp, ArrowUpRight,
  ArrowDownRight, CircleCheck, CircleAlert,
  Edit3, Trash2, Search, ChartNoAxesCombined, ListVideo,
  Play, Pencil, TriangleAlert,
} from "lucide-react";

import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { timeAgo, formatDuration } from "@/src/lib/utils";
import { PageMeta } from "@/src/components/PageMeta";

const UploadModal = dynamic(() => import("./upload-modal"), { ssr: false });
const EditModal = dynamic(() => import("./edit-modal"), { ssr: false });

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval>>(null);
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 800;
    const step = Math.max(1, Math.floor(end / (duration / 16)));
    ref.current = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); if (ref.current) clearInterval(ref.current); }
      else setDisplay(start);
    }, 16);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [value]);
  return <>{display.toLocaleString()}{suffix}</>;
}

function Skeleton({ height }: { height?: string }) {
  return (
    <div style={{ width: "100%", height: height || "100%", borderRadius: 20, backgroundColor: "var(--card)", animation: "pulse 1.5s ease-in-out infinite" }} />
  );
}

function MetricCard({
  label, value, icon, trend, color, subtitle,
}: {
  label: string; value: number; icon: React.ReactNode; trend?: { value: number; positive: boolean }; color: string; subtitle?: string;
}) {
  return (
    <motion.div variants={itemVariants} style={{
      backgroundColor: "var(--card)", borderRadius: 20, border: "1px solid var(--border)",
      padding: "1.25rem", position: "relative", overflow: "hidden",
      transition: "box-shadow 0.2s, transform 0.2s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: `${color}15`, color, flexShrink: 0,
        }}>
          {icon}
        </div>
        {trend && (
          <div style={{
            display: "flex", alignItems: "center", gap: 2, padding: "0.15rem 0.5rem",
            borderRadius: "var(--radius-full)", fontSize: "0.72rem", fontWeight: 600,
            backgroundColor: trend.positive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: trend.positive ? "#22c55e" : "#ef4444",
          }}>
            {trend.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.25rem", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: subtitle ? "0.15rem" : 0 }}>
        <AnimatedCounter value={value} />
      </div>
      {subtitle && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{subtitle}</div>}
    </motion.div>
  );
}

function EmptyVideosState({ onUpload }: { onUpload: () => void }) {
  return (
    <motion.div variants={itemVariants} style={{
      backgroundColor: "var(--card)", borderRadius: 20, border: "1px solid var(--border)",
      padding: "3rem 2rem", textAlign: "center",
    }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
        <Clapperboard size={28} style={{ color: "var(--accent)" }} />
      </div>
      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>No videos uploaded yet</h3>
      <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", maxWidth: 400, margin: "0 auto 1.5rem", lineHeight: 1.6 }}>
        Your creator journey starts here. Upload your first video and begin building your audience.
      </p>
      <button className="btn-primary" onClick={onUpload} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0 1.5rem", height: 46, fontSize: "0.95rem" }}>
        <UploadCloud size={18} />
        Upload Video
      </button>
    </motion.div>
  );
}

function EmptyChart() {
  return (
    <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
      <ChartNoAxesCombined size={36} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No views data yet</p>
    </div>
  );
}

function DeleteConfirmDialog({
  videoId, videoTitle, onConfirm, onCancel, isPending,
}: {
  videoId: string; videoTitle: string; onConfirm: (id: string) => void; onCancel: () => void; isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        style={{
          width: "100%", maxWidth: 420,
          borderRadius: "var(--radius-xl)", padding: "1.5rem",
          backgroundColor: "var(--card)", border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", flexShrink: 0 }}>
            <TriangleAlert size={18} />
          </div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Delete video
          </h2>
        </div>

        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.5 }}>
          Are you sure you want to delete <strong style={{ color: "var(--text-primary)" }}>{videoTitle}</strong>? This action cannot be undone.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={isPending}
            className="btn btn-ghost btn-pill"
            style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600 }}
          >
            Cancel
          </button>
          <button onClick={() => onConfirm(videoId)} disabled={isPending}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600,
              borderRadius: 99, border: "none", cursor: isPending ? "not-allowed" : "pointer",
              backgroundColor: "#ef4444", color: "#fff", opacity: isPending ? 0.5 : 1,
            }}
          >
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreatorStudioContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [deletingVideo, setDeletingVideo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "views">("newest");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => { const res = await api.get("/dashboard/stats"); return res.data; },
    enabled: isAuthenticated,
  });

  const { data: videosRes, isLoading: videosLoading } = useQuery({
    queryKey: ["dashboard-videos"],
    queryFn: async () => { const res = await api.get("/dashboard/videos"); return res.data; },
    enabled: isAuthenticated,
  });

  const stats = statsRes?.data || { totalViews: 0, totalSubscribers: 0, totalLikes: 0, totalVideos: 0, totalWatchTime: 0, totalComments: 0 };
  const sortedVideos = Array.isArray(videosRes?.data?.docs) ? [...videosRes.data.docs].filter((v: any) => v.title?.toLowerCase().includes(searchQuery.toLowerCase())).sort((a: any, b: any) => {
    if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return (b.views || 0) - (a.views || 0);
  }) : [];

  const avgViews = stats.totalVideos > 0 ? Math.round(stats.totalViews / stats.totalVideos) : 0;
  const engagementRate = stats.totalViews > 0 ? ((stats.totalLikes / stats.totalViews) * 100).toFixed(1) : "0";
  const likesPerVideo = stats.totalVideos > 0 ? Math.round(stats.totalLikes / stats.totalVideos) : 0;
  const engagementPct = stats.totalViews > 0 ? Math.min(parseFloat(engagementRate), 100) : 0;
  const watchTimePct = Math.min((stats.totalWatchTime || 0) / 10, 100);
  const likesPerVideoPct = Math.min(likesPerVideo * 5, 100);
  const avgViewsPct = Math.min(avgViews / 10, 100);

  const deleteMutation = useMutation({
    mutationFn: async (videoId: string) => { await api.delete(`/videos/${videoId}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dashboard-videos"] }); queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ color: "var(--text-secondary)" }}>Loading session...</div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Creator Studio" description="Manage your videos and channel analytics." noIndex />
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "1rem" : "1.5rem 2rem 4rem" }}>
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {/* Header */}
            <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "flex-start", marginBottom: "1.5rem", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                    <LayoutDashboard size={20} />
                  </div>
                  <h1 style={{ fontSize: isMobile ? "1.25rem" : "1.5rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Creator Studio</h1>
                </div>
                <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: "0.25rem 0 0", lineHeight: 1.5 }}>
                  Manage your videos, audience, analytics and channel performance.
                </p>
              </div>
              <button className="btn-primary" onClick={() => setShowUploadModal(true)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0 1.5rem", height: 46, fontSize: "0.95rem", borderRadius: 14, width: isMobile ? "100%" : "auto" }}>
                <Plus size={18} />
                Upload Video
              </button>
            </motion.div>

            {/* Last synced */}
            <motion.div variants={itemVariants} style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1.5rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              <Clock3 size={12} />
              Last synced: Just now
            </motion.div>

            {/* Metric Cards */}
            {statsLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? "140px" : "160px"}, 1fr))`, gap: "0.75rem", marginBottom: "1.25rem" }}>
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height="120px" />)}
              </div>
            ) : (
              <motion.div variants={itemVariants} style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? "140px" : "160px"}, 1fr))`, gap: isMobile ? "0.6rem" : "0.75rem", marginBottom: "1.25rem" }}>
                <MetricCard label="Views" value={stats.totalViews || 0} icon={<Eye size={18} />} color="var(--accent)" subtitle="All time" />
                <MetricCard label="Subscribers" value={stats.totalSubscribers || 0} icon={<Users size={18} />} color="#22c55e" />
                <MetricCard label="Videos" value={stats.totalVideos || 0} icon={<Clapperboard size={18} />} color="#f59e0b" />
                <MetricCard label="Likes" value={stats.totalLikes || 0} icon={<Heart size={18} />} color="#ec4899" />
                <MetricCard label="Watch Time" value={stats.totalWatchTime || 0} icon={<Clock3 size={18} />} color="#8b5cf6" subtitle="minutes" />
                <MetricCard label="Comments" value={stats.totalComments || 0} icon={<MessageCircle size={18} />} color="#06b6d4" />
              </motion.div>
            )}

            {/* Analytics Section */}
            <motion.div variants={itemVariants} style={{ display: "grid", gridTemplateColumns: isTablet ? "1fr" : "2fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ backgroundColor: "var(--card)", borderRadius: 20, border: "1px solid var(--border)", padding: isMobile ? "1rem" : "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                  <ChartNoAxesCombined size={18} style={{ color: "var(--accent)" }} />
                  <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Weekly Views</h2>
                </div>
                <EmptyChart />
              </div>
              <div style={{ backgroundColor: "var(--card)", borderRadius: 20, border: "1px solid var(--border)", padding: isMobile ? "1rem" : "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                  <TrendingUp size={18} style={{ color: "var(--accent)" }} />
                  <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Engagement</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {[
                    { label: "Engagement Rate", value: `${engagementRate}%`, pct: engagementPct },
                    { label: "Watch Time", value: `${stats.totalWatchTime || 0}m`, pct: watchTimePct },
                    { label: "Likes per Video", value: `${likesPerVideo}`, pct: likesPerVideoPct },
                    { label: "Avg Views", value: `${avgViews.toLocaleString()}`, pct: avgViewsPct },
                  ].map((item) => (
                    <div key={item.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{item.value}</span>
                      </div>
                      <div style={{ height: 4, backgroundColor: "var(--elevated)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} transition={{ duration: 1, delay: 0.3 }} style={{ height: "100%", backgroundColor: "var(--accent)", borderRadius: "var(--radius-full)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={itemVariants} style={{ backgroundColor: "var(--card)", borderRadius: 20, border: "1px solid var(--border)", padding: isMobile ? "1rem" : "1.5rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <ListVideo size={18} style={{ color: "var(--accent)" }} />
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Recent Activity</h2>
              </div>
              {sortedVideos.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {sortedVideos.slice(0, 5).map((v: any) => (
                    <div key={v._id} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.55rem 0.65rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-secondary)", fontSize: "0.82rem" }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
                        {v.isPublished ? <Play size={13} /> : <Pencil size={13} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: isMobile ? "0.78rem" : "0.85rem" }}>{v.isPublished ? "Video uploaded" : "Draft saved"}</span>
                        {!isMobile && <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem", fontSize: "0.78rem" }}>— {v.title}</span>}
                      </div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", flexShrink: 0 }}>{timeAgo(v.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "1.5rem", textAlign: "center" }}>
                  <ListVideo size={28} style={{ color: "var(--text-muted)", opacity: 0.3, marginBottom: "0.5rem" }} />
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No recent activity</p>
                </div>
              )}
            </motion.div>

            {/* Videos Section */}
            <motion.div variants={itemVariants}>
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", marginBottom: "1rem", gap: "0.75rem" }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Latest Videos</h2>
                {sortedVideos.length > 0 && (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flex: isMobile ? 1 : undefined }}>
                      <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                      <input type="text" placeholder="Search videos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ height: 34, paddingLeft: 30, fontSize: "0.82rem", width: isMobile ? "100%" : 180, borderRadius: "var(--radius-md)", border: "1px solid var(--border)", backgroundColor: "var(--input)", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ height: 34, fontSize: "0.82rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", backgroundColor: "var(--input)", color: "var(--text-primary)", padding: "0 0.5rem", outline: "none", flex: isMobile ? 1 : undefined }}>
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="views">Most views</option>
                    </select>
                  </div>
                )}
              </div>

              {videosLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="64px" />)}
                </div>
              ) : sortedVideos.length === 0 ? (
                <EmptyVideosState onUpload={() => setShowUploadModal(true)} />
              ) : (
                <div style={{ backgroundColor: "var(--card)", borderRadius: 20, border: "1px solid var(--border)", overflow: "auto" }}>
                  <div style={{ minWidth: 650 }}>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "2fr 1fr 1fr 60px" : "3fr 1fr 1fr 1fr 1fr 1fr 40px", gap: "0.5rem", padding: "0.65rem 1rem", borderBottom: "1px solid var(--border)", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <span>Video</span>
                      {!isMobile && <span style={{ textAlign: "center" }}>Likes</span>}
                      {!isMobile && <span style={{ textAlign: "center" }}>Comments</span>}
                      <span style={{ textAlign: "center" }}>Views</span>
                      <span style={{ textAlign: "center" }}>Status</span>
                      <span style={{ textAlign: "center" }}>Date</span>
                      <span />
                    </div>
                    <AnimatePresence>
                      {sortedVideos.map((video: any, i: number) => (
                        <motion.div
                          key={video._id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ delay: i * 0.03 }}
                          style={{ display: "grid", gridTemplateColumns: isMobile ? "2fr 1fr 1fr 60px" : "3fr 1fr 1fr 1fr 1fr 1fr 40px", gap: "0.5rem", padding: "0.55rem 1rem", alignItems: "center", borderBottom: i < sortedVideos.length - 1 ? "1px solid var(--border)" : "none", fontSize: isMobile ? "0.78rem" : "0.85rem", transition: "background-color 0.15s" }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ""}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
                            <div style={{ width: isMobile ? 72 : 100, height: isMobile ? 40 : 56, borderRadius: "var(--radius-md)", overflow: "hidden", backgroundColor: "var(--bg-secondary)", flexShrink: 0, position: "relative" }}>
                              <img src={video.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              <span style={{ position: "absolute", bottom: 2, right: 2, padding: "1px 3px", borderRadius: 3, backgroundColor: "rgba(0,0,0,0.8)", color: "#fff", fontSize: "0.6rem", fontWeight: 600 }}>{formatDuration(video.duration)}</span>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: isMobile ? "0.78rem" : "0.85rem" }}>{video.title}</div>
                            </div>
                          </div>
                          {!isMobile && <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>{video.likesCount || 0}</div>}
                          {!isMobile && <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>{video.commentsCount || 0}</div>}
                          <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>{video.views || 0}</div>
                          <div style={{ textAlign: "center" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "0.2rem", padding: "0.1rem 0.4rem",
                              borderRadius: "var(--radius-full)", fontSize: "0.68rem", fontWeight: 600,
                              backgroundColor: video.isPublished ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                              color: video.isPublished ? "#22c55e" : "#f59e0b",
                            }}>
                              {video.isPublished ? <CircleCheck size={9} /> : <CircleAlert size={9} />}
                              {isMobile ? (video.isPublished ? "Pub" : "Dft") : (video.isPublished ? "Published" : "Draft")}
                            </span>
                          </div>
                          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: isMobile ? "0.7rem" : "0.78rem" }}>{timeAgo(video.createdAt)}</div>
                          <div style={{ display: "flex", gap: "0.15rem", justifyContent: "center" }}>
                            <Link href={`/videos/${video._id}`}
                              style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", textDecoration: "none", transition: "color 0.15s" }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent)"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                            >
                              <Play size={12} />
                            </Link>
                            <button onClick={() => { setEditingVideo(video); setShowEditModal(true); }}
                              style={{ width: 26, height: 26, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-sm)", border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)", transition: "color 0.15s" }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button onClick={() => setDeletingVideo(video._id)}
                              style={{ width: 26, height: 26, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-sm)", border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)", transition: "color 0.15s" }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "var(--error)"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showUploadModal && (
          <UploadModal onClose={() => setShowUploadModal(false)} onSuccess={() => { setShowUploadModal(false); queryClient.invalidateQueries({ queryKey: ["dashboard-videos"] }); }} />
        )}
        {showEditModal && editingVideo && (
          <EditModal videoId={editingVideo._id} onClose={() => { setShowEditModal(false); setEditingVideo(null); }} onSuccess={() => { setShowEditModal(false); setEditingVideo(null); queryClient.invalidateQueries({ queryKey: ["dashboard-videos"] }); }} />
        )}
        {deletingVideo && (
          <DeleteConfirmDialog
            videoId={deletingVideo}
            videoTitle={sortedVideos.find((v: any) => v._id === deletingVideo)?.title || "this video"}
            onConfirm={(id) => {
              deleteMutation.mutate(id, {
                onSuccess: () => { setDeletingVideo(null); },
                onError: () => { setDeletingVideo(null); },
              });
            }}
            onCancel={() => setDeletingVideo(null)}
            isPending={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function CreatorStudio() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ color: "var(--text-secondary)" }}>Loading studio...</div>
      </div>
    }>
      <CreatorStudioContent />
    </Suspense>
  );
}
