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

const sampleUser = {
  id: 1,
  introduction: "hello",
  loginId: "user@example.com",
  profileImage: "",
  username: "사용자",
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("auth session", () => {
  it("stores keepSignedIn=false sessions in sessionStorage only", async () => {
    const browserWindow = stubBrowserWindow();
    const {
      getSession,
      getSessionSource,
      hasPersistentLoginIntent,
      setSession,
    } = await import("./session");

    setSession({ accessToken: "token", user: sampleUser }, false);

    expect(getSessionSource()).toBe("session");
    expect(hasPersistentLoginIntent()).toBe(false);
    expect(browserWindow.sessionStorage.getItem("contextory.session")).toContain("token");
    expect(browserWindow.localStorage.getItem("contextory.session")).toBeNull();
    expect(browserWindow.localStorage.getItem("contextory.persist-login")).toBeNull();
    expect(getSession()?.user?.loginId).toBe("user@example.com");
  });

  it("stores keepSignedIn=true sessions in localStorage only", async () => {
    const browserWindow = stubBrowserWindow();
    const {
      getSessionSource,
      hasPersistentLoginIntent,
      setSession,
    } = await import("./session");

    setSession({ accessToken: "token", user: sampleUser }, true);

    expect(getSessionSource()).toBe("local");
    expect(hasPersistentLoginIntent()).toBe(true);
    expect(browserWindow.localStorage.getItem("contextory.session")).toContain("token");
    expect(browserWindow.sessionStorage.getItem("contextory.session")).toBeNull();
    expect(browserWindow.localStorage.getItem("contextory.persist-login")).toBe("1");
  });

  it("clears local/session storage and persistent-login intent", async () => {
    const browserWindow = stubBrowserWindow();
    const {
      clearSession,
      getSession,
      hasPersistentLoginIntent,
      setSession,
    } = await import("./session");

    setSession({ accessToken: "token", user: sampleUser }, true);
    clearSession();

    expect(getSession()).toBeUndefined();
    expect(hasPersistentLoginIntent()).toBe(false);
    expect(browserWindow.localStorage.getItem("contextory.session")).toBeNull();
    expect(browserWindow.sessionStorage.getItem("contextory.session")).toBeNull();
    expect(browserWindow.localStorage.getItem("contextory.persist-login")).toBeNull();
  });

  it("keeps a persistent session in localStorage when updating its token", async () => {
    const browserWindow = stubBrowserWindow();
    const { getSession, getSessionSource, setSession, updateAccessToken } = await import("./session");

    setSession({ accessToken: "old", user: sampleUser }, true);
    updateAccessToken("new");

    expect(getSession()).toMatchObject({
      accessToken: "new",
      user: { loginId: "user@example.com" },
    });
    expect(getSessionSource()).toBe("local");
    expect(browserWindow.localStorage.getItem("contextory.session")).toContain("new");
    expect(browserWindow.sessionStorage.getItem("contextory.session")).toBeNull();
  });

  it("keeps a non-persistent session in sessionStorage when updating its token", async () => {
    const browserWindow = stubBrowserWindow();
    const { getAccessToken, getSessionSource, setSession, updateAccessToken } = await import("./session");

    setSession({ accessToken: "old", user: sampleUser }, false);
    updateAccessToken("new");

    expect(getAccessToken()).toBe("new");
    expect(getSessionSource()).toBe("session");
    expect(browserWindow.localStorage.getItem("contextory.session")).toBeNull();
    expect(browserWindow.sessionStorage.getItem("contextory.session")).toContain("new");
  });

  it("writes cold-start reissue tokens to localStorage when persist intent is set", async () => {
    const browserWindow = stubBrowserWindow();
    const {
      getSessionSource,
      hasPersistentLoginIntent,
      updateAccessToken,
    } = await import("./session");

    browserWindow.localStorage.setItem("contextory.persist-login", "1");
    expect(hasPersistentLoginIntent()).toBe(true);

    updateAccessToken("restored-token");

    expect(getSessionSource()).toBe("local");
    expect(browserWindow.localStorage.getItem("contextory.session")).toContain("restored-token");
    expect(browserWindow.sessionStorage.getItem("contextory.session")).toBeNull();
  });
});
