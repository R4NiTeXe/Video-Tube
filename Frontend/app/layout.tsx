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
import ToastViewport from "@/src/components/ToastViewport";
import { SITE_URL } from "@/src/services/siteConfig";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { MotionConfig } from "framer-motion";

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
  description:
    "Watch, share, and connect on VideoTube — a video platform for everyone.",
  keywords: [
    "video sharing",
    "streaming",
    "VideoTube",
    "watch videos",
    "upload videos",
    "video platform",
  ],
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
  manifest: "/manifest.json",
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
    <html
      lang="en"
      className={`${inter.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="upgrade-insecure-requests"
        />
      </head>
      <body suppressHydrationWarning>
        <a
          href="#main-content"
          className="skip-link"
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            zIndex: 9999,
            padding: "0.75rem 1.5rem",
            backgroundColor: "var(--accent)",
            color: "#fff",
            borderRadius: "0 0 var(--radius-md) 0",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Skip to content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "VideoTube",
                url: SITE_URL,
                logo: `${SITE_URL}/logo.png`,
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "VideoTube",
                url: SITE_URL,
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
                  },
                  "query-input": "required name=search_term_string",
                },
              },
            ]),
          }}
        />
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem={false}
        >
          <QueryProvider>
            <AuthProvider>
              <MotionConfig reducedMotion="user">
                <ErrorBoundary>
                  <SplashWrapper>
                    <AppShell>{children}</AppShell>
                    <MobileDrawer />
                  </SplashWrapper>
                  <ShortcutsDialog />
                  <ToastViewport />
                </ErrorBoundary>
              </MotionConfig>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
