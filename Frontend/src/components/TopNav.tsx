"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useThemeStore } from "@/src/store/useThemeStore";
import { api } from "@/src/services/api";
import { useKeyboardShortcuts } from "@/src/hooks/useKeyboardShortcuts";
import {
  SearchIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  PlayIcon,
  UserIcon,
  UploadIcon,
  SettingsIcon,
  LogoutIcon,
  ChevronDownIcon,
  StudioIcon,
  UsersIcon,
  ClockIcon,
  HeartIcon,
  LibraryIcon,
  ExternalLinkIcon,
} from "@/src/components/icons";

export default function TopNav() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useQuery({
    queryKey: ["unreadNotifications"],
    queryFn: async () => {
      const res = await api.get("/notifications/unread-count");
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  const unreadCount: number = unreadData?.unreadCount ?? 0;

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  useKeyboardShortcuts([
    { key: "k", ctrl: true, description: "Focus search", action: focusSearch },
    { key: "/", description: "Focus search", action: focusSearch },
    { key: "Escape", description: "Close dropdown", action: closeDropdown },
  ]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/users/logout");
    } finally {
      logout();
      setIsDropdownOpen(false);
      router.push("/login");
    }
  };

  if (!user) {
    return (
      <div className="topnav" style={{ pointerEvents: "none" }}>
        <div className="topnav-logo">
          <div className="topnav-logo-icon skeleton" style={{ width: 32, height: 32 }} />
          <div className="skeleton" style={{ width: 90, height: 16 }} />
        </div>
        <div className="topnav-search">
          <div className="skeleton" style={{ width: 200, height: 16 }} />
        </div>
        <div className="topnav-actions">
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "var(--radius-md)" }} />
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "var(--radius-md)" }} />
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "var(--radius-full)" }} />
        </div>
      </div>
    );
  }

  return (
    <nav className="topnav">
      <Link href="/" className="topnav-logo">
        <div className="topnav-logo-icon">
          <PlayIcon size={16} />
        </div>
        <span className="topnav-logo-text">VideoTube</span>
      </Link>

      <form className="topnav-search" onSubmit={handleSearchSubmit}>
        <SearchIcon size={16} />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search videos, channels, creators..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <kbd className="topnav-search-kbd">&#8984;K</kbd>
      </form>

      <div className="topnav-actions">
        <Link href="/studio" className="topnav-upload-btn">
          <UploadIcon size={16} />
          <span>Upload</span>
        </Link>

        <Link href="/notifications" className="btn-icon" style={{ position: "relative" }}>
          <BellIcon size={20} />
          {unreadCount > 0 && (
            <span className="badge" style={{ position: "absolute", top: 2, right: 2 }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            className="topnav-avatar"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-label="User menu"
          >
            <img src={user.avatar} alt={user.fullName} />
            <ChevronDownIcon size={14} />
          </button>

          <div className={`dropdown${isDropdownOpen ? " open" : ""}`}>
            <div className="dropdown-header">
              <div style={{ position: "relative" }}>
                <img src={user.avatar} alt={user.fullName} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                <span className="online-dot" />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="dropdown-name">{user.fullName}</div>
                <div className="dropdown-email">@{user.username}</div>
              </div>
            </div>

            <Link
              href={`/channel/${user.username}`}
              className="dropdown-item"
              style={{ color: "var(--accent)", fontWeight: 500 }}
              onClick={() => setIsDropdownOpen(false)}
            >
              View your channel
              <ExternalLinkIcon size={14} />
            </Link>

            <div className="dropdown-divider" />

            <Link href={`/channel/${user.username}`} className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
              <UserIcon size={16} />
              My Channel
              <span style={{ marginLeft: "auto" }}><ChevronDownIcon size={14} /></span>
            </Link>

            <Link href="/studio" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
              <StudioIcon size={16} />
              Creator Studio
              <span style={{ marginLeft: "auto" }}><ChevronDownIcon size={14} /></span>
            </Link>

            <button className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
              <UsersIcon size={16} />
              Switch Account
              <span style={{ marginLeft: "auto" }}><ChevronDownIcon size={14} /></span>
            </button>

            <div className="dropdown-divider" />

            <Link href="/notifications" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
              <BellIcon size={16} />
              Notifications
              {unreadCount > 0 && (
                <span className="dropdown-badge">{unreadCount}</span>
              )}
            </Link>

            <Link href="/library" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
              <ClockIcon size={16} />
              Watch Later
            </Link>

            <Link href="/liked" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
              <HeartIcon size={16} />
              Liked Videos
            </Link>

            <Link href="/history" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
              <LibraryIcon size={16} />
              History
            </Link>

            <div className="dropdown-divider" />

            <Link href="/settings" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
              <SettingsIcon size={16} />
              Settings
            </Link>

            <button className="dropdown-item" onClick={toggleTheme}>
              {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
              Appearance
              <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
                {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
              </span>
            </button>

            <div className="dropdown-divider" />

            <button className="dropdown-item danger" onClick={handleLogout}>
              <LogoutIcon size={16} />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
