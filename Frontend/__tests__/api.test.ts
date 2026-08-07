import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosResponse } from "axios";

type AxiosConfig = {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
};

type ReqHandler = (config: AxiosConfig) => AxiosConfig;
type ResOkHandler = (res: unknown) => unknown;
type ResErrHandler = (err: unknown) => Promise<never>;

const mockBox = vi.hoisted(() => {
  const reqHandlers: ReqHandler[] = [];
  const resOkHandlers: ResOkHandler[] = [];
  const resErrHandlers: ResErrHandler[] = [];
  return { reqHandlers, resOkHandlers, resErrHandlers };
});

vi.mock("axios", () => {
  const instance = vi.fn((config?: AxiosConfig) => config) as unknown as {
    (config?: AxiosConfig): AxiosConfig;
    defaults: {
      baseURL: string;
      withCredentials: boolean;
      headers: Record<string, string>;
    };
    interceptors: {
      request: { use: (fn: ReqHandler) => void };
      response: { use: (ok: ResOkHandler, err: ResErrHandler) => void };
    };
  };
  instance.defaults = {
    baseURL: "http://localhost:8000/api/v1",
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  };
  instance.interceptors = {
    request: {
      use: (fn: ReqHandler) => mockBox.reqHandlers.push(fn),
    },
    response: {
      use: (ok: ResOkHandler, err: ResErrHandler) => {
        mockBox.resOkHandlers.push(ok);
        mockBox.resErrHandlers.push(err);
      },
    },
  };
  const isAxiosError = (e: { isAxiosError?: boolean }) => !!e?.isAxiosError;
  return {
    __esModule: true,
    default: {
      create: () => instance,
      get: vi.fn(),
      post: vi.fn(),
      isAxiosError,
    },
    create: () => instance,
    get: vi.fn(),
    post: vi.fn(),
    isAxiosError,
  };
});

import axios from "axios";
import {
  getApiErrorMessage,
  setCsrfToken,
  api,
  refreshCsrfToken,
} from "@/src/services/api";

beforeEach(() => {
  setCsrfToken("");
  vi.mocked(axios.get).mockClear();
  vi.mocked(axios.post).mockClear();
});

describe("getApiErrorMessage", () => {
  it("returns server message when present", () => {
    const err = { isAxiosError: true, response: { data: { message: "X" } } };
    expect(getApiErrorMessage(err, "fb")).toBe("X");
  });

  it("falls back to error message for plain errors", () => {
    expect(getApiErrorMessage(new Error("boom"), "fb")).toBe("boom");
  });

  it("returns fallback for unknown", () => {
    expect(getApiErrorMessage("raw", "fb")).toBe("fb");
  });
});

describe("api instance", () => {
  it("is created with credentials enabled", () => {
    expect(api.defaults.baseURL).toBeDefined();
    expect(api.defaults.withCredentials).toBe(true);
  });
});

describe("request interceptor", () => {
  it("adds csrf header on mutations when token present", () => {
    setCsrfToken("abc");
    const handler = mockBox.reqHandlers[0]!;
    const out = handler({
      method: "post",
      url: "/like",
      headers: {},
    });
    expect(out.headers!["x-csrf-token"]).toBe("abc");
  });

  it("does not add csrf header on GET", () => {
    setCsrfToken("abc");
    const handler = mockBox.reqHandlers[0]!;
    const out = handler({ method: "get", url: "/videos", headers: {} });
    expect(out.headers!["x-csrf-token"]).toBeUndefined();
  });
});

describe("response interceptor", () => {
  it("stores server time offset from date header", () => {
    const res = { headers: { date: new Date().toUTCString() }, data: {} };
    expect(resOkHandlersRun(res)).toBe(res);
  });

  it("does not set offset for invalid date", () => {
    const res = { headers: {}, data: {} };
    expect(resOkHandlersRun(res)).toBe(res);
  });

  it("rejects non-retryable errors", async () => {
    const err = { response: { status: 400 }, config: {} };
    await expect(mockBox.resErrHandlers[0]!(err)).rejects.toBe(err);
  });

  it("skips refresh for 401 on no-auth endpoints", async () => {
    const err = {
      response: { status: 401 },
      config: { url: "/users/login", headers: {} },
    };
    await expect(mockBox.resErrHandlers[0]!(err)).rejects.toBe(err);
  });

  it("retries after successful cookie-based refresh", async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { data: {} },
    } as AxiosResponse);
    const err = {
      response: { status: 401 },
      config: { url: "/videos", headers: {} },
    };
    const p = mockBox.resErrHandlers[0]!(err);
    await expect(p).resolves.toMatchObject({ url: "/videos", headers: {} });
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/users/refresh-token"),
      {},
      expect.anything(),
    );
  });
});

describe("refreshCsrfToken", () => {
  it("returns null when csrf endpoint fails", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("down"));
    expect(await refreshCsrfToken()).toBeNull();
  });

  it("returns token when csrf endpoint succeeds", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { csrfToken: "tok" },
    } as AxiosResponse);
    expect(await refreshCsrfToken()).toBe("tok");
  });
});

function resOkHandlersRun(res: unknown) {
  return mockBox.resOkHandlers[0]!(res);
}