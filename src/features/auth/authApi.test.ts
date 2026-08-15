import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
  const browserWindow = new EventTarget() as EventTarget & {
    localStorage: Storage;
    sessionStorage: Storage;
  };
  browserWindow.localStorage = new MemoryStorage();
  browserWindow.sessionStorage = new MemoryStorage();
  vi.stubGlobal("window", browserWindow);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("reissue", () => {
  it("shares one request across concurrent callers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      code: "SUCCESS",
      isSuccess: true,
      message: "success",
      result: "new-access-token",
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { reissue } = await import("./authApi");

    await expect(Promise.all([reissue(), reissue()])).resolves.toEqual([
      "new-access-token",
      "new-access-token",
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/auth/reissue",
      expect.objectContaining({ credentials: "include", method: "POST" }),
    );
  });
});

describe("logout", () => {
  it("reissues after a 401, retries with the new token, and clears the session", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(
        { code: "UNAUTHORIZED", isSuccess: false, message: "expired", result: null },
        { status: 401 },
      ))
      .mockResolvedValueOnce(Response.json({
        code: "SUCCESS",
        isSuccess: true,
        message: "success",
        result: "new-access-token",
      }))
      .mockResolvedValueOnce(Response.json({
        code: "SUCCESS",
        isSuccess: true,
        message: "success",
        result: null,
      }));
    vi.stubGlobal("fetch", fetchMock);
    const { logout } = await import("./authApi");
    const { getSession, setSession } = await import("../../shared/api/session");
    setSession({ accessToken: "expired-access-token" }, false);

    await expect(logout()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.test/api/auth/logout",
      "https://api.test/api/auth/reissue",
      "https://api.test/api/auth/logout",
    ]);
    const retriedLogout = fetchMock.mock.calls[2]?.[1] as RequestInit & { headers: Headers };
    expect(retriedLogout.headers.get("Authorization")).toBe("Bearer new-access-token");
    expect(getSession()).toBeUndefined();
  });
});
