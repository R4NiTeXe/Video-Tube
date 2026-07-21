"use client";

import { useRef, useState, useEffect } from "react";
import { api, getApiErrorMessage } from "@/src/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { CloseIcon, VideoIcon, ImageIcon, GlobeIcon } from "@/src/components/icons";

const CATEGORIES = ["General", "Gaming", "Music", "Education", "Entertainment", "Sports", "News", "Technology", "Science", "Travel", "Food", "Fashion", "Art", "Podcasts"] as const;

export default function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
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
  const [_processing, setProcessing] = useState(false);
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
          const [time = "", ...titleParts] = line.split(" ");
          const [m, s] = time.replace(":", ".").split(".").map(Number);
          return { startTime: (m || 0) * 60 + (s || 0), title: titleParts.join(" ") };
        });
        formData.append("chapters", JSON.stringify(chapters));
      } catch (err) { console.error("Failed to parse chapters", err); }
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
