import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_API_BASE_URL).origin
    : "https://videotube.app";

  const staticRoutes = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1.0 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${baseUrl}/login/mobile`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.2 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${baseUrl}/register/mobile`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.2 },
    { url: `${baseUrl}/forgot-password`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.1 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.6 },
    { url: `${baseUrl}/transcode`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.1 },
    { url: `${baseUrl}/live`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.1 },
    { url: `${baseUrl}/embed`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.4 },
  ];

  return staticRoutes;
}
