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
    sessionStorage: Storage;
  };
  browserWindow.sessionStorage = new MemoryStorage();
  vi.stubGlobal("window", browserWindow);
  return browserWindow;
}

beforeEach(() => {
  stubBrowserWindow();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("invitation redirect helpers", () => {
  it("allows only internal invitation paths", async () => {
    const { isSafeInvitationRedirectPath } = await import("./invitationRedirect");

    expect(isSafeInvitationRedirectPath("/invitations/abc123")).toBe(true);
    expect(isSafeInvitationRedirectPath("https://evil.com")).toBe(false);
    expect(isSafeInvitationRedirectPath("//evil.com")).toBe(false);
    expect(isSafeInvitationRedirectPath("/projects/1/home")).toBe(false);
  });

  it("reads safe redirect query values", async () => {
    const { getSafeInvitationRedirectPath } = await import("./invitationRedirect");

    expect(getSafeInvitationRedirectPath("/invitations/token")).toBe("/invitations/token");
    expect(getSafeInvitationRedirectPath("https://evil.com")).toBeUndefined();
  });

  it("stores and consumes kakao invitation return paths", async () => {
    const {
      consumeKakaoInvitationReturnPath,
      setKakaoInvitationReturnPath,
    } = await import("./invitationRedirect");

    setKakaoInvitationReturnPath("/invitations/token");
    expect(consumeKakaoInvitationReturnPath()).toBe("/invitations/token");
    expect(consumeKakaoInvitationReturnPath()).toBeUndefined();
  });
});
