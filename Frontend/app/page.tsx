"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useThemeStore } from "@/src/store/useThemeStore";
import { useKeyboardShortcuts } from "@/src/hooks/useKeyboardShortcuts";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface VideoOwner {
  fullName: string;
  avatar: string;
  username?: string;
}

interface Video {
  _id: string;
  thumbnail: string;
  title: string;
  description?: string;
  owner?: VideoOwner;
  views: number;
  duration: number;
  createdAt: string;
}

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const PlayLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const HomeIcon = ({ active }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const TrendingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);
const FireIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z"/></svg>
);
const ShortsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/><path d="M9 8l3-3 3 3"/></svg>
);
const LiveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
);
const BellIcon = ({ count }: { count?: number }) => (
  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    {count && count > 0 ? (
      <span style={{ position: "absolute", top: -4, right: -6, backgroundColor: "var(--accent)", color: "#fff", fontSize: "10px", fontWeight: 600, borderRadius: 99, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", lineHeight: 1 }}>
        {count > 99 ? "99+" : count}
      </span>
    ) : null}
  </div>
);
const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
);
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
);
const PlaySmall = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const SkeletonNav = () => (
  <div className="nav-premium" style={{ pointerEvents: "none" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div className="skeleton" style={{ width: 28, height: 28, borderRadius: "50%" }} />
      <div className="skeleton" style={{ width: 100, height: 18, borderRadius: 6 }} />
    </div>
    <div className="skeleton" style={{ width: 320, height: 40, borderRadius: 14 }} />
    <div style={{ display: "flex", gap: 8 }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 14 }} />
      <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%" }} />
    </div>
  </div>
);

const SkeletonHero = () => (
  <div className="hero-card" style={{ pointerEvents: "none" }}>
    <div className="skeleton" style={{ position: "absolute", inset: 0, borderRadius: 0 }} />
    <div style={{ position: "relative", zIndex: 10, padding: "40px 48px", width: "100%" }}>
      <div className="skeleton" style={{ width: 140, height: 28, borderRadius: 99, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: "60%", height: 40, borderRadius: 14, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: "35%", height: 20, borderRadius: 14, marginBottom: 24 }} />
      <div className="skeleton" style={{ width: 160, height: 48, borderRadius: 14 }} />
    </div>
  </div>
);

const SkeletonCard = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div className="skeleton" style={{ width: "100%", paddingTop: "56.25%", borderRadius: 18 }} />
    <div style={{ display: "flex", gap: 12, padding: "0 2px" }}>
      <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="skeleton" style={{ width: "90%", height: 16, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: "60%", height: 14, borderRadius: 6 }} />
      </div>
    </div>
  </div>
);

const formatViews = (views: number) => {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return views.toString();
};

const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

type SortBy = "createdAt" | "views" | "duration";
type SortType = "desc" | "asc";

interface SortConfig {
  sortBy: SortBy;
  sortType: SortType;
  label: string;
}

const sidebarSortMap: Record<string, SortConfig> = {
  home:     { sortBy: "createdAt", sortType: "desc", label: "Latest" },
  trending: { sortBy: "views",     sortType: "desc", label: "Trending" },
  library:  { sortBy: "createdAt", sortType: "asc",  label: "Oldest" },
  fire:     { sortBy: "views",     sortType: "desc", label: "Most Popular" },
};

const categories = ["All", "Latest", "Most Viewed", "Oldest", "Longest", "Shortest"];

const categorySortMap: Record<string, SortConfig> = {
  "All":        { sortBy: "createdAt", sortType: "desc", label: "All" },
  "Latest":     { sortBy: "createdAt", sortType: "desc", label: "Latest" },
  "Most Viewed":{ sortBy: "views",     sortType: "desc", label: "Most Viewed" },
  "Oldest":     { sortBy: "createdAt", sortType: "asc",  label: "Oldest" },
  "Longest":    { sortBy: "duration",  sortType: "desc", label: "Longest" },
  "Shortest":   { sortBy: "duration",  sortType: "asc",  label: "Shortest" },
};

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSidebar, setActiveSidebar] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sortBy = params.get("sortBy") as SortBy | null;
    const sortType = params.get("sortType") as SortType | null;
    if (sortBy) {
      const matchingCategory = Object.entries(categorySortMap).find(
        ([, v]) => v.sortBy === sortBy && (!sortType || v.sortType === sortType)
      );
      if (matchingCategory) {
        setActiveCategory(matchingCategory[0]);
        setActiveSidebar("trending");
      }
    }
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);
  useKeyboardShortcuts([
    { key: "k", description: "Focus search", action: () => searchInputRef.current?.focus() },
    { key: "/", description: "Focus search", action: () => searchInputRef.current?.focus() },
    { key: "Escape", description: "Close / Go back", action: () => { setProfileOpen(false); } },
    { key: "h", description: "Go home", action: () => router.push("/") },
    { key: "l", description: "Go to library", action: () => router.push("/library") },
    { key: "n", description: "Go to notifications", action: () => router.push("/notifications") },
  ]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setDebouncedSearch(searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedSearch("");
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const currentSort = activeCategory !== "All"
    ? categorySortMap[activeCategory]
    : sidebarSortMap[activeSidebar];

  const { data: categoriesRes } = useQuery({
    queryKey: ["video-categories"],
    queryFn: async () => {
      const res = await api.get("/videos/categories");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const { data: notifCountRes } = useQuery({
    queryKey: ["notification-unread-count"],
    queryFn: async () => {
      const res = await api.get("/notifications/unread-count");
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const unreadCount: number = notifCountRes?.data?.count || 0;

  const { data: response, isLoading: videosLoading, error } = useQuery({
    queryKey: ["videos", currentSort.sortBy, currentSort.sortType, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        sortBy: currentSort.sortBy,
        sortType: currentSort.sortType,
        limit: "50",
      });
      if (debouncedSearch.trim()) {
        params.set("query", debouncedSearch.trim());
      }
      const res = await api.get(`/videos?${params.toString()}`);
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const handleLogout = async () => {
    try {
      await api.post("/users/logout");
      logout();
      router.push("/login");
    } catch {
      alert("Failed to logout");
    }
  };

  const handleSidebarClick = (key: string) => {
    setActiveSidebar(key);
    setActiveCategory("All");
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    if (cat !== "All") {
      setActiveSidebar("");
    } else {
      setActiveSidebar("home");
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-secondary)", fontWeight: 500, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: 36, height: 36, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }}
          />
          {authLoading ? "Loading session..." : "Redirecting to login..."}
        </motion.div>
      </div>
    );
  }

  const videos: Video[] = response?.data?.docs || [];
  const featuredVideo = videos.length > 0 ? videos[0] : null;
  const gridVideos = videos.slice(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      {/* ── NAVIGATION ── */}
      {videosLoading ? <SkeletonNav /> : (
        <nav className="nav-premium">
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
              <PlayLogo size={16} />
            </div>
            <span style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              VideoTube
            </span>
          </Link>

          <form onSubmit={handleSearchSubmit} className="search-box">
            <SearchIcon />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button type="button" onClick={clearSearch} style={{ display: "flex", alignItems: "center", color: "var(--text-muted)", flexShrink: 0 }}>
                <CloseIcon />
              </button>
            )}
          </form>

          <div className="nav-actions">
            <button
              onClick={() => router.push("/notifications")}
              className="icon-btn"
              title="Notifications"
            >
              <BellIcon count={unreadCount} />
            </button>

            <div className="profile-wrapper" ref={profileRef}>
              <button
                className="avatar-btn"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user?.avatar} alt={user?.fullName} />
              </button>

              <div className={`profile-dropdown ${profileOpen ? "open" : ""}`}>
                <div className="dropdown-header">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={user?.avatar} alt={user?.fullName} />
                  <div className="user-info">
                    <span className="user-name">{user?.fullName}</span>
                    <span className="user-email">@{user?.username || user?.email}</span>
                  </div>
                </div>

                <Link href={`/channel/${user?.username}`} className="dropdown-item" onClick={() => setProfileOpen(false)}>
                  <UserIcon /> My Channel
                </Link>
                <Link href="/notifications" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                  <BellIcon /> Notifications
                </Link>
                <Link href="/edit-profile" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit Profile
                </Link>
                <Link href="/settings" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  Settings
                </Link>

                <div className="dropdown-divider" />

                <button className="dropdown-item danger" onClick={() => { setProfileOpen(false); handleLogout(); }}>
                  <LogoutIcon /> Log out
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div style={{ display: "flex", flex: 1, paddingTop: 72, width: "100%", position: "relative", zIndex: 10 }}>

        {/* ── SIDEBAR ── */}
        <aside className="sidebar-premium">
          <button
            className={`sidebar-btn ${activeSidebar === "home" ? "active" : ""}`}
            title="Home"
            onClick={() => handleSidebarClick("home")}
          >
            <HomeIcon active={activeSidebar === "home"} />
          </button>
          <button
            className={`sidebar-btn ${activeSidebar === "trending" ? "active" : ""}`}
            title="Trending"
            onClick={() => handleSidebarClick("trending")}
          >
            <TrendingIcon />
          </button>
          <button
            className={`sidebar-btn ${activeSidebar === "fire" ? "active" : ""}`}
            title="Most Popular"
            onClick={() => handleSidebarClick("fire")}
          >
            <FireIcon />
          </button>
          <button
            className="sidebar-btn"
            title="Shorts"
            onClick={() => router.push("/shorts")}
          >
            <ShortsIcon />
          </button>
          <button
            className="sidebar-btn"
            title="Subscriptions"
            onClick={() => handleSidebarClick("library")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </button>
          <div style={{ width: 24, height: 1, background: "var(--border)", margin: "4px auto" }} />
          <button
            className="sidebar-btn"
            title="Live Streams"
            onClick={() => router.push("/live")}
          >
            <LiveIcon />
          </button>
          <button
            className="sidebar-btn"
            title="Stream Dashboard"
            onClick={() => router.push("/live/dashboard")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          </button>
          <button
            className="sidebar-btn"
            title="Community"
            onClick={() => router.push("/community")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </button>
          <button
            className="sidebar-btn"
            title="Donations"
            onClick={() => router.push("/donations")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </button>
          <div style={{ width: 24, height: 1, background: "var(--border)", margin: "4px auto" }} />
          <button
            className="sidebar-btn"
            title="Notifications"
            onClick={() => router.push("/notifications")}
          >
            <BellIcon count={unreadCount} />
          </button>
          <button
            className="sidebar-btn"
            title="Creator Studio"
            onClick={() => router.push("/studio")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          </button>
          <div style={{ width: 24, height: 1, background: "var(--border)", margin: "4px auto" }} />
          <button
            className="sidebar-btn"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </aside>

        {/* ── CONTENT ── */}
        <main style={{ flex: 1, padding: "32px 32px 80px 16px", display: "flex", flexDirection: "column", gap: 32 }}>

          {/* FEATURED HERO */}
          {videosLoading ? <SkeletonHero /> : featuredVideo && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="hero-card"
            >
              <div className="hero-bg" style={{ backgroundImage: `url(${featuredVideo.thumbnail})` }} />
              <div className="hero-gradient" />

              <div className="hero-content">
                <div>
                  <motion.div
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                    className="hero-badge"
                  >
                    <FireIcon /> Featured
                  </motion.div>
                  <motion.h1
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
                    className="hero-title"
                  >
                    {featuredVideo.title}
                  </motion.h1>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                    className="hero-meta"
                  >
                    <span>{featuredVideo.owner?.fullName}</span>
                    <span className="dot" />
                    <span>{formatViews(featuredVideo.views)} views</span>
                    <span className="dot" />
                    <span>{formatDuration(featuredVideo.duration)}</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  >
                    <Link href={`/videos/${featuredVideo._id}`} className="hero-btn">
                      <PlaySmall /> Watch Now
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {/* FILTER CHIPS */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            <style dangerouslySetInnerHTML={{__html: `div::-webkit-scrollbar { display: none; }`}} />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`chip-premium ${activeCategory === cat ? "active" : ""}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Active sort indicator */}
          {currentSort && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)", marginTop: -16 }}>
              <span>Showing:</span>
              <span style={{ fontWeight: 600, color: "var(--accent)" }}>{currentSort.label}</span>
              {debouncedSearch && (
                <>
                  <span>·</span>
                  <span>Search: &ldquo;{debouncedSearch}&rdquo;</span>
                  <button onClick={clearSearch} style={{ color: "var(--accent)", fontWeight: 600, fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>Clear</button>
                </>
              )}
            </div>
          )}

          {/* VIDEO GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "32px 16px" }}>

            {videosLoading && (
              <>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </>
            )}

            {error && (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>Something went wrong</p>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Failed to load videos. Please try again later.</p>
              </div>
            )}

            <AnimatePresence>
              {!videosLoading && gridVideos.map((video, idx) => (
                <motion.div
                  key={video._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.4), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={`/videos/${video._id}`}
                    className="video-card-premium"
                  >
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

            {!videosLoading && videos.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">
                  {debouncedSearch ? <SearchIcon /> : <PlayLogo size={28} />}
                </div>
                <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                  {debouncedSearch ? "No results found" : "No videos yet"}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
                  {debouncedSearch ? `No videos match "${debouncedSearch}"` : "Be the first to share something amazing"}
                </p>
                {debouncedSearch ? (
                  <button onClick={clearSearch} className="btn-primary">
                    Clear Search
                  </button>
                ) : (
                  <Link href="/studio" className="btn-primary" style={{ textDecoration: "none" }}>
                    <PlusIcon /> Upload Video
                  </Link>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
