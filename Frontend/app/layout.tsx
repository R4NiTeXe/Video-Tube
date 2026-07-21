import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/src/providers/QueryProvider";
import AuthProvider from "@/src/providers/AuthProvider";
import SplashWrapper from "@/src/components/SplashWrapper";
import BottomNav from "@/src/components/BottomNav";
import ShortcutsDialog from "@/src/components/ShortcutsDialog";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import AppShell from "@/src/components/AppShell";
import { SITE_URL } from "@/src/services/siteConfig";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f0f0f",
};

export const metadata: Metadata = {
  title: {
    default: "VideoTube — Discover, Watch, and Share Videos",
    template: "%s | VideoTube",
  },
  description: "Discover, watch, and share videos on VideoTube — a premium video sharing platform with high-quality streaming, community features, and creator tools.",
  keywords: ["video sharing", "streaming", "VideoTube", "watch videos", "upload videos", "video platform"],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "VideoTube",
    title: "VideoTube — Discover, Watch, and Share Videos",
    description: "Discover, watch, and share videos on VideoTube — a premium video sharing platform.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VideoTube — Discover, Watch, and Share Videos",
    description: "Discover, watch, and share videos on VideoTube — a premium video sharing platform.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('vt-theme');if(!t){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <ErrorBoundary>
              <SplashWrapper>
                <AppShell>
                  {children}
                </AppShell>
              </SplashWrapper>
              <BottomNav />
              <ShortcutsDialog />
            </ErrorBoundary>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
