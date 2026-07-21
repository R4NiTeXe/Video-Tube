"use client";

import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/src/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { CloseIcon, ImageIcon, TrashIcon } from "@/src/components/icons";

const CATEGORIES = ["General", "Gaming", "Music", "Education", "Entertainment", "Sports", "News", "Technology", "Science", "Travel", "Food", "Fashion", "Art", "Podcasts"] as const;

export default function EditModal({ videoId, onClose, onSuccess }: { videoId: string; onClose: () => void; onSuccess: () => void }) {
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
