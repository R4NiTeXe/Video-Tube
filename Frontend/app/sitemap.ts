import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/services/siteConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1.0 },
    { url: `${SITE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${SITE_URL}/login/mobile`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.2 },
    { url: `${SITE_URL}/register`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${SITE_URL}/register/mobile`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.2 },
    { url: `${SITE_URL}/forgot-password`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.1 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.6 },
    { url: `${SITE_URL}/transcode`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.1 },
    { url: `${SITE_URL}/live`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.1 },
    { url: `${SITE_URL}/embed`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.4 },
  ];

  return staticRoutes;
}
