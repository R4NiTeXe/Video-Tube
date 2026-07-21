import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_BASE_URL) {
  console.warn(
    "[SECURITY WARNING] NEXT_PUBLIC_API_BASE_URL is not set. Falling back to HTTP localhost. " +
    "Set NEXT_PUBLIC_API_BASE_URL to your production HTTPS API URL in production environment."
  );
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface ApiErrorBody {
  message?: string;
}

// Create an Axios instance with base configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for sending/receiving secure cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add CSRF token for mutating requests
api.interceptors.request.use((config) => {
  const mutatingMethods = ["post", "put", "patch", "delete"];
  if (mutatingMethods.includes(config.method?.toLowerCase() || "")) {
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrf_token="))
      ?.split("=")[1];
    if (csrfToken) {
      config.headers["x-csrf-token"] = csrfToken;
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
        const csrfToken = document.cookie
          .split("; ")
          .find((row) => row.startsWith("csrf_token="))
          ?.split("=")[1];
        await axios.post(
          `${API_BASE_URL}/users/refresh-token`,
          {},
          {
            withCredentials: true,
            headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
          }
        );
        return api(originalRequest);
      } catch (refreshError) {
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
