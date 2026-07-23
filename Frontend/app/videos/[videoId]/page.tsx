"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Hls from "hls.js";
import { formatViews } from "@/src/lib/utils";
import { PageMeta } from "@/src/components/PageMeta";

import {
  CloseIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  ShareIcon,
  SettingsIcon,
} from "@/src/components/icons";


interface VideoOwner {
  _id: string;
  fullName: string;
  username: string;
  avatar: string;
  subscribersCount?: number;
  isSubscribed?: boolean;
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

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
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

const formatTime = (sec: number): string => {
  if (!sec || !isFinite(sec)) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s}`;
  return `${m}:${s}`;
};


const ThumbsUpIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
);
const ThumbsDownIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
);
const FlagIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
);
const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
);const ReplyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
);const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
);const ReportModalIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);


const SkeletonVideoPage = () => (
  <div style={{ width: "100%", padding: "var(--sp-6) var(--sp-8)", display: "flex", gap: "var(--sp-6)" }}>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <div className="skeleton" style={{ width: "100%", paddingTop: "56.25%", borderRadius: "var(--radius-lg)" }} />
      <div className="skeleton" style={{ width: "70%", height: 28, borderRadius: 8 }} />
      <div className="skeleton" style={{ width: "40%", height: 18, borderRadius: 6 }} />
      <div className="skeleton" style={{ width: "100%", height: 80, borderRadius: "var(--radius-md)" }} />
    </div>
    <div style={{ width: 380, display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: "var(--sp-3)" }}>
          <div className="skeleton" style={{ width: 160, height: 90, borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
            <div className="skeleton" style={{ width: "90%", height: 14, borderRadius: 4 }} />
            <div className="skeleton" style={{ width: "60%", height: 12, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);


const REPORT_REASONS = [
  { value: "spam", label: "Spam or misleading" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "nudity", label: "Sexual or adult content" },
  { value: "violence", label: "Violence or graphic content" },
  { value: "misinformation", label: "Misinformation" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "copyright", label: "Copyright infringement" },
  { value: "other", label: "Other" },
];

function ReportModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prevFocused = document.activeElement as HTMLElement | null;
    const focusable = modalRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])");
    focusable?.focus();
    return () => {
      prevFocused?.focus();
    };
  }, []);

  const reportMutation = useMutation({
    mutationFn: async () => {
      await api.post("/reports", { target: videoId, targetType: "video", reason: selectedReason, description: selectedReason });
    },
    onSuccess: () => setSubmitted(true),
  });

  return (
    <motion.div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
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
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {submitted ? (
          <div style={{ textAlign: "center", padding: "var(--sp-8) 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "var(--success-subtle)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--sp-4)", color: "var(--success)" }}>
              <CheckIcon size={16} />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--sp-2)" }}>Report Submitted</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "var(--sp-6)" }}>Thank you for helping keep our community safe.</p>
            <button onClick={onClose} className="btn btn-primary btn-pill">Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-6)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "var(--error-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--error)" }}>
                  <ReportModalIcon />
                </div>
                <h2 id="report-modal-title" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>Report Video</h2>
              </div>
              <button aria-label="Close" onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                <CloseIcon size={16} />
              </button>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>Why are you reporting this video?</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", marginBottom: "var(--sp-6)" }}>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--sp-3)",
                    padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
                    border: `1.5px solid ${selectedReason === r.value ? "var(--accent)" : "var(--border)"}`,
                    backgroundColor: selectedReason === r.value ? "var(--accent-subtle)" : "transparent",
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
              className="btn btn-primary btn-pill"
              style={{ width: "100%" }}
              disabled={!selectedReason || reportMutation.isPending}
              onClick={() => reportMutation.mutate()}
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}


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
    const handler = (e: Event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const playlists: Playlist[] = playlistsRes?.data || [];

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-sm btn-ghost btn-pill"
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
              width: 280, backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              padding: "0.5rem", overflow: "hidden",
            }}
          >
            <div style={{ padding: "0.5rem 0.75rem 0.75rem", borderBottom: "1px solid var(--border)", marginBottom: "var(--sp-1)" }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>Save to playlist</p>
            </div>

            {playlists.map((pl) => (
              <button
                key={pl._id}
                onClick={() => addToPlaylistMutation.mutate(pl._id)}
                disabled={addToPlaylistMutation.isPending}
                style={{
                  display: "flex", alignItems: "center", gap: "var(--sp-3)",
                  width: "100%", padding: "0.6rem 0.75rem",
                  borderRadius: "var(--radius-sm)", textAlign: "left",
                  fontSize: "0.85rem", color: "var(--text-primary)",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--elevated)")}
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
              <p style={{ padding: "var(--sp-3)", fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center" }}>No playlists yet</p>
            )}

            <div style={{ borderTop: "1px solid var(--border)", marginTop: "0.25rem", paddingTop: "0.25rem" }}>
              {showCreate ? (
                <div style={{ padding: "var(--sp-2) var(--sp-3)" }}>
                  <input
                    type="text"
                    placeholder="Playlist name"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newPlaylistName.trim()) createPlaylistMutation.mutate();
                    }}
                    className="input"
                    autoFocus
                    style={{ fontSize: "0.85rem", padding: "var(--sp-2) var(--sp-3)" }}
                  />
                  <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
                    <button
                      onClick={() => { setShowCreate(false); setNewPlaylistName(""); }}
                      className="btn btn-sm btn-ghost btn-pill"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => createPlaylistMutation.mutate()}
                      disabled={!newPlaylistName.trim() || createPlaylistMutation.isPending}
                      className="btn btn-sm btn-primary btn-pill"
                      style={{ flex: 1 }}
                    >
                      Create
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreate(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--sp-3)",
                    width: "100%", padding: "0.65rem 0.75rem",
                    fontSize: "0.85rem", fontWeight: 600, color: "var(--accent)",
                    textAlign: "left", borderRadius: "var(--radius-sm)",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--elevated)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <PlusIcon size={16} /> Create new playlist
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


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
      await api.delete(`/comments/c/${comment._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/comments/c/${comment._id}`, { content: editText });
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
        display: "flex", gap: "var(--sp-3)",
        paddingLeft: depth > 0 ? "2.5rem" : 0,
      }}
    >
      
        <AnimatePresence>
          {showReplyForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: "var(--sp-2)", overflow: "hidden" }}
            >
              <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                <input
                  type="text"
                  placeholder="Reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && replyText.trim()) replyMutation.mutate();
                  }}
                  className="input"
                  autoFocus
                  style={{ flex: 1, fontSize: "0.85rem", padding: "var(--sp-2) var(--sp-3)" }}
                />
                <button
                  onClick={() => replyMutation.mutate()}
                  disabled={!replyText.trim() || replyMutation.isPending}
                  className="btn btn-sm btn-primary btn-pill"
                >
                  Reply
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        
        <AnimatePresence>
          {showReplies && replies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: "var(--sp-3)", display: "flex", flexDirection: "column", gap: "var(--sp-3)", borderLeft: "2px solid var(--border)", paddingLeft: "var(--sp-3)", overflow: "hidden" }}
            >
              {replies.map((reply) => (
                <CommentItem key={reply._id} comment={reply} videoId={videoId} {...(currentUserId ? { currentUserId } : {})} depth={1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}


export default function VideoPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const videoId = params.videoId as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [theaterMode, _setTheaterMode] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bellActive, setBellActive] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [videoQuality, setVideoQuality] = useState("auto");
  const [videoSrc, setVideoSrc] = useState("");
  const [buffering, setBuffering] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<{ height: number; name: string }[]>([]);
  const [hoveredChapter, setHoveredChapter] = useState<Chapter | null>(null);
  const [showChapterTooltip, setShowChapterTooltip] = useState(false);
  const findChapterAtMouse = (e: React.MouseEvent) => {
    if (!videoRef.current || duration <= 0) return;
    const bar = e.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const timeAtMouse = pct * duration;
    const chapters = video?.chapters;
    if (!chapters?.length) return;
    let closest: Chapter | null = null;
    for (const ch of chapters) {
      if (ch.startTime <= timeAtMouse) closest = ch;
    }
    setHoveredChapter(closest);
    setShowChapterTooltip(true);
  };
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  // Fetch video details
  const { data: videoRes, isLoading: videoLoading } = useQuery({
    queryKey: ["video", videoId, isAuthenticated],
    queryFn: async () => {
      const res = await api.get(`/videos/${videoId}?recordView=true`);
      return res.data;
    },
    enabled: isAuthenticated && !!videoId,
  });

  // Fetch comments
  const { data: commentsRes, isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", videoId, isAuthenticated],
    queryFn: async () => {
      const res = await api.get(`/comments/${videoId}`);
      return res.data;
    },
    enabled: isAuthenticated && !!videoId,
  });

  // Fetch related videos
  const { data: relatedRes, isLoading: relatedLoading } = useQuery({
    queryKey: ["related-videos", videoId, isAuthenticated],
    queryFn: async () => {
      const res = await api.get(`/videos/${videoId}/related`);
      return res.data;
    },
    enabled: isAuthenticated && !!videoId,
  });

  // Fetch channel notification status
  const ownerId = videoRes?.data?.owner?._id;
  const { data: channelNotifRes } = useQuery({
    queryKey: ["channel-notifications", ownerId],
    queryFn: async () => {
      const res = await api.get(`/subscriptions/c/${ownerId}/notifications`);
      return res.data;
    },
    enabled: isAuthenticated && !!ownerId,
  });

  const channelMuted: boolean = channelNotifRes?.data?.isMuted ?? false;

  // Toggle channel notifications mutation
  const toggleNotifMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/subscriptions/c/${ownerId}/notifications`);
    },
    onMutate: () => {
      queryClient.setQueryData(["channel-notifications", ownerId], (old: { data?: { isMuted?: boolean } } | undefined) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, isMuted: !old.data.isMuted } };
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-notifications", ownerId] });
    },
  });

  // Toggle like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/likes/toggle/v/${videoId}`);
    },
    onMutate: () => {
      const cached = queryClient.getQueryData<{ data: { isLiked: boolean; likesCount: number } }>(["video", videoId]);
      const wasLiked = cached?.data?.isLiked ?? liked;
      setLiked(!wasLiked);
      if (wasLiked) setDisliked(false);
      queryClient.setQueryData(["video", videoId], (old: { data?: { isLiked?: boolean; likesCount?: number } } | undefined) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, isLiked: !wasLiked, likesCount: (old.data.likesCount ?? 0) + (wasLiked ? -1 : 1) } };
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["video", videoId] });
    },
  });

  // Toggle subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!video?.owner?._id) return;
      await api.post(`/subscriptions/c/${video.owner._id}`);
    },
    onMutate: () => {
      const cached = queryClient.getQueryData<{ data: { owner: { isSubscribed: boolean; subscribersCount: number } } }>(["video", videoId]);
      const wasSubscribed = cached?.data?.owner?.isSubscribed ?? isSubscribed;
      queryClient.setQueryData(["video", videoId], (old: Record<string, unknown> | undefined) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            owner: {
              ...(old.data as Record<string, unknown>).owner as Record<string, unknown>,
              isSubscribed: !wasSubscribed,
              subscribersCount: (((old.data as Record<string, unknown>).owner as Record<string, unknown>)?.subscribersCount as number || 0) + (wasSubscribed ? -1 : 1),
            },
          },
        };
      });
    },
    onError: () => {
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

  useEffect(() => {
    if (!videoRes?.data || !videoRef.current) return;

    const video = videoRes.data;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (video.hlsUrl && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(video.hlsUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels.map((l: { height: number }, _i: number) => ({
          height: l.height,
          name: l.height >= 1080 ? "1080p" : l.height >= 720 ? "720p" : l.height >= 480 ? "480p" : l.height >= 360 ? "360p" : l.height >= 240 ? "240p" : "144p",
        }));
        setAvailableQualities(levels);
        const autoLevel = hls.autoLevelEnabled;
        setVideoQuality(autoLevel ? "auto" : levels[levels.length - 1]?.name || "auto");
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event: unknown, data: { level: number }) => {
        const level = hls.levels[data.level];
        if (level) {
          const name = level.height >= 1080 ? "1080p" : level.height >= 720 ? "720p" : level.height >= 480 ? "480p" : level.height >= 360 ? "360p" : level.height >= 240 ? "240p" : "144p";
          setVideoQuality(name);
        }
      });

      hls.on(Hls.Events.ERROR, (_event: unknown, data: { type: string; fatal: boolean }) => {
        if (data.fatal) {
          hls.destroy();
          hlsRef.current = null;
          setVideoSrc(video.videoFile);
        }
      });
    } else {
      setVideoSrc(video.videoFile);
    }
  }, [videoRes?.data]);

  useEffect(() => {
    if (!hlsRef.current || videoQuality === "auto") return;
    const hls = hlsRef.current;
    const index = hls.levels.findIndex((l: { height: number }) => {
      const targetHeight = parseInt(videoQuality);
      return l.height === targetHeight;
    });
    if (index >= 0) {
      hls.currentLevel = index;
    }
  }, [videoQuality]);

  useEffect(() => {
    const isFullscreen = () => {
      const fullscreenDocument = document as FullscreenDocument;
      return !!(fullscreenDocument.fullscreenElement || fullscreenDocument.webkitFullscreenElement);
    };
    const onFsChange = () => setIsFullscreen(isFullscreen());
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  useEffect(() => {
    if (videoRes?.data) {
      setLiked(!!videoRes.data.isLiked);
    }
  }, [videoRes?.data?.isLiked]);

  
  const video: Video | undefined = videoRes?.data;
  const comments: Comment[] = commentsRes?.data?.docs || [];
  const relatedVideos: RelatedVideo[] = (relatedRes?.data || []).filter((v: RelatedVideo) => v._id !== videoId);
  const isSubscribed = video?.owner?.isSubscribed ?? false;

  const videoJsonLd = (() => {
    if (!video) return undefined;
    return {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: video.title,
      description: video.description?.slice(0, 200),
      thumbnailUrl: video.thumbnail,
      uploadDate: video.createdAt,
      duration: video.duration ? `PT${Math.floor(video.duration / 60)}M${Math.floor(video.duration % 60)}S` : undefined,
      author: {
        "@type": "Person",
        name: video.owner?.fullName,
      },
    };
  })();

  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ color: "var(--text-secondary)", fontWeight: 500, display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-4)" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
          {authLoading ? "Checking session..." : "Redirecting to login..."}
        </motion.div>
      </div>
    );
  }

  if (videoLoading) return <SkeletonVideoPage />;

  if (!video) {
    return (
      <div className="empty-state">
        <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "var(--elevated)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--sp-6)", color: "var(--text-muted)" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--sp-2)" }}>Video not found</p>
        <p style={{ color: "var(--text-muted)", marginBottom: "var(--sp-6)", fontSize: "0.9rem" }}>This video doesn&apos;t exist or has been removed.</p>
        <Link href="/" className="btn btn-primary btn-pill">Go Home</Link>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={video.title}
        description={video.description?.slice(0, 160)}
        ogImage={video.thumbnail}
        ogType="video.other"
        {...(typeof window !== "undefined" ? { ogUrl: window.location.href } : {})}
        {...(videoJsonLd ? { jsonLd: videoJsonLd } : {})}
      />
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>

      <div className="video-page-wrap content-padding" style={{
        width: "100%",
        transition: "max-width 0.3s ease",
      }}>

        
                {video?.chapters?.map((ch) => {
                  const pct = duration > 0 ? (ch.startTime / duration) * 100 : 0;
                  return (
                    <div
                      key={ch._id}
                      title={ch.title}
                      style={{
                        position: "absolute", left: `${pct}%`, top: 0,
                        width: 2, height: "100%",
                        backgroundColor: "rgba(255,255,255,0.6)",
                        zIndex: 2, pointerEvents: "none",
                      }}
                    />
                  );
                })}
                
                  <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", fontWeight: 500, fontFamily: "monospace" }}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                
                  <button onClick={() => {
                    const el = containerRef.current;
                    if (!el) return;
                    const fullscreenDocument = document as FullscreenDocument;
                    if (fullscreenDocument.fullscreenElement || fullscreenDocument.webkitFullscreenElement) {
                      if (document.exitFullscreen) { void document.exitFullscreen(); }
                      else { void fullscreenDocument.webkitExitFullscreen?.(); }
                    } else {
                      if (el.requestFullscreen) { void el.requestFullscreen(); }
                      else { void (el as FullscreenElement).webkitRequestFullscreen?.(); }
                    }
                  }}
                    aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", padding: "0.25rem", display: "flex", alignItems: "center" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                  </button>
                </div>
              </div>
            </div>
            )}
          </motion.div>

          
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", flexWrap: "wrap" }}>
              
            {commentsLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", gap: "var(--sp-3)" }}>
                    <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ width: "30%", height: 14, borderRadius: 4, marginBottom: "var(--sp-2)" }} />
                      <div className="skeleton" style={{ width: "80%", height: 14, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
                {comments.map((comment) => (
                  <CommentItem
                    key={comment._id}
                    comment={comment}
                    videoId={videoId}
                    {...(user?._id ? { currentUserId: user._id } : {})}
                  />
                ))}
                {comments.length === 0 && (
                  <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "var(--sp-8) 0", fontSize: "0.9rem" }}>
                    No comments yet. Be the first to comment!
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>

        
      <AnimatePresence>
        {showReportModal && <ReportModal videoId={videoId} onClose={() => setShowReportModal(false)} />}
      </AnimatePresence>
    </div>
    </>
  );
}
