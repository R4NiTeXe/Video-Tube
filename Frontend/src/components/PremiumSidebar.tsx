"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useThemeStore } from "@/src/store/useThemeStore";
import { useAuthStore } from "@/src/store/useAuthStore";
import {
  HomeIcon,
  TrendingIcon,
  FireIcon,
  ShortsIcon,
  LibraryIcon,
  LiveIcon,
  CommunityIcon,
  BellIcon,
  StudioIcon,
  SunIcon,
  MoonIcon,
  ClockIcon,
  HeartIcon,
  SettingsIcon,
  ChevronRightIcon,
} from "@/src/components/icons";

interface PremiumSidebarProps {
  activeSection?: string;
}

export default function PremiumSidebar({ activeSection = "home" }: PremiumSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useThemeStore();
  const { user } = useAuthStore();

  const isActive = (section: string, href?: string) => {
    if (href) return pathname === href || pathname.startsWith(href.split("?")[0]);
    return activeSection === section;
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-nav-items">
        <Link href="/" className={`sidebar-btn${isActive("home", "/") ? " active" : ""}`}>
          <HomeIcon active={isActive("home", "/")} />
        </Link>

        <Link href="/?sortBy=views&sortType=desc" className={`sidebar-btn${isActive("trending") ? " active" : ""}`}>
          <TrendingIcon />
        </Link>

        <Link href="/shorts" className={`sidebar-btn${isActive("shorts", "/shorts") ? " active" : ""}`}>
          <ShortsIcon />
        </Link>

        <Link href="/library" className={`sidebar-btn${isActive("library", "/library") ? " active" : ""}`}>
          <LibraryIcon />
        </Link>

        <div className="sidebar-divider" />

        <Link href="/history" className={`sidebar-btn${isActive("history", "/history") ? " active" : ""}`}>
          <ClockIcon />
        </Link>

        <Link href="/liked" className={`sidebar-btn${isActive("liked", "/liked") ? " active" : ""}`}>
          <HeartIcon />
        </Link>

        <div className="sidebar-divider" />

        <Link href="/live" className={`sidebar-btn${isActive("live", "/live") ? " active" : ""}`}>
          <LiveIcon />
        </Link>

        <Link href="/community" className={`sidebar-btn${isActive("community", "/community") ? " active" : ""}`}>
          <CommunityIcon />
        </Link>

        <div className="sidebar-divider" />

        <Link href="/notifications" className={`sidebar-btn${isActive("notifications", "/notifications") ? " active" : ""}`}>
          <BellIcon />
        </Link>

        <Link href="/studio" className={`sidebar-btn${isActive("studio", "/studio") ? " active" : ""}`}>
          <StudioIcon />
        </Link>

        <div className="sidebar-divider" />

        <Link href="/settings" className={`sidebar-btn${isActive("settings", "/settings") ? " active" : ""}`}>
          <SettingsIcon />
        </Link>
      </div>

      {/* Bottom: User Profile Card */}
      {user && (
        <div className="sidebar-bottom">
          <button className="sidebar-profile-card" onClick={() => router.push(`/channel/${user.username}`)}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <img src={user.avatar} alt={user.fullName} className="sidebar-profile-avatar" />
              <span className="online-dot" />
            </div>
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">{user.fullName}</span>
              <span className="sidebar-profile-handle">@{user.username}</span>
            </div>
            <ChevronRightIcon size={14} />
          </button>

          <button className="sidebar-theme-btn" onClick={toggleTheme}>
            {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            <span className="sidebar-theme-toggle-track">
              <span className={`sidebar-theme-toggle-thumb${theme === "dark" ? " on" : ""}`} />
            </span>
          </button>
        </div>
      )}
    </nav>
  );
}
