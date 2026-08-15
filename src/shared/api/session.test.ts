import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
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

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("auth session", () => {
  it("keeps a persistent session in localStorage when updating its token", async () => {
    const browserWindow = stubBrowserWindow();
    const { getSession, setSession, updateAccessToken } = await import("./session");

    setSession({ accessToken: "old", user: {
      id: 1,
      introduction: "hello",
      loginId: "user@example.com",
      profileImage: "",
      username: "사용자",
    } }, true);
    updateAccessToken("new");

    expect(getSession()).toMatchObject({
      accessToken: "new",
      user: { loginId: "user@example.com" },
    });
    expect(browserWindow.localStorage.length).toBe(1);
    expect(browserWindow.sessionStorage.length).toBe(0);
  });

  it("keeps a non-persistent session in sessionStorage when updating its token", async () => {
    const browserWindow = stubBrowserWindow();
    const { getAccessToken, setSession, updateAccessToken } = await import("./session");

    setSession({ accessToken: "old" }, false);
    updateAccessToken("new");

    expect(getAccessToken()).toBe("new");
    expect(browserWindow.localStorage.length).toBe(0);
    expect(browserWindow.sessionStorage.length).toBe(1);
  });
});
