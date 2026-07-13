"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useRouter, useSearchParams } from "next/navigation";
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
  TrendingIcon,
  ClockIcon,
  DownloadIcon,
} from "@/src/components/icons";

const CATEGORIES = ["General", "Gaming", "Music", "Education", "Entertainment", "Sports", "News", "Technology", "Science", "Travel", "Food", "Fashion", "Art", "Podcasts"] as const;

// ── Upload Modal ──
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const videoRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval>>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [isPublished, setIsPublished] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [chaptersInput, setChaptersInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [videoName, setVideoName] = useState("");
  const [thumbnailName, setThumbnailName] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const MAX_VIDEO_MB = 20;
  const MAX_THUMBNAIL_MB = 2;

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const videoFile = videoRef.current?.files?.[0];
    const thumbnailFile = thumbnailRef.current?.files?.[0];
    if (!videoFile) return setError("Please select a video file.");
    if (!thumbnailFile) return setError("Please select a thumbnail image.");
    if (!title.trim()) return setError("Title is required.");
    if (!description.trim()) return setError("Description is required.");

    if (videoFile.size > MAX_VIDEO_MB * 1024 * 1024) {
      return setError(`Video size must be ${MAX_VIDEO_MB} MB or less`);
    }
    if (thumbnailFile.size > MAX_THUMBNAIL_MB * 1024 * 1024) {
      return setError(`Thumbnail size must be ${MAX_THUMBNAIL_MB} MB or less`);
    }

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
    setProcessing(false);
    setProgress(0);
    setCancelled(false);
    if (progressRef.current) clearInterval(progressRef.current);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await api.post("/videos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000,
        signal: controller.signal,
        onUploadProgress: (evt) => {
          if (evt.total) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            setProgress(Math.min(pct, 100));
          }
        },
      });
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);
      setProcessing(true);
      onSuccess();
    } catch (err: unknown) {
      if (progressRef.current) clearInterval(progressRef.current);
      if (err instanceof DOMException && err.name === "AbortError") {
        setCancelled(true);
        setUploading(false);
        setProcessing(false);
        abortRef.current = null;
        return;
      }
      setError(getApiErrorMessage(err, "Upload failed. Please try again."));
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleCancelUpload = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Title <span style={{ color: "var(--error)" }}>*</span></label>
                <input type="text" required placeholder="Title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={uploading} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Description <span style={{ color: "var(--error)" }}>*</span></label>
                <textarea required placeholder="Description" className="input" value={description} onChange={(e) => setDescription(e.target.value)} disabled={uploading} rows={3} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Tags</label>
                <textarea placeholder="gaming, tutorial, comedy" className="input" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} disabled={uploading} rows={2} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Category</label>
                <select className="input select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={uploading}>
                  {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Visibility</label>
                <div style={{ display: "flex", gap: "var(--sp-5)", padding: "0.6rem 0" }}>
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
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Chapters (optional)</label>
                <textarea className="input" placeholder={"00:00 Intro\n01:30 Main topic"} value={chaptersInput} onChange={(e) => setChaptersInput(e.target.value)} disabled={uploading} rows={3} style={{ fontFamily: "monospace", fontSize: "12px" }} />
                <span className="text-micro" style={{ color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>Format: MM:SS Title (one per line)</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
              <div className="upload-zone">
                <input type="file" accept="video/*" ref={videoRef} required disabled={uploading} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setVideoName(file.name);
                    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
                      setError(`Video size must be ${MAX_VIDEO_MB} MB or less`);
                    } else {
                      setError("");
                    }
                  }
                }} />
                <div className="upload-zone-icon">
                  <VideoIcon size={18} />
                </div>
                {videoName ? (
                  <p className="upload-zone-label" style={{ fontSize: "11px", wordBreak: "break-all" }}>{videoName}</p>
                ) : (
                  <p className="upload-zone-label">Video File</p>
                )}
                <p className="upload-zone-hint">MP4, MOV, AVI (max {MAX_VIDEO_MB} MB)</p>
              </div>
              <div className="upload-zone">
                <input type="file" accept="image/*" ref={thumbnailRef} required disabled={uploading} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setThumbnailName(file.name);
                    if (file.size > MAX_THUMBNAIL_MB * 1024 * 1024) {
                      setError(`Thumbnail size must be ${MAX_THUMBNAIL_MB} MB or less`);
                    } else {
                      setError("");
                    }
                  }
                }} />
                <div className="upload-zone-icon">
                  <ImageIcon size={18} />
                </div>
                {thumbnailName ? (
                  <p className="upload-zone-label" style={{ fontSize: "11px", wordBreak: "break-all" }}>{thumbnailName}</p>
                ) : (
                  <p className="upload-zone-label">Thumbnail</p>
                )}
                <p className="upload-zone-hint">JPG, PNG, WEBP (max {MAX_THUMBNAIL_MB} MB)</p>
              </div>
              </div>
            </div>

            {uploading && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
                <div style={{ width: "100%", height: 6, backgroundColor: "var(--elevated)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                  <motion.div initial={{ width: "0%" }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} style={{ height: "100%", background: "var(--text-primary)", borderRadius: "var(--radius-full)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p className="text-micro" style={{ color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>
                    {progress}%
                  </p>
                  <button type="button" onClick={handleCancelUpload}
                    style={{ background: "none", border: "none", color: "var(--error)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {cancelled && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.75rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <span>Upload cancelled</span>
                <button type="button" onClick={() => { setCancelled(false); setError(""); }}
                  style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.8rem", textDecoration: "underline", padding: 0 }}>
                  Dismiss
                </button>
              </div>
            )}

            <button type="submit" className="btn" disabled={uploading} style={{
              width: "100%",
              padding: "0.85rem",
              borderRadius: "var(--radius-lg)",
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "#fff",
              backgroundColor: "#ef4444",
              border: "none",
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.7 : 1,
              transition: "opacity 0.2s, transform 0.15s",
            }}
              onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
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

// ── Edit Modal ──
function EditModal({ videoId, onClose, onSuccess }: { videoId: string; onClose: () => void; onSuccess: () => void }) {
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [thumbnailName, setThumbnailName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/videos/${videoId}`);
      onSuccess();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to delete video."));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const { data: videoRes, isLoading: loading } = useQuery({
    queryKey: ["edit-video", videoId],
    queryFn: async () => {
      const res = await api.get(`/videos/${videoId}`);
      return res.data;
    },
    enabled: !!videoId,
  });

  const video = videoRes?.data;

  useEffect(() => {
    if (video) {
      setTitle(video.title || "");
      setDescription(video.description || "");
      setTagsInput((video.tags || []).join(", "));
      setCategory(video.category || CATEGORIES[0]);
    }
  }, [video]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Title is required.");
    if (!description.trim()) return setError("Description is required.");

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("tags", tagsInput.split(",").map((t) => t.trim()).filter(Boolean).join(","));
      formData.append("category", category);

      const thumbnailFile = thumbnailRef.current?.files?.[0];
      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile);
      }

      await api.patch(`/videos/${videoId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to update video."));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: 520, padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>Loading video details...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: 520, padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--error)" }}>Video not found</p>
          <button className="btn btn-sm btn-secondary" onClick={onClose} style={{ marginTop: "1rem" }}>Close</button>
        </div>
      </div>
    );
  }

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
          style={{ maxWidth: 520 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-6)" }}>
            <h2 className="text-section">Edit Video</h2>
            <button className="btn-icon btn-sm" onClick={onClose} disabled={saving}>
              <CloseIcon size={18} />
            </button>
          </div>

          {error && (
            <div style={{ padding: "var(--sp-3) var(--sp-4)", backgroundColor: "var(--error-subtle)", color: "var(--error)", borderRadius: "var(--radius-md)", marginBottom: "var(--sp-4)", fontSize: "13px", border: "1px solid rgba(239,68,68,0.15)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
              <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Title <span style={{ color: "var(--error)" }}>*</span></label>
              <input type="text" required placeholder="Title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
              <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Description <span style={{ color: "var(--error)" }}>*</span></label>
              <textarea required placeholder="Description" className="input" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} rows={3} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
              <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Tags</label>
              <input type="text" placeholder="gaming, tutorial, comedy" className="input" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} disabled={saving} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
              <label className="text-caption" style={{ color: "var(--text-secondary)" }}>Category</label>
              <select className="input select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={saving}>
                {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>

            <div className="upload-zone">
              <input type="file" accept="image/*" ref={thumbnailRef} disabled={saving} onChange={(e) => setThumbnailName(e.target.files?.[0]?.name || "")} />
              <div className="upload-zone-icon">
                <ImageIcon size={18} />
              </div>
              {thumbnailName ? (
                <p className="upload-zone-label" style={{ fontSize: "12px", wordBreak: "break-all" }}>{thumbnailName}</p>
              ) : (
                <>
                  <p className="upload-zone-label">Replace Thumbnail</p>
                  <p className="upload-zone-hint">Leave empty to keep current</p>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <button type="button" className="btn btn-sm btn-secondary" style={{ color: "var(--error)", borderColor: "rgba(239,68,68,0.2)" }} onClick={() => setConfirmDelete(true)}>
                  <TrashIcon size={14} />
                  Delete
                </button>
              </div>
              <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving || deleting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || deleting}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>

          {confirmDelete && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setConfirmDelete(false)}
              style={{ position: "fixed", zIndex: 9999 }}
            >
              <motion.div
                className="modal-content"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 400, padding: "2rem", textAlign: "center" }}
              >
                <div style={{ width: 48, height: 48, borderRadius: "var(--radius-full)", backgroundColor: "var(--error-subtle)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", color: "var(--error)" }}>
                  <TrashIcon size={22} />
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Delete Video</h3>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                  Are you sure you want to delete this video? This action cannot be undone.
                </p>
                <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "center" }}>
                  <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</button>
                  <button className="btn btn-primary" style={{ backgroundColor: "var(--error)", borderColor: "var(--error)" }} onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
          </motion.div>
      </motion.div>
    </AnimatePresence>
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
                  <h3 className="text-section" style={{ margin: 0, fontSize: "0.95rem" }}>Top Performing</h3>
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
                  <h3 className="text-section" style={{ margin: 0, fontSize: "0.95rem" }}>Channel Analytics</h3>
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
