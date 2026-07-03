"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──
interface Report {
  _id: string;
  reporter: { _id: string; fullName: string; avatar: string } | null;
  reportedUser?: { _id: string; fullName: string; avatar: string } | null;
  reportedVideo?: { _id: string; title: string; thumbnail: string } | null;
  targetType: string;
  targetId: string;
  reason: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: string;
}

interface UserResult {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar: string;
  createdAt: string;
}

// ── SVG Icons ──
const PlayLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);
const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const VideoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
);
const FlagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);

// ── Stat Card ──
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: "1.5rem",
        borderRadius: "var(--radius-lg)",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-light)",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        backgroundColor: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
        <p style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>{value}</p>
      </div>
    </motion.div>
  );
}

// ── Status Badge ──
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "var(--accent-warm-light)", color: "var(--accent-warm)", label: "Pending" },
    reviewed: { bg: "var(--accent-light)", color: "var(--accent)", label: "Reviewed" },
    resolved: { bg: "var(--success-light, #dcfce7)", color: "var(--success, #16a34a)", label: "Resolved" },
  };
  const c = config[status] || config.pending;
  return (
    <span style={{
      padding: "0.2rem 0.6rem",
      borderRadius: "2rem",
      fontSize: "0.72rem",
      fontWeight: 600,
      backgroundColor: c.bg,
      color: c.color,
    }}>
      {c.label}
    </span>
  );
}

// ── Main Page ──
export default function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  // Fetch users count
  const { data: usersRes, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await api.get("/users/search?query=");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // Fetch videos count
  const { data: videosRes, isLoading: videosLoading } = useQuery({
    queryKey: ["admin-videos"],
    queryFn: async () => {
      const res = await api.get("/videos?limit=1&sortBy=createdAt&sortType=desc");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // Fetch reports
  const { data: reportsRes, isLoading: reportsLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const res = await api.get("/reports");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // Update report status
  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      await api.patch(`/reports/${reportId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    },
  });

  // Search users
  const { data: searchUsersRes, isLoading: searchUsersLoading } = useQuery({
    queryKey: ["admin-search-users", searchQuery],
    queryFn: async () => {
      const res = await api.get(`/users/search?query=${encodeURIComponent(searchQuery)}`);
      return res.data;
    },
    enabled: isAuthenticated && searchQuery.length > 0,
  });

  // Loading / Auth states
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

  // Admin check
  if (user?.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)", padding: "2rem" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "var(--accent-warm-light)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem", color: "var(--accent-warm)" }}>
          <ShieldIcon />
        </div>
        <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Access Denied</p>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.9rem", textAlign: "center", maxWidth: 400 }}>You do not have admin privileges to access this page. Contact an administrator if you believe this is an error.</p>
        <Link href="/" className="btn-primary" style={{ borderRadius: 99, padding: "0.7rem 1.75rem" }}>Go Home</Link>
      </div>
    );
  }

  const totalUsers = usersRes?.data?.length ?? 0;
  const totalVideos = videosRes?.data?.total ?? 0;
  const reports: Report[] = reportsRes?.data || [];
  const filteredReports = statusFilter === "all" ? reports : reports.filter((r) => r.status === statusFilter);
  const searchedUsers: UserResult[] = searchUsersRes?.data || [];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      {/* Sticky Header */}
      <header
        className="glass"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "0.75rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "none",
          borderLeft: "none",
          borderRight: "none",
          borderRadius: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)", fontSize: "0.88rem", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
            <BackIcon /> Back
          </button>
          <span style={{ color: "var(--border-light)", fontSize: "1.2rem", fontWeight: 300 }}>/</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--accent-warm)", fontWeight: 600, fontSize: "0.9rem" }}>
            <ShieldIcon /> Admin Panel
          </div>
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

      <div style={{ width: "100%", padding: "2rem" }}>
        {/* Page Title */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
            Admin Panel
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Manage users, videos, and reports</p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          <StatCard
            label="Total Users"
            value={usersLoading ? 0 : totalUsers}
            color="var(--accent-light)"
            icon={<UsersIcon />}
          />
          <StatCard
            label="Total Videos"
            value={videosLoading ? 0 : totalVideos}
            color="var(--accent-warm-light)"
            icon={<VideoIcon />}
          />
          <StatCard
            label="Total Reports"
            value={reports.length}
            color="var(--accent-warm-light)"
            icon={<FlagIcon />}
          />
        </div>

        {/* Reports Management */}
        <div style={{ marginBottom: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>Reports Management</h2>

            {/* Status Filter Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="btn-ghost"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem",
                  borderRadius: 99,
                }}
              >
                {statusFilter === "all" ? "All Reports" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                <ChevronDownIcon />
              </button>
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      zIndex: 100,
                      width: 180,
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border-light)",
                      borderRadius: "var(--radius-lg)",
                      boxShadow: "var(--shadow-lg)",
                      padding: "0.35rem",
                      overflow: "hidden",
                    }}
                  >
                    {["all", "pending", "reviewed", "resolved"].map((s) => (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setDropdownOpen(false); }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          width: "100%",
                          padding: "0.55rem 0.75rem",
                          borderRadius: "var(--radius-sm)",
                          textAlign: "left",
                          fontSize: "0.85rem",
                          fontWeight: statusFilter === s ? 600 : 400,
                          color: statusFilter === s ? "var(--accent)" : "var(--text-primary)",
                          backgroundColor: statusFilter === s ? "var(--accent-light)" : "transparent",
                          transition: "background-color 0.15s",
                          border: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { if (statusFilter !== s) e.currentTarget.style.backgroundColor = "var(--bg-elevated)"; }}
                        onMouseLeave={(e) => { if (statusFilter !== s) e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        {s === "all" ? "All Reports" : s.charAt(0).toUpperCase() + s.slice(1)}
                        {statusFilter === s && <CheckIcon />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Reports Table */}
          <div style={{
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-light)",
          }}>
            {reportsLoading ? (
              <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)" }}>
                  Loading reports...
                </motion.div>
              </div>
            ) : filteredReports.length === 0 ? (
              <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-light)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                  color: "var(--accent)",
                }}>
                  <FlagIcon />
                </div>
                <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                  {statusFilter === "all" ? "No reports yet" : `No ${statusFilter} reports`}
                </p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {statusFilter === "all" ? "When users report content, it will appear here." : "Try a different filter."}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-light)", backgroundColor: "var(--bg-elevated)" }}>
                      <th style={{ padding: "0.85rem 1rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reporter</th>
                      <th style={{ padding: "0.85rem 1rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Target</th>
                      <th style={{ padding: "0.85rem 1rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reason</th>
                      <th style={{ padding: "0.85rem 1rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</th>
                      <th style={{ padding: "0.85rem 1rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</th>
                      <th style={{ padding: "0.85rem 1rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr
                        key={report._id}
                        style={{ borderBottom: "1px solid var(--border-light)", transition: "background-color 0.15s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
                      >
                        {/* Reporter */}
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={report.reporter?.avatar || ""}
                              alt={report.reporter?.fullName || "User"}
                              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                            />
                            <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                              {report.reporter?.fullName || "Unknown"}
                            </span>
                          </div>
                        </td>

                        {/* Target */}
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {report.targetType === "video" && report.reportedVideo ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={report.reportedVideo.thumbnail}
                                  alt={report.reportedVideo.title}
                                  style={{ width: 48, height: 28, objectFit: "cover", borderRadius: "var(--radius-sm)" }}
                                />
                                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {report.reportedVideo.title}
                                </span>
                              </div>
                            ) : report.targetType === "user" && report.reportedUser ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={report.reportedUser.avatar}
                                  alt={report.reportedUser.fullName}
                                  style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                                />
                                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{report.reportedUser.fullName}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{report.targetType}: {report.targetId.slice(0, 8)}...</span>
                            )}
                          </div>
                        </td>

                        {/* Reason */}
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", textTransform: "capitalize" }}>{report.reason}</span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <StatusBadge status={report.status} />
                        </td>

                        {/* Date */}
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            {report.targetType === "video" && report.reportedVideo && (
                              <Link
                                href={`/videos/${report.targetId}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 32,
                                  height: 32,
                                  borderRadius: "var(--radius-sm)",
                                  color: "var(--text-muted)",
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
                                title="View video"
                              >
                                <EyeIcon />
                              </Link>
                            )}
                            {report.status !== "reviewed" && (
                              <button
                                onClick={() => updateReportMutation.mutate({ reportId: report._id, status: "reviewed" })}
                                disabled={updateReportMutation.isPending}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 32,
                                  height: 32,
                                  borderRadius: "var(--radius-sm)",
                                  color: "var(--accent)",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--accent-light)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                title="Mark as reviewed"
                              >
                                <CheckIcon />
                              </button>
                            )}
                            {report.status !== "resolved" && (
                              <button
                                onClick={() => updateReportMutation.mutate({ reportId: report._id, status: "resolved" })}
                                disabled={updateReportMutation.isPending}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 32,
                                  height: 32,
                                  borderRadius: "var(--radius-sm)",
                                  color: "var(--success, #16a34a)",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--success-light, #dcfce7)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                title="Mark as resolved"
                              >
                                <XIcon />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* User Management */}
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>User Management</h2>

          <div
            className="glass"
            style={{
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
            }}
          >
            {/* Search Bar */}
            <div style={{ position: "relative", marginBottom: "1.25rem" }}>
              <div style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
              }}>
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search users by name or username..."
                className="input-field"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: "2.75rem",
                  width: "100%",
                }}
              />
            </div>

            {/* Users List */}
            {searchQuery.length === 0 ? (
              <div style={{ padding: "3rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
                <UsersIcon />
                <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>Type a name or username to search for users.</p>
              </div>
            ) : searchUsersLoading ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)" }}>
                  Searching...
                </motion.div>
              </div>
            ) : searchedUsers.length === 0 ? (
              <div style={{ padding: "3rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
                <p style={{ fontSize: "0.9rem" }}>No users found matching &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <AnimatePresence mode="popLayout">
                  {searchedUsers.map((u) => (
                    <motion.div
                      key={u._id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "0.85rem 1rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-light)",
                        transition: "background-color 0.15s",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u.avatar}
                        alt={u.fullName}
                        style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-light)" }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>{u.fullName}</p>
                        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>@{u.username}</p>
                      </div>
                      <Link
                        href={`/channel/${u.username}`}
                        className="btn-ghost"
                        style={{ padding: "0.4rem 0.85rem", fontSize: "0.78rem", borderRadius: 99 }}
                      >
                        View Channel
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
