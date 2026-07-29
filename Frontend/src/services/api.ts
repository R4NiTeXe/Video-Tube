import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/src/services/config";

const DEBUG = process.env.NODE_ENV !== "production";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _csrfRetry?: boolean;
}

interface ApiErrorBody {
  message?: string;
  errors?: string[];
}

let _csrfToken: string | null = null;
let _serverTimeOffset = 0;
let _isRefreshing = false;
let _refreshQueue: Array<{ resolve: (token: string | null) => void }> = [];
let _isRefreshingToken = false;
let _tokenRefreshQueue: Array<{ resolve: (success: boolean) => void }> = [];

export const setCsrfToken = (token: string) => {
  _csrfToken = token;
};
export const getCsrfToken = () => _csrfToken;
export const getServerTimeOffset = () => _serverTimeOffset;

export const refreshCsrfToken = async (): Promise<string | null> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/csrf-token`, {
      withCredentials: true,
    });
    const csrfToken: unknown = res.data?.csrfToken;
    if (typeof csrfToken === "string" && csrfToken.length > 0) {
      _csrfToken = csrfToken;
      if (DEBUG)
        console.log("[CSRF] Token refreshed:", csrfToken.slice(0, 12) + "...");
      return _csrfToken;
    }
  } catch (e) {
    if (DEBUG) console.log("[CSRF] Refresh failed", e);
  }
  return null;
};

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
      if (DEBUG)
        console.log(
          `[API] CSRF header set for ${config.method?.toUpperCase()} ${config.url}: ${_csrfToken.slice(0, 12)}...`,
        );
      config.headers["x-csrf-token"] = _csrfToken;
    } else if (DEBUG) {
      console.log(
        `[API] WARNING: CSRF token MISSING for ${config.method?.toUpperCase()} ${config.url}`,
      );
    }
  }

  if (DEBUG) {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      hasCsrfToken: !!_csrfToken,
      withCredentials: config.withCredentials,
    });
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const dateHeader = response.headers["date"];
    if (dateHeader) {
      const serverTime = new Date(dateHeader).getTime();
      if (!isNaN(serverTime)) {
        _serverTimeOffset = serverTime - Date.now();
      }
    }
    return response;
  },
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status === 403 &&
      originalRequest &&
      !originalRequest._csrfRetry
    ) {
      const msg = error.response?.data?.message?.toLowerCase() || "";
      const hasCsrfError =
        msg.includes("csrf") ||
        (error.response?.data?.errors || []).some((e: string) =>
          e.toLowerCase().includes("csrf"),
        );

      if (hasCsrfError) {
        originalRequest._csrfRetry = true;
        if (!_isRefreshing) {
          _isRefreshing = true;
          _csrfToken = null;
          const newToken = await refreshCsrfToken();
          _isRefreshing = false;
          _refreshQueue.forEach((q) => q.resolve(newToken));
          _refreshQueue = [];
        }
        const newToken = await new Promise<string | null>((resolve) => {
          _refreshQueue.push({ resolve });
        });
        if (newToken) {
          if (DEBUG) console.log("[API] CSRF retry with new token");
          return api(originalRequest);
        }
      }
    }

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      const noAuthEndpoints = [
        "/users/login",
        "/users/register",
        "/users/send-forgot-otp",
        "/users/verify-forgot-otp",
        "/users/reset-password-token",
      ];
      const isNoAuth = noAuthEndpoints.some((ep) =>
        originalRequest.url?.includes(ep),
      );
      if (isNoAuth) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (!_isRefreshingToken) {
        _isRefreshingToken = true;
        try {
          const storedRefreshToken =
            typeof window !== "undefined"
              ? localStorage.getItem("refreshToken")
              : null;

          const refreshRes = await axios.post(
            `${API_BASE_URL}/users/refresh-token`,
            storedRefreshToken ? { refreshToken: storedRefreshToken } : {},
            {
              withCredentials: true,
              headers: _csrfToken ? { "x-csrf-token": _csrfToken } : {},
            },
          );

          const newAccessToken = refreshRes.data?.data?.accessToken;
          if (newAccessToken && typeof window !== "undefined") {
            localStorage.setItem("accessToken", newAccessToken);
          }

          const newRefreshToken = refreshRes.data?.data?.refreshToken;
          if (newRefreshToken && typeof window !== "undefined") {
            localStorage.setItem("refreshToken", newRefreshToken);
          }

          if (DEBUG) console.log("[API] Token refreshed");
          _tokenRefreshQueue.forEach((q) => q.resolve(true));
          _tokenRefreshQueue = [];
        } catch (refreshError) {
          _tokenRefreshQueue.forEach((q) => q.resolve(false));
          _tokenRefreshQueue = [];
          if (DEBUG)
            console.log("[API] Token refresh failed — clearing tokens");

          if (typeof window !== "undefined") {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
          }

          if (typeof window !== "undefined") {
            const publicPaths = [
              "/",
              "/login",
              "/register",
              "/forgot-password",
              "/auth/callback",
            ];
            const isPublicPath = publicPaths.some(
              (p) =>
                window.location.pathname === p ||
                window.location.pathname.startsWith(`${p}/`),
            );
            if (!isPublicPath) {
              window.location.href = "/login";
            }
          }

          return Promise.reject(refreshError);
        } finally {
          _isRefreshingToken = false;
        }
      } else {
        const success = await new Promise<boolean>((resolve) => {
          _tokenRefreshQueue.push({ resolve });
        });
        if (!success) return Promise.reject(error);
      }

      if (originalRequest.headers) {
        delete originalRequest.headers["Authorization"];
      }

      if (DEBUG)
        console.log("[API] Retrying original request after token refresh");
      return api(originalRequest);
    }

    return Promise.reject(error);
  },
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
