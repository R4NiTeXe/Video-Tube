"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { timeAgo, formatDuration } from "@/src/lib/utils";
import dynamic from "next/dynamic";
import {
  PlusIcon,
  EyeIcon,
  UserIcon,
  HeartIcon,
  Edit2Icon,
  CheckIcon,
  TrendingIcon,
  VideoIcon,
  CloseIcon,
  TrashIcon,
  UploadIcon,
} from "@/src/components/icons";
import { PageMeta } from "@/src/components/PageMeta";
const UploadModal = dynamic(() => import("./upload-modal"), { ssr: false });
const EditModal = dynamic(() => import("./edit-modal"), { ssr: false });

// ── Stat Card ──
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <motion.div className="stat-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="stat-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </motion.div>
  );
}

// ── Video Card (Horizontal) ──
function VideoCard({ video, isSelected, onSelect, onToggleSelect }: {
  video: { _id: string; thumbnail: string; title: string; isPublished: boolean; createdAt: string; views: number; likesCount: number; duration: number };
  isSelected: boolean;
  onSelect: () => void;
  onToggleSelect: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex",
        gap: 0,
        overflow: "hidden",
        borderRadius: "var(--radius-lg)",
        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
        backgroundColor: "var(--card)",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: isSelected ? "0 0 0 1px var(--accent)" : "0 1px 3px rgba(0,0,0,0.04)",
        cursor: "default",
      }}
      onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; } }}
      onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; } }}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", cursor: "pointer", width: 200, minHeight: 112, flexShrink: 0, overflow: "hidden" }} onClick={onSelect}>
        <img src={video.thumbnail} alt={video.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s" }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        />
        <span className="video-duration">{formatDuration(video.duration)}</span>
        <span style={{
          position: "absolute", top: "var(--sp-2)", left: "var(--sp-2)", zIndex: 2,
          padding: "2px 10px", borderRadius: "var(--radius-full)", fontSize: "11px", fontWeight: 600,
          backgroundColor: video.isPublished ? "var(--accent)" : "rgba(0,0,0,0.6)",
          color: "#fff",
        }}>
          {video.isPublished ? "Public" : "Private"}
        </span>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          style={{ position: "absolute", bottom: "var(--sp-2)", left: "var(--sp-2)", zIndex: 2, accentColor: "var(--accent)", width: 16, height: 16, cursor: "pointer" }}
        />
      </div>

      {/* Info */}
      <div style={{ padding: "var(--sp-3) var(--sp-4)", flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: "var(--sp-1)" }}>
        <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0 }}>{video.title}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "var(--text-muted)" }}>
          <span>{video.views.toLocaleString()} views</span>
          <span>&middot;</span>
          <span>{video.likesCount.toLocaleString()} likes</span>
          <span>&middot;</span>
          <span>{timeAgo(video.createdAt)}</span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
          <button className="btn btn-sm btn-secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem", fontWeight: 500 }} onClick={() => router.push(`/videos/${video._id}`)}>
            <EyeIcon size={12} />
            View
          </button>
          <button className="btn btn-sm btn-secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem", fontWeight: 500 }} onClick={() => router.push(`/studio?edit=${video._id}`)}>
            <Edit2Icon size={12} />
            Edit
          </button>
          <div style={{ position: "relative" }}>
            <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setMenuOpen(!menuOpen)} style={{ width: 28, height: 28 }}>
              <span style={{ fontSize: "14px", lineHeight: 1 }}>&hellip;</span>
            </button>
            {menuOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={() => setMenuOpen(false)} />
                <div className="dropdown open" style={{ top: "auto", bottom: "100%", marginBottom: "var(--sp-1)", minWidth: 140 }}>
                  <button className="dropdown-item" onClick={() => { setMenuOpen(false); router.push(`/videos/${video._id}`); }}>
                    <EyeIcon size={16} />
                    View on site
                  </button>
                  <button className="dropdown-item" onClick={() => { setMenuOpen(false); router.push(`/studio?edit=${video._id}`); }}>
                    <Edit2Icon size={16} />
                    Edit details
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ──
function CreatorStudioContent() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editVideoId, setEditVideoId] = useState<string | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortType, setSortType] = useState("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | "public" | "private">("all");

  useEffect(() => {
    setEditVideoId(editId);
  }, [editId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ["channel-stats"],
    queryFn: async () => { const res = await api.get("/dashboard/stats"); return res.data; },
    enabled: isAuthenticated,
  });

  const { data: videosRes, isLoading: videosLoading } = useQuery({
    queryKey: ["channel-videos"],
    queryFn: async () => { const res = await api.get("/dashboard/videos"); return res.data; },
    enabled: isAuthenticated,
  });

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    queryClient.invalidateQueries({ queryKey: ["channel-stats"] });
    queryClient.invalidateQueries({ queryKey: ["channel-videos"] });
    queryClient.invalidateQueries({ queryKey: ["videos"] });
  };

  const handleEditSuccess = () => {
    setEditVideoId(null);
    router.replace("/studio");
    queryClient.invalidateQueries({ queryKey: ["channel-videos"] });
    queryClient.invalidateQueries({ queryKey: ["videos"] });
  };

  const handleEditClose = () => {
    setEditVideoId(null);
    router.replace("/studio");
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (videoIds: string[]) => { await api.post("/videos/bulk/delete", { videoIds }); },
    onSuccess: () => { setSelectedVideos(new Set()); queryClient.invalidateQueries({ queryKey: ["channel-videos"] }); queryClient.invalidateQueries({ queryKey: ["channel-stats"] }); },
  });

  const bulkPublishMutation = useMutation({
    mutationFn: async ({ videoIds, isPublished }: { videoIds: string[]; isPublished: boolean }) => { await api.post("/videos/bulk/publish", { videoIds, isPublished }); },
    onSuccess: () => { setSelectedVideos(new Set()); queryClient.invalidateQueries({ queryKey: ["channel-videos"] }); },
  });

  const toggleSelectAll = () => {
    if (selectedVideos.size === filteredVideos.length) setSelectedVideos(new Set());
    else setSelectedVideos(new Set(filteredVideos.map((v: { _id: string }) => v._id)));
  };

  const toggleSelectVideo = (id: string) => {
    setSelectedVideos((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6rem 2rem" }}>
        <div className="skeleton" style={{ width: 160, height: 20 }} />
      </div>
    );
  }

  if (statsLoading || videosLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6rem 2rem" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-4)" }}>
          <div className="skeleton" style={{ width: 200, height: 20 }} />
          <p className="text-caption" style={{ color: "var(--text-muted)" }}>Loading your studio...</p>
        </div>
      </div>
    );
  }

  const stats = statsRes?.data;
  const allVideos = videosRes?.data || [];

  const filteredVideos = allVideos.filter((v: { isPublished: boolean }) => {
    if (filterStatus === "public") return v.isPublished;
    if (filterStatus === "private") return !v.isPublished;
    return true;
  });

  const sortedVideos = [...filteredVideos].sort((a: { createdAt: string; views: number; likesCount: number }, b: { createdAt: string; views: number; likesCount: number }) => {
    if (sortBy === "views") return sortType === "desc" ? b.views - a.views : a.views - b.views;
    if (sortBy === "likesCount") return sortType === "desc" ? b.likesCount - a.likesCount : a.likesCount - b.likesCount;
    return sortType === "desc" ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <>
      <PageMeta title="Creator Studio" description="Manage your videos, analytics, and channel on VideoTube." noIndex />
      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} onSuccess={handleUploadSuccess} />}
      {editVideoId && <EditModal videoId={editVideoId} onClose={handleEditClose} onSuccess={handleEditSuccess} />}

      <div className="content-max">
        {/* Welcome with Quick Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--sp-8)", flexWrap: "wrap", gap: "var(--sp-4)" }}>
          <div>
            <h1 className="text-page" style={{ marginBottom: "var(--sp-1)" }}>Creator Studio</h1>
            <p className="text-caption" style={{ color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>Welcome back, {user?.fullName}</p>
          </div>
              <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
                <button className="btn btn-primary btn-pill" onClick={() => setShowUploadModal(true)}>
                  <PlusIcon size={16} />
                  Upload
                </button>
              </div>
            </div>

            {/* Analytics Dashboard */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--sp-4)", marginBottom: "var(--sp-6)" }}>
              <StatCard label="Total Views" value={stats?.totalViews || 0} color="var(--accent-subtle)"
                icon={<EyeIcon size={18} />}
              />
              <StatCard label="Subscribers" value={stats?.totalSubscribers || 0} color="var(--error-subtle)"
                icon={<UserIcon size={18} />}
              />
              <StatCard label="Total Likes" value={stats?.totalLikes || 0} color="var(--accent-subtle)"
                icon={<HeartIcon size={18} />}
              />
              <StatCard label="Total Videos" value={stats?.totalVideos || 0} color="var(--error-subtle)"
                icon={<VideoIcon size={18} />}
              />
            </div>

            {/* Insights Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-6)", marginBottom: "var(--sp-8)" }}>
              {/* Top Performing Videos */}
              <div className="form-card" style={{ padding: "var(--sp-5)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
                  <TrendingIcon size={18} />
                  <h2 className="text-section" style={{ margin: 0, fontSize: "0.95rem" }}>Top Performing</h2>
                </div>
                {sortedVideos.length === 0 ? (
                  <p className="text-caption" style={{ color: "var(--text-muted)" }}>No videos yet</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
                    {[...sortedVideos]
                      .sort((a: { views: number }, b: { views: number }) => b.views - a.views)
                      .slice(0, 5)
                      .map((video: { _id: string; title: string; views: number; likesCount: number }, i: number) => (
                        <div key={video._id} style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "var(--sp-2) var(--sp-3)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-secondary)" }}>
                          <span style={{ width: 20, fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textAlign: "center" }}>{i + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{video.title}</p>
                            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{video.views.toLocaleString()} views &middot; {video.likesCount.toLocaleString()} likes</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Channel Analytics */}
              <div className="form-card" style={{ padding: "var(--sp-5)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
                  <TrendingIcon size={18} />
                  <h2 className="text-section" style={{ margin: 0, fontSize: "0.95rem" }}>Channel Analytics</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--sp-2) 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Avg Views / Video</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {stats?.totalVideos > 0 ? Math.round((stats?.totalViews || 0) / stats.totalVideos).toLocaleString() : 0}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--sp-2) 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Engagement Rate</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {stats?.totalViews > 0 ? `${((stats?.totalLikes || 0) / stats.totalViews * 100).toFixed(1)}%` : "0%"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--sp-2) 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Like-to-Sub Ratio</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {stats?.totalSubscribers > 0 ? `${((stats?.totalLikes || 0) / stats.totalSubscribers * 100).toFixed(0)}%` : "0%"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--sp-2) 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Likes per Video</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {stats?.totalVideos > 0 ? Math.round((stats?.totalLikes || 0) / stats.totalVideos).toLocaleString() : 0}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--sp-2) 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Views per Subscriber</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {stats?.totalSubscribers > 0 ? (stats?.totalViews / stats.totalSubscribers).toFixed(1) : "0"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--sp-2) 0" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Subscriber Efficiency</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {stats?.totalVideos > 0 ? `${Math.round((stats?.totalSubscribers || 0) / stats.totalVideos).toLocaleString()} / video` : "0"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <h2 className="text-section" style={{ marginBottom: "var(--sp-4)" }}>Channel Content</h2>

            {/* Bulk Action Bar */}
            <AnimatePresence>
              {selectedVideos.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "var(--sp-3) var(--sp-4)", marginBottom: "var(--sp-4)", borderRadius: "var(--radius-md)", backgroundColor: "var(--accent-subtle)", border: "1px solid var(--accent)", flexWrap: "wrap" }}
                >
                  <span className="text-caption" style={{ color: "var(--accent)", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>{selectedVideos.size} selected</span>
                  <button className="btn btn-sm btn-primary" onClick={() => bulkPublishMutation.mutate({ videoIds: Array.from(selectedVideos), isPublished: true })} disabled={bulkPublishMutation.isPending}>
                    <CheckIcon size={14} />
                    Publish
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={() => bulkPublishMutation.mutate({ videoIds: Array.from(selectedVideos), isPublished: false })} disabled={bulkPublishMutation.isPending}>
                    <CloseIcon size={14} />
                    Unpublish
                  </button>
                  <button className="btn btn-sm btn-secondary" style={{ backgroundColor: "var(--error)", color: "#fff", border: "none" }} onClick={() => { if (confirm(`Delete ${selectedVideos.size} videos?`)) bulkDeleteMutation.mutate(Array.from(selectedVideos)); }} disabled={bulkDeleteMutation.isPending}>
                    <TrashIcon size={14} />
                    Delete
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setSelectedVideos(new Set())}>
                    Clear
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sort + Filter Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-4)", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <span className="text-caption" style={{ color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>Sort by</span>
                <select className="input select btn btn-sm btn-secondary" value={`${sortBy}-${sortType}`} onChange={(e) => { const [by = "createdAt", type = "desc"] = e.target.value.split("-"); setSortBy(by); setSortType(type); }}
                  style={{ width: "auto", height: 32, padding: "0 var(--sp-3)" }}>
                  <option value="createdAt-desc">Newest</option>
                  <option value="createdAt-asc">Oldest</option>
                  <option value="views-desc">Most views</option>
                  <option value="likesCount-desc">Most likes</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <span className="text-caption" style={{ color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>Filter</span>
                <select className="input select btn btn-sm btn-secondary" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "all" | "public" | "private")}
                  style={{ width: "auto", height: 32, padding: "0 var(--sp-3)" }}>
                  <option value="all">All</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div style={{ flex: 1 }} />
              <label style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", fontSize: "12px", color: "var(--text-muted)", cursor: "pointer" }}>
                <input type="checkbox" checked={selectedVideos.size === sortedVideos.length && sortedVideos.length > 0} onChange={toggleSelectAll}
                  style={{ accentColor: "var(--accent)", width: 14, height: 14, cursor: "pointer" }} />
                Select all
              </label>
            </div>

            {/* Video Cards Grid */}
            {sortedVideos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <VideoIcon size={28} />
                </div>
                <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "var(--sp-2)" }}>No videos uploaded yet</p>
                <p className="text-caption" style={{ color: "var(--text-muted)", marginBottom: "var(--sp-5)", textTransform: "none", letterSpacing: 0 }}>Upload your first video to get started</p>
                <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                  <UploadIcon size={16} />
                  Upload your first video
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                {sortedVideos.map((video: { _id: string; thumbnail: string; title: string; isPublished: boolean; createdAt: string; views: number; likesCount: number; duration: number }) => (
                  <VideoCard
                    key={video._id}
                    video={video}
                    isSelected={selectedVideos.has(video._id)}
                    onSelect={() => router.push(`/videos/${video._id}`)}
                    onToggleSelect={() => toggleSelectVideo(video._id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      );
}

export default function CreatorStudio() {
  return (
    <Suspense fallback={<div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}><div style={{ color: "var(--text-secondary)" }}>Loading studio...</div></div>}>
      <CreatorStudioContent />
    </Suspense>
  );
}
