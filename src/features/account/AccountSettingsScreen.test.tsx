/// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
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
  const browserWindow = window as Window & typeof globalThis;
  Object.defineProperty(browserWindow, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
  Object.defineProperty(browserWindow, "sessionStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
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
  loginId: "real@example.com",
  username: "실제사용자",
  introduction: "소개",
  profileImage: "",
};

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("AccountSettingsScreen", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
    stubBrowserWindow();
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.innerHTML = "";
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function renderScreen() {
    const { AccountSettingsScreen } = await import("./AccountSettingsScreen");
    await act(async () => {
      root.render(
        <MemoryRouter>
          <AccountSettingsScreen />
        </MemoryRouter>,
      );
    });
  }

  it("shows loading without mock user or GitHub account data", async () => {
    let resolveMyInfo!: (value: Response) => void;
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => {
      resolveMyInfo = resolve;
    }));
    vi.stubGlobal("fetch", fetchMock);

    await renderScreen();
    await flush();

    expect(container.textContent).toContain("프로필 정보를 불러오는 중입니다.");
    expect(container.textContent).not.toContain("홍길동");
    expect(container.textContent).not.toContain("hong@example.com");
    expect(container.textContent).not.toContain("hong-dev");
    expect(container.textContent).not.toContain("실제사용자");

    const editButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "프로필 수정");
    expect(editButton).toBeUndefined();

    await act(async () => {
      resolveMyInfo(successResult(myInfo));
      await Promise.resolve();
    });
  });

  it("renders real GET /api/users/me data on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResult(myInfo));
    vi.stubGlobal("fetch", fetchMock);

    await renderScreen();
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.textContent).toContain("실제사용자");
      });
    });

    expect(container.textContent).toContain("real@example.com");
    expect(container.textContent).toContain("소개");
    expect(container.textContent).not.toContain("홍길동");
    expect(container.textContent).not.toContain("hong@example.com");
    expect(container.textContent).not.toContain("hong-dev");
  });

  it("shows error state without mock fallbacks and without edit CTA", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    await renderScreen();
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.textContent).toMatch(
          /사용자 정보를 불러오지 못했습니다|네트워크 연결을 확인한 뒤 다시 시도해주세요/,
        );
      });
    });

    expect(container.textContent).not.toContain("홍길동");
    expect(container.textContent).not.toContain("hong@example.com");
    expect(container.textContent).not.toContain("hong-dev");

    const editButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "프로필 수정");
    expect(editButton).toBeUndefined();
  });

  it("shows GitHub connection as unavailable account-level info", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResult(myInfo));
    vi.stubGlobal("fetch", fetchMock);

    await renderScreen();
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.textContent).toContain("실제사용자");
      });
    });

    expect(container.textContent).toContain("GitHub 연결");
    expect(container.textContent).toContain("준비 중");
    expect(container.textContent).toContain("GitHub 계정 연결 정보는 현재 제공하지 않습니다.");
    expect(container.textContent).toContain("각 프로젝트 설정에서 관리할 수 있습니다.");
    expect(container.textContent).not.toContain("hong-dev");
    expect(container.textContent).not.toContain("연결 해제");
  });

  it("allows profile edit after load and updates session on PATCH success", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(successResult(myInfo))
      .mockResolvedValueOnce(successResult({
        userId: 7,
        username: "변경된이름",
        introduction: "새 소개",
      }));
    vi.stubGlobal("fetch", fetchMock);

    const { setSession, getCurrentUser } = await import("../../shared/api/session");
    setSession({
      accessToken: "token",
      user: {
        id: 7,
        loginId: "real@example.com",
        username: "실제사용자",
        introduction: "소개",
        profileImage: "",
      },
    }, false);

    await renderScreen();
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.textContent).toContain("실제사용자");
      });
    });

    const editButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "프로필 수정");
    expect(editButton).toBeTruthy();

    await act(async () => {
      editButton?.click();
    });

    const usernameInput = container.querySelector("#account-profile-username") as HTMLInputElement;
    const introductionInput = container.querySelector("#account-profile-introduction") as HTMLTextAreaElement;
    expect(usernameInput).toBeTruthy();

    await act(async () => {
      usernameInput.value = "변경된이름";
      usernameInput.dispatchEvent(new Event("input", { bubbles: true }));
      introductionInput.value = "새 소개";
      introductionInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const form = container.querySelector("form.account-profile-form") as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(container.textContent).toContain("변경된이름");
      });
    });

    expect(container.textContent).toContain("새 소개");
    expect(container.textContent).toContain("real@example.com");
    expect(getCurrentUser()).toMatchObject({
      id: 7,
      loginId: "real@example.com",
      username: "변경된이름",
      introduction: "새 소개",
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.test/api/users/me",
      "https://api.test/api/users/me",
    ]);
  });
});
