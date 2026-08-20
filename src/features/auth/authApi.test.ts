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

function stubBrowserWindow() {
  const browserWindow = new EventTarget() as EventTarget & {
    localStorage: Storage;
    sessionStorage: Storage;
  };
  browserWindow.localStorage = new MemoryStorage();
  browserWindow.sessionStorage = new MemoryStorage();
  vi.stubGlobal("window", browserWindow);
  return browserWindow;
}

function successResult<T>(result: T) {
  return Response.json({
    code: "SUCCESS",
    isSuccess: true,
    message: "success",
    result,
  });
}

const myInfo = {
  userId: 7,
  loginId: "user@example.com",
  username: "사용자",
  introduction: "소개",
  profileImage: "https://cdn.example/p.png",
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
  stubBrowserWindow();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("reissue", () => {
  it("shares one request across concurrent callers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResult("new-access-token"));
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

describe("bootstrapAuthSession", () => {
  it("does not reissue when access token is missing and persist login is off", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { bootstrapAuthSession } = await import("./authApi");

    await expect(bootstrapAuthSession()).resolves.toBe("unauthenticated");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cold-starts with reissue + user hydration when persist login is allowed", async () => {
    const browserWindow = window as Window & typeof globalThis;
    browserWindow.localStorage.setItem("contextory.persist-login", "1");

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(successResult("restored-access-token"))
      .mockResolvedValueOnce(successResult(myInfo));
    vi.stubGlobal("fetch", fetchMock);

    const { bootstrapAuthSession } = await import("./authApi");
    const {
      getCurrentUser,
      getSessionSource,
      hasAuthenticatedSession,
    } = await import("../../shared/api/session");

    await expect(bootstrapAuthSession()).resolves.toBe("authenticated");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.test/api/auth/reissue",
      "https://api.test/api/users/me",
    ]);
    expect(hasAuthenticatedSession()).toBe(true);
    expect(getCurrentUser()).toEqual({
      id: 7,
      loginId: "user@example.com",
      username: "사용자",
      introduction: "소개",
      profileImage: "https://cdn.example/p.png",
    });
    expect(getSessionSource()).toBe("local");
    expect(browserWindow.localStorage.getItem("contextory.session")).toContain("restored-access-token");
    expect(browserWindow.sessionStorage.getItem("contextory.session")).toBeNull();
  });

  it("clears session and stays unauthenticated when reissue fails", async () => {
    const browserWindow = window as Window & typeof globalThis;
    browserWindow.localStorage.setItem("contextory.persist-login", "1");

    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        { code: "UNAUTHORIZED", isSuccess: false, message: "expired", result: null },
        { status: 401 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { bootstrapAuthSession } = await import("./authApi");
    const { getSession, hasPersistentLoginIntent } = await import("../../shared/api/session");

    await expect(bootstrapAuthSession()).resolves.toBe("unauthenticated");
    expect(getSession()).toBeUndefined();
    expect(hasPersistentLoginIntent()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not expose token-only session when user hydration fails", async () => {
    const browserWindow = window as Window & typeof globalThis;
    browserWindow.localStorage.setItem("contextory.persist-login", "1");

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(successResult("restored-access-token"))
      .mockResolvedValueOnce(
        Response.json(
          { code: "ERROR", isSuccess: false, message: "failed", result: null },
          { status: 500 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { bootstrapAuthSession } = await import("./authApi");
    const {
      getSession,
      hasAuthenticatedSession,
      hasPersistentLoginIntent,
    } = await import("../../shared/api/session");

    await expect(bootstrapAuthSession()).resolves.toBe("unauthenticated");
    expect(hasAuthenticatedSession()).toBe(false);
    expect(getSession()).toBeUndefined();
    expect(hasPersistentLoginIntent()).toBe(false);
  });

  it("skips reissue and getMyInfo when access token and user already exist", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { setSession } = await import("../../shared/api/session");
    setSession({
      accessToken: "existing",
      user: {
        id: 1,
        loginId: "user@example.com",
        username: "사용자",
        introduction: "",
        profileImage: "",
      },
    }, true);

    const { bootstrapAuthSession } = await import("./authApi");
    await expect(bootstrapAuthSession()).resolves.toBe("authenticated");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hydrates missing user when access token already exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResult(myInfo));
    vi.stubGlobal("fetch", fetchMock);
    const { setSession, getCurrentUser } = await import("../../shared/api/session");
    setSession({ accessToken: "existing" }, false);

    const { bootstrapAuthSession } = await import("./authApi");
    await expect(bootstrapAuthSession()).resolves.toBe("authenticated");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/users/me",
      expect.anything(),
    );
    expect(getCurrentUser()?.id).toBe(7);
  });
});

describe("logout", () => {
  it("reissues after a 401, retries with the new token, and clears the session", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(
        { code: "UNAUTHORIZED", isSuccess: false, message: "expired", result: null },
        { status: 401 },
      ))
      .mockResolvedValueOnce(successResult("new-access-token"))
      .mockResolvedValueOnce(successResult(null));
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
