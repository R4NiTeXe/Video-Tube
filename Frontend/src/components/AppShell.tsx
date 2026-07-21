"use client";

import { usePathname } from "next/navigation";
import TopNav from "./TopNav";
import PremiumSidebar from "./PremiumSidebar";
import { useAuthStore } from "@/src/store/useAuthStore";

const authPages = ["/login", "/register", "/forgot-password", "/embed"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();

  const isAuthPage = authPages.includes(pathname) || pathname.startsWith("/embed");
  const isLandingPage = pathname === "/" && !isAuthenticated;

  if (isAuthPage || isLandingPage) {
    return <main id="main-content">{children}</main>;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <TopNav />
      <div className="page-layout">
        <PremiumSidebar />
        <main id="main-content" className="page-content">{children}</main>
      </div>
    </div>
  );
}
