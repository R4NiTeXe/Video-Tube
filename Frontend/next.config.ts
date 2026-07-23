import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isProduction = process.env.NODE_ENV === "production";
const isLocalhostUrl = (origin: string) => {
  return origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1") || origin.startsWith("http://0.0.0.0");
};

const getApiOrigin = () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    if (isProduction) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is required in production");
    }
    return null;
  }

  const origin = new URL(apiBaseUrl).origin;
  if (isProduction && !origin.startsWith("https://") && !isLocalhostUrl(apiBaseUrl)) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must use HTTPS in production unless it is localhost");
  }
  return origin;
};

const apiOrigin = getApiOrigin();
const scriptSrc = ["'self'", "'unsafe-inline'", ...(!isProduction ? ["'unsafe-eval'"] : [])];
const connectSrc = [
  "'self'",
  ...(apiOrigin ? [apiOrigin] : ["http://localhost:8000", "http://127.0.0.1:8000"]),
  "ws:",
  "wss:",
];

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value:
      `default-src 'self'; script-src ${scriptSrc.join(" ")}; style-src 'self' 'unsafe-inline'; img-src 'self' res.cloudinary.com *.cloudinary.com lh3.googleusercontent.com avatars.githubusercontent.com platform-lookaside.fbsbx.com cdn.discordapp.com flagcdn.com images.unsplash.com ui-avatars.com data: blob: https: http:; media-src 'self' res.cloudinary.com *.cloudinary.com blob: data: http: https:; connect-src ${connectSrc.join(" ")}; font-src 'self' data:; frame-ancestors 'none';`,
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  generateEtags: true,
  httpAgentOptions: { keepAlive: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "cdn.discordapp.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react", "@tanstack/react-query"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default bundleAnalyzer(nextConfig);
