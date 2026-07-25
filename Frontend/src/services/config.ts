const DEV_API_BASE_URL = "http://localhost:8000/api/v1";

const normalizeApiBaseUrl = (value: string) => value.replace(/\/+$/, "");

export const API_BASE_URL = (() => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (configuredUrl) {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
      return "/api/v1";
    }
    return normalizeApiBaseUrl(configuredUrl);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required in production");
  }

  return DEV_API_BASE_URL;
})();

export const API_FULL_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL || DEV_API_BASE_URL
);
