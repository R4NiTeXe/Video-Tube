import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/services/siteConfig";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/studio",
          "/settings",
          "/edit-profile",
          "/admin",
          "/notifications",
          "/playlists",
          "/library",
          "/liked",
          "/history",
          "/subscriptions",
          "/community",
          "/auth/callback",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
