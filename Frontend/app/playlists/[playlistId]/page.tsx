"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatDuration, formatViews } from "@/src/lib/utils";
import { PageMeta } from "@/src/components/PageMeta";

interface Video {
  _id: string;
  title: string;
  thumbnail: string;
  duration: number;
  views: number;
  createdAt: string;
  owner: { _id: string; fullName: string; avatar: string };
}

interface PlaylistDetail {
  _id: string;
  name: string;
  description: string;
  owner: { _id: string; fullName: string };
  videos: Video[];
  createdAt: string;
}

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);


export default function PlaylistDetailPage() {
  const params = useParams();
  const playlistId = params.playlistId as string;
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  const { data: response, isLoading } = useQuery({
    queryKey: ["playlist", playlistId],
    queryFn: async () => {
      const res = await api.get(`/playlists/${playlistId}`);
      return res.data;
    },
    enabled: isAuthenticated && !!playlistId,
  });

  const updatePlaylist = useMutation({
    mutationFn: async () => {
      await api.patch(`/playlists/${playlistId}`, { name: editName.trim(), description: editDesc.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      setEditing(false);
    },
  });

  const deletePlaylist = useMutation({
    mutationFn: async () => {
      await api.delete(`/playlists/${playlistId}`);
    },
    onSuccess: () => {
      router.push("/playlists");
    },
  });

  const removeVideo = useMutation({
    mutationFn: async (videoId: string) => {
      await api.patch(`/playlists/remove/${videoId}/${playlistId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
    },
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
          Loading...
        </motion.div>
      </div>
    );
  }

  const playlist: PlaylistDetail | undefined = response?.data;
  const isOwner = playlist?.owner?._id === user?._id;

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)" }}>
          Loading playlist...
        </motion.div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Playlist not found</p>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>This playlist doesn&apos;t exist or has been removed.</p>
          <Link href="/playlists" className="btn btn-primary" style={{ borderRadius: 99, padding: "0.7rem 1.75rem" }}>Go to Playlists</Link>
        </div>
      </div>
    );
  }

  const videos: Video[] = playlist.videos || [];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <PageMeta title={playlist?.name || "Playlist"} description="View playlist on VideoTube." noIndex />
      <header
        className="glass"
        style={{
          position: "sticky", top: 0, zIndex: 50,
          padding: "0.75rem 2rem",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)", fontSize: "0.88rem", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
            <BackIcon /> Back
          </button>
          <span style={{ color: "var(--border)", fontSize: "1.2rem", fontWeight: 300 }}>/</span>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Playlist</span>
        </div>
        {isOwner && !editing && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              setEditName(playlist.name);
              setEditDesc(playlist.description);
              setEditing(true);
            }}
            style={{ padding: "0.45rem 1rem", fontSize: "0.82rem", borderRadius: 99, display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <EditIcon /> Edit
          </button>
        )}
      </header>

      <div style={{ width: "100%", padding: "2rem" }}>
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "2rem" }}>
          {editing ? (
            <div className="form-card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Name</label>
                  <input
                    type="text"
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Description</label>
                  <textarea
                    className="input"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    style={{ resize: "vertical", fontFamily: "inherit" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between" }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => { if (window.confirm("Delete this playlist? This cannot be undone.")) deletePlaylist.mutate(); }}
                    disabled={deletePlaylist.isPending}
                    style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", color: "var(--error)", borderColor: "var(--error)" }}
                  >
                    <TrashIcon /> {deletePlaylist.isPending ? "Deleting..." : "Delete Playlist"}
                  </button>
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <button className="btn btn-ghost" onClick={() => setEditing(false)} style={{ padding: "0.5rem 1.1rem", fontSize: "0.85rem" }}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => updatePlaylist.mutate()}
                      disabled={!editName.trim() || updatePlaylist.isPending}
                      style={{ padding: "0.5rem 1.4rem", fontSize: "0.85rem" }}
                    >
                      {updatePlaylist.isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{
                width: 180, height: 110, borderRadius: "var(--radius-lg)",
                backgroundColor: "var(--elevated)", overflow: "hidden", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid var(--border)",
              }}>
                {(() => {
                  const firstVideo = videos[0];
                  return firstVideo?.thumbnail ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={firstVideo.thumbnail} alt={firstVideo.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  );
                })()}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.3rem" }}>
                  {playlist.name}
                </h1>
                {playlist.description && (
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                    {playlist.description}
                  </p>
                )}
                <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  <span>{videos.length} video{videos.length !== 1 ? "s" : ""}</span>
                  <span>Created {new Date(playlist.createdAt).toLocaleDateString()}</span>
                  <span>By {playlist.owner.fullName}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Videos */}
        {videos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              backgroundColor: "var(--elevated)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: "1rem", color: "var(--text-muted)",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            </div>
            <p style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>No videos in this playlist</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Add videos from the home page to start building this playlist.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <AnimatePresence mode="popLayout">
              {videos.map((video, i) => (
                <motion.div
                  key={video._id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div
                    className="video-card-premium"
                    style={{
                      display: "flex", flexDirection: "row", alignItems: "center", gap: "1rem",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--card)",
                    }}
                  >
                    <Link href={`/videos/${video._id}`} style={{ flexShrink: 0, width: 180, position: "relative" }}>
                      <div style={{ width: "100%", paddingTop: "56.25%", borderRadius: "var(--radius-md)", overflow: "hidden", position: "relative" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={video.thumbnail} alt={video.title} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        <div className="duration-badge" style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.75)", color: "#fff", padding: "0.15rem 0.45rem", borderRadius: 4, fontSize: "0.7rem", fontWeight: 600 }}>
                          {formatDuration(video.duration)}
                        </div>
                      </div>
                    </Link>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/videos/${video._id}`} style={{ textDecoration: "none" }}>
                        <h2 style={{
                          fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)",
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                          marginBottom: "0.3rem",
                        }}>
                          {video.title}
                        </h2>
                      </Link>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        <span>{formatViews(video.views)} views</span>
                        <span>•</span>
                        <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {isOwner && (
                      <button
                        onClick={() => removeVideo.mutate(video._id)}
                        disabled={removeVideo.isPending}
                        title="Remove from playlist"
                        style={{
                          flexShrink: 0,
                          width: 34, height: 34, borderRadius: "50%",
                          backgroundColor: "transparent",
                          border: "1px solid var(--border)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--error-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--error)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--error)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                      >
                        <XIcon />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
