import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/src/services/config";

// Set to true to enable console logging for auth/CSRF debugging
const DEBUG = false;

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _csrfRetry?: boolean;
}

interface ApiErrorBody {
  message?: string;
  errors?: string[];
}

let _csrfToken: string | null = null;

export const setCsrfToken = (token: string) => { _csrfToken = token; };
export const getCsrfToken = () => _csrfToken;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("accessToken");
    if (stored && !config.headers["Authorization"]) {
      if (DEBUG) console.log("[API] Attaching Bearer token from localStorage");
      config.headers["Authorization"] = `Bearer ${stored}`;
    }
  }

  const mutatingMethods = ["post", "put", "patch", "delete"];
  if (mutatingMethods.includes(config.method?.toLowerCase() || "")) {
    if (_csrfToken) {
      if (DEBUG) console.log("[API] Attaching CSRF token to", config.method, config.url);
      config.headers["x-csrf-token"] = _csrfToken;
    } else if (DEBUG) {
      console.log("[API] CSRF token missing for", config.method, config.url);
    }
  }

  if (DEBUG) {
    console.log("[API] Request:", config.method?.toUpperCase(), config.url);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status === 403 &&
      originalRequest &&
      !originalRequest._csrfRetry
    ) {
      const msg = error.response?.data?.message?.toLowerCase() || "";
      const hasCsrfError = msg.includes("csrf") ||
        (error.response?.data?.errors || []).some((e: string) => e.toLowerCase().includes("csrf"));

      if (hasCsrfError) {
        if (DEBUG) console.log("[API] CSRF 403 — re-fetching token and retrying");
        originalRequest._csrfRetry = true;
        _csrfToken = null;
        try {
          const res = await axios.get(`${API_BASE_URL}/csrf-token`, {
            withCredentials: true,
          });
          if (res.data?.csrfToken) {
            _csrfToken = res.data.csrfToken;
            if (DEBUG) console.log("[API] CSRF token refreshed");
          }
        } catch (e) {
          if (DEBUG) console.log("[API] CSRF fetch failed", e);
        }
        if (_csrfToken) {
          return api(originalRequest);
        }
      }
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (DEBUG) console.log("[API] 401 — attempting token refresh");
      originalRequest._retry = true;

      try {
        const storedRefreshToken = typeof window !== "undefined"
          ? localStorage.getItem("refreshToken")
          : null;

        const refreshRes = await axios.post(
          `${API_BASE_URL}/users/refresh-token`,
          storedRefreshToken ? { refreshToken: storedRefreshToken } : {},
          {
            withCredentials: true,
            headers: _csrfToken ? { "x-csrf-token": _csrfToken } : {},
          }
        );

        const newAccessToken = refreshRes.data?.data?.accessToken;
        if (newAccessToken && typeof window !== "undefined") {
          localStorage.setItem("accessToken", newAccessToken);
        }

        if (DEBUG) console.log("[API] Token refreshed, retrying original request");
        return api(originalRequest);
      } catch (refreshError) {
        if (DEBUG) console.log("[API] Token refresh failed — clearing tokens");

        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }

        if (typeof window !== "undefined") {
          const publicPaths = ["/", "/login", "/register", "/forgot-password", "/auth/callback"];
          const isPublicPath = publicPaths.some(
            (p) => window.location.pathname === p || window.location.pathname.startsWith(`${p}/`)
          );
          if (!isPublicPath) {
            window.location.href = "/login";
          }
        }

        return Promise.reject(
          new Error(
            refreshError instanceof Error
              ? refreshError.message
              : "Session expired"
          )
        );
      }
    }

    return Promise.reject(error);
  }
);

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};
