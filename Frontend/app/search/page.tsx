"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PageMeta } from "@/src/components/PageMeta";
import { formatViews, formatDuration } from "@/src/lib/utils";

const STORAGE_KEY = "vt-recent-searches";
const MAX_RECENT = 8;

const SearchIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

const PlaySmall = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);


interface VideoResult {
  _id: string;
  thumbnail: string;
  title: string;
  views: number;
  duration: number;
  owner?: { fullName: string; avatar: string; username?: string };
}

interface ChannelResult {
  _id: string;
  avatar: string;
  fullName: string;
  username?: string;
  subscribersCount?: number;
}

interface UserResult {
  _id: string;
  avatar: string;
  fullName: string;
  username?: string;
}

type Tab = "videos" | "channels" | "users";

const tabs: { key: Tab; label: string }[] = [
  { key: "videos", label: "Videos" },
  { key: "channels", label: "Channels" },
  { key: "users", label: "Users" },
];

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return;
  const recent = getRecentSearches().filter((r) => r !== query);
  recent.unshift(query);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

// Backend-backed search history
async function fetchSearchHistory(): Promise<string[]> {
  try {
    const res = await api.get("/users/search/history");
    return res.data?.data || [];
  } catch {
    return getRecentSearches(); // fallback to localStorage
  }
}

async function addSearchHistoryBackend(query: string): Promise<void> {
  try {
    await api.post("/users/search/history", { query });
  } catch {
    saveRecentSearch(query); // fallback to localStorage
  }
}

async function clearSearchHistoryBackend(): Promise<void> {
  try {
    await api.delete("/users/search/history");
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("videos");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetchSearchHistory().then(setRecentSearches);
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      addSearchHistoryBackend(query.trim());
      fetchSearchHistory().then(setRecentSearches);
      setDebouncedQuery(query);
    }
  };

  const pickRecent = (term: string) => {
    setQuery(term);
    setDebouncedQuery(term);
    inputRef.current?.focus();
  };

  const clearRecent = () => {
    clearSearchHistoryBackend();
    setRecentSearches([]);
  };

  
  const { data: videosResp, isLoading: videosLoading } = useQuery({
    queryKey: ["search-videos", debouncedQuery],
    queryFn: async () => {
      const res = await api.get(`/videos?query=${encodeURIComponent(debouncedQuery)}&limit=30`);
      return res.data;
    },
    enabled: activeTab === "videos" && !!debouncedQuery.trim(),
  });

  
  const { data: channelsResp, isLoading: channelsLoading } = useQuery({
    queryKey: ["search-channels", debouncedQuery],
    queryFn: async () => {
      const res = await api.get(`/videos/search/channels?query=${encodeURIComponent(debouncedQuery)}`);
      return res.data;
    },
    enabled: activeTab === "channels" && !!debouncedQuery.trim(),
  });

  
  const { data: usersResp, isLoading: usersLoading } = useQuery({
    queryKey: ["search-users", debouncedQuery],
    queryFn: async () => {
      const res = await api.get(`/users/search?query=${encodeURIComponent(debouncedQuery)}`);
      return res.data;
    },
    enabled: activeTab === "users" && !!debouncedQuery.trim(),
  });

  const videos: VideoResult[] = videosResp?.data?.docs || [];
  const channels: ChannelResult[] = channelsResp?.data || [];
  const users: UserResult[] = usersResp?.data || [];

  const showSuggestions = !debouncedQuery.trim();

  return (
    <>
      <PageMeta
        title={debouncedQuery ? `Search: ${debouncedQuery}` : "Search"}
        description={debouncedQuery ? `Search results for "${debouncedQuery}" on VideoTube.` : "Search for videos, channels, and users on VideoTube."}
        noIndex
      />
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--glass-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid var(--glass-border)" }}>
        <form onSubmit={handleSubmit} style={{ maxWidth: 1400, margin: "0 auto", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg-secondary)", border: "1.5px solid var(--border-medium)", borderRadius: "var(--radius-md)", padding: "0 0.85rem", transition: "border-color 0.2s, box-shadow 0.2s" }}>
            <SearchIcon size={18} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search"
              style={{ flex: 1, border: "none", background: "transparent", color: "var(--text-primary)", fontSize: "0.9rem", padding: "0.7rem 0", outline: "none" }}
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); setDebouncedQuery(""); inputRef.current?.focus(); }} style={{ display: "flex", color: "var(--text-muted)", padding: 4 }}>
                <CloseIcon />
              </button>
            )}
          </div>
        </form>
      </div>
        
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "1.5rem 2rem" }}>

        
        {showSuggestions && (
          <div>
            {recentSearches.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
                  <h1 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>Recent Searches</h1>
                  <button onClick={clearRecent} style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>Clear all</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => pickRecent(term)}
                      style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.75rem", borderRadius: "var(--radius-sm)", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontSize: "0.88rem", textAlign: "left", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--elevated)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <ClockIcon /> {term}
                    </button>
                  ))}
                </div>
                <div style={{ height: 1, background: "var(--border)", margin: "1.25rem 0" }} />
              </div>
            )}

            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--elevated)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", color: "var(--text-muted)" }}>
                <SearchIcon size={28} />
              </div>
              <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.4rem" }}>Search VideoTube</p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Find videos, channels, and users</p>
            </div>
          </div>
        )}

        
        {!showSuggestions && (
          <>
            {/* TABS */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: activeTab === tab.key ? "var(--accent-subtle)" : "none",
                    color: activeTab === tab.key ? "var(--accent)" : "var(--text-secondary)",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    fontWeight: activeTab === tab.key ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                
                {/* VIDEOS TAB */}
                {activeTab === "videos" && (
                  <div>
                    {videosLoading ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>Loading videos...</div>
                    ) : videos.length === 0 ? (
                      <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>No videos found.</p>
                    ) : (
                      <div className="video-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
                        {videos.map(v => (
                          <motion.div key={v._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Link href={`/videos/${v._id}`} className="video-card" style={{ textDecoration: "none" }}>
                              <div className="thumb-wrapper" style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: "var(--radius-lg)", overflow: "hidden", backgroundColor: "var(--bg-secondary)" }}>
                                <img src={v.thumbnail} alt={v.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                <div className="thumb-overlay">
                                  <div className="play-circle"><PlaySmall /></div>
                                </div>
                                <span className="duration-badge" style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.8)", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600 }}>{formatDuration(v.duration)}</span>
                              </div>
                              <div className="card-info" style={{ marginTop: "0.75rem" }}>
                                <h2 className="card-title" style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>{v.title}</h2>
                                <div className="card-meta" style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)", alignItems: "center" }}>
                                  <span className="channel-name">{v.owner?.fullName}</span>
                                  <span>&middot;</span>
                                  <span>{formatViews(v.views)} views</span>
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* CHANNELS TAB */}
                {activeTab === "channels" && (
                  <div>
                    {channelsLoading ? (
                      <div>Loading channels...</div>
                    ) : channels.length === 0 ? (
                      <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>No channels found.</p>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
                        {channels.map(ch => (
                          <motion.div key={ch._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Link href={`/channel/${ch.username}`} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", borderRadius: "var(--radius-lg)", backgroundColor: "var(--card)", textDecoration: "none", border: "1px solid var(--border)" }}>
                              <img src={ch.avatar} alt={ch.fullName} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.fullName}</p>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>@{ch.username}{typeof ch.subscribersCount === "number" ? ` · ${formatViews(ch.subscribersCount)} subscribers` : ""}</p>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* USERS TAB */}
                {activeTab === "users" && (
                  <div>
                    {usersLoading ? (
                      <div>Loading users...</div>
                    ) : users.length === 0 ? (
                      <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>No users found.</p>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
                        {users.map(u => (
                          <motion.div key={u._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Link href={`/channel/${u.username}`} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", borderRadius: "var(--radius-lg)", backgroundColor: "var(--card)", textDecoration: "none", border: "1px solid var(--border)" }}>
                              <img src={u.avatar} alt={u.fullName} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", flexShrink: 0 }} />
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.fullName}</p>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>@{u.username}</p>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
    </>
  );
}
