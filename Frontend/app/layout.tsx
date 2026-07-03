import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/src/providers/QueryProvider";
import AuthProvider from "@/src/providers/AuthProvider";
import SplashWrapper from "@/src/components/SplashWrapper";
import BottomNav from "@/src/components/BottomNav";
import ShortcutsDialog from "@/src/components/ShortcutsDialog";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VideoTube",
  description: "A premium video sharing platform",
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('vt-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <ErrorBoundary>
              <SplashWrapper>
                {children}
              </SplashWrapper>
            </ErrorBoundary>
            <BottomNav />
            <ShortcutsDialog />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
