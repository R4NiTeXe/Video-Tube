"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Playlist {
  _id: string;
  name: string;
  description: string;
  videos: { _id: string; thumbnail: string }[];
  createdAt: string;
}

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);

const PlaylistIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

export default function PlaylistsPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  const { data: response, isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: async () => {
      const res = await api.get(`/playlists/user/${user?._id}`);
      return res.data;
    },
    enabled: isAuthenticated && !!user?._id,
  });

  const createPlaylist = useMutation({
    mutationFn: async () => {
      const res = await api.post("/playlists", { name: newName.trim(), description: newDesc.trim() });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
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

  const playlists: Playlist[] = response?.data || [];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
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
          <span style={{ color: "var(--border-light)", fontSize: "1.2rem", fontWeight: 300 }}>/</span>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Playlists</span>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowCreate(!showCreate)}
          style={{ padding: "0.5rem 1.1rem", fontSize: "0.85rem", borderRadius: 99 }}
        >
          <PlusIcon /> New Playlist
        </button>
      </header>

      <div style={{ width: "100%", padding: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Your Playlists</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}
          </p>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              style={{ overflow: "hidden", marginBottom: "2rem" }}
            >
              <div className="form-card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>Create New Playlist</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Name</label>
                    <input
                      type="text"
                      placeholder="Playlist name..."
                      className="input-field"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Description</label>
                    <textarea
                      placeholder="Describe your playlist..."
                      className="input-field"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      rows={2}
                      style={{ resize: "vertical", fontFamily: "inherit" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                    <button className="btn-ghost" onClick={() => { setShowCreate(false); setNewName(""); setNewDesc(""); }} style={{ padding: "0.5rem 1.1rem", fontSize: "0.85rem" }}>
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => createPlaylist.mutate()}
                      disabled={!newName.trim() || createPlaylist.isPending}
                      style={{ padding: "0.5rem 1.4rem", fontSize: "0.85rem" }}
                    >
                      {createPlaylist.isPending ? "Creating..." : "Create"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 2rem" }}>
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)" }}>
              Loading playlists...
            </motion.div>
          </div>
        ) : playlists.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              backgroundColor: "var(--bg-elevated)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: "1.25rem", color: "var(--text-muted)",
            }}>
              <PlaylistIcon />
            </div>
            <p style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>No playlists yet</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Create your first playlist to organize your favorite videos.</p>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <PlusIcon /> Create your first playlist
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.25rem" }}>
            <AnimatePresence>
              {playlists.map((pl, i) => (
                <motion.div
                  key={pl._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/playlists/${pl._id}`} style={{ textDecoration: "none" }}>
                    <div
                      className="form-card"
                      style={{
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)"; }}
                    >
                      {/* Cover */}
                      <div style={{
                        width: "100%", height: 160,
                        backgroundColor: "var(--bg-elevated)",
                        position: "relative", overflow: "hidden",
                      }}>
                        {pl.videos.length > 0 && pl.videos[0].thumbnail ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={pl.videos[0].thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                            <PlaylistIcon />
                          </div>
                        )}
                        <div style={{
                          position: "absolute", bottom: 0, right: 0,
                          background: "rgba(0,0,0,0.75)", color: "#fff",
                          padding: "0.2rem 0.6rem", borderRadius: "6px 0 0 0",
                          fontSize: "0.75rem", fontWeight: 600,
                        }}>
                          {pl.videos.length} video{pl.videos.length !== 1 ? "s" : ""}
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ padding: "1rem 1.15rem" }}>
                        <h3 style={{
                          fontSize: "0.98rem", fontWeight: 700,
                          color: "var(--text-primary)",
                          marginBottom: "0.3rem",
                          display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden",
                        }}>
                          {pl.name}
                        </h3>
                        {pl.description && (
                          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {pl.description}
                          </p>
                        )}
                        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          Created {new Date(pl.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
