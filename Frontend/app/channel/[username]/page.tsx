"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatViews, formatDuration, timeAgo } from "@/src/lib/utils";

interface ChannelProfile {
  _id: string;
  fullName: string;
  username: string;
  avatar: string;
  coverImage?: string;
  bio?: string;
  socialLinks?: {
    youtube?: string;
    twitter?: string;
    instagram?: string;
    github?: string;
    website?: string;
  };
  subscribersCount: number;
  channelsSubscribedToCount: number;
  isSubscribed: boolean;
  totalVideos?: number;
  totalViews?: number;
  createdAt?: string;
}

interface ChannelVideo {
  _id: string;
  title: string;
  thumbnail?: string;
  videoFile: string;
  duration: number;
  views: number;
  likesCount?: number;
  createdAt: string;
}

interface Playlist {
  _id: string;
  name: string;
  description?: string;
  videos: string[];
  createdAt: string;
}


function extractHandle(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length > 0 ? `@${parts[parts.length - 1]}` : u.hostname;
  } catch {
    return url;
  }
}

const PlayLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
);

const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "var(--accent-warm)" : "none"} stroke="var(--accent-warm)" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
);

const YoutubeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
);

const TwitterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
);

const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
);

const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
);

const WebsiteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);

const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);

const PlayCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);

const VideoEmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>
);

const PlaylistEmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
);

const socialLinkConfig = [
  { key: "youtube" as const, icon: <YoutubeIcon />, label: "YouTube", color: "#FF0000" },
  { key: "twitter" as const, icon: <TwitterIcon />, label: "Twitter / X", color: "#1DA1F2" },
  { key: "instagram" as const, icon: <InstagramIcon />, label: "Instagram", color: "#E4405F" },
  { key: "github" as const, icon: <GithubIcon />, label: "GitHub", color: "#6e40c9" },
  { key: "website" as const, icon: <WebsiteIcon />, label: "Website", color: "var(--accent)" },
];

export default function ChannelPage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"videos" | "about" | "playlists">("videos");
  const [channelSortBy, setChannelSortBy] = useState("createdAt");
  const [channelSortType, setChannelSortType] = useState("desc");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  const { data: response, isLoading } = useQuery({
    queryKey: ["channel", username],
    queryFn: async () => {
      const res = await api.get(`/users/c/${username}`);
      return res.data;
    },
    enabled: isAuthenticated && !!username,
  });

  const channel: ChannelProfile | undefined = response?.data;
  const isOwnChannel = currentUser?._id === channel?._id;

  const { data: videosRes, isLoading: videosLoading } = useQuery({
    queryKey: ["channel-videos", username, channelSortBy, channelSortType],
    queryFn: async () => {
      const res = await api.get(`/videos/channel/${username}?sortBy=${channelSortBy}&sortType=${channelSortType}`);
      return res.data;
    },
    enabled: isAuthenticated && !!username && activeTab === "videos",
  });

  const { data: playlistsRes, isLoading: playlistsLoading } = useQuery({
    queryKey: ["channel-playlists", channel?._id],
    queryFn: async () => {
      const res = await api.get(`/playlists/user/${channel?._id}`);
      return res.data;
    },
    enabled: isAuthenticated && !!channel?._id && activeTab === "playlists",
  });

  const { data: aboutRes } = useQuery({
    queryKey: ["channel-about", username],
    queryFn: async () => {
      const res = await api.get(`/videos/channel/${username}/about`);
      return res.data;
    },
    enabled: isAuthenticated && !!username && activeTab === "about",
  });

  const aboutData = aboutRes?.data;

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/subscriptions/c/${channel?._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel", username] });
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

  const videos: ChannelVideo[] = videosRes?.data?.docs || videosRes?.data || [];
  const playlists: Playlist[] = playlistsRes?.data || [];

  return (
    <>
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "6rem 2rem" }}>
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)" }}>
            Loading channel...
          </motion.div>
        </div>
      ) : !channel ? (
        <div style={{ textAlign: "center", padding: "6rem 2rem" }}>
          <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Channel not found</p>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>This channel doesn&apos;t exist or has been removed.</p>
          <Link href="/" className="btn btn-primary" style={{ borderRadius: 99, padding: "0.7rem 1.75rem" }}>Go Home</Link>
        </div>
      ) : (
        <div style={{ width: "100%", padding: "0 2rem" }}>
          {/* Cover Image Banner */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ position: "relative", width: "100%", height: 200, overflow: "hidden" }}
          >
            {channel.coverImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={channel.coverImage} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, var(--accent), var(--elevated))" }} />
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent 60%)" }} />
          </motion.div>

          {/* Channel Header Card */}
          <div className="form-card" style={{ marginTop: "-2rem", position: "relative", zIndex: 2, marginLeft: "2rem", marginRight: "2rem", padding: "1.5rem 2rem", display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{ width: 96, height: 96, borderRadius: "50%", border: "3px solid var(--accent)", padding: 3, flexShrink: 0, boxShadow: "var(--shadow-accent)", backgroundColor: "var(--bg-primary)", marginTop: "-3.5rem" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={channel.avatar} alt={channel.fullName} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            </div>

            {/* Info + actions */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>{channel.fullName}</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>@{channel.username}</p>
              {!isOwnChannel ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => subscribeMutation.mutate()}
                  disabled={subscribeMutation.isPending}
                  className={channel.isSubscribed ? "btn-ghost" : "btn-primary"}
                  style={{ borderRadius: 99, padding: "0.55rem 1.6rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {channel.isSubscribed ? (
                      <motion.span key="subscribed" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <BellIcon /> Subscribed
                      </motion.span>
                    ) : (
                      <motion.span key="subscribe" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                        Subscribe
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              ) : (
                <Link href="/edit-profile" className="btn btn-secondary" style={{ borderRadius: 99, padding: "0.55rem 1.4rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  Edit Profile
                </Link>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: "1.5rem", flexShrink: 0 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>{channel.subscribersCount || 0}</p>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Subscribers</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>{videos.length}</p>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Videos</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}>
              {(["videos", "about", "playlists"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "0.7rem 1.4rem",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    color: activeTab === tab ? "var(--accent)" : "var(--text-secondary)",
                    background: "none",
                    border: "none",
                    borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ paddingBottom: "4rem" }}
              >
                {/* VIDEOS TAB */}
                {activeTab === "videos" && (
                  <div>
                    {/* Sort dropdown with label */}
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>Sort by</span>
                      <select
                        value={`${channelSortBy}-${channelSortType}`}
                        onChange={(e) => {
                          const [by, type] = e.target.value.split("-");
                          setChannelSortBy(by);
                          setChannelSortType(type);
                        }}
                        style={{
                          padding: "0.4rem 0.8rem", borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border)", backgroundColor: "var(--elevated)",
                          color: "var(--text-secondary)", fontSize: "0.82rem", fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        <option value="createdAt-desc">Newest First</option>
                        <option value="createdAt-asc">Oldest First</option>
                        <option value="views-desc">Most Viewed</option>
                        <option value="views-asc">Least Viewed</option>
                        <option value="duration-desc">Longest</option>
                        <option value="duration-asc">Shortest</option>
                      </select>
                    </div>

                    {videosLoading ? (
                      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)" }}>
                          Loading videos...
                        </motion.div>
                      </div>
                    ) : videos.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
                        <VideoEmptyIcon />
                        <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem", marginTop: "1rem" }}>No videos yet</p>
                        <p style={{ color: "var(--text-muted)", marginBottom: "1.25rem" }}>This channel hasn&apos;t uploaded any videos.</p>
                        {isOwnChannel && (
                          <Link href="/studio" className="btn btn-primary" style={{ borderRadius: 99, padding: "0.6rem 1.5rem", fontSize: "0.85rem", display: "inline-flex" }}>
                            Upload your first video
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                        {videos.map((video, i) => (
                          <motion.div
                            key={video._id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="video-card-premium"
                            onClick={() => router.push(`/videos/${video._id}`)}
                          >
                            <div className="thumb-wrapper">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={video.thumbnail || video.videoFile} alt={video.title} />
                              <div className="thumb-overlay">
                                <div className="play-circle">
                                  <PlayCircleIcon />
                                </div>
                              </div>
                              <span className="duration-badge">{formatDuration(video.duration)}</span>
                            </div>
                            <div className="card-info">
                              <p className="card-title">{video.title}</p>
                              <div className="card-meta" style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                                <span>{formatViews(video.views)} views</span>
                                <span>&middot;</span>
                                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                  <HeartIcon filled /> {formatViews(video.likesCount || 0)}
                                </span>
                                <span>&middot;</span>
                                <span>{timeAgo(video.createdAt)}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ABOUT TAB */}
                {activeTab === "about" && (
                  <div className="form-card" style={{ padding: "2rem" }}>
                    {/* Bio */}
                    <div style={{ marginBottom: "2rem" }}>
                      <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>About</h3>
                      <p style={{ color: "var(--text-primary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
                        {aboutData?.bio || channel?.bio ? (
                          aboutData?.bio || channel?.bio
                        ) : isOwnChannel ? (
                          <span>
                            You haven&apos;t added a bio yet.{" "}
                            <Link href="/edit-profile" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
                              Add one to tell viewers about yourself →
                            </Link>
                          </span>
                        ) : (
                          "This channel hasn&apos;t added a bio yet."
                        )}
                      </p>
                    </div>

                    {/* Stats */}
                    {aboutData && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "2rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
                        <div style={{ textAlign: "center", padding: "0.5rem" }}>
                          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatViews(aboutData.totalViews || 0)}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Views</div>
                        </div>
                        <div style={{ textAlign: "center", padding: "0.5rem" }}>
                          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatViews(aboutData.subscriberCount || 0)}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Subscribers</div>
                        </div>
                        <div style={{ textAlign: "center", padding: "0.5rem" }}>
                          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>{aboutData.videoCount || 0}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Videos</div>
                        </div>
                        <div style={{ textAlign: "center", padding: "0.5rem" }}>
                          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatViews(channel.channelsSubscribedToCount || 0)}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Subscribed to</div>
                        </div>
                      </div>
                    )}

                    {/* Social Links with handles */}
                    {(aboutData?.socialLinks || channel?.socialLinks) && Object.values(aboutData?.socialLinks || channel?.socialLinks || {}).some(Boolean) && (
                      <div style={{ marginBottom: "2rem" }}>
                        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>Links</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {socialLinkConfig.map(({ key, icon, label, color }) => {
                            const url = (aboutData?.socialLinks || channel?.socialLinks)?.[key];
                            if (!url) return null;
                            const handle = extractHandle(url);
                            return (
                              <a
                                key={key}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "flex", alignItems: "center", gap: "0.7rem",
                                  padding: "0.55rem 0.75rem", borderRadius: "var(--radius-sm)",
                                  color: "var(--text-primary)", fontSize: "0.9rem",
                                  transition: "background-color 0.15s, color 0.15s",
                                  textDecoration: "none",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-secondary)"; e.currentTarget.style.color = color; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-primary)"; }}
                              >
                                <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{icon}</span>
                                <span style={{ flex: 1 }}>{label}</span>
                                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{handle}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Joined & Subscribers */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
                      {(aboutData?.joinDate || channel?.createdAt) && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                          <CalendarIcon />
                          Joined {new Date(aboutData?.joinDate || channel?.createdAt || "").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        <BellIcon />
                        {formatViews(aboutData?.subscriberCount || channel?.subscribersCount || 0)} subscribers
                      </div>
                    </div>
                  </div>
                )}

                {/* PLAYLISTS TAB */}
                {activeTab === "playlists" && (
                  <div>
                    {playlistsLoading ? (
                      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)" }}>
                          Loading playlists...
                        </motion.div>
                      </div>
                    ) : playlists.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
                        <PlaylistEmptyIcon />
                        <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem", marginTop: "1rem" }}>No playlists yet</p>
                        <p style={{ color: "var(--text-muted)" }}>This channel hasn&apos;t created any playlists.</p>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                        {playlists.map((playlist, i) => (
                          <motion.div
                            key={playlist._id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="form-card"
                            style={{ padding: "1.25rem", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                              <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", backgroundColor: "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
                                <PlayLogo size={18} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playlist.name}</p>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{playlist.videos.length} videos &middot; {timeAgo(playlist.createdAt)}</p>
                              </div>
                            </div>
                            {playlist.description && (
                              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {playlist.description}
                              </p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
      )}
    </>
  );
}
