"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { timeAgo } from "@/src/lib/utils";
import { PageMeta } from "@/src/components/PageMeta";

interface PostOwner {
  _id: string;
  fullName: string;
  avatar: string;
  username: string;
}

interface CommunityPost {
  _id: string;
  content: string;
  image?: string;
  owner: PostOwner;
  likes: number;
  isLiked: boolean;
  commentCount: number;
  createdAt: string;
}


const ThumbsUpIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);
const CommentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const ImageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
  </svg>
);
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);


const SkeletonPost = () => (
  <div style={{ padding: "1.5rem", backgroundColor: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "50%" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 80, height: 12, borderRadius: 6 }} />
      </div>
    </div>
    <div className="skeleton" style={{ width: "90%", height: 14, borderRadius: 6, marginBottom: "0.5rem" }} />
    <div className="skeleton" style={{ width: "60%", height: 14, borderRadius: 6, marginBottom: "1rem" }} />
    <div className="skeleton" style={{ width: "100%", paddingTop: "50%", borderRadius: "var(--radius-md)" }} />
  </div>
);

export default function CommunityPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["community-posts"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get(`/community?page=${pageParam}&limit=10`);
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage?.data?.hasNextPage) return lastPage.data.page + 1;
      return undefined;
    },
    initialPageParam: 1,
    enabled: isAuthenticated,
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("content", newPostContent);
      if (newPostImage) formData.append("image", newPostImage);
      const res = await api.post("/community", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      setNewPostContent("");
      setNewPostImage(null);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await api.post(`/community/${postId}/like`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPostImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim() && !newPostImage) return;
    createPostMutation.mutate();
  };

  const allPosts: CommunityPost[] = data?.pages?.flatMap((page) => page?.data?.docs || []) || [];

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
      <PageMeta title="Community" description="Community posts from channels you follow on VideoTube." noIndex />
      
      <div style={{ position: "fixed", top: "5%", left: "30%", width: "50vw", height: "50vw", background: "var(--accent)", filter: "blur(250px)", opacity: 0.035, borderRadius: "50%", pointerEvents: "none", zIndex: 0 }} />

      
      <div style={{ width: "100%", maxWidth: 680, margin: "0 auto", padding: "2rem 1rem" }}>
        
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
            Community
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Share updates, images, and connect with your audience</p>
        </motion.div>

        
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="form-card"
          style={{ marginBottom: "2rem" }}
        >
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "var(--accent-subtle)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, overflow: "hidden", flexShrink: 0 }}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.fullName || "User"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                (user?.fullName?.[0] || "U").toUpperCase()
              )}
            </div>
            <div style={{ flex: 1 }}>
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What's on your mind?"
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  resize: "vertical",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {imagePreview && (
                <div style={{ marginTop: "0.75rem", position: "relative", display: "inline-block" }}>
                  <img src={imagePreview} alt="Preview" style={{ maxHeight: 200, borderRadius: "var(--radius-md)", objectFit: "cover" }} />
                  <button
                    onClick={() => { setNewPostImage(null); setImagePreview(null); }}
                    style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
                >
                  <ImageIcon /> Add Image
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={createPostMutation.isPending || (!newPostContent.trim() && !newPostImage)}
                  className="btn btn-primary btn-pill"
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}
                >
                  <SendIcon /> {createPostMutation.isPending ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {Array.from({ length: 3 }).map((_, i) => <SkeletonPost key={i} />)}
          </div>
        ) : allPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="empty-state"
            style={{ padding: "4rem 2rem", textAlign: "center" }}
          >
            <div className="empty-icon">
              <CommentIcon />
            </div>
            <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              No posts yet
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Be the first to share something with the community
            </p>
          </motion.div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <AnimatePresence>
              {allPosts.map((post, idx) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(idx * 0.06, 0.5), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="form-card"
                  style={{ padding: "1.25rem 1.5rem" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", backgroundColor: "var(--accent-subtle)", flexShrink: 0 }}>
                      {post.owner?.avatar ? (
                        <img src={post.owner.avatar} alt={post.owner.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 700 }}>
                          {(post.owner?.fullName?.[0] || "U").toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{post.owner?.fullName || post.owner?.username || "Anonymous"}</h4>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>{timeAgo(post.createdAt)}</p>
                    </div>
                  </div>

                  {post.content && (
                    <p style={{ fontSize: "0.92rem", color: "var(--text-primary)", lineHeight: 1.6, marginBottom: post.image ? "0.85rem" : "1rem", whiteSpace: "pre-wrap" }}>
                      {post.content}
                    </p>
                  )}

                  {post.image && (
                    <div style={{ marginBottom: "1rem", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                      <img src={post.image} alt="Post image" style={{ width: "100%", maxHeight: 400, objectFit: "cover" }} />
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border)" }}>
                    <button
                      onClick={() => likeMutation.mutate(post._id)}
                      disabled={likeMutation.isPending}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.4rem",
                        padding: "0.4rem 0.75rem", borderRadius: 99,
                        border: "none", cursor: "pointer",
                        backgroundColor: post.isLiked ? "var(--accent-subtle)" : "transparent",
                        color: post.isLiked ? "var(--accent)" : "var(--text-muted)",
                        fontWeight: 500, fontSize: "0.85rem",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!post.isLiked) e.currentTarget.style.color = "var(--accent)";
                      }}
                      onMouseLeave={(e) => {
                        if (!post.isLiked) e.currentTarget.style.color = "var(--text-muted)";
                      }}
                    >
                      <ThumbsUpIcon filled={post.isLiked} />
                      {post.likes > 0 && post.likes}
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      <CommentIcon />
                      {post.commentCount > 0 && post.commentCount}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {hasNextPage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: "flex", justifyContent: "center", paddingTop: "1rem" }}
              >
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="btn btn-primary"
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.65rem 1.75rem", borderRadius: 99,
                    fontSize: "0.85rem", fontWeight: 600,
                  }}
                >
                  {isFetchingNextPage ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }}
                    />
                  ) : (
                    "Load More"
                  )}
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
