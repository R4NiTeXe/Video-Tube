import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  mobile?: string;
  avatar: string;
  coverImage?: string;
  bio?: string;
  socialLinks?: {
    youtube?: string;
    twitter?: string;
    instagram?: string;
    github?: string;
    website?: string;
  };
  isVerified?: boolean;
  role?: "user" | "admin";
  isEmailVerified?: boolean;
  isMobileVerified?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (user: User) => void;
  logout: () => void;
  setLoading: (status: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true, // Initially true while we check auth status on mount

      login: (user) => set({ user, isAuthenticated: true, isLoading: false }),
      
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
      },
      
      setLoading: (status) => set({ isLoading: status }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      // Do NOT set isLoading=false here — let AuthProvider.init() control the loading state.
      // Otherwise, stale sessionStorage data can trigger SSE connects and API calls
      // before the backend has verified the session (race condition → 401 storm).
    }
  )
);

