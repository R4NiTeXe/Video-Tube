import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/services/siteConfig";
import { API_FULL_URL } from "@/src/services/config";

const staticRoutes: MetadataRoute.Sitemap = [
  {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1.0,
  },
  {
    url: `${SITE_URL}/login`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.3,
  },
  {
    url: `${SITE_URL}/login/mobile`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.2,
  },
  {
    url: `${SITE_URL}/register`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/register/mobile`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.2,
  },
  {
    url: `${SITE_URL}/forgot-password`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.1,
  },
  {
    url: `${SITE_URL}/search`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.6,
  },
  {
    url: `${SITE_URL}/transcode`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.1,
  },
  {
    url: `${SITE_URL}/live`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.1,
  },
  {
    url: `${SITE_URL}/embed`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.4,
  },
  {
    url: `${SITE_URL}/about`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.2,
  },
  {
    url: `${SITE_URL}/community`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.4,
  },
];

interface SitemapVideo {
  _id: string;
  updatedAt?: string;
  owner?: { username?: string };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [...staticRoutes];

  try {
    const res = await fetch(`${API_FULL_URL}/videos?limit=500&sortType=desc`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return routes;

    const data = await res.json();
    const docs: SitemapVideo[] = data?.data?.docs ?? [];

    const channelUsernames = new Set<string>();

    for (const video of docs) {
      if (!video?._id) continue;

      routes.push({
        url: `${SITE_URL}/videos/${video._id}`,
        lastModified: video.updatedAt ? new Date(video.updatedAt) : new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });

      if (video.owner?.username) {
        channelUsernames.add(video.owner.username);
      }
    }

    for (const username of channelUsernames) {
      routes.push({
        url: `${SITE_URL}/channel/${username}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // API unreachable (e.g. offline build) — serve static routes only.
  }

  return routes;
}
