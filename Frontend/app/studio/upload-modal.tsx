"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { api, getApiErrorMessage } from "@/src/services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, UploadCloud, Image, FileVideo, Globe, Lock,
  CalendarClock, FolderKanban, Tag, CircleCheck,
  CircleAlert, Clock3,
} from "lucide-react";

const CATEGORIES = [
  "General", "Gaming", "Music", "Education", "Entertainment",
  "Sports", "News", "Technology", "Science", "Travel",
  "Food", "Fashion", "Art", "Podcasts",
] as const;

const MAX_VIDEO_MB = 20;
const MAX_THUMBNAIL_MB = 2;

function DropZone({
  icon, label, hint, accept, onChange, fileName, preview, disabled,
}: {
  icon: React.ReactNode; label: string; hint: string; accept: string;
  onChange: (file: File) => void; fileName: string; preview?: string; disabled: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onChange(file);
  }, [onChange]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        borderRadius: 16, border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
        padding: "1.5rem 1rem", textAlign: "center", cursor: disabled ? "not-allowed" : "pointer",
        backgroundColor: dragging ? "var(--accent-subtle)" : "var(--bg-secondary)",
        transition: "all 0.2s", opacity: disabled ? 0.5 : 1, position: "relative", overflow: "hidden",
      }}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }} disabled={disabled} style={{ display: "none" }} />
      {preview && label === "Thumbnail" ? (
        <img src={preview} alt="Preview" style={{ width: "100%", maxHeight: 120, objectFit: "contain", borderRadius: "var(--radius-md)", marginBottom: "0.5rem" }} />
      ) : (
        <div style={{ color: dragging ? "var(--accent)" : "var(--text-muted)", marginBottom: "0.5rem", transition: "color 0.2s" }}>
          {icon}
        </div>
      )}
      {fileName ? (
        <p style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 500, margin: 0, wordBreak: "break-all" }}>{fileName}</p>
      ) : (
        <>
          <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 500, margin: "0 0 0.2rem" }}>
            {label === "Video" ? "Drag & drop or browse files" : "Drag & drop or browse"}
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>{hint}</p>
        </>
      )}
    </div>
  );
}

function SegmentControl({ options, value, onChange }: { options: { value: string; label: string; icon: React.ReactNode }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", backgroundColor: "var(--bg-secondary)", borderRadius: 12, padding: 3, gap: 2 }}>
      {options.map((opt) => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
            padding: "0.5rem 0.75rem", borderRadius: 10, fontSize: "0.82rem", fontWeight: 500,
            border: "none", cursor: "pointer", transition: "all 0.15s",
            backgroundColor: value === opt.value ? "var(--card)" : "transparent",
            color: value === opt.value ? "var(--text-primary)" : "var(--text-muted)",
            boxShadow: value === opt.value ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [isPublished, setIsPublished] = useState("public");
  const [scheduledAt, setScheduledAt] = useState("");
  const [chaptersInput, setChaptersInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  useEffect(() => {
    return () => { if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview); };
  }, [thumbnailPreview]);

  const handleVideoSelect = (file: File) => {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) { setError(`Video size must be ${MAX_VIDEO_MB} MB or less`); return; }
    setVideoFile(file); setError("");
  };

  const handleThumbnailSelect = (file: File) => {
    if (file.size > MAX_THUMBNAIL_MB * 1024 * 1024) { setError(`Thumbnail size must be ${MAX_THUMBNAIL_MB} MB or less`); return; }
    setThumbnailFile(file);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(URL.createObjectURL(file));
    setError("");
  };

  const validate = () => {
    if (!videoFile) { setError("Please select a video file."); return false; }
    if (!thumbnailFile) { setError("Please select a thumbnail image."); return false; }
    if (!title.trim()) { setError("Title is required."); return false; }
    if (!description.trim()) { setError("Description is required."); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError("");

    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("tags", tags.join(","));
    formData.append("category", category);
    formData.append("isPublished", String(isPublished === "public"));
    if (scheduledAt) formData.append("scheduledAt", scheduledAt);
    if (chaptersInput.trim()) {
      try {
        const chapters = chaptersInput.split("\n").filter(Boolean).map((line) => {
          const [time = "", ...titleParts] = line.split(" ");
          const [m, s] = time.replace(":", ".").split(".").map(Number);
          return { startTime: (m || 0) * 60 + (s || 0), title: titleParts.join(" ") };
        });
        formData.append("chapters", JSON.stringify(chapters));
      } catch { /* skip */ }
    }
    if (videoFile) formData.append("videoFile", videoFile);
    if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

    setUploading(true);
    setProgress(0);
    setCancelled(false);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await api.post("/videos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000,
        signal: controller.signal,
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.min(Math.round((evt.loaded / evt.total) * 100), 100));
        },
      });
      setProgress(100);
      setTimeout(onSuccess, 400);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") { setCancelled(true); setUploading(false); abortRef.current = null; return; }
      setError(getApiErrorMessage(err, "Upload failed. Please try again."));
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget && !uploading) onClose(); }}
      style={{ backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 20 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: "min(90vw, 720px)", maxHeight: "90vh", overflow: "auto",
          backgroundColor: "var(--card)", borderRadius: 24, border: "1px solid var(--border)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
              <UploadCloud size={16} />
            </div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Upload Video</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Step {currentStep} of {totalSteps}</span>
            <button onClick={onClose} disabled={uploading}
              style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "none", cursor: uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", opacity: uploading ? 0.4 : 1 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
          {/* Step indicators */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <div onClick={() => !uploading && setCurrentStep(1)} style={{ flex: 1, height: 3, borderRadius: "var(--radius-full)", backgroundColor: currentStep >= 1 ? "var(--accent)" : "var(--border)", cursor: uploading ? "not-allowed" : "pointer", transition: "background-color 0.3s" }} />
            <div onClick={() => !uploading && setCurrentStep(2)} style={{ flex: 1, height: 3, borderRadius: "var(--radius-full)", backgroundColor: currentStep >= 2 ? "var(--accent)" : "var(--border)", cursor: uploading ? "not-allowed" : "pointer", transition: "background-color 0.3s" }} />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.7rem 1rem", borderRadius: 12, backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.85rem", marginBottom: "1rem" }}
              >
                <CircleAlert size={16} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 1: Details */}
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* Title & Description */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                    Video Details <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <input type="text" placeholder="Add a title that describes your video" className="input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={uploading} />
                    <textarea placeholder="Tell viewers about your video" className="input" value={description} onChange={(e) => setDescription(e.target.value)} disabled={uploading} rows={3} style={{ height: 80, padding: "0.75rem var(--sp-4)", resize: "vertical" }} />
                  </div>
                </div>

                {/* Category & Tags */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <FolderKanban size={14} /> Category
                      </div>
                    </label>
                    <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} disabled={uploading} style={{ height: 44, borderRadius: "var(--radius-md)", border: "1px solid var(--border)", backgroundColor: "var(--input)", color: "var(--text-primary)", width: "100%", padding: "0 var(--sp-4)", outline: "none" }}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <Tag size={14} /> Tags
                      </div>
                    </label>
                    <input type="text" placeholder="gaming, tutorial, music" className="input" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} disabled={uploading} />
                  </div>
                </div>

                {/* Visibility & Schedule */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.4rem" }}>Visibility</label>
                    <SegmentControl
                      options={[
                        { value: "public", label: "Public", icon: <Globe size={14} /> },
                        { value: "private", label: "Private", icon: <Lock size={14} /> },
                      ]}
                      value={isPublished}
                      onChange={setIsPublished}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <CalendarClock size={14} /> Schedule (optional)
                      </div>
                    </label>
                    <input type="datetime-local" className="input" value={scheduledAt} onChange={(e) => { setScheduledAt(e.target.value); if (e.target.value) setIsPublished("private"); }} disabled={uploading} />
                  </div>
                </div>

                {/* Chapters */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <Clock3 size={14} /> Chapters (optional)
                    </div>
                  </label>
                  <textarea
                    placeholder={`00:00 Introduction\n01:35 Topic One\n03:40 Demo`}
                    className="input" value={chaptersInput} onChange={(e) => setChaptersInput(e.target.value)}
                    disabled={uploading} rows={3}
                    style={{ fontFamily: "monospace", fontSize: "0.8rem", height: 80, padding: "0.75rem var(--sp-4)", resize: "vertical" }}
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>Format: MM:SS Title (one per line)</span>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" className="btn-primary" onClick={() => setCurrentStep(2)} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0 1.5rem", height: 44, fontSize: "0.9rem", borderRadius: 12 }}>
                    Next — Files
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Files & Upload */}
            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* Upload zones */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <DropZone
                    icon={<FileVideo size={32} />}
                    label="Video"
                    hint={`MP4, MOV, AVI (max ${MAX_VIDEO_MB} MB)`}
                    accept="video/*"
                    onChange={handleVideoSelect}
                    fileName={videoFile?.name || ""}
                    disabled={uploading}
                  />
                  <DropZone
                    icon={<Image size={32} />}
                    label="Thumbnail"
                    hint={`PNG, JPG, WEBP (max ${MAX_THUMBNAIL_MB} MB)`}
                    accept="image/*"
                    onChange={handleThumbnailSelect}
                    fileName={thumbnailFile?.name || ""}
                    preview={thumbnailPreview}
                    disabled={uploading}
                  />
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div style={{ backgroundColor: "var(--bg-secondary)", borderRadius: 16, padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FileVideo size={18} style={{ color: "var(--accent)" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{videoFile?.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {videoFile ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB` : ""}
                        </div>
                      </div>
                      {progress === 100 ? (
                        <CircleCheck size={20} style={{ color: "#22c55e", flexShrink: 0 }} />
                      ) : (
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent)", flexShrink: 0 }}>{progress}%</span>
                      )}
                    </div>
                    <div style={{ height: 6, backgroundColor: "var(--elevated)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3, ease: "easeOut" }}
                        style={{ height: "100%", background: progress === 100 ? "#22c55e" : "var(--accent)", borderRadius: "var(--radius-full)" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{progress < 100 ? "Uploading..." : "Processing..."}</span>
                      {progress < 100 && (
                        <button type="button" onClick={handleCancel} style={{ fontSize: "0.72rem", color: "var(--error)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {cancelled && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.7rem 1rem", backgroundColor: "var(--bg-secondary)", borderRadius: 12, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <span>Upload cancelled</span>
                    <button type="button" onClick={() => { setCancelled(false); setError(""); }} style={{ fontSize: "0.82rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Dismiss</button>
                  </div>
                )}

                {/* Navigation and Publish */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setCurrentStep(1)} disabled={uploading} className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", height: 44, padding: "0 1rem", borderRadius: 12, fontSize: "0.9rem" }}>
                    Back
                  </button>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button type="submit" disabled={uploading || !videoFile || !thumbnailFile}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0 1.5rem", height: 44,
                        fontSize: "0.9rem", fontWeight: 700, borderRadius: 12, border: "none",
                        cursor: (uploading || !videoFile || !thumbnailFile) ? "not-allowed" : "pointer",
                        opacity: (uploading || !videoFile || !thumbnailFile) ? 0.5 : 1,
                        background: uploading ? "var(--accent)" : "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                        color: "#fff", transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                    >
                      {uploading ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.7s linear infinite" }}>
                            <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
                            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                            <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
                            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>Publish Video</>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </motion.div>
  );
}
