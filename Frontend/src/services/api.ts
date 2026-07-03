import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

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
    // Any status code within the range of 2xx triggers this function
    return response;
  },
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    // If the error is 401 Unauthorized, and we haven't already retried this exact request
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to hit the refresh token endpoint
        // Since withCredentials is true, the refresh cookie is sent automatically
        await axios.post(`${API_BASE_URL}/users/refresh-token`, {}, { withCredentials: true });

        // If successful, the backend sets a new access token cookie.
        // We can now safely retry the original request!
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login — but not if we're already there
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    // Reject for all other errors (400, 404, 500, etc.)
    return Promise.reject(error);
  }
);
