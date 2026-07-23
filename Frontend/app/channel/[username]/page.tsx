"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatViews, formatDuration, timeAgo } from "@/src/lib/utils";
import CommunityPoll from "@/src/components/CommunityPoll";
import { PageMeta } from "@/src/components/PageMeta";

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

interface PollData {
  _id: string;
  question: string;
  options: Array<{
    _id: string;
    text: string;
    voters: string[];
  }>;
  isActive: boolean;
  endsAt?: string;
  createdAt: string;
  createdBy?: { _id: string; fullName: string };
}

interface ChannelPost {
  _id: string;
  content: string;
  image?: string;
  createdAt: string;
  owner: { fullName: string; username: string; avatar: string };
  poll?: PollData;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
}


const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "var(--accent-warm)" : "none"} stroke="var(--accent-warm)" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
);


const FlagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
);

const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

const CloseIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);


const VideoEmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>
);

const PlaylistEmptyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
);



export default function ChannelPage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"videos" | "about" | "playlists" | "community">("videos");
  const [channelSortBy, setChannelSortBy] = useState("createdAt");
  const [channelSortType, setChannelSortType] = useState("desc");
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [showReportModal, setShowReportModal] = useState(false);

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

  const { data: postsRes, isLoading: postsLoading } = useQuery({
    queryKey: ["channel-posts", username],
    queryFn: async () => {
      const res = await api.get(`/community/channel/${username}`);
      return res.data;
    },
    enabled: isAuthenticated && !!username && activeTab === "community",
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

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("content", postContent.trim());
      if (pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2) {
        fd.append("pollQuestion", pollQuestion.trim());
        pollOptions.filter((o) => o.trim()).forEach((o) => fd.append("pollOptions", o.trim()));
      }
      if (postImage) {
        fd.append("image", postImage);
      }
      const res = await api.post("/community", fd, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data;
    },
    onSuccess: () => {
      setPostContent("");
      setPostImage(null);
      setPostImagePreview("");
      setPollQuestion("");
      setPollOptions(["", ""]);
      queryClient.invalidateQueries({ queryKey: ["channel-posts", username] });
    },
  });

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    createPostMutation.mutate();
  };

  const togglePostLikeMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/community/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-posts", username] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/community/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-posts", username] });
    },
  });

  const handlePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostImage(file);
      setPostImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePollOptionChange = (i: number, val: string) => {
    const next = [...pollOptions];
    next[i] = val;
    setPollOptions(next);
    if (i === pollOptions.length - 1 && val.trim() && pollOptions.length < 10) {
      setPollOptions([...next, ""]);
    }
  };

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
      <PageMeta
        title={channel?.fullName ? `${channel.fullName} - Channel` : "Channel"}
        description={channel?.bio?.slice(0, 160) || "View channel on VideoTube."}
        {...(channel?.avatar ? { ogImage: channel.avatar } : {})}
        ogType="profile"
      />
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
        <div style={{ width: "100%", paddingBottom: "4rem" }}>
          {/* COVER IMAGE */}
          <div style={{ width: "100%", height: 240, backgroundColor: "var(--elevated)", position: "relative", overflow: "hidden" }}>
            {channel.coverImage ? (
              <img src={channel.coverImage} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(to right, var(--accent-subtle), var(--elevated))" }} />
            )}
          </div>

          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 2rem" }}>
            {/* CHANNEL HEADER */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "flex-end", marginTop: "-3rem", marginBottom: "2rem" }}>
              <img src={channel.avatar} alt={channel.fullName} style={{ width: 120, height: 120, borderRadius: "50%", border: "4px solid var(--bg-primary)", backgroundColor: "var(--bg-secondary)", objectFit: "cover", flexShrink: 0, position: "relative", zIndex: 2 }} />
              <div style={{ flex: 1, minWidth: 280, paddingTop: "3rem" }}>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>{channel.fullName}</h1>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "0.75rem", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>@{channel.username}</span>
                  <span>&middot;</span>
                  <span>{formatViews(channel.subscribersCount)} subscribers</span>
                  <span>&middot;</span>
                  <span>{formatViews(channel.totalVideos || 0)} videos</span>
                </div>
                {channel.bio && (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: 600 }}>
                    {channel.bio}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", paddingTop: "3rem" }}>
                {!isOwnChannel ? (
                  <button
                    onClick={() => subscribeMutation.mutate()}
                    className={`btn ${channel.isSubscribed ? "btn-ghost" : "btn-primary"}`}
                    style={{ borderRadius: 99, padding: "0.7rem 1.5rem" }}
                  >
                    {channel.isSubscribed ? "Subscribed" : "Subscribe"}
                  </button>
                ) : (
                  <Link href="/settings" className="btn btn-secondary" style={{ borderRadius: 99, padding: "0.7rem 1.5rem" }}>
                    Manage Channel
                  </Link>
                )}
              </div>
            </div>

            {/* TABS */}
            <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--border)", marginBottom: "2rem", overflowX: "auto", scrollbarWidth: "none" }}>
              {(["videos", "about", "playlists", "community"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "none", border: "none",
                    borderBottom: `2px solid ${activeTab === tab ? "var(--text-primary)" : "transparent"}`,
                    color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                    fontWeight: activeTab === tab ? 700 : 500,
                    textTransform: "uppercase", fontSize: "0.85rem", letterSpacing: "0.05em",
                    cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap"
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

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
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>Sort by</span>
<select
                        value={`${channelSortBy}-${channelSortType}`}
                        onChange={(e) => {
                          const parts = e.target.value.split("-");
                          if (parts.length === 2) {
                            const [by, type] = parts as [string, string];
                            setChannelSortBy(by);
                            setChannelSortType(type);
                          }
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
                            <div className="thumb-wrapper" style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: "var(--radius-lg)", overflow: "hidden", backgroundColor: "var(--bg-secondary)" }}>
                              <img src={video.thumbnail || ""} alt={video.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              <div className="duration-badge" style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.8)", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600 }}>{formatDuration(video.duration)}</div>
                            </div>
                            <div className="card-info" style={{ marginTop: "0.75rem" }}>
                              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{video.title}</h3>
                              <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)", alignItems: "center" }}>
                                <span>{formatViews(video.views)} views</span>
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
                        <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem", marginTop: "1rem" }}>No playlists</p>
                        <p style={{ color: "var(--text-muted)" }}>This channel has no public playlists.</p>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
                        {playlists.map((pl, i) => (
                          <motion.div
                            key={pl._id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <Link href={`/playlists/${pl._id}`} style={{ textDecoration: "none", color: "inherit" }}>
                              <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: "var(--radius-lg)", overflow: "hidden", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-secondary)" }}>
                                  <PlaylistEmptyIcon />
                                </div>
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", padding: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#fff", fontSize: "0.8rem", fontWeight: 600 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                    Playlist
                                  </div>
                                </div>
                              </div>
                              <div style={{ marginTop: "0.75rem" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.2rem" }}>{pl.name}</h3>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>View full playlist</p>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ABOUT TAB */}
                {activeTab === "about" && (
                  <div>
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
                  </div>
                )}
                    
                {activeTab === "community" && (
                  <div>
                    {/* Create Post Form (only for channel owner) */}
                    {isOwnChannel && (
                      <form onSubmit={handleCreatePost} className="form-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
                        <textarea
                          placeholder="Share an update with your subscribers..."
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                          maxLength={500}
                          rows={3}
                          className="input"
                          style={{ width: "100%", resize: "vertical", marginBottom: "0.75rem" }}
                        />
                        {postImagePreview && (
                          <div style={{ position: "relative", display: "inline-block", marginBottom: "0.75rem" }}>
                            <img src={postImagePreview} alt="Preview" style={{ maxHeight: 200, borderRadius: "var(--radius-md)", objectFit: "cover" }} />
                            <button type="button" onClick={() => { setPostImage(null); setPostImagePreview(""); }} style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                          </div>
                        )}
                        {/* Poll Builder */}
                        <div style={{ marginBottom: "0.75rem", padding: "0.75rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                          <input
                            placeholder="Ask a question (optional poll)"
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            className="input"
                            style={{ width: "100%", marginBottom: "0.5rem" }}
                          />
                          {pollQuestion.trim() && pollOptions.map((opt, i) => (
                            <input
                              key={i}
                              placeholder={`Option ${i + 1}`}
                              value={opt}
                              onChange={(e) => handlePollOptionChange(i, e.target.value)}
                              className="input"
                              style={{ width: "100%", marginBottom: "0.3rem", fontSize: "0.85rem" }}
                            />
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <label style={{ cursor: "pointer", fontSize: "0.82rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            Add image
                            <input type="file" accept="image/*" onChange={handlePostImageChange} style={{ display: "none" }} />
                          </label>
                          <button type="submit" disabled={createPostMutation.isPending || !postContent.trim()} className="btn btn-primary" style={{ marginLeft: "auto", borderRadius: 99, padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}>
                            {createPostMutation.isPending ? "Posting..." : "Post"}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Posts Feed */}
                    {postsLoading ? (
                      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-muted)" }}>Loading posts...</motion.div>
                      </div>
                    ) : !postsRes?.data?.length ? (
                      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" opacity="0.4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", margin: "1rem 0 0.5rem" }}>No community posts yet</p>
                        <p style={{ color: "var(--text-muted)" }}>{isOwnChannel ? "Create your first post above!" : "This channel hasn't posted anything yet."}</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {postsRes.data.map((post: ChannelPost, i: number) => (
                          <motion.div
                            key={post._id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="form-card"
                            style={{ padding: "1.25rem" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                              <img src={post.owner.avatar} alt={post.owner.fullName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                              <div>
                                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>{post.owner.fullName}</p>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{timeAgo(post.createdAt)}</p>
                              </div>
                            </div>

                            <p style={{ fontSize: "0.92rem", color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{post.content}</p>

                            {post.image && (
                              <img src={post.image} alt="Post image" style={{ width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: "var(--radius-md)", marginTop: "0.75rem" }} />
                            )}

                            {post.poll && (
                              <CommunityPoll poll={post.poll} channelUsername={username} />
                            )}

                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                <button onClick={() => togglePostLikeMutation.mutate(post._id)}
                                  style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", color: post.isLiked ? "var(--accent-warm)" : "var(--text-muted)", padding: 0, fontSize: "0.82rem", transition: "color 0.15s" }}
                                >
                                  <HeartIcon filled={post.isLiked} /> {post.likesCount}
                                </button>
                                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                  {post.commentsCount}
                                </span>
                              </div>
                              {isOwnChannel && (
                                <button onClick={() => { if (confirm("Delete this post?")) deletePostMutation.mutate(post._id); }}
                                  style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, fontSize: "0.82rem" }}
                                  title="Delete post"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                  Delete
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
      {showReportModal && <ReportModal targetId={channel?._id || ""} onClose={() => setShowReportModal(false)} />}
    </>
  );
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam or misleading" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "nudity", label: "Inappropriate profile content" },
  { value: "impersonation", label: "Impersonation" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "other", label: "Other" },
];

function ReportModal({ targetId, onClose }: { targetId: string; onClose: () => void }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prevFocused = document.activeElement as HTMLElement | null;
    const focusable = modalRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])");
    focusable?.focus();
    return () => {
      prevFocused?.focus();
    };
  }, []);

  const reportMutation = useMutation({
    mutationFn: async () => {
      await api.post("/reports", { target: targetId, targetType: "user", reason: selectedReason, description: selectedReason });
    },
    onSuccess: () => setSubmitted(true),
  });

  return (
    <motion.div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        style={{
          width: "100%", maxWidth: 480,
          borderRadius: "var(--radius-xl)", padding: "2rem",
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {submitted ? (
          <div style={{ textAlign: "center", padding: "var(--sp-8) 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "var(--success-subtle)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--sp-4)", color: "var(--success)" }}>
              <CheckIcon size={16} />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--sp-2)" }}>Report Submitted</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "var(--sp-6)" }}>Thank you for helping keep our community safe.</p>
            <button onClick={onClose} className="btn btn-primary btn-pill">Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-6)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "var(--error-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--error)" }}>
                  <FlagIcon />
                </div>
                <h2 id="report-modal-title" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>Report User</h2>
              </div>
              <button aria-label="Close" onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                <CloseIcon size={16} />
              </button>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>Why are you reporting this user?</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", marginBottom: "var(--sp-6)" }}>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--sp-3)",
                    padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
                    border: `1.5px solid ${selectedReason === r.value ? "var(--accent)" : "var(--border)"}`,
                    backgroundColor: selectedReason === r.value ? "var(--accent-subtle)" : "transparent",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={selectedReason === r.value}
                    onChange={() => setSelectedReason(r.value)}
                    style={{ display: "none" }}
                  />
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${selectedReason === r.value ? "var(--accent)" : "var(--border-medium)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: selectedReason === r.value ? "var(--accent)" : "transparent",
                    transition: "all 0.2s",
                  }}>
                    {selectedReason === r.value && <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#fff" }} />}
                  </div>
                  <span style={{ fontSize: "0.9rem", color: selectedReason === r.value ? "var(--accent)" : "var(--text-primary)", fontWeight: selectedReason === r.value ? 600 : 400 }}>
                    {r.label}
                  </span>
                </label>
              ))}
            </div>

            <button
              className="btn btn-primary btn-pill"
              style={{ width: "100%" }}
              disabled={!selectedReason || reportMutation.isPending}
              onClick={() => reportMutation.mutate()}
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
