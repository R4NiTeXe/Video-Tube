import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/src/store/useAuthStore";

const mockUser = {
  _id: "u1",
  fullName: "Test User",
  username: "testuser",
  email: "test@example.com",
  avatar: "/avatar.png",
};

describe("useAuthStore", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  it("starts unauthenticated with loading", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
  });

  it("logs in a user", () => {
    useAuthStore.getState().login(mockUser);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
  });

  it("logs out a user", () => {
    useAuthStore.getState().login(mockUser);
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it("updates a logged-in user", () => {
    useAuthStore.getState().login(mockUser);
    useAuthStore.getState().updateUser({ bio: "hello" });
    expect(useAuthStore.getState().user?.bio).toBe("hello");
    expect(useAuthStore.getState().user?.email).toBe("test@example.com");
  });

  it("does not crash updating user when not logged in", () => {
    expect(() =>
      useAuthStore.getState().updateUser({ bio: "x" }),
    ).not.toThrow();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("persists user to sessionStorage", () => {
    useAuthStore.getState().login(mockUser);
    const raw = sessionStorage.getItem("auth-storage");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw || "{}");
    expect(parsed.state.user).toEqual(mockUser);
  });
});