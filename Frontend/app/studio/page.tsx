"use client";

import { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import TopNav from "@/src/components/TopNav";
import { timeAgo, formatDuration } from "@/src/lib/utils";
import {
  PlusIcon,
  VideoIcon,
  EyeIcon,
  UserIcon,
  HeartIcon,
  Edit2Icon,
  TrashIcon,
  CloseIcon,
  CheckIcon,
  UploadIcon,
  ImageIcon,
  GlobeIcon,
} from "@/src/components/icons";

const CATEGORIES = ["General", "Gaming", "Music", "Education", "Entertainment", "Sports", "News", "Technology", "Science", "Travel", "Food", "Fashion", "Art", "Podcasts"] as const;

// ── Upload Modal ──
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const videoRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [isPublished, setIsPublished] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [chaptersInput, setChaptersInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const videoFile = videoRef.current?.files?.[0];
    const thumbnailFile = thumbnailRef.current?.files?.[0];
    if (!videoFile) return setError("Please select a video file.");
    if (!thumbnailFile) return setError("Please select a thumbnail image.");
    if (!title.trim()) return setError("Title is required.");
    if (!description.trim()) return setError("Description is required.");

    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("tags", tags.join(","));
    formData.append("category", category);
    formData.append("isPublished", String(isPublished));
    if (scheduledAt) formData.append("scheduledAt", scheduledAt);
    if (chaptersInput.trim()) {
      try {
        const chapters = chaptersInput.split("\n").filter(Boolean).map((line) => {
          const [time, ...titleParts] = line.split(" ");
          const [m, s] = time.replace(":", ".").split(".").map(Number);
          return { startTime: (m || 0) * 60 + (s || 0), title: titleParts.join(" ") };
        });
        formData.append("chapters", JSON.stringify(chapters));
      } catch { /* ignore */ }
    }
    formData.append("videoFile", videoFile);
    formData.append("thumbnail", thumbnailFile);

    setUploading(true);
    try {
      await api.post("/videos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });
      onSuccess();
    } catch {
      setError("Upload failed. Please try again.");
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          className="modal-content"
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-6)" }}>
            <h2 className="text-section">Upload Video</h2>
            <button className="btn-icon btn-sm" onClick={onClose} disabled={uploading}>
              <CloseIcon size={18} />
            </button>
          </div>

          {error && (
            <div style={{ padding: "var(--sp-3) var(--sp-4)", backgroundColor: "var(--error-subtle)", color: "var(--error)", borderRadius: "var(--radius-md)", marginBottom: "var(--sp-4)", fontSize: "13px", border: "1px solid rgba(239,68,68,0.15)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
              <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Title <span style={{ color: "var(--error)" }}>*</span></label>
              <input type="text" required placeholder="Title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={uploading} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
              <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Description <span style={{ color: "var(--error)" }}>*</span></label>
              <textarea required placeholder="Description" className="input" value={description} onChange={(e) => setDescription(e.target.value)} disabled={uploading} rows={3} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
              <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Tags</label>
              <input type="text" placeholder="gaming, tutorial, comedy" className="input" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} disabled={uploading} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
              <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Category</label>
              <select className="input select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={uploading}>
                {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
              <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Visibility</label>
              <div style={{ display: "flex", gap: "var(--sp-5)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)" }}>
                  <input type="radio" name="visibility" checked={isPublished === true} onChange={() => setIsPublished(true)} disabled={uploading} style={{ accentColor: "var(--accent)" }} />
                  <GlobeIcon size={14} />
                  Public
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)" }}>
                  <input type="radio" name="visibility" checked={isPublished === false} onChange={() => setIsPublished(false)} disabled={uploading} style={{ accentColor: "var(--accent)" }} />
                  <CloseIcon size={14} />
                  Private
                </label>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
              <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Schedule Publishing (optional)</label>
              <input type="datetime-local" className="input" value={scheduledAt} onChange={(e) => { setScheduledAt(e.target.value); if (e.target.value) setIsPublished(false); }} disabled={uploading} />
              {scheduledAt && <span className="text-micro" style={{ color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>Video will be published automatically at this time</span>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
              <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Chapters (optional)</label>
              <textarea className="input" placeholder={"00:00 Intro\n01:30 Main topic"} value={chaptersInput} onChange={(e) => setChaptersInput(e.target.value)} disabled={uploading} rows={4} style={{ fontFamily: "monospace", fontSize: "12px" }} />
              <span className="text-micro" style={{ color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>Format: MM:SS Title (one per line)</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
              <div className="upload-zone">
                <input type="file" accept="video/*" ref={videoRef} required disabled={uploading} />
                <div className="upload-zone-icon">
                  <VideoIcon size={18} />
                </div>
                <p className="upload-zone-label">Video File</p>
                <p className="upload-zone-hint">MP4, MOV, AVI</p>
              </div>
              <div className="upload-zone">
                <input type="file" accept="image/*" ref={thumbnailRef} required disabled={uploading} />
                <div className="upload-zone-icon">
                  <ImageIcon size={18} />
                </div>
                <p className="upload-zone-label">Thumbnail</p>
                <p className="upload-zone-hint">JPG, PNG, WEBP</p>
              </div>
            </div>

            {uploading && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
                <div style={{ width: "100%", height: 6, backgroundColor: "var(--elevated)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                  <motion.div initial={{ width: "0%" }} animate={{ width: `${progress}%` }} style={{ height: "100%", background: "linear-gradient(to right, var(--accent), var(--warning))", borderRadius: "var(--radius-full)" }} />
                </div>
                <p className="text-micro" style={{ color: "var(--text-muted)", textAlign: "center", textTransform: "none", letterSpacing: 0 }}>
                  {progress < 100 ? `Uploading... ${progress}%` : "Processing on Cloudinary, please wait..."}
                </p>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? "Uploading..." : "Publish Video"}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

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

// ── Video Card ──
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
      className="card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderColor: isSelected ? "var(--accent)" : undefined,
        boxShadow: isSelected ? "0 0 0 1px var(--accent)" : undefined,
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", cursor: "pointer" }} onClick={onSelect}>
        <div className="video-thumb">
          <img src={video.thumbnail} alt={video.title} />
        </div>
        <div style={{ position: "absolute", top: "var(--sp-2)", left: "var(--sp-2)", zIndex: 2, display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            style={{ accentColor: "var(--accent)", width: 16, height: 16, cursor: "pointer", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: "var(--radius-xs)" }}
          />
        </div>
        <span className="video-duration">{formatDuration(video.duration)}</span>
        <span style={{
          position: "absolute", top: "var(--sp-2)", right: "var(--sp-2)", zIndex: 2,
          padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: "11px", fontWeight: 600,
          backgroundColor: video.isPublished ? "var(--accent)" : "var(--elevated)",
          color: video.isPublished ? "#fff" : "var(--text-muted)",
        }}>
          {video.isPublished ? "Public" : "Private"}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: "var(--sp-3) var(--sp-4)" }}>
        <p className="video-title">{video.title}</p>
        <div className="video-meta">
          <span>{video.views.toLocaleString()} views</span>
          <span>&middot;</span>
          <span>{video.likesCount.toLocaleString()} likes</span>
          <span>&middot;</span>
          <span>{timeAgo(video.createdAt)}</span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginTop: "var(--sp-3)", borderTop: "1px solid var(--border)", paddingTop: "var(--sp-3)" }}>
          <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => router.push(`/videos/${video._id}`)}>
            <EyeIcon size={14} />
            View
          </button>
          <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => router.push(`/studio?edit=${video._id}`)}>
            <Edit2Icon size={14} />
            Edit
          </button>
          <div style={{ position: "relative" }}>
            <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setMenuOpen(!menuOpen)}>
              <span style={{ fontSize: "16px", lineHeight: 1 }}>&hellip;</span>
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
export default function CreatorStudio() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortType, setSortType] = useState("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | "public" | "private">("all");

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
      <div className="page-layout">
        <TopNav />
        <div className="page-content" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="skeleton" style={{ width: 160, height: 20 }} />
        </div>
      </div>
    );
  }

  if (statsLoading || videosLoading) {
    return (
      <div className="page-layout">
        <TopNav />
        <div className="page-content" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-4)" }}>
            <div className="skeleton" style={{ width: 200, height: 20 }} />
            <p className="text-caption" style={{ color: "var(--text-muted)" }}>Loading your studio...</p>
          </div>
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
      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} onSuccess={handleUploadSuccess} />}

      <TopNav />

      <div className="page-layout">
        <main className="page-content">
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
                <Link href="/" className="btn btn-ghost btn-pill" style={{ textDecoration: "none" }}>
                  <GlobeIcon size={14} />
                  View Channel
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--sp-4)", marginBottom: "var(--sp-10)" }}>
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
                <select className="input select btn btn-sm btn-secondary" value={`${sortBy}-${sortType}`} onChange={(e) => { const [by, type] = e.target.value.split("-"); setSortBy(by); setSortType(type); }}
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
              <div className="video-grid">
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
        </main>
      </div>
    </>
  );
}
