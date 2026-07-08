"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getApiErrorMessage } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import PageNavDropdown from "@/src/components/PageNavDropdown";

interface MyStream {
  _id: string;
  title: string;
  streamKey: string;
  isLive: boolean;
  viewerCount: number;
  totalViewers: number;
  category: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

const CATEGORIES = ["Just Chatting", "Gaming", "Music", "Education", "Entertainment", "Sports", "News", "Technology", "Science", "Travel", "Food", "Art"];

export default function StreamDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [myStream, setMyStream] = useState<MyStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Just Chatting");
  const [tags, setTags] = useState("");
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      api.get("/live/my-stream")
        .then((res) => setMyStream(res.data.data))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isAuthenticated]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await api.post("/live", { title, description, category, tags });
      setMyStream(res.data.data);
      setShowCreate(false);
      setTitle(""); setDescription(""); setTags("");
      setSuccess("Stream created! You can now go live.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create stream"));
    } finally {
      setCreating(false);
    }
  };

  const handleGoLive = async () => {
    if (!myStream) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await api.post(`/live/${myStream._id}/go-live`);
      setMyStream(res.data.data);
      setSuccess("You are now live!");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to go live"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndStream = async () => {
    if (!myStream) return;
    if (!confirm("Are you sure you want to end your stream?")) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await api.post(`/live/${myStream._id}/end`);
      setMyStream(res.data.data);
      setSuccess("Stream ended.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to end stream"));
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <header className="glass" style={{ position: "sticky", top: 0, zIndex: 50, padding: "0.75rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <PageNavDropdown />
          <span style={{ color: "var(--border)", fontSize: "1.2rem", fontWeight: 300 }}>/</span>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Stream Dashboard</span>
        </div>
      </header>

      <div style={{ width: "100%", padding: "2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.5rem" }}>Stream Dashboard</h1>

        {error && <div style={{ padding: "0.7rem 1rem", backgroundColor: "var(--accent-warm-light)", color: "var(--accent-warm)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid rgba(244,63,94,0.15)" }}>{error}</div>}
        {success && <div style={{ padding: "0.7rem 1rem", backgroundColor: "var(--accent-subtle)", color: "var(--accent)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid var(--border-focus)" }}>{success}</div>}

        {isLoading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
        ) : !myStream ? (
          <div className="form-card" style={{ padding: "2rem", maxWidth: 600 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>Start a New Stream</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>Create a stream to start broadcasting to your audience.</p>

            {!showCreate ? (
              <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ padding: "0.65rem 1.5rem", fontSize: "0.9rem" }}>
                Create Stream
              </button>
            ) : (
              <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Title</label>
                  <input type="text" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Stream title" required style={{ width: "100%", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Description</label>
                  <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will you be streaming?" rows={3} style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Category</label>
                  <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Tags (comma-separated)</label>
                  <input type="text" className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="gaming, fun, live" style={{ width: "100%", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setShowCreate(false)} style={{ padding: "0.65rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem", fontWeight: 600, backgroundColor: "var(--elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={creating} className="btn btn-primary" style={{ padding: "0.65rem 1.5rem", fontSize: "0.9rem" }}>
                    {creating ? "Creating..." : "Create Stream"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            {/* Stream Info Card */}
            <div className="form-card" style={{ padding: "1.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>Your Stream</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Title</p>
                  <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>{myStream.title}</p>
                </div>
                <div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Category</p>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{myStream.category}</p>
                </div>
                <div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Status</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: myStream.isLive ? "#FF3B30" : "var(--text-muted)" }} />
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: myStream.isLive ? "#FF3B30" : "var(--text-muted)" }}>
                      {myStream.isLive ? "LIVE" : "Offline"}
                    </span>
                    {myStream.isLive && <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>| {myStream.viewerCount} viewers</span>}
                  </div>
                </div>
                {myStream.startedAt && (
                  <div>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Started</p>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{new Date(myStream.startedAt).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Total Viewers</p>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{myStream.totalViewers}</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
                {myStream.isLive ? (
                  <>
                    <Link href={`/live/${myStream._id}`} style={{ padding: "0.65rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem", fontWeight: 600, backgroundColor: "var(--accent)", color: "white", textDecoration: "none", cursor: "pointer" }}>
                      View Stream
                    </Link>
                    <button onClick={handleEndStream} disabled={actionLoading} style={{ padding: "0.65rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem", fontWeight: 600, backgroundColor: "var(--accent-warm)", color: "white", border: "none", cursor: actionLoading ? "not-allowed" : "pointer" }}>
                      {actionLoading ? "Ending..." : "End Stream"}
                    </button>
                  </>
                ) : (
                  <button onClick={handleGoLive} disabled={actionLoading} className="btn btn-primary" style={{ padding: "0.65rem 1.5rem", fontSize: "0.9rem" }}>
                    {actionLoading ? "Starting..." : "Go Live"}
                  </button>
                )}
              </div>
            </div>

            {/* Stream Key Card */}
            <div className="form-card" style={{ padding: "1.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>Stream Key</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                Use this key in your streaming software (OBS, Streamlabs, etc.) to connect to your stream.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input type="text" className="input" value={myStream.streamKey} readOnly style={{ flex: 1, fontFamily: "monospace", fontSize: "0.85rem" }} />
                <button onClick={() => { navigator.clipboard.writeText(myStream.streamKey); setSuccess("Stream key copied!"); setTimeout(() => setSuccess(""), 2000); }} style={{ padding: "0.55rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 600, backgroundColor: "var(--elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer", whiteSpace: "nowrap" }}>
                  Copy
                </button>
              </div>
              <div style={{ marginTop: "1rem", padding: "0.75rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.4rem" }}>How to use:</p>
                <ol style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                  <li>Open OBS Studio or your streaming software</li>
                  <li>Go to Settings &gt; Stream</li>
                  <li>Set Service to &quot;Custom&quot;</li>
                  <li>Set Server to <code>rtmp://localhost:1935/live</code></li>
                  <li>Paste the stream key above</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
