import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import QueryProvider from "@/src/providers/QueryProvider";
import AuthProvider from "@/src/providers/AuthProvider";
import SplashWrapper from "@/src/components/SplashWrapper";
import ShortcutsDialog from "@/src/components/ShortcutsDialog";
import MobileDrawer from "@/src/components/MobileDrawer";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import AppShell from "@/src/components/AppShell";
import { SITE_URL } from "@/src/services/siteConfig";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
    default: "VideoTube — Watch, Share, and Connect",
    template: "%s | VideoTube",
  },
  description: "Watch, share, and connect on VideoTube — a video platform for everyone.",
  keywords: ["video sharing", "streaming", "VideoTube", "watch videos", "upload videos", "video platform"],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "VideoTube",
    title: "VideoTube — Watch, Share, and Connect",
    description: "Watch, share, and connect on VideoTube.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VideoTube — Watch, Share, and Connect",
    description: "Watch, share, and connect on VideoTube.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
          <QueryProvider>
            <AuthProvider>
              <ErrorBoundary>
                <SplashWrapper>
                  <AppShell>
                    {children}
                  </AppShell>
                  <MobileDrawer />
                </SplashWrapper>
                <ShortcutsDialog />
              </ErrorBoundary>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
