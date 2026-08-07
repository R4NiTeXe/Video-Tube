import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSSE } from "@/src/hooks/useSSE";
import { useAuthStore } from "@/src/store/useAuthStore";

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    MotionConfig: ({ children }: { children: ReactNode }) => children,
  };
});

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
  return { qc, wrapper };
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal("EventSource", MockEventSource);
  Object.defineProperty(globalThis, "EventSource", {
    value: MockEventSource,
    configurable: true,
    writable: true,
  });
  useAuthStore.setState({ isAuthenticated: false, isLoading: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useSSE", () => {
  it("does not connect when not authenticated", () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSSE(), { wrapper });
    expect(result.current.isConnected).toBe(false);
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("connects when authenticated and reflects connection state", async () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useSSE(), { wrapper });

    act(() => {
      useAuthStore.setState({ isAuthenticated: true, isLoading: false });
    });

    expect(MockEventSource.instances.length).toBeGreaterThanOrEqual(1);
    const es = MockEventSource.instances[0] as MockEventSource;
    expect(es.url).toContain("/sse/notifications");

    act(() => {
      es.onopen?.();
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      es.onopen?.();
    });
    es.onmessage?.({ data: JSON.stringify({ type: "notification" }) });
    expect(result.current.isConnected).toBe(true);
  });
});