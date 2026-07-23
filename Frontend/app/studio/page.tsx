"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { timeAgo, formatDuration } from "@/src/lib/utils";
import dynamic from "next/dynamic";
import {
  PlusIcon,
  EyeIcon,
  UserIcon,
  HeartIcon,
  Edit2Icon,
  TrendingIcon,
  VideoIcon,
  TrashIcon,
  UploadIcon,
} from "@/src/components/icons";
import { PageMeta } from "@/src/components/PageMeta";
const UploadModal = dynamic(() => import("./upload-modal"), { ssr: false });
const EditModal = dynamic(() => import("./edit-modal"), { ssr: false });


function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="stat-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </motion.div>
  );
}


function VideoCard({
  video,
  isSelected,
  onSelect,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  video: {
    _id: string;
    thumbnail: string;
    title: string;
    isPublished: boolean;
    createdAt: string;
    views: number;
    likesCount: number;
    duration: number;
  };
  isSelected: boolean;
  onSelect: () => void;
  onToggleSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0.75rem 1rem",
        borderRadius: "var(--radius-lg)",
        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
        backgroundColor: "var(--card)",
        transition: "all 0.2s",
        boxShadow: isSelected
          ? "0 0 0 1px var(--accent)"
          : "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        style={{ cursor: "pointer" }}
      />
      <div
        onClick={onSelect}
        style={{
          position: "relative",
          width: 120,
          height: 68,
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          backgroundColor: "var(--bg-secondary)",
          flexShrink: 0,
          cursor: "pointer",
        }}
      >
        <img
          src={video.thumbnail}
          alt={video.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <span
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            padding: "2px 4px",
            borderRadius: 4,
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "#fff",
            fontSize: "0.7rem",
            fontWeight: 600,
          }}
        >
          {formatDuration(video.duration)}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={onSelect}>
        <h3
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "0.25rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {video.title}
        </h3>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
          <span>{video.isPublished ? "Published" : "Draft"}</span>
          <span>{timeAgo(video.createdAt)}</span>
          <span>{video.views} views</span>
          <span>{video.likesCount} likes</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {onEdit && (
          <button
            onClick={onEdit}
            className="btn btn-ghost btn-sm"
            style={{ padding: "0.4rem" }}
          >
            <Edit2Icon size={16} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="btn btn-ghost btn-sm"
            style={{ padding: "0.4rem", color: "var(--error)" }}
          >
            <TrashIcon size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function CreatorStudioContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  const { data: statsRes } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/dashboard/stats");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const { data: videosRes } = useQuery({
    queryKey: ["dashboard-videos"],
    queryFn: async () => {
      const res = await api.get("/dashboard/videos");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const stats = statsRes?.data || { totalViews: 0, totalSubscribers: 0, totalLikes: 0, totalVideos: 0 };
  const sortedVideos = videosRes?.data || [];

  const deleteMutation = useMutation({
    mutationFn: async (videoId: string) => {
      await api.delete(`/videos/${videoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-videos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const toggleSelectVideo = (id: string) => {
    setSelectedVideos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ color: "var(--text-secondary)" }}>Loading session...</div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Creator Studio" description="Manage your videos and channel analytics." noIndex />
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", padding: "2rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--sp-8)", flexWrap: "wrap", gap: "var(--sp-4)" }}>
            <div>
              <h1 className="text-page" style={{ marginBottom: "var(--sp-1)" }}>
                Creator Studio
              </h1>
              <p className="text-caption" style={{ color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>
                Welcome back, {user?.fullName}
              </p>
            </div>
            <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-pill" onClick={() => setShowUploadModal(true)}>
                <PlusIcon size={16} /> Upload
              </button>
            </div>
          </div>

          {/* Stats overview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <StatCard label="Total Views" value={stats.totalViews || 0} icon={<EyeIcon size={20} />} color="rgba(99, 102, 241, 0.15)" />
            <StatCard label="Subscribers" value={stats.totalSubscribers || 0} icon={<UserIcon size={20} />} color="rgba(34, 197, 94, 0.15)" />
            <StatCard label="Total Likes" value={stats.totalLikes || 0} icon={<HeartIcon size={20} />} color="rgba(236, 72, 153, 0.15)" />
            <StatCard label="Total Videos" value={stats.totalVideos || 0} icon={<VideoIcon size={20} />} color="rgba(245, 158, 11, 0.15)" />
          </div>

          {/* Detailed Analytics */}
          <div className="form-card" style={{ padding: "var(--sp-5)", marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
              <TrendingIcon size={18} />
              <h2 className="text-section" style={{ margin: 0, fontSize: "0.95rem" }}>Channel Analytics</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--sp-2) 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Avg Views / Video</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {stats?.totalVideos > 0 ? Math.round((stats?.totalViews || 0) / stats.totalVideos).toLocaleString() : 0}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--sp-2) 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Engagement Rate</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {stats?.totalViews > 0 ? `${(((stats?.totalLikes || 0) / stats.totalViews) * 100).toFixed(1)}%` : "0%"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--sp-2) 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Like-to-Sub Ratio</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {stats?.totalSubscribers > 0 ? `${(((stats?.totalLikes || 0) / stats.totalSubscribers) * 100).toFixed(0)}%` : "0%"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--sp-2) 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Likes per Video</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {stats?.totalVideos > 0 ? Math.round((stats?.totalLikes || 0) / stats.totalVideos).toLocaleString() : 0}
                </span>
              </div>
            </div>
          </div>

          {/* Videos list */}
          <h2 className="text-section" style={{ marginBottom: "var(--sp-4)" }}>
            Channel Content
          </h2>

          {sortedVideos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <VideoIcon size={28} />
              </div>
              <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "var(--sp-2)" }}>No videos uploaded yet</p>
              <p className="text-caption" style={{ color: "var(--text-muted)", marginBottom: "var(--sp-5)", textTransform: "none", letterSpacing: 0 }}>
                Upload your first video to get started
              </p>
              <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                <UploadIcon size={16} /> Upload your first video
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              {sortedVideos.map((video: any) => (
                <VideoCard
                  key={video._id}
                  video={video}
                  isSelected={selectedVideos.has(video._id)}
                  onSelect={() => router.push(`/videos/${video._id}`)}
                  onToggleSelect={() => toggleSelectVideo(video._id)}
                  onEdit={() => { setEditingVideo(video); setShowEditModal(true); }}
                  onDelete={() => deleteMutation.mutate(video._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} onSuccess={() => { setShowUploadModal(false); queryClient.invalidateQueries({ queryKey: ["dashboard-videos"] }); }} />}
        {showEditModal && editingVideo && <EditModal videoId={editingVideo._id} onClose={() => { setShowEditModal(false); setEditingVideo(null); }} onSuccess={() => { setShowEditModal(false); setEditingVideo(null); queryClient.invalidateQueries({ queryKey: ["dashboard-videos"] }); }} />}
      </AnimatePresence>
    </>
  );
}

export default function CreatorStudio() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--bg-primary)",
          }}
        >
          <div style={{ color: "var(--text-secondary)" }}>
            Loading studio...
          </div>
        </div>
      }
    >
      <CreatorStudioContent />
    </Suspense>
  );
}
