"use client";

import React, { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PageNavDropdown from "@/src/components/PageNavDropdown";

const CATEGORIES = ["General", "Gaming", "Music", "Education", "Entertainment", "Sports", "News", "Technology", "Science", "Travel", "Food", "Fashion", "Art", "Podcasts"] as const;

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
          style={{ width: "100%", maxWidth: 560, borderRadius: "var(--radius-xl)", padding: "2rem", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-lg)", maxHeight: "90vh", overflowY: "auto" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>Upload Video</h2>
            <button onClick={onClose} disabled={uploading} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 }}>x</button>
          </div>

          {error && (
            <div style={{ padding: "0.7rem 1rem", backgroundColor: "var(--accent-warm-light)", color: "var(--accent-warm)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid rgba(244,63,94,0.15)" }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Title <span style={{ color: "var(--accent-warm)" }}>*</span></label>
              <input type="text" required placeholder="Title" className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} disabled={uploading} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Description <span style={{ color: "var(--accent-warm)" }}>*</span></label>
              <textarea required placeholder="Description" className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} disabled={uploading} rows={3} style={{ resize: "vertical", fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Tags</label>
              <input type="text" placeholder="Tags (comma separated)" className="input-field" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} disabled={uploading} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Category</label>
              <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)} disabled={uploading} style={{ cursor: "pointer" }}>
                {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Visibility</label>
              <div style={{ display: "flex", gap: "1.25rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                  <input type="radio" name="visibility" checked={isPublished === true} onChange={() => setIsPublished(true)} disabled={uploading} style={{ accentColor: "var(--accent)" }} />
                  Public
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                  <input type="radio" name="visibility" checked={isPublished === false} onChange={() => setIsPublished(false)} disabled={uploading} style={{ accentColor: "var(--accent)" }} />
                  Private
                </label>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Schedule Publishing (optional)</label>
              <input type="datetime-local" className="input-field" value={scheduledAt} onChange={(e) => { setScheduledAt(e.target.value); if (e.target.value) setIsPublished(false); }} disabled={uploading} style={{ cursor: "pointer" }} />
              {scheduledAt && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Video will be published automatically at this time</span>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Chapters (optional)</label>
              <textarea className="input-field" placeholder={"Timestamps (optional)"} value={chaptersInput} onChange={(e) => setChaptersInput(e.target.value)} disabled={uploading} rows={4} style={{ fontFamily: "monospace", fontSize: "0.82rem", resize: "vertical" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Format: MM:SS Title (one per line)</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="upload-zone" style={{ padding: "1rem" }}>
                <input type="file" accept="video/*" ref={videoRef} required disabled={uploading} />
                <div className="upload-zone-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                </div>
                <p className="upload-zone-label">Video File</p>
                <p className="upload-zone-hint">MP4, MOV, AVI</p>
              </div>
              <div className="upload-zone" style={{ padding: "1rem" }}>
                <input type="file" accept="image/*" ref={thumbnailRef} required disabled={uploading} />
                <div className="upload-zone-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                </div>
                <p className="upload-zone-label">Thumbnail</p>
                <p className="upload-zone-hint">JPG, PNG, WEBP</p>
              </div>
            </div>

            {uploading && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ width: "100%", height: 6, backgroundColor: "var(--bg-elevated)", borderRadius: 99, overflow: "hidden" }}>
                  <motion.div initial={{ width: "0%" }} animate={{ width: `${progress}%` }} style={{ height: "100%", background: "linear-gradient(to right, var(--accent), var(--accent-warm))", borderRadius: 99 }} />
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>
                  {progress < 100 ? `Uploading... ${progress}%` : "Processing on Cloudinary, please wait..."}
                </p>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={uploading} style={{ marginTop: "0.25rem" }}>
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
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: "1.25rem", borderRadius: "var(--radius-lg)", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", display: "flex", alignItems: "center", gap: "0.85rem" }}
    >
      <div style={{ width: 42, height: 42, borderRadius: "50%", backgroundColor: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
        <p style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>{value}</p>
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
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: "var(--radius-lg)", overflow: "hidden",
        backgroundColor: "var(--bg-card)", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border-light)"}`,
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: isSelected ? "0 0 0 1px var(--accent)" : "none",
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", cursor: "pointer" }} onClick={onSelect}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.thumbnail} alt={video.title} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            style={{ accentColor: "var(--accent)", width: 16, height: 16, cursor: "pointer", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 4 }}
          />
        </div>
        <span style={{ position: "absolute", bottom: 8, right: 8, padding: "0.15rem 0.45rem", borderRadius: 4, fontSize: "0.72rem", fontWeight: 600, backgroundColor: "rgba(0,0,0,0.75)", color: "white" }}>
          {formatDuration(video.duration)}
        </span>
        <span style={{
          position: "absolute", top: 8, right: 8,
          padding: "0.15rem 0.5rem", borderRadius: "2rem", fontSize: "0.7rem", fontWeight: 600,
          backgroundColor: video.isPublished ? "var(--accent)" : "var(--bg-elevated)",
          color: video.isPublished ? "white" : "var(--text-muted)",
        }}>
          {video.isPublished ? "Public" : "Private"}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: "0.85rem 1rem" }}>
        <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)", marginBottom: "0.4rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
          {video.title}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
          <span>{video.views.toLocaleString()} views</span>
          <span>&middot;</span>
          <span>{video.likesCount.toLocaleString()} likes</span>
          <span>&middot;</span>
          <span>{timeAgo(video.createdAt)}</span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", borderTop: "1px solid var(--border-light)", paddingTop: "0.65rem" }}>
          <button onClick={() => router.push(`/videos/${video._id}`)} style={{ flex: 1, padding: "0.35rem 0.6rem", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", fontWeight: 500, backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-light)", cursor: "pointer", transition: "background-color 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--accent-light)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          >
            View
          </button>
          <button onClick={() => router.push(`/studio?edit=${video._id}`)} style={{ flex: 1, padding: "0.35rem 0.6rem", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", fontWeight: 500, backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-light)", cursor: "pointer", transition: "background-color 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--accent-light)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          >
            Edit
          </button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ padding: "0.35rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", backgroundColor: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", lineHeight: 1 }}>
              ...
            </button>
            {menuOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={() => setMenuOpen(false)} />
                <div style={{ position: "absolute", bottom: "100%", right: 0, marginBottom: 4, minWidth: 130, zIndex: 10, backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)", padding: "0.3rem" }}>
                  <button onClick={() => { setMenuOpen(false); router.push(`/videos/${video._id}`); }} style={{ display: "block", width: "100%", padding: "0.45rem 0.7rem", fontSize: "0.78rem", color: "var(--text-primary)", background: "none", border: "none", textAlign: "left", cursor: "pointer", borderRadius: "var(--radius-sm)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                  >
                    View on site
                  </button>
                  <button onClick={() => { setMenuOpen(false); router.push(`/studio?edit=${video._id}`); }} style={{ display: "block", width: "100%", padding: "0.45rem 0.7rem", fontSize: "0.78rem", color: "var(--text-primary)", background: "none", border: "none", textAlign: "left", cursor: "pointer", borderRadius: "var(--radius-sm)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                  >
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
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)", fontWeight: 500 }}>Loading...</motion.div>
      </div>
    );
  }

  if (statsLoading || videosLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)", fontWeight: 500 }}>Loading your studio...</motion.div>
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

      <main style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
        <header className="glass" style={{ position: "sticky", top: 0, zIndex: 50, padding: "0.75rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <PageNavDropdown />
            <span style={{ color: "var(--border-light)", fontSize: "1.2rem", fontWeight: 300 }}>/</span>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Creator Studio</span>
          </div>
        </header>

        <div style={{ width: "100%", padding: "2rem" }}>

          {/* Welcome with Quick Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Creator Studio</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Welcome back, {user?.fullName}</p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => setShowUploadModal(true)} style={{ padding: "0.55rem 1.2rem", fontSize: "0.85rem", borderRadius: 99, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Upload
              </button>
              <Link href="/" className="btn-ghost" style={{ padding: "0.55rem 1.2rem", fontSize: "0.85rem", borderRadius: 99, display: "flex", alignItems: "center", gap: "0.4rem", textDecoration: "none" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                View Channel
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.85rem", marginBottom: "2.5rem" }}>
            <StatCard label="Total Views" value={stats?.totalViews || 0} color="var(--accent-light)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
            />
            <StatCard label="Subscribers" value={stats?.totalSubscribers || 0} color="var(--accent-warm-light)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warm)" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}
            />
            <StatCard label="Total Likes" value={stats?.totalLikes || 0} color="var(--accent-light)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>}
            />
            <StatCard label="Total Videos" value={stats?.totalVideos || 0} color="var(--accent-warm-light)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warm)" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>}
            />
          </div>

          {/* Content */}
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>Channel Content</h2>

          {/* Bulk Action Bar */}
          {selectedVideos.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", marginBottom: "1rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--accent-light)", border: "1px solid var(--accent)", flexWrap: "wrap" }}
            >
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent)" }}>{selectedVideos.size} selected</span>
              <button onClick={() => bulkPublishMutation.mutate({ videoIds: Array.from(selectedVideos), isPublished: true })} disabled={bulkPublishMutation.isPending}
                style={{ padding: "0.4rem 0.8rem", borderRadius: 99, fontSize: "0.78rem", fontWeight: 600, backgroundColor: "var(--accent)", color: "white", border: "none", cursor: "pointer" }}>Publish</button>
              <button onClick={() => bulkPublishMutation.mutate({ videoIds: Array.from(selectedVideos), isPublished: false })} disabled={bulkPublishMutation.isPending}
                style={{ padding: "0.4rem 0.8rem", borderRadius: 99, fontSize: "0.78rem", fontWeight: 600, backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-light)", cursor: "pointer" }}>Unpublish</button>
              <button onClick={() => { if (confirm(`Delete ${selectedVideos.size} videos?`)) bulkDeleteMutation.mutate(Array.from(selectedVideos)); }} disabled={bulkDeleteMutation.isPending}
                style={{ padding: "0.4rem 0.8rem", borderRadius: 99, fontSize: "0.78rem", fontWeight: 600, backgroundColor: "#dc2626", color: "white", border: "none", cursor: "pointer" }}>Delete</button>
              <button onClick={() => setSelectedVideos(new Set())}
                style={{ padding: "0.4rem 0.8rem", borderRadius: 99, fontSize: "0.78rem", fontWeight: 600, backgroundColor: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer" }}>Clear</button>
            </motion.div>
          )}

          {/* Sort + Filter Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Sort by</span>
              <select value={`${sortBy}-${sortType}`} onChange={(e) => { const [by, type] = e.target.value.split("-"); setSortBy(by); setSortType(type); }}
                style={{ padding: "0.35rem 0.7rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer" }}>
                <option value="createdAt-desc">Newest</option>
                <option value="createdAt-asc">Oldest</option>
                <option value="views-desc">Most views</option>
                <option value="likesCount-desc">Most likes</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Filter</span>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "all" | "public" | "private")}
                style={{ padding: "0.35rem 0.7rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer" }}>
                <option value="all">All</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div style={{ flex: 1 }} />
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer" }}>
              <input type="checkbox" checked={selectedVideos.size === sortedVideos.length && sortedVideos.length > 0} onChange={toggleSelectAll}
                style={{ accentColor: "var(--accent)", width: 14, height: 14, cursor: "pointer" }} />
              Select all
            </label>
          </div>

          {/* Video Cards Grid */}
          {sortedVideos.length === 0 ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "var(--accent-light)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem", color: "var(--accent)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
              </div>
              <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>No videos uploaded yet</p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Upload your first video to get started</p>
              <button className="btn-primary" onClick={() => setShowUploadModal(true)}>Upload your first video</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
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
    </>
  );
}
