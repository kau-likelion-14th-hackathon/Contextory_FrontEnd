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
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("post-auth redirect helpers", () => {
  it("allows only safe internal return paths", async () => {
    const { getSafeInternalRedirectPath, isSafeInternalRedirectPath } = await import("./invitationRedirect");

    expect(isSafeInternalRedirectPath("/projects/12/github/pulls/42")).toBe(true);
    expect(isSafeInternalRedirectPath("/projects/12/github?state=CLOSED&page=4")).toBe(true);
    expect(isSafeInternalRedirectPath("/projects/12/github#files")).toBe(true);
    expect(isSafeInternalRedirectPath("/invitations/abc123")).toBe(true);

    expect(getSafeInternalRedirectPath("https://example.com")).toBeUndefined();
    expect(getSafeInternalRedirectPath("//evil.example.com")).toBeUndefined();
    expect(getSafeInternalRedirectPath("https://evil.com/projects")).toBeUndefined();
    expect(getSafeInternalRedirectPath("/auth/login")).toBeUndefined();
    expect(getSafeInternalRedirectPath("\\evil")).toBeUndefined();
  });

  it("keeps invitation redirect query limited to invitation paths", async () => {
    const {
      getSafeInvitationRedirectPath,
      isSafeInvitationRedirectPath,
    } = await import("./invitationRedirect");

    expect(isSafeInvitationRedirectPath("/invitations/abc123")).toBe(true);
    expect(isSafeInvitationRedirectPath("/invitations/accept?token=query-token")).toBe(true);
    expect(isSafeInvitationRedirectPath("/invitations/accept")).toBe(false);
    expect(isSafeInvitationRedirectPath("/projects/1/home")).toBe(false);
    expect(isSafeInvitationRedirectPath("/auth/login")).toBe(false);
    expect(isSafeInvitationRedirectPath("https://evil.example.com")).toBe(false);
    expect(isSafeInvitationRedirectPath("//evil.example.com")).toBe(false);
    expect(getSafeInvitationRedirectPath("/invitations/token")).toBe("/invitations/token");
    expect(getSafeInvitationRedirectPath("/invitations/accept?token=query-token"))
      .toBe("/invitations/accept?token=query-token");
    expect(getSafeInvitationRedirectPath("https://evil.com")).toBeUndefined();
    expect(getSafeInvitationRedirectPath("/projects/12/github/pulls/42")).toBeUndefined();
  });

  it("resolves invitation tokens from path or query without treating accept as a token", async () => {
    const { resolveInvitationToken } = await import("./invitationRedirect");

    expect(resolveInvitationToken({ pathToken: "path-token" })).toBe("path-token");
    expect(resolveInvitationToken({
      pathToken: undefined,
      queryToken: "query-token",
    })).toBe("query-token");
    expect(resolveInvitationToken({
      pathToken: "path-token",
      queryToken: "query-token",
    })).toBe("path-token");
    expect(resolveInvitationToken({
      pathToken: "accept",
      queryToken: "query-token",
    })).toBe("query-token");
    expect(resolveInvitationToken({
      pathToken: "accept",
      queryToken: null,
    })).toBeUndefined();
    expect(resolveInvitationToken({
      pathToken: "  ",
      queryToken: "  ",
    })).toBeUndefined();
  });

  it("resolves protected URL return path from location.state.from", async () => {
    const { resolvePostAuthPath } = await import("./invitationRedirect");

    expect(resolvePostAuthPath({
      locationState: { from: "/projects/12/github/pulls/42" },
    })).toBe("/projects/12/github/pulls/42");

    expect(resolvePostAuthPath({
      locationState: { from: "/projects/12/github?state=CLOSED&page=4" },
    })).toBe("/projects/12/github?state=CLOSED&page=4");

    expect(resolvePostAuthPath({
      locationState: { from: "/projects/12/home#overview" },
    })).toBe("/projects/12/home#overview");
  });

  it("falls back to /projects when return path is missing or unsafe", async () => {
    const { resolvePostAuthPath } = await import("./invitationRedirect");

    expect(resolvePostAuthPath({})).toBe("/projects");
    expect(resolvePostAuthPath({
      locationState: { from: "https://example.com" },
    })).toBe("/projects");
    expect(resolvePostAuthPath({
      locationState: { from: "//evil.example.com" },
    })).toBe("/projects");
  });

  it("prefers invitation redirect query over location.state.from", async () => {
    const { resolvePostAuthPath } = await import("./invitationRedirect");

    expect(resolvePostAuthPath({
      redirectParam: "/invitations/invite-token",
      locationState: { from: "/projects/12/github/pulls/42" },
    })).toBe("/invitations/invite-token");

    expect(resolvePostAuthPath({
      redirectParam: "/invitations/accept?token=query-token",
      locationState: { from: "/projects/12/home" },
    })).toBe("/invitations/accept?token=query-token");
  });

  it("preserves return path across login/signup switch state", async () => {
    const { getLocationStateReturnPath, resolvePostAuthPath } = await import("./invitationRedirect");

    const switchedState = {
      from: "/projects/12/github/pulls/42",
    };
    expect(getLocationStateReturnPath(switchedState)).toBe("/projects/12/github/pulls/42");
    expect(resolvePostAuthPath({ locationState: switchedState }))
      .toBe("/projects/12/github/pulls/42");
  });

  it("stores and consumes kakao return paths for protected URLs and invitations", async () => {
    const {
      consumeKakaoAuthReturnPath,
      setKakaoAuthReturnPath,
    } = await import("./invitationRedirect");

    setKakaoAuthReturnPath("/projects/12/github/pulls/42");
    expect(consumeKakaoAuthReturnPath()).toBe("/projects/12/github/pulls/42");
    expect(consumeKakaoAuthReturnPath()).toBeUndefined();

    setKakaoAuthReturnPath("/invitations/token");
    expect(consumeKakaoAuthReturnPath()).toBe("/invitations/token");

    setKakaoAuthReturnPath("/invitations/accept?token=query-token");
    expect(consumeKakaoAuthReturnPath()).toBe("/invitations/accept?token=query-token");
  });

  it("rejects unsafe kakao return paths and clears stored values", async () => {
    const {
      clearKakaoAuthReturnPath,
      consumeKakaoAuthReturnPath,
      setKakaoAuthReturnPath,
      setKakaoInvitationReturnPath,
      consumeKakaoInvitationReturnPath,
    } = await import("./invitationRedirect");

    setKakaoAuthReturnPath("https://evil.com");
    expect(consumeKakaoAuthReturnPath()).toBeUndefined();

    setKakaoInvitationReturnPath("/invitations/old-token");
    clearKakaoAuthReturnPath();
    expect(consumeKakaoInvitationReturnPath()).toBeUndefined();
  });
});
