import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useToastStore } from "@/src/store/useToastStore";

describe("useToastStore", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with no toasts", () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it("push adds a toast with default type info", () => {
    useToastStore.getState().push("hello");
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.message).toBe("hello");
    expect(toasts[0]?.type).toBe("info");
  });

  it("push honours the type and dismisses after 4s", () => {
    useToastStore.getState().push("error msg", "error");
    expect(useToastStore.getState().toasts[0]?.type).toBe("error");
    vi.advanceTimersByTime(4000);
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it("dismiss removes a specific toast", () => {
    useToastStore.getState().push("one", "success");
    useToastStore.getState().push("two", "info");
    const first = useToastStore.getState().toasts[0];
    if (first) useToastStore.getState().dismiss(first.id);
    const remaining = useToastStore.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.message).toBe("two");
  });
});