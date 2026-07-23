"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { timeAgo, formatDuration } from "@/src/lib/utils";
import dynamic from "next/dynamic";
import {
  PlusIcon,
  EyeIcon,
  UserIcon,
  HeartIcon,
  Edit2Icon,
  CheckIcon,
  TrendingIcon,
  VideoIcon,
  CloseIcon,
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
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex",
        gap: 0,
        overflow: "hidden",
        borderRadius: "var(--radius-lg)",
        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
        backgroundColor: "var(--card)",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: isSelected
          ? "0 0 0 1px var(--accent)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = "var(--border-hover)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
        }
      }}
    >
      
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "var(--sp-8)",
            flexWrap: "wrap",
            gap: "var(--sp-4)",
          }}
        >
          <div>
            <h1 className="text-page" style={{ marginBottom: "var(--sp-1)" }}>
              Creator Studio
            </h1>
            <p
              className="text-caption"
              style={{
                color: "var(--text-muted)",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              Welcome back, {user?.fullName}
            </p>
          </div>
          <div
            style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}
          >
            <button
              className="btn btn-primary btn-pill"
              onClick={() => setShowUploadModal(true)}
            >
              <PlusIcon size={16} />
              Upload
            </button>
          </div>
        </div>

        
          <div className="form-card" style={{ padding: "var(--sp-5)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--sp-2)",
                marginBottom: "var(--sp-4)",
              }}
            >
              <TrendingIcon size={18} />
              <h2
                className="text-section"
                style={{ margin: 0, fontSize: "0.95rem" }}
              >
                Channel Analytics
              </h2>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--sp-3)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--sp-2) 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Avg Views / Video
                </span>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {stats?.totalVideos > 0
                    ? Math.round(
                        (stats?.totalViews || 0) / stats.totalVideos,
                      ).toLocaleString()
                    : 0}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--sp-2) 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Engagement Rate
                </span>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {stats?.totalViews > 0
                    ? `${(((stats?.totalLikes || 0) / stats.totalViews) * 100).toFixed(1)}%`
                    : "0%"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--sp-2) 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Like-to-Sub Ratio
                </span>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {stats?.totalSubscribers > 0
                    ? `${(((stats?.totalLikes || 0) / stats.totalSubscribers) * 100).toFixed(0)}%`
                    : "0%"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--sp-2) 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Likes per Video
                </span>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {stats?.totalVideos > 0
                    ? Math.round(
                        (stats?.totalLikes || 0) / stats.totalVideos,
                      ).toLocaleString()
                    : 0}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--sp-2) 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Views per Subscriber
                </span>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {stats?.totalSubscribers > 0
                    ? (stats?.totalViews / stats.totalSubscribers).toFixed(1)
                    : "0"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--sp-2) 0",
                }}
              >
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Subscriber Efficiency
                </span>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {stats?.totalVideos > 0
                    ? `${Math.round((stats?.totalSubscribers || 0) / stats.totalVideos).toLocaleString()} / video`
                    : "0"}
                </span>
              </div>
            </div>
          </div>
        </div>

        
        <h2 className="text-section" style={{ marginBottom: "var(--sp-4)" }}>
          Channel Content
        </h2>

        
        {sortedVideos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <VideoIcon size={28} />
            </div>
            <p
              style={{
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "var(--sp-2)",
              }}
            >
              No videos uploaded yet
            </p>
            <p
              className="text-caption"
              style={{
                color: "var(--text-muted)",
                marginBottom: "var(--sp-5)",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              Upload your first video to get started
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setShowUploadModal(true)}
            >
              <UploadIcon size={16} />
              Upload your first video
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--sp-3)",
            }}
          >
            {sortedVideos.map(
              (video: {
                _id: string;
                thumbnail: string;
                title: string;
                isPublished: boolean;
                createdAt: string;
                views: number;
                likesCount: number;
                duration: number;
              }) => (
                <VideoCard
                  key={video._id}
                  video={video}
                  isSelected={selectedVideos.has(video._id)}
                  onSelect={() => router.push(`/videos/${video._id}`)}
                  onToggleSelect={() => toggleSelectVideo(video._id)}
                />
              ),
            )}
          </div>
        )}
      </div>
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
