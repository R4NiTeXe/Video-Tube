"use client";

import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PageNavDropdown from "@/src/components/PageNavDropdown";

interface Notification {
  _id: string;
  sender: { _id: string; fullName: string; avatar: string } | null;
  message: string;
  video: { _id: string; thumbnail: string; title: string } | null;
  isRead: boolean;
  createdAt: string;
}

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);

const BellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
);

const CheckAllIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
);

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  const { data: response, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.patch("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/read/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
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

  const notifications: Notification[] = response?.data?.notifications || [];
  const hasUnread = notifications.some((n) => !n.isRead);

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
          <PageNavDropdown />
          <span style={{ color: "var(--border-light)", fontSize: "1.2rem", fontWeight: 300 }}>/</span>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Notifications</span>
        </div>
      </header>

      <div style={{ width: "100%", padding: "1.5rem 2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            backgroundColor: "var(--accent-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--accent)",
          }}>
            <BellIcon />
          </div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>Notifications</h1>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 2rem" }}>
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)" }}>
              Loading notifications...
            </motion.div>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              backgroundColor: "var(--bg-elevated)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: "1.25rem", color: "var(--text-muted)",
            }}>
              <BellIcon />
            </div>
            <p style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>No notifications yet</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>When someone interacts with your content, you&apos;ll see it here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <AnimatePresence mode="popLayout">
              {notifications.map((n) => (
                <motion.div
                  key={n._id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate(n._id);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "1rem",
                    padding: "1rem 1.25rem",
                    borderRadius: "var(--radius-lg)",
                    backgroundColor: n.isRead ? "transparent" : "var(--accent-light)",
                    border: `1px solid ${n.isRead ? "var(--border-light)" : "var(--accent)"}`,
                    cursor: "pointer",
                    transition: "background-color 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => { if (n.isRead) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)"; }}
                  onMouseLeave={(e) => { if (n.isRead) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  {/* Unread dot */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={n.sender?.avatar || ""}
                      alt={n.sender?.fullName || "User"}
                      style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-light)" }}
                    />
                    {!n.isRead && (
                      <div style={{
                        position: "absolute", top: 0, right: 0,
                        width: 12, height: 12, borderRadius: "50%",
                        backgroundColor: "#3B82F6",
                        border: "2px solid var(--bg-primary)",
                      }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600 }}>{n.sender?.fullName || "Someone"}</span>{" "}
                      {n.message}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>

                  {/* Video thumbnail */}
                  {n.video && (
                    <Link
                      href={`/videos/${n.video._id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ flexShrink: 0 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={n.video.thumbnail}
                        alt={n.video.title}
                        style={{ width: 72, height: 44, objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}
                      />
                    </Link>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
