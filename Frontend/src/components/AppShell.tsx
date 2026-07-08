"use client";

import { usePathname } from "next/navigation";
import TopNav from "./TopNav";
import PremiumSidebar from "./PremiumSidebar";

const authPages = ["/login", "/register", "/forgot-password", "/embed"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthPage = authPages.includes(pathname) || pathname.startsWith("/embed");

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <TopNav />
      <div className="page-layout">
        <PremiumSidebar />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
