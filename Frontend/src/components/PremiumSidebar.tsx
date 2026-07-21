"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useThemeStore } from "@/src/store/useThemeStore";
import { useAuthStore } from "@/src/store/useAuthStore";
import {
  HomeIcon,
  LibraryIcon,
  CommunityIcon,
  SubscriptionsIcon,
  PlaylistsIcon,
  SunIcon,
  MoonIcon,
  ChevronRightIcon,
} from "@/src/components/icons";

const navItems = [
  { key: "home", href: "/", label: "Home", icon: HomeIcon },
  { key: "subscriptions", href: "/subscriptions", label: "Subscriptions", icon: SubscriptionsIcon },
  { key: "library", href: "/library", label: "Library", icon: LibraryIcon },
  { key: "playlists", href: "/playlists", label: "Playlists", icon: PlaylistsIcon },
  { key: "community", href: "/community", label: "Community", icon: CommunityIcon },
];

export default function PremiumSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useThemeStore();
  const { user } = useAuthStore();

  const isActive = (item: typeof navItems[0]) => {
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <nav className="sidebar" aria-label="Sidebar navigation">
      <div className="sidebar-nav-items">
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`sidebar-btn${isActive(item) ? " active" : ""}`}
            title={item.label}
            aria-current={isActive(item) ? "page" : undefined}
          >
            <item.icon active={isActive(item)} aria-hidden="true" />
            <span className="sidebar-btn-label">{item.label}</span>
          </Link>
        ))}
      </div>

      {user && (
        <div className="sidebar-bottom">
          <button className="sidebar-profile-card" onClick={() => router.push(`/channel/${user.username}`)} aria-label={`Your profile: ${user.fullName}`}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <img src={user.avatar} alt="" className="sidebar-profile-avatar" />
              <span className="online-dot" aria-hidden="true" />
            </div>
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">{user.fullName}</span>
              <span className="sidebar-profile-handle">@{user.username}</span>
            </div>
            <ChevronRightIcon size={14} aria-hidden="true" />
          </button>

          <button className="sidebar-theme-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <SunIcon size={16} aria-hidden="true" /> : <MoonIcon size={16} aria-hidden="true" />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            <span className="sidebar-theme-toggle-track" aria-hidden="true">
              <span className={`sidebar-theme-toggle-thumb${theme === "dark" ? " on" : ""}`} />
            </span>
          </button>
        </div>
      )}
    </nav>
  );
}
