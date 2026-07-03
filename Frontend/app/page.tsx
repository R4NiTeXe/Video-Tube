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

// ── Icons ──
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
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
const LibraryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
);
const FireIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z"/></svg>
);
const ShortsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/><path d="M9 8l3-3 3 3"/></svg>
);
const LiveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/><line x1="2" y1="2" x2="22" y2="22" opacity="0.5"/></svg>
);
const BellIcon = ({ count }: { count?: number }) => (
  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    {count && count > 0 ? (
      <span style={{ position: "absolute", top: -4, right: -6, backgroundColor: "var(--accent-warm)", color: "#fff", fontSize: "0.6rem", fontWeight: 700, borderRadius: 99, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", lineHeight: 1 }}>
        {count > 99 ? "99+" : count}
      </span>
    ) : null}
  </div>
);
const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
);
const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
);
const PlaySmall = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);
const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

// ── Skeleton Components ──
const SkeletonNav = () => (
  <div className="nav-premium" style={{ pointerEvents: "none" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <div className="skeleton" style={{ width: 28, height: 28, borderRadius: "50%" }} />
      <div className="skeleton" style={{ width: 100, height: 18, borderRadius: 6 }} />
    </div>
    <div className="skeleton" style={{ width: "30%", height: 36, borderRadius: 99 }} />
    <div style={{ display: "flex", gap: "0.6rem" }}>
      <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 99 }} />
      <div className="skeleton" style={{ width: 38, height: 38, borderRadius: "50%" }} />
    </div>
  </div>
);

const SkeletonHero = () => (
  <div className="hero-card" style={{ pointerEvents: "none" }}>
    <div className="skeleton" style={{ position: "absolute", inset: 0, borderRadius: 0 }} />
    <div style={{ position: "relative", zIndex: 10, padding: "3rem 3.5rem", width: "100%" }}>
      <div className="skeleton" style={{ width: 140, height: 28, borderRadius: 99, marginBottom: "1.25rem" }} />
      <div className="skeleton" style={{ width: "60%", height: 40, borderRadius: 8, marginBottom: "0.75rem" }} />
      <div className="skeleton" style={{ width: "35%", height: 20, borderRadius: 6, marginBottom: "1.75rem" }} />
      <div className="skeleton" style={{ width: 160, height: 48, borderRadius: 99 }} />
    </div>
  </div>
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

  // Initialize sort from URL params (for ?sortBy=views&sortType=desc from Trending link)
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

  // Keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  useKeyboardShortcuts([
    { key: "k", description: "Focus search", action: () => searchInputRef.current?.focus() },
    { key: "/", description: "Focus search", action: () => searchInputRef.current?.focus() },
    { key: "Escape", description: "Close / Go back", action: () => { setProfileOpen(false); } },
    { key: "h", description: "Go home", action: () => router.push("/") },
    { key: "l", description: "Go to library", action: () => router.push("/library") },
    { key: "n", description: "Go to notifications", action: () => router.push("/notifications") },
  ]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Search only on Enter/submit
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

  // Determine sort config from sidebar or category
  const currentSort = activeCategory !== "All"
    ? categorySortMap[activeCategory]
    : sidebarSortMap[activeSidebar];

  // Fetch available categories from backend
  const { data: categoriesRes } = useQuery({
    queryKey: ["video-categories"],
    queryFn: async () => {
      const res = await api.get("/videos/categories");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const backendCategories: string[] = categoriesRes?.data || [];

  // Fetch unread notification count
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
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "var(--text-secondary)", fontWeight: 500, display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: 36, height: 36, border: "3px solid var(--border-light)", borderTopColor: "var(--accent)", borderRadius: "50%" }}
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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--bg-primary)", position: "relative" }}>
      
      {/* ── AMBIENT BACKGROUND ── */}
      <div style={{ position: "fixed", top: "5%", left: "30%", width: "50vw", height: "50vw", background: "var(--accent)", filter: "blur(250px)", opacity: 0.035, borderRadius: "50%", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "10%", right: "10%", width: "30vw", height: "30vw", background: "var(--accent)", filter: "blur(200px)", opacity: 0.025, borderRadius: "50%", pointerEvents: "none", zIndex: 0 }} />

      {/* ── NAVIGATION ── */}
      {videosLoading ? <SkeletonNav /> : (
        <nav className="nav-premium">
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", boxShadow: "var(--shadow-accent)" }}>
              <PlayLogo size={16} />
            </div>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
              Video<span style={{ color: "var(--text-muted)" }}>Tube</span>
            </span>
          </Link>

          {/* Search */}
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
            {/* Notification Bell */}
            <button 
              onClick={() => router.push("/notifications")}
              style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <BellIcon count={unreadCount} />
            </button>

            {/* Profile Dropdown */}
            <div className="profile-wrapper" ref={profileRef}>
              <button 
                className="avatar-btn" 
                onClick={() => setProfileOpen(!profileOpen)}
                style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", border: `2px solid ${profileOpen ? "var(--accent)" : "var(--border-light)"}`, cursor: "pointer", transition: "border-color 0.2s", background: "none", padding: 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user?.avatar} alt={user?.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                <Link href="/shorts" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                  <ShortsIcon /> Shorts
                </Link>
                <Link href="/live" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                  <LiveIcon /> Live
                </Link>
                <Link href="/library" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                  <LibraryIcon /> Library
                </Link>
                <Link href="/notifications" className="dropdown-item" onClick={() => setProfileOpen(false)} style={{ position: "relative" }}>
                  <BellIcon count={unreadCount} /> Notifications
                </Link>
                <Link href="/studio" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  Creator Studio
                </Link>
                <Link href="/edit-profile" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit Profile
                </Link>
                <Link href="/settings" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
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
      <div style={{ display: "flex", flex: 1, paddingTop: "100px", width: "100%", position: "relative", zIndex: 10 }}>
        
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
            className={`sidebar-btn ${activeSidebar === "shorts" ? "active" : ""}`} 
            title="Shorts"
            onClick={() => router.push("/shorts")}
          >
            <ShortsIcon />
          </button>
          <button 
            className={`sidebar-btn ${activeSidebar === "live" ? "active" : ""}`} 
            title="Live"
            onClick={() => router.push("/live")}
          >
            <LiveIcon />
          </button>
          <button 
            className={`sidebar-btn ${activeSidebar === "trending" ? "active" : ""}`} 
            title="Trending"
            onClick={() => handleSidebarClick("trending")}
          >
            <TrendingIcon />
          </button>
          <button 
            className={`sidebar-btn ${activeSidebar === "library" ? "active" : ""}`} 
            title="Library"
            onClick={() => handleSidebarClick("library")}
          >
            <LibraryIcon />
          </button>
          <button 
            className={`sidebar-btn ${activeSidebar === "fire" ? "active" : ""}`} 
            title="Most Popular"
            onClick={() => handleSidebarClick("fire")}
          >
            <FireIcon />
          </button>
          <button 
            className={`sidebar-btn ${activeSidebar === "community" ? "active" : ""}`} 
            title="Community"
            onClick={() => router.push("/community")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </button>
          <div style={{ width: "100%", height: 1, background: "var(--border-light)", margin: "0.25rem 0" }} />
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
          <div style={{ width: "100%", height: 1, background: "var(--border-light)", margin: "0.25rem 0" }} />
          <button 
            className="sidebar-btn" 
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </aside>

        {/* ── CONTENT ── */}
        <main style={{ flex: 1, padding: "0 2rem 4rem 2rem", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          
          {/* FEATURED HERO */}
          {videosLoading ? <SkeletonHero /> : featuredVideo && (
            <motion.div 
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="hero-card"
            >
              <div className="hero-bg" style={{ backgroundImage: `url(${featuredVideo.thumbnail})` }} />
              <div className="hero-gradient" />
              
              <div className="hero-content">
                <div>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                    className="hero-badge"
                  >
                    <FireIcon /> Featured Premiere
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
                    className="hero-title"
                  >
                    {featuredVideo.title}
                  </motion.h1>
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                    className="hero-meta"
                  >
                    <span>{featuredVideo.owner?.fullName}</span>
                    <span className="dot" />
                    <span>{formatViews(featuredVideo.views)} views</span>
                    <span className="dot" />
                    <span>{formatDuration(featuredVideo.duration)}</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
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
          <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem", scrollbarWidth: "none" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "-1rem" }}>
              <span>Showing:</span>
              <span style={{ fontWeight: 600, color: "var(--accent)" }}>{currentSort.label}</span>
              {debouncedSearch && (
                <>
                  <span>·</span>
                  <span>Search: &ldquo;{debouncedSearch}&rdquo;</span>
                  <button onClick={clearSearch} style={{ color: "var(--accent)", fontWeight: 600, fontSize: "0.82rem" }}>Clear</button>
                </>
              )}
            </div>
          )}

          {/* VIDEO GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem 1.25rem" }}>
            
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
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Something went wrong</p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Failed to load videos. Please try again later.</p>
              </div>
            )}
            
            <AnimatePresence>
              {!videosLoading && gridVideos.map((video, idx) => (
                <motion.div 
                  key={video._id} 
                  initial={{ opacity: 0, y: 24 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(idx * 0.06, 0.6), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
                  {debouncedSearch ? <SearchIcon /> : <PlayLogo size={32} />}
                </div>
                <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  {debouncedSearch ? "No results found" : "No videos yet"}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                  {debouncedSearch ? `No videos match "${debouncedSearch}"` : "Be the first to share something amazing"}
                </p>
                {debouncedSearch ? (
                  <button onClick={clearSearch} className="btn-primary" style={{ borderRadius: 99, padding: "0.7rem 1.75rem" }}>
                    Clear Search
                  </button>
                ) : (
                  <Link href="/studio" className="btn-primary" style={{ borderRadius: 99, padding: "0.7rem 1.75rem" }}>
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
