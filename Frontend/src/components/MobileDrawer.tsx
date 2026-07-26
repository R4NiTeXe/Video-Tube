"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useMobileDrawer } from "@/src/store/useMobileDrawer";
import { api } from "@/src/services/api";
import {
  HomeIcon,
  TrendingIcon,
  SubscriptionsIcon,
  LibraryIcon,
  PlaylistsIcon,
  CommunityIcon,
  ClockIcon,
  HeartIcon,
  UserIcon,
  StudioIcon,
  SettingsIcon,
  LogoutIcon,
  CloseIcon,
} from "@/src/components/icons";

const mainNavItems = [
  { key: "home", href: "/", label: "Home", icon: HomeIcon },
  { key: "trending", href: "/?sortBy=views&sortType=desc", label: "Trending", icon: TrendingIcon },
  { key: "subscriptions", href: "/subscriptions", label: "Subscriptions", icon: SubscriptionsIcon },
  { key: "library", href: "/library", label: "Library", icon: LibraryIcon },
  { key: "playlists", href: "/playlists", label: "Playlists", icon: PlaylistsIcon },
  { key: "community", href: "/community", label: "Community", icon: CommunityIcon },
  { key: "history", href: "/history", label: "History", icon: ClockIcon },
  { key: "liked", href: "/liked", label: "Liked Videos", icon: HeartIcon },
];

const accountNavItems = [
  { key: "channel", href: "", label: "My Channel", icon: UserIcon },
  { key: "edit-profile", href: "/edit-profile", label: "Edit Profile", icon: UserIcon },
  { key: "studio", href: "/studio", label: "Creator Studio", icon: StudioIcon },
  { key: "settings", href: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function MobileDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, close } = useMobileDrawer();
  const { user, logout } = useAuthStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    },
    [close]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  const handleItemClick = () => {
    close();
  };

  const handleLogout = async () => {
    try {
      await api.post("/users/logout");
    } finally {
      logout();
      close();
      router.push("/login");
    }
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    if (href.includes("?")) {
      const [base] = href.split("?");
      return pathname === base;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const drawerVariants = {
    hidden: { x: "-100%" },
    visible: { x: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="mobile-drawer-overlay"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.2 }}
          onClick={close}
          aria-hidden="true"
        >
          <motion.aside
            className="mobile-drawer"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="mobile-drawer-header">
              <button
                className="mobile-drawer-close"
                onClick={close}
                aria-label="Close navigation menu"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="mobile-drawer-content">
              {user && (
                <div className="mobile-drawer-profile">
                  <Link href={`/channel/${user.username}`} className="mobile-drawer-profile-link" onClick={handleItemClick}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <img src={user.avatar} alt="" className="mobile-drawer-avatar" />
                      <span className="online-dot" aria-hidden="true" />
                    </div>
                    <div className="mobile-drawer-profile-info">
                      <div className="mobile-drawer-profile-name">{user.fullName}</div>
                      <div className="mobile-drawer-profile-handle">@{user.username}</div>
                    </div>
                  </Link>
                </div>
              )}

              <nav className="mobile-drawer-nav" aria-label="Mobile navigation">
                <div className="mobile-drawer-section-label">Main</div>
                {mainNavItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`mobile-drawer-item${isActive(item.href) ? " active" : ""}`}
                    onClick={handleItemClick}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    <item.icon size={18} active={isActive(item.href)} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                ))}

                {user && (
                  <>
                    <div className="mobile-drawer-divider" />
                    <div className="mobile-drawer-section-label">Account</div>
                    {accountNavItems.map((item) => {
                      const href = item.key === "channel" ? `/channel/${user.username}` : item.href;
                      return (
                        <Link
                          key={item.key}
                          href={href}
                          className={`mobile-drawer-item${isActive(href) ? " active" : ""}`}
                          onClick={handleItemClick}
                          aria-current={isActive(href) ? "page" : undefined}
                        >
                          <item.icon size={18} aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}

                    <div className="mobile-drawer-divider" />

                    <button
                      className="mobile-drawer-item mobile-drawer-logout"
                      onClick={handleLogout}
                    >
                      <LogoutIcon size={18} aria-hidden="true" />
                      <span>Log Out</span>
                    </button>
                  </>
                )}
              </nav>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
