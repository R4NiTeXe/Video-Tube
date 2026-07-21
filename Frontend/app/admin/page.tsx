"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageMeta } from "@/src/components/PageMeta";


interface PlatformStats {
  totalUsers: number;
  totalVideos: number;
  publishedVideos: number;
  totalComments: number;
  totalSubscriptions: number;
  totalLikes: number;
  totalPlaylists: number;
  totalReports: number;
  totalViews: number;
}

interface AdminUser {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar: string;
  role: string;
  createdAt: string;
}

interface AdminReport {
  _id: string;
  reporter: { _id: string; fullName: string; avatar: string; username: string };
  targetType: string;
  target: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
}

const statCards = [
  { key: "totalUsers", label: "Users", color: "var(--accent)" },
  { key: "totalVideos", label: "Videos", color: "var(--success)" },
  { key: "publishedVideos", label: "Published", color: "#3B82F6" },
  { key: "totalComments", label: "Comments", color: "#F59E0B" },
  { key: "totalSubscriptions", label: "Subscriptions", color: "#8B5CF6" },
  { key: "totalLikes", label: "Likes", color: "#EC4899" },
  { key: "totalPlaylists", label: "Playlists", color: "#14B8A6" },
  { key: "totalReports", label: "Reports", color: "var(--accent-warm)" },
  { key: "totalViews", label: "Views", format: true },
];

function formatCount(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toString();
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"stats" | "users" | "reports" | "activity">("stats");
  const [userQuery, setUserQuery] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [reportFilter, setReportFilter] = useState("pending");
  const [reportPage, setReportPage] = useState(1);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "admin")) router.push("/");
  }, [authLoading, isAuthenticated, user, router]);

  const { data: statsRes } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => { const res = await api.get("/admin/stats"); return res.data.data; },
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: usersRes } = useQuery({
    queryKey: ["admin-users", userQuery, userPage],
    queryFn: async () => { const res = await api.get(`/admin/users?page=${userPage}&limit=15${userQuery ? `&query=${userQuery}` : ""}`); return res.data.data; },
    enabled: isAuthenticated && user?.role === "admin" && tab === "users",
  });

  const { data: reportsRes } = useQuery({
    queryKey: ["admin-reports", reportFilter, reportPage],
    queryFn: async () => { const res = await api.get(`/admin/reports?page=${reportPage}&limit=15&status=${reportFilter}`); return res.data.data; },
    enabled: isAuthenticated && user?.role === "admin" && tab === "reports",
  });

  const { data: activityRes } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => { const res = await api.get("/admin/activity?limit=10"); return res.data.data; },
    enabled: isAuthenticated && user?.role === "admin" && tab === "activity",
  });

  const banMutation = useMutation({
    mutationFn: async (userId: string) => { await api.delete(`/admin/users/${userId}/ban`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); setActionMsg("User banned"); setTimeout(() => setActionMsg(""), 3000); },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => { await api.patch(`/admin/users/${userId}/role`, { role }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); setActionMsg("Role updated"); setTimeout(() => setActionMsg(""), 3000); },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => { await api.delete(`/admin/videos/${videoId}`); },
    onSuccess: () => { setActionMsg("Video deleted"); setTimeout(() => setActionMsg(""), 3000); },
  });

  const stats = statsRes as PlatformStats | undefined;
  const users = usersRes as { docs: AdminUser[]; totalDocs: number } | undefined;
  const reports = reportsRes as { docs: AdminReport[]; totalDocs: number } | undefined;

  if (authLoading) return <div style={{ display: "flex", justifyContent: "center", padding: "4rem", color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <PageMeta title="Admin Dashboard" description="VideoTube administration panel." noIndex />
      <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.3rem" }}>Admin Panel</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>Platform management & moderation</p>

      {actionMsg && (
        <div style={{ padding: "0.6rem 1rem", backgroundColor: "var(--success-subtle)", color: "var(--success)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem" }}>{actionMsg}</div>
      )}

      <div className="responsive-tabs" style={{ gap: "0.3rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
        {(["stats", "users", "reports", "activity"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setActionMsg(""); }}
            style={{ padding: "0.5rem 1.2rem", fontWeight: 600, fontSize: "0.85rem", color: tab === t ? "var(--accent)" : "var(--text-secondary)", background: "none", border: "none", borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent", cursor: "pointer", textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>

      {/* STATS */}
      {tab === "stats" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "0.75rem" }}>
          {statCards.map((s) => {
            const val = stats ? (stats as any)[s.key] : null;
            return (
              <div key={s.key} className="form-card" style={{ padding: "1.25rem" }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>{s.label}</p>
                <p style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color || "var(--text-primary)" }}>
                  {val !== null ? (s.format ? formatCount(val) : val.toLocaleString()) : "—"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* USERS */}
      {tab === "users" && (
        <div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <input value={userQuery} onChange={(e) => { setUserQuery(e.target.value); setUserPage(1); }} placeholder="Search users by name, email or username..." className="input" style={{ flex: 1 }} />
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })} className="btn btn-primary" style={{ borderRadius: "var(--radius-md)", padding: "0.5rem 1rem" }}>Search</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {users?.docs.map((u) => (
              <div key={u._id} className="form-card" style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <img src={u.avatar} alt={u.fullName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{u.fullName} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>@{u.username}</span></p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{u.email} · Role: {u.role} · Joined {new Date(u.createdAt).toLocaleDateString("en-GB")}</p>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                  {u.role === "user" ? (
                    <button onClick={() => roleMutation.mutate({ userId: u._id, role: "admin" })} style={{ fontSize: "0.75rem", padding: "0.35rem 0.7rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--accent-subtle)", color: "var(--accent)", border: "none", cursor: "pointer" }}>
                      Make Admin
                    </button>
                  ) : (
                    <button onClick={() => roleMutation.mutate({ userId: u._id, role: "user" })} style={{ fontSize: "0.75rem", padding: "0.35rem 0.7rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer" }}>
                      Remove Admin
                    </button>
                  )}
                  <button onClick={() => { if (confirm(`Ban ${u.fullName}? This will delete all their content.`)) banMutation.mutate(u._id); }} style={{ fontSize: "0.75rem", padding: "0.35rem 0.7rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--accent-warm-light)", color: "var(--accent-warm)", border: "none", cursor: "pointer" }}>
                    Ban
                  </button>
                </div>
              </div>
            ))}
          </div>
          {users && users.totalDocs > 15 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem" }}>
              <button disabled={userPage <= 1} onClick={() => setUserPage((p) => p - 1)} style={{ padding: "0.4rem 1rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: userPage <= 1 ? "not-allowed" : "pointer" }}>Previous</button>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", alignSelf: "center" }}>Page {userPage}</span>
              <button disabled={!users || userPage * 15 >= users.totalDocs} onClick={() => setUserPage((p) => p + 1)} style={{ padding: "0.4rem 1rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: !users || userPage * 15 >= users.totalDocs ? "not-allowed" : "pointer" }}>Next</button>
            </div>
          )}
        </div>
      )}

      {/* REPORTS */}
      {tab === "reports" && (
        <div>
          <div style={{ display: "flex", gap: "0.3rem", marginBottom: "1rem" }}>
            {["pending", "reviewed", "resolved", "dismissed"].map((s) => (
              <button key={s} onClick={() => { setReportFilter(s); setReportPage(1); }} style={{ padding: "0.4rem 0.9rem", fontSize: "0.78rem", fontWeight: 600, borderRadius: "var(--radius-sm)", backgroundColor: reportFilter === s ? "var(--accent)" : "var(--elevated)", color: reportFilter === s ? "#fff" : "var(--text-secondary)", border: "none", cursor: "pointer", textTransform: "capitalize" }}>
                {s}
              </button>
            ))}
          </div>
          {reports?.docs.length === 0 ? (
            <p style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>No {reportFilter} reports</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {reports?.docs.map((r) => (
                <div key={r._id} className="form-card" style={{ padding: "0.75rem 1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.3rem" }}>
                    <img src={r.reporter.avatar} alt={r.reporter.fullName} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>{r.reporter.fullName}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>reported a {r.targetType}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "auto" }}>{new Date(r.createdAt).toLocaleDateString("en-GB")}</span>
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.2rem" }}><strong>Reason:</strong> {r.reason.replace(/_/g, " ")}</p>
                  {r.description && <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{r.description}</p>}
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>Status: <span style={{ fontWeight: 600, color: r.status === "pending" ? "var(--accent-warm)" : r.status === "resolved" ? "var(--success)" : "var(--text-secondary)" }}>{r.status}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACTIVITY */}
      {tab === "activity" && (
        <div className="responsive-grid-2" style={{ gap: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>Recent Users</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {activityRes?.recentUsers?.map((u: any) => (
                <div key={u._id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                  <img src={u.avatar} alt={u.fullName} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                  <span style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 500 }}>{u.fullName}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "auto" }}>{new Date(u.createdAt).toLocaleDateString("en-GB")}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>Recent Videos</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {activityRes?.recentVideos?.map((v: any) => (
                <div key={v._id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ width: 40, height: 24, borderRadius: 4, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--elevated)" }}>
                    {v.thumbnail && <img src={v.thumbnail} alt={v.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</p>
                    <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{formatCount(v.views || 0)} views · {new Date(v.createdAt).toLocaleDateString("en-GB")}</p>
                  </div>
                  <button onClick={() => { if (confirm("Delete this video?")) deleteVideoMutation.mutate(v._id); }} style={{ marginLeft: "auto", fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--accent-warm-light)", color: "var(--accent-warm)", border: "none", cursor: "pointer", flexShrink: 0 }}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
