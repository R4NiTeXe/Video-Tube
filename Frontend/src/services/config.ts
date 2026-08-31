const DEV_API_BASE_URL = "http://localhost:8000/api/v1";

const normalizeUrl = (value: string) => value.replace(/\/+$/, "");

// Client-side API base — used by axios, EventSource, etc.
// In production, use a relative URL (/api/v1) so cookies are same-origin
// (proxied to the backend via Next.js rewrites).
export const API_BASE_URL = (() => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (configuredUrl) {
    return normalizeUrl(configuredUrl);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required in production");
  }

  return DEV_API_BASE_URL;
})();

// Full absolute URL for server-side fetches (opengraph-image, etc.).
// Falls back to BACKEND_API_URL, then NEXT_PUBLIC_API_BASE_URL if absolute.
export const API_FULL_URL = (() => {
  if (process.env.BACKEND_API_URL) return normalizeUrl(process.env.BACKEND_API_URL);
  const publicUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (publicUrl && !publicUrl.startsWith("/")) return normalizeUrl(publicUrl);
  if (publicUrl) return normalizeUrl(publicUrl);
  return DEV_API_BASE_URL;
})();
