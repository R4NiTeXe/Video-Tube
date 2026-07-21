const DEFAULT_SITE_URL = "https://videotube.app";

const isLocalhostUrl = (origin: string) => {
  return origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1") || origin.startsWith("http://0.0.0.0");
};

export const SITE_URL = (() => {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_SITE_URL is required in production");
    }
    return DEFAULT_SITE_URL;
  }

  const parsed = new URL(configuredUrl);
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:" && !isLocalhostUrl(configuredUrl)) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production unless it is localhost");
  }

  return parsed.origin;
})();
