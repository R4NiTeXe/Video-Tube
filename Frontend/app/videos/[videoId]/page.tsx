"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VideoPoll from "@/src/components/VideoPoll";

// ── Types ──
interface VideoOwner {
  _id: string;
  fullName: string;
  username: string;
  avatar: string;
  subscribersCount?: number;
}

interface Chapter {
  _id: string;
  title: string;
  startTime: number;
  endTime: number;
}

interface Video {
  _id: string;
  title: string;
  description: string;
  videoFile: string;
  thumbnail: string;
  duration: number;
  views: number;
  likesCount: number;
  isPublished: boolean;
  owner: VideoOwner;
  createdAt: string;
  isSubscribed?: boolean;
  isLiked?: boolean;
  chapters?: Chapter[];
}

interface Comment {
  _id: string;
  content: string;
  likesCount: number;
  isLiked?: boolean;
  isPinned?: boolean;
  owner?: { _id: string; fullName: string; avatar: string };
  createdAt: string;
  repliesCount?: number;
  replyTo?: string;
}

interface Playlist {
  _id: string;
  name: string;
  description?: string;
  videos?: { _id: string }[];
  totalVideos?: number;
}

interface RelatedVideo {
  _id: string;
  title: string;
  thumbnail: string;
  duration: number;
  views: number;
  owner?: { fullName: string; avatar: string };
  createdAt: string;
}

// ── Utility Functions ──
const formatViews = (views: number): string => {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return views.toString();
};

const formatDuration = (sec: number): string => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s}`;
  return `${m}:${s}`;
};

const formatTimeAgo = (date: string): string => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

const formatFullDate = (date: string): string =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// ── SVG Icons ──
const PlayLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);
const ThumbsUpIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
);
const ThumbsDownIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
);
const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
);
const FlagIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
);
const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
);
const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const MaximizeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
);
const MinimizeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6m10-10h-6V4m0 6l7-7M3 21l7-7"/></svg>
);
const ReplyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
);
const PlaySmall = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const ReportModalIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

// ── Skeleton ──
const SkeletonVideoPage = () => (
  <div style={{ width: "100%", padding: "1.5rem 2rem", display: "flex", gap: "1.5rem" }}>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="skeleton" style={{ width: "100%", paddingTop: "56.25%", borderRadius: "var(--radius-lg)" }} />
      <div className="skeleton" style={{ width: "70%", height: 28, borderRadius: 8 }} />
      <div className="skeleton" style={{ width: "40%", height: 18, borderRadius: 6 }} />
      <div className="skeleton" style={{ width: "100%", height: 80, borderRadius: "var(--radius-md)" }} />
    </div>
    <div style={{ width: 380, display: "flex", flexDirection: "column", gap: "1rem" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: "0.75rem" }}>
          <div className="skeleton" style={{ width: 160, height: 90, borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div className="skeleton" style={{ width: "90%", height: 14, borderRadius: 4 }} />
            <div className="skeleton" style={{ width: "60%", height: 12, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Report Modal ──
const REPORT_REASONS = [
  { value: "spam", label: "Spam or misleading" },
  { value: "copyright", label: "Copyright infringement" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "adult", label: "Sexual or adult content" },
  { value: "violence", label: "Violence or graphic content" },
  { value: "other", label: "Other" },
];

function ReportModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const reportMutation = useMutation({
    mutationFn: async () => {
      await api.post("/reports", { targetId: videoId, targetType: "video", reason: selectedReason });
    },
    onSuccess: () => setSubmitted(true),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        style={{
          width: "100%", maxWidth: 480,
          borderRadius: "var(--radius-xl)", padding: "2rem",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-light)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {submitted ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "var(--success-light)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem", color: "var(--success)" }}>
              <CheckIcon />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Report Submitted</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>Thank you for helping keep our community safe.</p>
            <button onClick={onClose} className="btn-primary" style={{ borderRadius: 99 }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "var(--error-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--error)" }}>
                  <ReportModalIcon />
                </div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>Report Video</h2>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                <CloseIcon />
              </button>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>Why are you reporting this video?</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
                    border: `1.5px solid ${selectedReason === r.value ? "var(--accent)" : "var(--border-light)"}`,
                    backgroundColor: selectedReason === r.value ? "var(--accent-light)" : "transparent",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={selectedReason === r.value}
                    onChange={() => setSelectedReason(r.value)}
                    style={{ display: "none" }}
                  />
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${selectedReason === r.value ? "var(--accent)" : "var(--border-medium)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: selectedReason === r.value ? "var(--accent)" : "transparent",
                    transition: "all 0.2s",
                  }}>
                    {selectedReason === r.value && <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#fff" }} />}
                  </div>
                  <span style={{ fontSize: "0.9rem", color: selectedReason === r.value ? "var(--accent)" : "var(--text-primary)", fontWeight: selectedReason === r.value ? 600 : 400 }}>
                    {r.label}
                  </span>
                </label>
              ))}
            </div>

            <button
              className="btn-primary"
              disabled={!selectedReason || reportMutation.isPending}
              onClick={() => reportMutation.mutate()}
              style={{ width: "100%", borderRadius: 99 }}
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Playlist Dropdown ──
function PlaylistDropdown({ videoId, ownerId }: { videoId: string; ownerId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: playlistsRes } = useQuery({
    queryKey: ["playlists", ownerId],
    queryFn: async () => {
      const res = await api.get(`/playlists/user/${ownerId}`);
      return res.data;
    },
    enabled: open && !!ownerId,
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async (playlistId: string) => {
      await api.patch(`/playlists/add/${videoId}/${playlistId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists", ownerId] });
      setOpen(false);
    },
  });

  const createPlaylistMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/playlists", { name: newPlaylistName });
      return res.data;
    },
    onSuccess: (data) => {
      const playlistId = data?.data?._id;
      if (playlistId) {
        addToPlaylistMutation.mutate(playlistId);
      }
      setNewPlaylistName("");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["playlists", ownerId] });
    },
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const playlists: Playlist[] = playlistsRes?.data || [];

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost"
        style={{ borderRadius: 99, padding: "0.5rem 1rem", fontSize: "0.85rem" }}
      >
        <BookmarkIcon /> Save
        <ChevronDownIcon />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 100,
              width: 280, backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              padding: "0.5rem", overflow: "hidden",
            }}
          >
            <div style={{ padding: "0.5rem 0.75rem 0.75rem", borderBottom: "1px solid var(--border-light)", marginBottom: "0.25rem" }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>Save to playlist</p>
            </div>

            {playlists.map((pl) => (
              <button
                key={pl._id}
                onClick={() => addToPlaylistMutation.mutate(pl._id)}
                disabled={addToPlaylistMutation.isPending}
                style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  width: "100%", padding: "0.6rem 0.75rem",
                  borderRadius: "var(--radius-sm)", textAlign: "left",
                  fontSize: "0.85rem", color: "var(--text-primary)",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <BookmarkIcon filled />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.name}</p>
                  {pl.totalVideos !== undefined && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{pl.totalVideos} videos</p>
                  )}
                </div>
              </button>
            ))}

            {playlists.length === 0 && !showCreate && (
              <p style={{ padding: "0.75rem", fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center" }}>No playlists yet</p>
            )}

            <div style={{ borderTop: "1px solid var(--border-light)", marginTop: "0.25rem", paddingTop: "0.25rem" }}>
              {showCreate ? (
                <div style={{ padding: "0.5rem 0.75rem" }}>
                  <input
                    type="text"
                    placeholder="Playlist name"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newPlaylistName.trim()) createPlaylistMutation.mutate();
                    }}
                    className="input-field"
                    autoFocus
                    style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}
                  />
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <button
                      onClick={() => { setShowCreate(false); setNewPlaylistName(""); }}
                      className="btn-ghost"
                      style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem", borderRadius: 99 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => createPlaylistMutation.mutate()}
                      disabled={!newPlaylistName.trim() || createPlaylistMutation.isPending}
                      className="btn-primary"
                      style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem", borderRadius: 99 }}
                    >
                      Create
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreate(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    width: "100%", padding: "0.65rem 0.75rem",
                    fontSize: "0.85rem", fontWeight: 600, color: "var(--accent)",
                    textAlign: "left", borderRadius: "var(--radius-sm)",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <PlusIcon /> Create new playlist
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Comment Item ──
function CommentItem({
  comment,
  videoId,
  currentUserId,
  depth = 0,
}: {
  comment: Comment;
  videoId: string;
  currentUserId?: string;
  depth?: number;
}) {
  const queryClient = useQueryClient();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);

  const isOwner = currentUserId && comment.owner?._id === currentUserId;

  const likeMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/likes/toggle/c/${comment._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/comments/${comment._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/comments/${comment._id}`, { content: editText });
    },
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/comments/${videoId}`, { content: replyText, replyTo: comment._id });
    },
    onSuccess: () => {
      setReplyText("");
      setShowReplyForm(false);
      setShowReplies(true);
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
    },
  });

  const { data: repliesRes } = useQuery({
    queryKey: ["replies", comment._id],
    queryFn: async () => {
      const res = await api.get(`/comments/replies/${comment._id}`);
      return res.data;
    },
    enabled: showReplies && (comment.repliesCount ?? 0) > 0,
  });

  const replies: Comment[] = repliesRes?.data || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex", gap: "0.75rem",
        paddingLeft: depth > 0 ? "2.5rem" : 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={comment.owner?.avatar || ""}
        alt={comment.owner?.fullName || "User"}
        style={{ width: depth > 0 ? 32 : 40, height: depth > 0 ? 32 : 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {comment.owner?.fullName}
          </span>
          {comment.isPinned && (
            <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--accent)", backgroundColor: "var(--accent-light)", padding: "0.1rem 0.5rem", borderRadius: 99 }}>
              Pinned
            </span>
          )}
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {formatTimeAgo(comment.createdAt)}
          </span>
        </div>

        {/* Content */}
        {editing ? (
          <div style={{ marginBottom: "0.5rem" }}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="input-field"
              rows={2}
              style={{ fontSize: "0.88rem", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
              <button onClick={() => { setEditing(false); setEditText(comment.content); }} className="btn-ghost" style={{ padding: "0.3rem 0.75rem", fontSize: "0.78rem", borderRadius: 99 }}>Cancel</button>
              <button onClick={() => editMutation.mutate()} disabled={!editText.trim() || editMutation.isPending} className="btn-primary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.78rem", borderRadius: 99 }}>Save</button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{comment.content}</p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.4rem" }}>
          <button
            onClick={() => likeMutation.mutate()}
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              fontSize: "0.8rem", fontWeight: 500,
              color: comment.isLiked ? "var(--accent)" : "var(--text-muted)",
              background: "none", border: "none", cursor: "pointer",
              padding: "0.2rem 0.4rem", borderRadius: "var(--radius-sm)",
              transition: "all 0.15s",
            }}
          >
            <ThumbsUpIcon filled={comment.isLiked} />
            {comment.likesCount > 0 && comment.likesCount}
          </button>

          {depth === 0 && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              style={{
                display: "flex", alignItems: "center", gap: "0.3rem",
                fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)",
                background: "none", border: "none", cursor: "pointer",
                padding: "0.2rem 0.4rem", borderRadius: "var(--radius-sm)",
              }}
            >
              <ReplyIcon /> Reply
            </button>
          )}

          {isOwner && (
            <>
              <button
                onClick={() => setEditing(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.3rem",
                  fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "0.2rem 0.4rem", borderRadius: "var(--radius-sm)",
                }}
              >
                <EditIcon /> Edit
              </button>
              <button
                onClick={() => { if (window.confirm("Delete this comment?")) deleteMutation.mutate(); }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.3rem",
                  fontSize: "0.8rem", fontWeight: 500, color: "var(--error)",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "0.2rem 0.4rem", borderRadius: "var(--radius-sm)",
                }}
              >
                <TrashIcon /> Delete
              </button>
            </>
          )}
        </div>

        {/* Reply Form */}
        <AnimatePresence>
          {showReplyForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: "0.5rem", overflow: "hidden" }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="Reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && replyText.trim()) replyMutation.mutate();
                  }}
                  className="input-field"
                  autoFocus
                  style={{ flex: 1, fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}
                />
                <button
                  onClick={() => replyMutation.mutate()}
                  disabled={!replyText.trim() || replyMutation.isPending}
                  className="btn-primary"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", borderRadius: 99 }}
                >
                  Reply
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show Replies */}
        {depth === 0 && (comment.repliesCount ?? 0) > 0 && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              fontSize: "0.8rem", fontWeight: 600, color: "var(--accent)",
              background: "none", border: "none", cursor: "pointer",
              marginTop: "0.4rem", padding: "0.2rem 0",
            }}
          >
            <ChevronDownIcon />
            {showReplies ? "Hide" : "Show"} {comment.repliesCount} {comment.repliesCount === 1 ? "reply" : "replies"}
          </button>
        )}

        {/* Replies */}
        <AnimatePresence>
          {showReplies && replies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem", borderLeft: "2px solid var(--border-light)", paddingLeft: "0.75rem", overflow: "hidden" }}
            >
              {replies.map((reply) => (
                <CommentItem key={reply._id} comment={reply} videoId={videoId} currentUserId={currentUserId} depth={1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Main Page ──
export default function VideoPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const videoId = params.videoId as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [theaterMode, setTheaterMode] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  // Fetch video details
  const { data: videoRes, isLoading: videoLoading } = useQuery({
    queryKey: ["video", videoId],
    queryFn: async () => {
      const res = await api.get(`/videos/${videoId}`);
      return res.data;
    },
    enabled: isAuthenticated && !!videoId,
  });

  // Fetch comments
  const { data: commentsRes, isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", videoId],
    queryFn: async () => {
      const res = await api.get(`/comments/${videoId}`);
      return res.data;
    },
    enabled: isAuthenticated && !!videoId,
  });

  // Fetch related videos
  const { data: relatedRes, isLoading: relatedLoading } = useQuery({
    queryKey: ["related-videos", videoId],
    queryFn: async () => {
      const res = await api.get("/videos?limit=10&sortBy=views&sortType=desc");
      return res.data;
    },
    enabled: isAuthenticated && !!videoId,
  });

  // Sync liked state from video data
  useEffect(() => {
    if (videoRes?.data) {
      setLiked(!!videoRes.data.isLiked);
    }
  }, [videoRes?.data]);

  // Toggle like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/likes/toggle/v/${videoId}`);
    },
    onSuccess: () => {
      setLiked((prev) => !prev);
      if (liked) setDisliked(false);
      queryClient.invalidateQueries({ queryKey: ["video", videoId] });
    },
  });

  // Toggle subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!video?.owner?._id) return;
      await api.post(`/subscriptions/c/${video.owner._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video", videoId] });
    },
  });

  // Toggle watch later mutation
  const [savedToWatchLater, setSavedToWatchLater] = useState(false);
  const watchLaterMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/users/watch-later/${videoId}`);
    },
    onSuccess: () => {
      setSavedToWatchLater((prev) => !prev);
    },
  });

  // Post comment
  const postCommentMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/comments/${videoId}`, { content: commentText });
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
    },
  });

  // Copy URL to clipboard
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = window.location.href;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Loading / Auth states ──
  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ color: "var(--text-secondary)", fontWeight: 500, display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: 36, height: 36, border: "3px solid var(--border-light)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
          {authLoading ? "Checking session..." : "Redirecting to login..."}
        </motion.div>
      </div>
    );
  }

  if (videoLoading) return <SkeletonVideoPage />;

  const video: Video | undefined = videoRes?.data;
  const comments: Comment[] = commentsRes?.data?.docs || [];
  const relatedVideos: RelatedVideo[] = (relatedRes?.data?.docs || []).filter((v: RelatedVideo) => v._id !== videoId);

  if (!video) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)", padding: "2rem" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem", color: "var(--text-muted)" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Video not found</p>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>This video doesn&apos;t exist or has been removed.</p>
        <Link href="/" className="btn-primary" style={{ borderRadius: 99, padding: "0.7rem 1.75rem" }}>Go Home</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      {/* Sticky Header */}
      <header className="glass" style={{
        position: "sticky", top: 0, zIndex: 50,
        padding: "0.75rem 2rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)", fontSize: "0.88rem", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
            <BackIcon /> Back
          </button>
          <span style={{ color: "var(--border-light)", fontSize: "1.2rem", fontWeight: 300 }}>/</span>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Now Playing</span>
        </div>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <PlayLogo size={14} />
          </div>
          <span style={{ fontWeight: 800, fontSize: "1rem" }}>
            Video<span style={{ color: "var(--accent)" }}>Tube</span>
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <div style={{
        width: "100%",
        padding: "1.5rem 2rem",
        display: "flex",
        gap: "1.5rem",
        transition: "max-width 0.3s ease",
      }}>

        {/* Left Column: Player + Info + Comments */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Video Player */}
          <motion.div
            layout
            style={{
              width: "100%",
              backgroundColor: "#000",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              position: "relative",
              border: "1px solid var(--border-light)",
            }}
          >
            <video
              ref={videoRef}
              src={video.videoFile}
              controls
              autoPlay
              style={{ width: "100%", maxHeight: theaterMode ? "85vh" : "70vh", outline: "none", display: "block" }}
            />
            {/* Theater Mode Toggle */}
            <button
              onClick={() => setTheaterMode(!theaterMode)}
              style={{
                position: "absolute", top: "0.75rem", right: "0.75rem",
                width: 36, height: 36, borderRadius: "50%",
                backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
                border: "none", color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background-color 0.2s",
              }}
              title={theaterMode ? "Exit theater mode" : "Enter theater mode"}
            >
              {theaterMode ? <MinimizeIcon /> : <MaximizeIcon />}
            </button>
          </motion.div>

          {/* Video Title */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: "0.25rem" }}
            >
              {video.title}
            </motion.h1>
          </div>

          {/* Owner Info + Actions Bar */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: "1rem",
              paddingBottom: "1rem",
              borderBottom: "1px solid var(--border-light)",
            }}
          >
            {/* Left: Avatar + Name + Subscribe */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Link href={`/channel/${video.owner?.username}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={video.owner?.avatar}
                  alt={video.owner?.fullName}
                  style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-light)", transition: "border-color 0.2s" }}
                />
              </Link>
              <div>
                <Link href={`/channel/${video.owner?.username}`} style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", display: "block", transition: "color 0.2s" }}>
                  {video.owner?.fullName}
                </Link>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {formatViews(video.owner?.subscribersCount || 0)} subscribers
                </p>
              </div>
              {user?._id !== video.owner?._id && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "0.5rem" }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => subscribeMutation.mutate()}
                    disabled={subscribeMutation.isPending}
                    className={video.isSubscribed ? "btn-ghost" : "btn-primary"}
                    style={{
                      borderRadius: 99,
                      padding: "0.5rem 1.25rem",
                      fontSize: "0.85rem",
                      ...(video.isSubscribed
                        ? { backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }
                        : {}),
                    }}
                  >
                    {video.isSubscribed ? "Subscribed" : "Subscribe"}
                  </motion.button>
                  {video.isSubscribed && (
                    <button
                      title="Notification preferences"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border-light)", cursor: "pointer", color: "var(--text-muted)", transition: "all 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-light)"; }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
              {/* Like */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => likeMutation.mutate()}
                disabled={likeMutation.isPending}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.5rem 1rem", borderRadius: 99,
                  backgroundColor: liked ? "var(--accent-light)" : "var(--bg-elevated)",
                  border: `1.5px solid ${liked ? "var(--accent)" : "var(--border-light)"}`,
                  color: liked ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: 600, fontSize: "0.85rem",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <ThumbsUpIcon filled={liked} />
                {formatViews(video.likesCount)}
              </motion.button>

              {/* Dislike */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => { setDisliked(!disliked); if (!disliked) setLiked(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.5rem 1rem", borderRadius: 99,
                  backgroundColor: disliked ? "var(--bg-elevated)" : "var(--bg-elevated)",
                  border: `1.5px solid ${disliked ? "var(--text-muted)" : "var(--border-light)"}`,
                  color: disliked ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: 600, fontSize: "0.85rem",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <ThumbsDownIcon filled={disliked} />
              </motion.button>

              {/* Share */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleShare}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.5rem 1rem", borderRadius: 99,
                  backgroundColor: copied ? "var(--success-light)" : "var(--bg-elevated)",
                  border: `1.5px solid ${copied ? "var(--success)" : "var(--border-light)"}`,
                  color: copied ? "var(--success)" : "var(--text-secondary)",
                  fontWeight: 600, fontSize: "0.85rem",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {copied ? <CheckIcon /> : <ShareIcon />}
                {copied ? "Copied!" : "Share"}
              </motion.button>

              {/* Save to Playlist */}
              <PlaylistDropdown videoId={videoId} ownerId={user?._id || ""} />

              {/* Watch Later */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => watchLaterMutation.mutate()}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.5rem 1rem", borderRadius: 99,
                  backgroundColor: savedToWatchLater ? "var(--accent)" : "var(--bg-elevated)",
                  border: `1.5px solid ${savedToWatchLater ? "var(--accent)" : "var(--border-light)"}`,
                  color: savedToWatchLater ? "white" : "var(--text-secondary)",
                  fontWeight: 600, fontSize: "0.85rem",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <BookmarkIcon />
                {savedToWatchLater ? "Saved" : "Watch Later"}
              </motion.button>

              {/* Download */}
              {video?.videoFile && (
                <motion.a
                  whileTap={{ scale: 0.92 }}
                  href={video.videoFile}
                  download
                  target="_blank"
                  style={{
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    padding: "0.5rem 1rem", borderRadius: 99,
                    backgroundColor: "var(--bg-elevated)",
                    border: "1.5px solid var(--border-light)",
                    color: "var(--text-secondary)",
                    fontWeight: 600, fontSize: "0.85rem",
                    cursor: "pointer", transition: "all 0.2s",
                    textDecoration: "none",
                  }}
                >
                  <DownloadIcon /> Download
                </motion.a>
              )}

              {/* Report */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowReportModal(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.5rem 1rem", borderRadius: 99,
                  backgroundColor: "var(--bg-elevated)",
                  border: "1.5px solid var(--border-light)",
                  color: "var(--text-secondary)",
                  fontWeight: 600, fontSize: "0.85rem",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <FlagIcon /> Report
              </motion.button>
            </div>
          </motion.div>

          {/* Description Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass"
            style={{ padding: "1rem 1.25rem", borderRadius: "var(--radius-lg)", cursor: "pointer" }}
            onClick={() => setShowDescription(!showDescription)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: showDescription ? "0.75rem" : 0 }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {formatViews(video.views)} views &bull; {formatFullDate(video.createdAt)}
              </p>
              <motion.div animate={{ rotate: showDescription ? 180 : 0 }} style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
                <ChevronDownIcon />
              </motion.div>
            </div>
            <AnimatePresence>
              {showDescription && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {video.description || "No description provided."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Chapters */}
          {video.chapters && video.chapters.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={{
                padding: "1rem 1.25rem",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-light)",
              }}
            >
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>Chapters</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {video.chapters.map((ch) => (
                  <button
                    key={ch._id}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = ch.startTime;
                        videoRef.current.play();
                      }
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)",
                      fontSize: "0.85rem", color: "var(--text-primary)", textAlign: "left",
                      background: "none", border: "none", cursor: "pointer",
                      transition: "background-color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600, minWidth: 48 }}>
                      {formatDuration(ch.startTime)}
                    </span>
                    <span>{ch.title}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Polls Section */}
          <VideoPoll videoId={videoId} />

          {/* Comments Section */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ marginTop: "0.5rem" }}
          >
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
              {comments.length} Comments
            </h2>

            {/* Add Comment Form */}
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user?.avatar || ""}
                alt={user?.fullName || "Your avatar"}
                style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="Comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && commentText.trim()) postCommentMutation.mutate();
                  }}
                  className="input-field"
                  style={{ fontSize: "0.9rem" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem", opacity: commentText.trim() ? 1 : 0, transition: "opacity 0.2s" }}>
                  <button onClick={() => setCommentText("")} className="btn-ghost" style={{ padding: "0.4rem 1rem", fontSize: "0.82rem", borderRadius: 99 }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => postCommentMutation.mutate()}
                    disabled={!commentText.trim() || postCommentMutation.isPending}
                    className="btn-primary"
                    style={{ padding: "0.4rem 1rem", fontSize: "0.82rem", borderRadius: 99 }}
                  >
                    {postCommentMutation.isPending ? "Posting..." : "Comment"}
                  </button>
                </div>
              </div>
            </div>

            {/* Comments List */}
            {commentsLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.75rem" }}>
                    <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ width: "30%", height: 14, borderRadius: 4, marginBottom: "0.5rem" }} />
                      <div className="skeleton" style={{ width: "80%", height: 14, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {comments.map((comment) => (
                  <CommentItem
                    key={comment._id}
                    comment={comment}
                    videoId={videoId}
                    currentUserId={user?._id}
                  />
                ))}
                {comments.length === 0 && (
                  <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0", fontSize: "0.9rem" }}>
                    No comments yet. Be the first to comment!
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Sidebar: Related Videos */}
        <div style={{ width: 380, flexShrink: 0 }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
            Related Videos
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {relatedLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: "0.75rem" }}>
                  <div className="skeleton" style={{ width: 160, height: 90, borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem", paddingTop: "0.25rem" }}>
                    <div className="skeleton" style={{ width: "90%", height: 14, borderRadius: 4 }} />
                    <div className="skeleton" style={{ width: "60%", height: 12, borderRadius: 4 }} />
                    <div className="skeleton" style={{ width: "40%", height: 12, borderRadius: 4 }} />
                  </div>
                </div>
              ))
            ) : (
              relatedVideos.map((rv) => (
                <Link
                  key={rv._id}
                  href={`/videos/${rv._id}`}
                  style={{
                    display: "flex", gap: "0.75rem",
                    padding: "0.4rem", borderRadius: "var(--radius-md)",
                    textDecoration: "none", color: "inherit",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {/* Thumbnail */}
                  <div style={{ position: "relative", width: 160, height: 90, borderRadius: "var(--radius-sm)", overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-elevated)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={rv.thumbnail} alt={rv.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <span style={{
                      position: "absolute", bottom: 4, right: 4,
                      backgroundColor: "rgba(0,0,0,0.75)", color: "#fff",
                      padding: "0.1rem 0.4rem", borderRadius: 4,
                      fontSize: "0.7rem", fontWeight: 600,
                    }}>
                      {formatDuration(rv.duration)}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, paddingTop: "0.15rem" }}>
                    <p style={{
                      fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      overflow: "hidden", lineHeight: 1.3, marginBottom: "0.3rem",
                    }}>
                      {rv.title}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.15rem" }}>
                      {rv.owner?.fullName}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {formatViews(rv.views)} views &bull; {formatTimeAgo(rv.createdAt)}
                    </p>
                  </div>
                </Link>
              ))
            )}

            {!relatedLoading && relatedVideos.length === 0 && (
              <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No related videos found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && <ReportModal videoId={videoId} onClose={() => setShowReportModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
