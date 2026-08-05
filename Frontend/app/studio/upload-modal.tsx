"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { api, getApiErrorMessage } from "@/src/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { useModalFocus } from "@/src/hooks/useModalFocus";
import {
  X,
  UploadCloud,
  Image,
  FileVideo,
  Globe,
  Lock,
  CalendarClock,
  Tag,
  CircleCheck,
  CircleAlert,
} from "lucide-react";

const CATEGORIES = [
  "General",
  "Gaming",
  "Music",
  "Education",
  "Entertainment",
  "Sports",
  "News",
  "Technology",
  "Science",
  "Travel",
  "Food",
  "Fashion",
  "Art",
  "Podcasts",
] as const;

const MAX_VIDEO_MB = 20;
const MAX_THUMBNAIL_MB = 2;
const MAX_TITLE_LENGTH = 100;
const MAX_DESC_LENGTH = 500;

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function DropZone({
  icon,
  label,
  hint,
  accept,
  onChange,
  fileName,
  preview,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  accept: string;
  onChange: (file: File) => void;
  fileName: string;
  preview?: string;
  disabled: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onChange(file);
    },
    [onChange],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        borderRadius: 16,
        border: `1.5px dashed ${dragging ? "var(--accent)" : "var(--border-hover)"}`,
        padding: "1.25rem 1rem",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        backgroundColor: dragging ? "rgba(255,59,48,0.06)" : "var(--surface)",
        transition: "all 0.2s",
        opacity: disabled ? 0.5 : 1,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
        }}
        disabled={disabled}
        style={{ display: "none" }}
      />
      {preview && label === "Thumbnail" ? (
        <img
          src={preview}
          alt="Preview"
          style={{
            width: "100%",
            maxHeight: 120,
            objectFit: "contain",
            borderRadius: 10,
            marginBottom: "0.5rem",
          }}
        />
      ) : (
        <div
          style={{
            color: dragging ? "var(--accent)" : "var(--text-muted)",
            marginBottom: "0.5rem",
            transition: "color 0.2s",
          }}
        >
          {icon}
        </div>
      )}
      {fileName ? (
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-primary)",
            fontWeight: 500,
            margin: 0,
            wordBreak: "break-all",
          }}
        >
          {fileName}
        </p>
      ) : (
        <>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-primary)",
              fontWeight: 500,
              margin: "0 0 0.2rem",
            }}
          >
            {label === "Video" ? "Choose Video" : "Choose Thumbnail"}
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
            {hint}
          </p>
        </>
      )}
    </div>
  );
}

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        padding: 0,
        backgroundColor: enabled ? "var(--accent)" : "var(--bg-tertiary)",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background-color 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: enabled ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

export default function UploadModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [isPublished, setIsPublished] = useState("public");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleTimezone, setScheduleTimezone] = useState(
    (typeof Intl !== "undefined" &&
      Intl.DateTimeFormat().resolvedOptions().timeZone) ||
      "UTC",
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleEscapeClose = useCallback(() => {
    if (!uploading) onClose();
  }, [uploading, onClose]);

  useModalFocus(modalRef, handleEscapeClose);

  useEffect(() => {
    return () => {
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [thumbnailPreview]);

  const handleVideoSelect = (file: File) => {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`Video size must be ${MAX_VIDEO_MB} MB or less`);
      return;
    }
    setVideoFile(file);
    setError("");
  };

  const handleThumbnailSelect = (file: File) => {
    if (file.size > MAX_THUMBNAIL_MB * 1024 * 1024) {
      setError(`Thumbnail size must be ${MAX_THUMBNAIL_MB} MB or less`);
      return;
    }
    setThumbnailFile(file);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleScheduleToggle = (v: boolean) => {
    setScheduleEnabled(v);
    if (v) {
      setIsPublished("private");
    } else {
      setScheduleDate("");
      setScheduleTime("");
      setIsPublished("public");
    }
  };

  const validate = () => {
    const errors: Record<string, boolean> = {};
    if (!videoFile) errors.video = true;
    if (!thumbnailFile) errors.thumbnail = true;
    if (!title.trim()) errors.title = true;
    if (!description.trim()) errors.description = true;
    setFieldErrors(errors);
    setTouchedFields({
      title: true,
      description: true,
      video: true,
      thumbnail: true,
    });
    if (Object.keys(errors).length > 0) {
      setError("Please fill in all required fields.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError("");

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("tags", tags.join(","));
    formData.append("category", category);
    formData.append("isPublished", String(isPublished === "public"));
    if (scheduleEnabled && scheduleDate && scheduleTime) {
      formData.append("scheduledAt", `${scheduleDate}T${scheduleTime}`);
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
          if (evt.total)
            setProgress(
              Math.min(Math.round((evt.loaded / evt.total) * 100), 100),
            );
        },
      });
      setProgress(100);
      setTimeout(onSuccess, 400);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setCancelled(true);
        setUploading(false);
        abortRef.current = null;
        return;
      }
      setError(getApiErrorMessage(err, "Upload failed. Please try again."));
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin-upload { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 720px) {
          .upload-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <motion.div
        ref={modalRef}
        tabIndex={-1}
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !uploading) onClose();
        }}
        style={{
          backdropFilter: "blur(6px)",
          backgroundColor: "rgba(0,0,0,0.7)",
        }}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: "min(92vw, 880px)",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "var(--bg-primary)",
            borderRadius: 24,
            border: "1px solid var(--border-hover)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-hover)",
              flexShrink: 0,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background:
                    "linear-gradient(135deg, rgba(255,59,48,0.2), rgba(255,59,48,0.05))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(255,59,48,0.15)",
                }}
              >
                <UploadCloud size={17} color="var(--accent)" />
              </div>
              <h2
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Upload Video
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={uploading}
              aria-label="Close upload modal"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "1px solid var(--border-hover)",
                background: "transparent",
                cursor: uploading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                opacity: uploading ? 0.4 : 1,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!uploading) {
                  e.currentTarget.style.background = "var(--elevated)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              <X size={18} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
              {/* Error Banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    role="alert"
                    aria-live="polite"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.7rem 1rem",
                      borderRadius: 12,
                      backgroundColor: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.15)",
                      color: "var(--error)",
                      fontSize: "0.85rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <CircleAlert size={16} />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Two-column layout */}
              <div
                className="upload-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 300px",
                  gap: "1.5rem",
                  alignItems: "start",
                }}
              >
                {/* Left Column: Form Fields */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  {/* Title */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.4rem",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Title <span style={{ color: "var(--accent)" }}>*</span>
                      </label>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {title.length}/{MAX_TITLE_LENGTH}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Add a title that describes your video"
                      value={title}
                      onChange={(e) => {
                        if (e.target.value.length <= MAX_TITLE_LENGTH)
                          setTitle(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, title: false }));
                      }}
                      disabled={uploading}
                      style={{
                        width: "100%",
                        height: 44,
                        padding: "0 1rem",
                        borderRadius: 12,
                        fontSize: "0.88rem",
                        border:
                          fieldErrors.title && touchedFields.title
                            ? "1.5px solid var(--error)"
                            : "1.5px solid var(--border-hover)",
                        backgroundColor: "var(--surface)",
                        color: "var(--text-primary)",
                        outline: "none",
                        transition: "border-color 0.15s",
                      }}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.4rem",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Description <span style={{ color: "var(--accent)" }}>*</span>
                      </label>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {description.length}/{MAX_DESC_LENGTH}
                      </span>
                    </div>
                    <textarea
                      placeholder="Tell viewers about your video"
                      value={description}
                      onChange={(e) => {
                        if (e.target.value.length <= MAX_DESC_LENGTH)
                          setDescription(e.target.value);
                        setFieldErrors((prev) => ({
                          ...prev,
                          description: false,
                        }));
                      }}
                      disabled={uploading}
                      rows={3}
                      style={{
                        width: "100%",
                        height: 80,
                        padding: "0.75rem 1rem",
                        borderRadius: 12,
                        fontSize: "0.88rem",
                        resize: "vertical",
                        border:
                          fieldErrors.description && touchedFields.description
                            ? "1.5px solid var(--error)"
                            : "1.5px solid var(--border-hover)",
                        backgroundColor: "var(--surface)",
                        color: "var(--text-primary)",
                        outline: "none",
                        fontFamily: "inherit",
                        transition: "border-color 0.15s",
                      }}
                    />
                  </div>

                  {/* Tags & Category */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          marginBottom: "0.4rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                          }}
                        >
                          <FileVideo size={14} color="var(--text-muted)" /> Category
                        </div>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        disabled={uploading}
                        style={{
                          width: "100%",
                          height: 44,
                          borderRadius: 12,
                          fontSize: "0.88rem",
                          border: "1.5px solid var(--border-hover)",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                          padding: "0 1rem",
                          outline: "none",
                          cursor: uploading ? "not-allowed" : "pointer",
                        }}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          marginBottom: "0.4rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                          }}
                        >
                          <Tag size={14} color="var(--text-muted)" /> Tags
                        </div>
                      </label>
                      <input
                        type="text"
                        placeholder="gaming, tutorial, music"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        disabled={uploading}
                        style={{
                          width: "100%",
                          height: 44,
                          padding: "0 1rem",
                          borderRadius: 12,
                          fontSize: "0.88rem",
                          border: "1.5px solid var(--border-hover)",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>

                  {/* Publish Settings Card */}
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid var(--border-hover)",
                      backgroundColor: "var(--surface)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "0.9rem 1.25rem",
                        borderBottom: "1px solid var(--border-hover)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <Globe size={15} color="var(--text-muted)" />
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Publish Settings
                      </span>
                    </div>

                    <div
                      style={{
                        padding: "1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.25rem",
                      }}
                    >
                      {/* Visibility */}
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            color: "var(--text-muted)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Visibility
                        </label>
                        <div
                          style={{
                            display: "flex",
                            backgroundColor: "var(--bg-primary)",
                            borderRadius: 12,
                            padding: 3,
                            gap: 2,
                            border: "1px solid var(--border-hover)",
                          }}
                        >
                          {[
                            {
                              value: "public",
                              label: "Public",
                              icon: <Globe size={14} />,
                            },
                            {
                              value: "private",
                              label: "Private",
                              icon: <Lock size={14} />,
                            },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setIsPublished(opt.value)}
                              disabled={
                                uploading ||
                                (scheduleEnabled && opt.value === "public")
                              }
                              style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.35rem",
                                padding: "0.55rem 0.75rem",
                                borderRadius: 10,
                                fontSize: "0.82rem",
                                fontWeight: 500,
                                border: "none",
                                cursor:
                                  uploading ||
                                  (scheduleEnabled && opt.value === "public")
                                    ? "not-allowed"
                                    : "pointer",
                                transition: "all 0.15s",
                                backgroundColor:
                                  isPublished === opt.value
                                    ? "var(--accent)"
                                    : "transparent",
                                color:
                                  isPublished === opt.value
                                    ? "#fff"
                                    : "var(--text-muted)",
                                opacity:
                                  uploading ||
                                  (scheduleEnabled && opt.value === "public")
                                    ? 0.4
                                    : 1,
                              }}
                            >
                              {opt.icon}
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Schedule */}
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <label
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 500,
                              color: "var(--text-muted)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                              }}
                            >
                              <CalendarClock size={14} /> Schedule
                            </div>
                          </label>
                          <Toggle
                            enabled={scheduleEnabled}
                            onChange={handleScheduleToggle}
                          />
                        </div>

                        <AnimatePresence>
                          {scheduleEnabled && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.6rem",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: "0.5rem",
                                }}
                              >
                                <div>
                                  <input
                                    type="date"
                                    value={scheduleDate}
                                    onChange={(e) =>
                                      setScheduleDate(e.target.value)
                                    }
                                    disabled={uploading}
                                    min={new Date().toISOString().split("T")[0]}
                                    style={{
                                      width: "100%",
                                      height: 40,
                                      padding: "0 0.75rem",
                                      borderRadius: 10,
                                      fontSize: "0.82rem",
                                      border: "1px solid var(--border-hover)",
                                      backgroundColor: "var(--bg-primary)",
                                      color: "var(--text-primary)",
                                      outline: "none",
                                      colorScheme: "dark",
                                    }}
                                  />
                                </div>
                                <div>
                                  <input
                                    type="time"
                                    value={scheduleTime}
                                    onChange={(e) =>
                                      setScheduleTime(e.target.value)
                                    }
                                    disabled={uploading}
                                    style={{
                                      width: "100%",
                                      height: 40,
                                      padding: "0 0.75rem",
                                      borderRadius: 10,
                                      fontSize: "0.82rem",
                                      border: "1px solid var(--border-hover)",
                                      backgroundColor: "var(--bg-primary)",
                                      color: "var(--text-primary)",
                                      outline: "none",
                                      colorScheme: "dark",
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <select
                                  value={scheduleTimezone}
                                  onChange={(e) =>
                                    setScheduleTimezone(e.target.value)
                                  }
                                  disabled={uploading}
                                  style={{
                                    width: "100%",
                                    height: 40,
                                    padding: "0 0.75rem",
                                    borderRadius: 10,
                                    fontSize: "0.82rem",
                                    border: "1px solid var(--border-hover)",
                                    backgroundColor: "var(--bg-primary)",
                                    color: "var(--text-primary)",
                                    outline: "none",
                                    cursor: uploading
                                      ? "not-allowed"
                                      : "pointer",
                                  }}
                                >
                                  {TIMEZONES.map((tz) => (
                                    <option key={tz} value={tz}>
                                      {tz.replace(/_/g, " ")}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Upload Zones */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    position: "sticky",
                    top: 0,
                  }}
                >
                  <DropZone
                    icon={<FileVideo size={28} />}
                    label="Video"
                    hint={`MP4, MOV, AVI (max ${MAX_VIDEO_MB} MB)`}
                    accept="video/*"
                    onChange={handleVideoSelect}
                    fileName={videoFile?.name || ""}
                    disabled={uploading}
                  />
                  <DropZone
                    icon={<Image size={28} />}
                    label="Thumbnail"
                    hint={`PNG, JPG, WEBP (max ${MAX_THUMBNAIL_MB} MB)`}
                    accept="image/*"
                    onChange={handleThumbnailSelect}
                    fileName={thumbnailFile?.name || ""}
                    preview={thumbnailPreview}
                    disabled={uploading}
                  />

                  {/* Upload Progress */}
                  {uploading && (
                    <div
                      aria-live="polite"
                      role="status"
                      style={{
                        borderRadius: 16,
                        border: "1px solid var(--border-hover)",
                        backgroundColor: "var(--surface)",
                        padding: "1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            backgroundColor: "rgba(255,59,48,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FileVideo size={17} color="var(--accent)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {videoFile?.name}
                          </div>
                          <div
                            style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                          >
                            {videoFile
                              ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB`
                              : ""}
                          </div>
                        </div>
                        {progress === 100 ? (
                          <CircleCheck
                            size={20}
                            color="var(--success)"
                            style={{ flexShrink: 0 }}
                          />
                        ) : (
                          <span
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: "var(--accent)",
                              flexShrink: 0,
                            }}
                          >
                            {progress}%
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          height: 6,
                          backgroundColor: "var(--bg-primary)",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          style={{
                            height: "100%",
                            background:
                              progress === 100
                                ? "var(--success)"
                                : "linear-gradient(90deg, var(--accent), var(--accent-hover))",
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "0.5rem",
                        }}
                      >
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {progress < 100 ? "Uploading..." : "Processing..."}
                        </span>
                        {progress < 100 && (
                          <button
                            type="button"
                            onClick={handleCancel}
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--error)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              textDecoration: "underline",
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {cancelled && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.7rem 1rem",
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border-hover)",
                        borderRadius: 12,
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      <span>Upload cancelled</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCancelled(false);
                          setError("");
                        }}
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--accent)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          textDecoration: "underline",
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: "0.75rem",
                padding: "1rem 1.5rem",
                borderTop: "1px solid var(--border-hover)",
                backgroundColor: "var(--bg-primary)",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  height: 42,
                  padding: "0 1.25rem",
                  borderRadius: 12,
                  fontSize: "0.88rem",
                  fontWeight: 500,
                  border: "1px solid var(--border-hover)",
                  backgroundColor: "transparent",
                  color: "var(--text-muted)",
                  cursor: uploading ? "not-allowed" : "pointer",
                  opacity: uploading ? 0.4 : 1,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.borderColor = "var(--text-placeholder)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-hover)";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !videoFile || !thumbnailFile}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0 1.5rem",
                  height: 42,
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  borderRadius: 12,
                  border: "none",
                  cursor:
                    uploading || !videoFile || !thumbnailFile
                      ? "not-allowed"
                      : "pointer",
                  opacity: uploading || !videoFile || !thumbnailFile ? 0.5 : 1,
                  background: uploading
                    ? "var(--accent)"
                    : "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                  color: "#fff",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!uploading)
                    e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                }}
              >
                {uploading ? (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      style={{ animation: "spin-upload 0.7s linear infinite" }}
                    >
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>Publish Video</>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </>
  );
}
