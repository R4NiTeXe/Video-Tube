"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatViews, formatDuration } from "@/src/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { PageMeta } from "@/src/components/PageMeta";

interface VideoOwner {
  fullName: string;
  avatar: string;
  username?: string;
}

interface Video {
  _id: string;
  thumbnail: string;
  title: string;
  owner?: VideoOwner;
  views: number;
  duration: number;
  createdAt: string;
}

const HeartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
);
const PlaySmall = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);

const SkeletonCard = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
    <div className="skeleton" style={{ width: "100%", paddingTop: "56.25%", borderRadius: "var(--radius-lg)" }} />
    <div style={{ display: "flex", gap: "0.75rem", paddingLeft: "0.25rem" }}>
      <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div className="skeleton" style={{ width: "90%", height: 16, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: "60%", height: 14, borderRadius: 6 }} />
      </div>
    </div>
  </div>
);


export default function LikedPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [page, setPage] = useState(1);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  const { data: response, isLoading } = useQuery({
    queryKey: ["liked-videos", page],
    queryFn: async () => {
      const res = await api.get(`/likes/videos?page=${page}&limit=12`);
      return res.data;
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (response?.data) {
      const rawVideos: { likedVideo?: Video }[] = response.data.docs || response.data || [];
      const mapped = rawVideos.map((item) => (item.likedVideo || item) as Video).filter(Boolean);
      const dedupById = (arr: Video[]) => {
        const seen = new Set<string>();
        return arr.filter((v: Video) => {
          const key = v._id?.toString();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };
      if (page === 1) {
        setAllVideos(dedupById(mapped));
      } else {
        setAllVideos(prev => dedupById([...prev, ...mapped]));
      }
      setTotal(response.data.total || 0);
    }
  }, [response, page]);

  const hasMore = allVideos.length < total;

  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-secondary)", fontWeight: 500, display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }}
          />
          {authLoading ? "Loading session..." : "Redirecting to login..."}
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <PageMeta title="Liked Videos" description="Videos you've liked on VideoTube." noIndex />
      <div style={{ width: "100%", padding: "2rem" }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
            <HeartIcon />
          </div>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.1rem" }}>
              Liked Videos
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{total} videos</p>
          </div>
        </motion.div>

        {isLoading && page === 1 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem 1.25rem" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : allVideos.length === 0 ? (
          <div className="empty-state" style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <div className="empty-icon">
              <HeartIcon />
            </div>
            <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              No liked videos yet
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Videos you like will appear here
            </p>
            <Link href="/" className="btn btn-primary" style={{ borderRadius: 99, padding: "0.7rem 1.75rem" }}>
              Browse Videos
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem 1.25rem" }}>
              <AnimatePresence>
                {allVideos.map((video, idx) => (
                  <motion.div
                    key={video._id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(idx * 0.06, 0.5), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link href={`/videos/${video._id}`} className="video-card-premium">
                      <div className="thumb-wrapper">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={video.thumbnail} alt={video.title} loading="lazy" />
                        <div className="thumb-overlay">
                          <div className="play-circle">
                            <PlaySmall />
                          </div>
                        </div>
                        <span className="duration-badge">
                          {formatDuration(video.duration)}
                        </span>
                        <div className="avatar-badge">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={video.owner?.avatar} alt={video.owner?.fullName} />
                        </div>
                      </div>
                      <div className="card-info">
                        <h3 className="card-title">{video.title}</h3>
                        <div className="card-meta">
                          <span className="channel-name">{video.owner?.fullName}</span>
                          <span>·</span>
                          <span>{formatViews(video.views)} views</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {hasMore && (
              <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)} disabled={isLoading}>
                  {isLoading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
