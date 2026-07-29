"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Hls from "hls.js";
import { formatViews, timeAgo } from "@/src/lib/utils";
import { PageMeta } from "@/src/components/PageMeta";

import {
  CloseIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  ShareIcon,
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
  hlsUrl?: string;
  qualities?: { resolution: string; url: string; bitrate?: number }[];
  isShort?: boolean;
}

interface RelatedVideo {
  _id: string;
  title: string;
  thumbnail: string;
  duration: number;
  views: number;
  createdAt: string;
  likesCount: number;
  owner: { _id: string; fullName: string; username: string; avatar: string };
}

const forceHttps = (url?: string) => {
  if (!url) return url;
  return url.replace("http://", "https://");
};

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

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

const ThumbsUpIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
);
const ThumbsDownIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
);
const FlagIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
);
const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
);
const ReplyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
);
const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
);
const ReportModalIcon = () => (
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["comments", videoId] });
      const previousComments = queryClient.getQueryData(["comments", videoId]);
      queryClient.setQueryData(["comments", videoId], (old: any) => {
        if (!old?.data) return old;
        
        const updateCommentLikes = (commentsList: Comment[]) => {
          return commentsList.map(c => {
            if (c._id === comment._id) {
              const wasLiked = c.isLiked;
              return {
                ...c,
                isLiked: !wasLiked,
                likesCount: Math.max(0, (c.likesCount || 0) + (wasLiked ? -1 : 1))
              };
            }
            return c;
          });
        };
        
        return {
          ...old,
          data: {
            ...old.data,
            docs: updateCommentLikes(old.data.docs || [])
          }
        };
      });
      return { previousComments };
    },
    onError: (_err, _newLike, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(["comments", videoId], context.previousComments);
      }
    },
    onSettled: () => {
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
      <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", backgroundColor: "var(--accent-subtle)", flexShrink: 0, marginTop: "0.25rem" }}>
        {comment.owner?.avatar ? (
          <img src={comment.owner.avatar} alt={comment.owner.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 700 }}>
            {(comment.owner?.fullName?.[0] || "U").toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
          <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem" }}>
            {comment.owner?.fullName}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
            {timeAgo(comment.createdAt)}
          </span>
          {comment.isPinned && (
            <span style={{ fontSize: "0.7rem", backgroundColor: "var(--accent-subtle)", color: "var(--accent)", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
              Pinned
            </span>
          )}
        </div>

        {editing ? (
          <div style={{ marginTop: "0.5rem" }}>
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="input"
              style={{ width: "100%", fontSize: "0.9rem", padding: "0.5rem 0.75rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button onClick={() => setEditing(false)} className="btn btn-sm btn-ghost btn-pill">Cancel</button>
              <button onClick={() => editMutation.mutate()} disabled={editMutation.isPending} className="btn btn-sm btn-primary btn-pill">Save</button>
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.4, margin: "0.25rem 0 0.5rem" }}>
            {comment.content}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.25rem" }}>
          <button
            onClick={() => likeMutation.mutate()}
            className="btn btn-sm btn-ghost btn-pill"
            style={{ padding: "0.25rem 0.5rem", color: comment.isLiked ? "red" : "var(--text-muted)", transition: "color 0.2s" }}
            onMouseEnter={(e) => {
              if (!comment.isLiked) e.currentTarget.style.color = "red";
            }}
            onMouseLeave={(e) => {
              if (!comment.isLiked) e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <ThumbsUpIcon filled={!!comment.isLiked} />
            <span style={{ fontSize: "0.8rem", marginLeft: "0.25rem" }}>{formatViews(comment.likesCount || 0)}</span>
          </button>
          
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="btn btn-sm btn-ghost btn-pill"
            style={{ padding: "0.25rem 0.5rem", color: "var(--text-muted)", fontSize: "0.8rem" }}
          >
            Reply
          </button>
          
          {isOwner && (
            <>
              <button onClick={() => setEditing(true)} className="btn btn-sm btn-ghost btn-pill" style={{ padding: "0.25rem", color: "var(--text-muted)" }}>
                <EditIcon size={14} />
              </button>
              <button onClick={() => deleteMutation.mutate()} className="btn btn-sm btn-ghost btn-pill" style={{ padding: "0.25rem", color: "var(--error)" }}>
                <TrashIcon size={14} />
              </button>
            </>
          )}
        </div>

        {(comment.repliesCount ?? 0) > 0 && depth === 0 && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="btn btn-sm btn-ghost btn-pill"
            style={{ marginTop: "0.5rem", color: "var(--accent)", padding: "0.25rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            {showReplies ? <ChevronDownIcon /> : <ReplyIcon />}
            {showReplies ? "Hide replies" : `View ${comment.repliesCount} replies`}
          </button>
        )}

        <AnimatePresence>
          {showReplyForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: "0.5rem", overflow: "hidden" }}
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
                  style={{ flex: 1, fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
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
                <CommentItem key={reply._id} comment={reply} videoId={videoId} {...(currentUserId ? { currentUserId } : {})} depth={depth + 1} />
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoQuality, setVideoQuality] = useState("auto");
  const [videoSrc, setVideoSrc] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSwitchingQuality, setIsSwitchingQuality] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to store playback state during quality switch
  const savedTimeRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false);

  const [commentText, setCommentText] = useState("");
  const [showDescription, setShowDescription] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          if (videoRef.current) {
            if (videoRef.current.paused) videoRef.current.play();
            else videoRef.current.pause();
            setIsPlaying(!videoRef.current.paused);
          }
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
          }
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isSwitchingQuality) {
      const duration = videoRef.current.duration || 1;
      setProgress((videoRef.current.currentTime / duration) * 100);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (Number(e.target.value) / 100) * (videoRef.current?.duration || 0);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setProgress(Number(e.target.value));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      if (isMuted && volume === 0) setVolume(1);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    const fullscreenDocument = document as FullscreenDocument;
    if (!fullscreenDocument.fullscreenElement && !fullscreenDocument.webkitFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (fullscreenDocument.webkitExitFullscreen) {
        fullscreenDocument.webkitExitFullscreen();
      }
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500);
  };


  const { data: videoRes, isLoading: videoLoading } = useQuery({
    queryKey: ["video", videoId, isAuthenticated],
    queryFn: async () => {
      const res = await api.get(`/videos/${videoId}?recordView=true`);
      return res.data;
    },
    enabled: isAuthenticated && !!videoId,
  });

  const { data: commentsRes, isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", videoId, isAuthenticated],
    queryFn: async () => {
      const res = await api.get(`/comments/${videoId}`);
      return res.data;
    },
    enabled: isAuthenticated && !!videoId,
  });

  const { data: relatedRes, isLoading: relatedLoading } = useQuery({
    queryKey: ["relatedVideos", videoId, isAuthenticated],
    queryFn: async () => {
      const res = await api.get(`/videos/${videoId}/related?limit=8`);
      return res.data;
    },
    enabled: isAuthenticated && !!videoId,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/likes/toggle/v/${videoId}`);
    },
    onMutate: () => {
      const cached = queryClient.getQueryData<{ data: { isLiked: boolean; likesCount: number } }>(["video", videoId, isAuthenticated]);
      const wasLiked = cached?.data?.isLiked ?? liked;
      setLiked(!wasLiked);
      if (!wasLiked) setDisliked(false);

      queryClient.setQueryData(["video", videoId, isAuthenticated], (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, isLiked: !wasLiked, likesCount: Math.max(0, (old.data.likesCount ?? 0) + (wasLiked ? -1 : 1)) } };
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["video", videoId] });
    },
  });

  const handleDislike = () => {
    const newDisliked = !disliked;
    setDisliked(newDisliked);
    if (newDisliked && liked) {
      likeMutation.mutate();
    }
  };

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!video?.owner?._id) return;
      await api.post(`/subscriptions/c/${video.owner._id}`);
    },
    onMutate: () => {
      const cached = queryClient.getQueryData<{ data: { isSubscribed: boolean; owner: { subscribersCount: number } } }>(["video", videoId, isAuthenticated]);
      const wasSubscribed = cached?.data?.isSubscribed ?? isSubscribed;
      
      queryClient.setQueryData(["video", videoId, isAuthenticated], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            isSubscribed: !wasSubscribed,
            owner: {
              ...old.data.owner,
              subscribersCount: Math.max(0, (old.data.owner?.subscribersCount || 0) + (wasSubscribed ? -1 : 1)),
            },
          },
        };
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["video", videoId] });
    },
  });

  const postCommentMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/comments/${videoId}`, { content: commentText });
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
    },
  });

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
      setVideoSrc("");
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hlsRef.current = hls;
      hls.loadSource(video.hlsUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels.map((l: { height: number }, _i: number) => ({
          height: l.height,
          name: l.height >= 1080 ? "1080p" : l.height >= 720 ? "720p" : l.height >= 480 ? "480p" : l.height >= 360 ? "360p" : l.height >= 240 ? "240p" : "144p",
        }));
        setAvailableQualities(levels.map(l => l.name));
        const autoLevel = hls.autoLevelEnabled;
        setVideoQuality(autoLevel ? "auto" : levels[levels.length - 1]?.name || "auto");
      });

      hls.on(Hls.Events.ERROR, (_event: unknown, data: { type: string; fatal: boolean }) => {
        if (data.fatal) {
          hls.destroy();
          hlsRef.current = null;
          setVideoSrc(video.videoFile);
          if (video.qualities?.length) setAvailableQualities(video.qualities.map((q: any) => q.resolution));
        }
      });
    } else {
      setVideoSrc(video.videoFile);
      if (video.qualities?.length) setAvailableQualities(video.qualities.map((q: any) => q.resolution));
    }
  }, [videoRes?.data]);

  // Handle quality switching
  useEffect(() => {
    const video = videoRes?.data;
    if (!video || !videoRef.current) return;

    if (hlsRef.current) {
      const hls = hlsRef.current;
      if (videoQuality === "auto") {
        hls.currentLevel = -1;
      } else {
        const index = hls.levels.findIndex((l: { height: number }) => {
          const targetHeight = parseInt(videoQuality);
          return l.height === targetHeight;
        });
        if (index >= 0) hls.currentLevel = index;
      }
    } else if (video.qualities && video.qualities.length > 0) {
      // Fallback native URL switching for explicit qualities if HLS fails
      const newUrl = videoQuality === "auto" 
        ? video.videoFile 
        : (video.qualities.find((q: any) => q.resolution === videoQuality)?.url || video.videoFile);

      // Only switch if URL is different
      if (videoSrc !== newUrl) {
        savedTimeRef.current = videoRef.current.currentTime;
        wasPlayingRef.current = !videoRef.current.paused;
        setIsSwitchingQuality(true);
        setVideoSrc(newUrl);
      }
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

  
  const video: Video | undefined = videoRes?.data ? {
    ...videoRes.data,
    thumbnail: forceHttps(videoRes.data.thumbnail),
    videoFile: forceHttps(videoRes.data.videoFile),
    hlsUrl: forceHttps(videoRes.data.hlsUrl),
    qualities: videoRes.data.qualities?.map((q: any) => ({ ...q, url: forceHttps(q.url) })),
    owner: {
      ...videoRes.data.owner,
      avatar: forceHttps(videoRes.data.owner?.avatar)
    }
  } : undefined;
  
  const comments: Comment[] = commentsRes?.data?.docs || [];

  const isSubscribed = video?.isSubscribed ?? false;
  const relatedVideos: RelatedVideo[] = relatedRes?.data?.map((rv: any) => ({
    ...rv,
    thumbnail: forceHttps(rv.thumbnail),
    owner: { ...rv.owner, avatar: forceHttps(rv.owner?.avatar) }
  })) ?? [];
  const isShort = !!video?.isShort;

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
        <div className="video-page-wrap" style={{ width: "100%", maxWidth: theaterMode ? "100%" : 1280, margin: "0 auto", padding: "1.5rem 1rem" }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* VIDEO PLAYER CONTAINER */}
            <div
              ref={containerRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setShowControls(false)}
              style={{
                position: "relative",
                width: "100%",
                paddingTop: isShort ? "177.78%" : "56.25%",
                backgroundColor: "#000",
                borderRadius: isFullscreen ? 0 : "var(--radius-lg)",
                overflow: "hidden",
              }}
            >
              <video
                ref={videoRef}
                {...(videoSrc ? { src: videoSrc } : {})}
                poster={video.thumbnail}
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                onLoadedData={() => {
                  if (isSwitchingQuality && videoRef.current) {
                    videoRef.current.currentTime = savedTimeRef.current;
                    if (wasPlayingRef.current) {
                      videoRef.current.play().catch(() => {});
                      setIsPlaying(true);
                    }
                    setIsSwitchingQuality(false);
                  }
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
              
              <AnimatePresence>
                {showControls && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: "absolute",
                      bottom: 0, left: 0, right: 0,
                      background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                      padding: "1rem",
                      display: "flex", flexDirection: "column", gap: "0.5rem"
                    }}
                  >
                    <input 
                      type="range" min="0" max="100" value={progress} 
                      onChange={handleProgressChange}
                      style={{ width: "100%", cursor: "pointer", accentColor: "red" }} 
                    />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <button onClick={togglePlay} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
                          {isPlaying ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          )}
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <button onClick={toggleMute} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
                            {isMuted || volume === 0 ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                            )}
                          </button>
                          <input 
                            type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} 
                            onChange={handleVolumeChange}
                            style={{ width: 80, cursor: "pointer", accentColor: "white" }} 
                          />
                        </div>
                        <span style={{ color: "white", fontSize: "0.85rem", fontWeight: 500 }}>
                          {videoRef.current ? `${Math.floor(videoRef.current.currentTime / 60)}:${String(Math.floor(videoRef.current.currentTime % 60)).padStart(2, '0')} / ${Math.floor(videoRef.current.duration / 60 || 0)}:${String(Math.floor(videoRef.current.duration % 60 || 0)).padStart(2, '0')}` : "0:00 / 0:00"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ position: "relative" }}>
                          <button 
                            onClick={() => setShowQualityMenu(!showQualityMenu)} 
                            style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", borderRadius: "4px" }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            {videoQuality === "auto" ? "Auto" : videoQuality}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </button>
                          
                          <AnimatePresence>
                            {showQualityMenu && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                  position: "absolute",
                                  bottom: "100%",
                                  right: 0,
                                  marginBottom: "0.5rem",
                                  backgroundColor: "rgba(28,28,28,0.95)",
                                  borderRadius: "var(--radius-md)",
                                  padding: "0.5rem 0",
                                  minWidth: 120,
                                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  backdropFilter: "blur(10px)",
                                  zIndex: 50,
                                }}
                              >
                                <button
                                  onClick={() => { setVideoQuality("auto"); setShowQualityMenu(false); }}
                                  style={{ width: "100%", textAlign: "left", padding: "0.5rem 1rem", background: videoQuality === "auto" ? "rgba(255,255,255,0.1)" : "transparent", border: "none", color: videoQuality === "auto" ? "var(--accent)" : "white", cursor: "pointer", fontSize: "0.85rem", fontWeight: videoQuality === "auto" ? 600 : 400 }}
                                  onMouseEnter={(e) => { if (videoQuality !== "auto") e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
                                  onMouseLeave={(e) => { if (videoQuality !== "auto") e.currentTarget.style.backgroundColor = "transparent"; }}
                                >
                                  Auto
                                </button>
                                {availableQualities.map((q: string) => (
                                  <button
                                    key={q}
                                    onClick={() => { setVideoQuality(q); setShowQualityMenu(false); }}
                                    style={{ width: "100%", textAlign: "left", padding: "0.5rem 1rem", background: videoQuality === q ? "rgba(255,255,255,0.1)" : "transparent", border: "none", color: videoQuality === q ? "var(--accent)" : "white", cursor: "pointer", fontSize: "0.85rem", fontWeight: videoQuality === q ? 600 : 400 }}
                                    onMouseEnter={(e) => { if (videoQuality !== q) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
                                    onMouseLeave={(e) => { if (videoQuality !== q) e.currentTarget.style.backgroundColor = "transparent"; }}
                                  >
                                    {q}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <button onClick={toggleFullscreen} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* VIDEO METADATA & ACTIONS */}
            <div>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                {video.title}
              </h1>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                {/* CHANNEL INFO */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Link href={`/channel/${video.owner?.username}`}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", backgroundColor: "var(--accent-subtle)", flexShrink: 0 }}>
                      {video.owner?.avatar ? (
                        <img src={video.owner.avatar} alt={video.owner.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 700 }}>
                          {(video.owner?.fullName?.[0] || "U").toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div>
                    <Link href={`/channel/${video.owner?.username}`} style={{ textDecoration: "none" }}>
                      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                        {video.owner?.fullName || video.owner?.username}
                      </h3>
                    </Link>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                      {formatViews(video.owner?.subscribersCount || 0)} subscribers
                    </p>
                  </div>
                  {video.owner?._id !== user?._id && (
                    <button
                      onClick={() => subscribeMutation.mutate()}
                      disabled={subscribeMutation.isPending}
                      className={`btn ${isSubscribed ? "btn-secondary" : "btn-primary"} btn-pill`}
                      style={{ marginLeft: "0.5rem", padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600 }}
                    >
                      {isSubscribed ? "Subscribed" : "Subscribe"}
                    </button>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", backgroundColor: "var(--card)", borderRadius: "var(--radius-full)", border: "1px solid var(--border)" }}>
                    <button
                      onClick={() => likeMutation.mutate()}
                      className="btn btn-ghost btn-pill"
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "0.4rem", 
                        padding: "0.45rem 0.9rem", 
                        fontSize: "0.85rem", 
                        color: liked ? "red" : "var(--text-primary)",
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                      }}
                    >
                      <ThumbsUpIcon filled={liked} />
                      <span style={{ fontWeight: 600 }}>{formatViews(video.likesCount || 0)}</span>
                    </button>
                    <div style={{ width: 1, backgroundColor: "var(--border)", margin: "0.45rem 0" }} />
                    <button
                      onClick={handleDislike}
                      className="btn btn-ghost btn-pill"
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        padding: "0.45rem 0.9rem", 
                        color: disliked ? "red" : "var(--text-primary)",
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                      }}
                    >
                      <ThumbsDownIcon filled={disliked} />
                    </button>
                  </div>

                  <button
                    onClick={handleShare}
                    className="btn btn-secondary btn-pill"
                    style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem", fontSize: "0.85rem" }}
                  >
                    <ShareIcon />
                    <span>{copied ? "Copied!" : "Share"}</span>
                  </button>

                  <PlaylistDropdown videoId={videoId} ownerId={user?._id || ""} />

                  <button
                    onClick={() => setShowReportModal(true)}
                    className="btn btn-ghost btn-pill"
                    style={{ padding: "0.45rem", color: "var(--text-muted)" }}
                    title="Report video"
                  >
                    <FlagIcon />
                  </button>
                </div>
              </div>

              {/* DESCRIPTION BOX */}
              <div
                style={{
                  backgroundColor: "var(--card)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1rem",
                  border: "1px solid var(--border)",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
                onClick={() => setShowDescription(!showDescription)}
              >
                <div style={{ display: "flex", gap: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                  <span>{formatViews(video.views)} views</span>
                  <span>{timeAgo(video.createdAt)}</span>
                </div>
                <p style={{
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  display: showDescription ? "block" : "-webkit-box",
                  WebkitLineClamp: showDescription ? "unset" : 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  margin: 0,
                }}>
                  {video.description || "No description provided."}
                </p>
                <button style={{ background: "none", border: "none", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.8rem", marginTop: "0.5rem", cursor: "pointer", padding: 0 }}>
                  {showDescription ? "Show less" : "...more"}
                </button>
              </div>

              {/* COMMENTS SECTION */}
              <div style={{ marginTop: "2rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                  {comments.length} Comments
                </h3>

                {/* ADD COMMENT FORM */}
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", backgroundColor: "var(--accent-subtle)", flexShrink: 0 }}>
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 700 }}>
                        {(user?.fullName?.[0] || "U").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && commentText.trim()) postCommentMutation.mutate();
                      }}
                      className="input"
                      style={{ width: "100%", fontSize: "0.9rem", padding: "0.65rem 0.85rem" }}
                    />
                    {commentText.trim() && (
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <button onClick={() => setCommentText("")} className="btn btn-ghost btn-sm btn-pill">
                          Cancel
                        </button>
                        <button
                          onClick={() => postCommentMutation.mutate()}
                          disabled={postCommentMutation.isPending}
                          className="btn btn-primary btn-sm btn-pill"
                        >
                          {postCommentMutation.isPending ? "Posting..." : "Comment"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* COMMENT LIST */}
                {commentsLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="skeleton" style={{ height: 60, borderRadius: "var(--radius-md)" }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    {comments.map((comment) => (
                      <CommentItem
                        key={comment._id}
                        comment={comment}
                        videoId={videoId}
                        {...(user?._id ? { currentUserId: user._id } : {})}
                      />
                    ))}
                    {comments.length === 0 && (
                      <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0", fontSize: "0.9rem" }}>
                        No comments yet. Be the first to comment!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RELATED VIDEOS SIDEBAR */}
          <div className="video-page-sidebar" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--sp-2)" }}>
              {relatedLoading ? "Related Videos" : `Related Videos`}
            </h3>
            {relatedLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", gap: "var(--sp-3)" }}>
                    <div className="skeleton" style={{ width: 160, height: 90, borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                      <div className="skeleton" style={{ width: "90%", height: 14, borderRadius: 4 }} />
                      <div className="skeleton" style={{ width: "60%", height: 12, borderRadius: 4 }} />
                    </div>
                  </div>
                ))
              : relatedVideos.map((rv) => (
                  <Link
                    key={rv._id}
                    href={`/videos/${rv._id}`}
                    style={{ display: "flex", gap: "var(--sp-3)", textDecoration: "none" }}
                  >
                    <div style={{ width: 160, height: 90, borderRadius: "var(--radius-sm)", overflow: "hidden", flexShrink: 0, backgroundColor: "#000", position: "relative" }}>
                      {rv.thumbnail ? (
                        <img src={rv.thumbnail} alt={rv.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : null}
                      {rv.duration ? (
                        <div style={{ position: "absolute", bottom: 4, right: 4, backgroundColor: "rgba(0,0,0,0.8)", color: "#fff", fontSize: "0.72rem", padding: "1px 5px", borderRadius: 4 }}>
                          {Math.floor(rv.duration / 60)}:{String(Math.floor(rv.duration % 60)).padStart(2, "0")}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--sp-1)", minWidth: 0 }}>
                      <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", margin: 0, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {rv.title}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                        {rv.owner?.fullName || rv.owner?.username}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                        {formatViews(rv.views)} views
                      </p>
                    </div>
                  </Link>
                ))}
          </div>
        </div>

        <AnimatePresence>
          {showReportModal && <ReportModal videoId={videoId} onClose={() => setShowReportModal(false)} />}
        </AnimatePresence>
      </div>
    </>
  );
}
