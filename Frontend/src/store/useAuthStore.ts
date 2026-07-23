import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
  _id: string;
  fullName: string;
  username: string;
  email: string;
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
      
      logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
      
      setLoading: (status) => set({ isLoading: status }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      // When persisted state is rehydrated, if user is already logged in, mark loading as done
      // This prevents pages from showing "checking auth..." on every client-side navigation
      onRehydrateStorage: () => (state) => {
        if (state?.isAuthenticated && state?.user) {
          state.isLoading = false;
        }
      },
    }
  )
);

