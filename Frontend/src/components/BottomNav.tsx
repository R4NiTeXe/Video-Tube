"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/src/store/useAuthStore";

const HomeIcon = ({ active }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);

const TrendingIcon = ({ active }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);

const LibraryIcon = ({ active }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
);

const UserIcon = ({ active }: { active?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

function BottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return null;

  const profileHref = user?.username ? `/channel/${user.username}` : "/login";

  const navItems = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/?sortBy=views&sortType=desc", label: "Trending", icon: TrendingIcon },
    { href: "/library", label: "Library", icon: LibraryIcon },
    { href: profileHref, label: "Profile", icon: UserIcon },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    const sortBy = searchParams.get("sortBy");
    if (href === "/") {
      return pathname === "/" && !sortBy;
    }
    if (href.includes("?")) {
      const [basePath, queryString] = href.split("?");
      if (pathname !== basePath) return false;
      const targetParams = new URLSearchParams(queryString);
      for (const [key, value] of targetParams.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bottom-nav" aria-label="Bottom navigation">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`bottom-nav-item${active ? " active" : ""}`}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
          >
            <item.icon active={active} aria-hidden="true" />
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavInner />
    </Suspense>
  );
}
