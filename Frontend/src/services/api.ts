import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/src/services/config";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface ApiErrorBody {
  message?: string;
}

// In-memory CSRF token — cross-origin cookies on the backend domain
// are not readable via document.cookie on the frontend domain
let _csrfToken: string | null = null;

export const setCsrfToken = (token: string) => { _csrfToken = token; };
export const getCsrfToken = () => _csrfToken;

// Create an Axios instance with base configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for sending/receiving secure cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add CSRF token for mutating requests and Bearer token fallback
api.interceptors.request.use((config) => {
  // Attach Bearer token from localStorage if available (fallback for OAuth cross-origin flows)
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("accessToken");
    if (stored && !config.headers["Authorization"]) {
      config.headers["Authorization"] = `Bearer ${stored}`;
    }
  }

  const mutatingMethods = ["post", "put", "patch", "delete"];
  if (mutatingMethods.includes(config.method?.toLowerCase() || "")) {
    if (_csrfToken) {
      config.headers["x-csrf-token"] = _csrfToken;
    }
  }
  return config;
});

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

// Response Interceptor for handling token refresh logic globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const storedRefreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
        const refreshRes = await axios.post(
          `${API_BASE_URL}/users/refresh-token`,
          storedRefreshToken ? { refreshToken: storedRefreshToken } : {},
          {
            withCredentials: true,
            headers: _csrfToken ? { "x-csrf-token": _csrfToken } : {},
          }
        );
        // Update stored access token if backend returns a new one
        const newAccessToken = refreshRes.data?.data?.accessToken;
        if (newAccessToken && typeof window !== "undefined") {
          localStorage.setItem("accessToken", newAccessToken);
        }
        return api(originalRequest);
      } catch (refreshError) {
        // Clear stored tokens on refresh failure
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
        // Only redirect to login for protected routes, not public pages
        if (typeof window !== "undefined") {
          const publicPaths = ["/", "/login", "/register", "/forgot-password", "/auth/callback"];
          const isPublicPath = publicPaths.some((p) => window.location.pathname === p || window.location.pathname.startsWith(`${p}/`));
          if (!isPublicPath && !window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
        }
        return Promise.reject(new Error(refreshError instanceof Error ? refreshError.message : "Session expired"));
      }
    }

    return Promise.reject(error);
  }
);
