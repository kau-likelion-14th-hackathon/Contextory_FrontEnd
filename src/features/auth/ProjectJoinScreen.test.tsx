/// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createMemoryRouter,
  RouterProvider,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function successResult<T>(result: T) {
  return Response.json({
    code: "SUCCESS",
    isSuccess: true,
    message: "success",
    result,
  });
}

function apiError(code: string, status = 400) {
  return Response.json(
    { code, isSuccess: false, message: code, result: null },
    { status },
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("ProjectJoinScreen invitation links", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
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

  async function renderInvitation(initialEntry: string) {
    const { ProjectJoinScreen } = await import("./ProjectJoinScreen");
    const router = createMemoryRouter(
      [
        {
          path: "/invitations/accept",
          element: <ProjectJoinScreen />,
        },
        {
          path: "/invitations/:token",
          element: <ProjectJoinScreen />,
        },
        {
          path: "/auth/login",
          element: <div>login-screen</div>,
        },
        {
          path: "/auth/signup",
          element: <div>signup-screen</div>,
        },
        {
          path: "/projects/:projectId/home",
          element: <div>project-home</div>,
        },
        {
          path: "/projects",
          element: <div>projects-list</div>,
        },
      ],
      { initialEntries: [initialEntry] },
    );

    await act(async () => {
      root.render(<RouterProvider router={router} />);
    });
    await flush();
    return router;
  }

  it("uses path token for /invitations/:token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const router = await renderInvitation("/invitations/path-token");

    const loginLink = container.querySelector('a[href*="/auth/login"]') as HTMLAnchorElement;
    expect(loginLink.href).toContain(encodeURIComponent("/invitations/path-token"));
    expect(container.textContent).toContain("프로젝트 초대를 받았습니다");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe("/invitations/path-token");
  });

  it("uses query token for /invitations/accept?token=", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await renderInvitation("/invitations/accept?token=query-token");

    const loginLink = container.querySelector('a[href*="/auth/login"]') as HTMLAnchorElement;
    expect(decodeURIComponent(loginLink.href)).toContain("/invitations/accept?token=query-token");
    expect(container.textContent).toContain("프로젝트 초대를 받았습니다");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers path token when both path and query tokens exist", async () => {
    await renderInvitation("/invitations/path-token?token=query-token");

    const loginLink = container.querySelector('a[href*="/auth/login"]') as HTMLAnchorElement;
    expect(decodeURIComponent(loginLink.getAttribute("href") ?? "")).toContain("/invitations/path-token");
    expect(decodeURIComponent(loginLink.getAttribute("href") ?? "")).toContain("token=query-token");
  });

  it("shows invalid state without calling accept when token is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await renderInvitation("/invitations/accept");

    expect(container.textContent).toContain("유효하지 않은 초대 링크입니다");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts with query token via POST /api/invitations/{token}/accept", async () => {
    const { setSession } = await import("../../shared/api/session");
    setSession({
      accessToken: "token",
      user: {
        id: 1,
        loginId: "user@example.com",
        username: "사용자",
        introduction: "",
        profileImage: "",
      },
    }, false);

    const fetchMock = vi.fn().mockResolvedValue(successResult({ projectId: 39 }));
    vi.stubGlobal("fetch", fetchMock);
    const router = await renderInvitation("/invitations/accept?token=query-token");

    const acceptButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("프로젝트 참여하기"));
    expect(acceptButton).toBeTruthy();

    await act(async () => {
      acceptButton?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/invitations/query-token/accept",
      expect.objectContaining({ method: "POST" }),
    );
    await act(async () => {
      await vi.waitFor(() => {
        expect(router.state.location.pathname).toBe("/projects/39/home");
      });
    });
  });

  it("accepts with path token via POST /api/invitations/{token}/accept", async () => {
    const { setSession } = await import("../../shared/api/session");
    setSession({
      accessToken: "token",
      user: {
        id: 1,
        loginId: "user@example.com",
        username: "사용자",
        introduction: "",
        profileImage: "",
      },
    }, false);

    const fetchMock = vi.fn().mockResolvedValue(successResult({ projectId: 12 }));
    vi.stubGlobal("fetch", fetchMock);
    const router = await renderInvitation("/invitations/path-token");

    const acceptButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("프로젝트 참여하기"));

    await act(async () => {
      acceptButton?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/invitations/path-token/accept",
      expect.objectContaining({ method: "POST" }),
    );
    await act(async () => {
      await vi.waitFor(() => {
        expect(router.state.location.pathname).toBe("/projects/12/home");
      });
    });
  });

  it("preserves query invitation redirect for logged-out users", async () => {
    await renderInvitation("/invitations/accept?token=query-token");

    const loginHref = container.querySelector('a[href*="/auth/login"]')?.getAttribute("href") ?? "";
    const signupHref = container.querySelector('a[href*="/auth/signup"]')?.getAttribute("href") ?? "";
    expect(decodeURIComponent(loginHref)).toBe("/auth/login?redirect=/invitations/accept?token=query-token");
    expect(decodeURIComponent(signupHref)).toBe("/auth/signup?redirect=/invitations/accept?token=query-token");
  });

  it("maps invitation API error codes to user-facing states", async () => {
    const { setSession } = await import("../../shared/api/session");
    setSession({
      accessToken: "token",
      user: {
        id: 1,
        loginId: "user@example.com",
        username: "사용자",
        introduction: "",
        profileImage: "",
      },
    }, false);

    const cases = [
      { code: "PROJECT_INVITATION_4041", title: "유효하지 않은 초대 링크입니다" },
      { code: "PROJECT_INVITATION_4002", title: "초대 링크가 만료되었습니다" },
      { code: "PROJECT_INVITATION_4031", title: "현재 계정으로 수락할 수 없습니다" },
      { code: "PROJECT_MEMBER_4091", title: "이미 프로젝트에 참여 중입니다" },
      { code: "PROJECT_INVITATION_4001", title: "이미 처리된 초대입니다" },
    ] as const;

    for (const item of cases) {
      vi.resetModules();
      vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
      const { setSession: setSessionAgain } = await import("../../shared/api/session");
      setSessionAgain({
        accessToken: "token",
        user: {
          id: 1,
          loginId: "user@example.com",
          username: "사용자",
          introduction: "",
          profileImage: "",
        },
      }, false);

      const fetchMock = vi.fn().mockResolvedValue(apiError(item.code, item.code.includes("404") ? 404 : 400));
      vi.stubGlobal("fetch", fetchMock);
      await renderInvitation("/invitations/accept?token=query-token");

      const acceptButton = Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("프로젝트 참여하기"));
      await act(async () => {
        acceptButton?.click();
        await Promise.resolve();
        await Promise.resolve();
      });

      await act(async () => {
        await vi.waitFor(() => {
          expect(container.textContent).toContain(item.title);
        });
      });
    }
  });

  it("logs out and keeps invitation redirect when switching accounts on email mismatch", async () => {
    const { setSession, getSession } = await import("../../shared/api/session");
    setSession({
      accessToken: "token",
      user: {
        id: 1,
        loginId: "wrong@example.com",
        username: "다른계정",
        introduction: "",
        profileImage: "",
      },
    }, false);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiError("PROJECT_INVITATION_4031", 403))
      .mockResolvedValueOnce(successResult(null));
    vi.stubGlobal("fetch", fetchMock);
    const router = await renderInvitation("/invitations/accept?token=query-token");

    const acceptButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("프로젝트 참여하기"));
    await act(async () => {
      acceptButton?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(container.textContent).toContain("다른 계정으로 로그인");
      });
    });

    const switchButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("다른 계정으로 로그인"));
    await act(async () => {
      switchButton?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(router.state.location.pathname).toBe("/auth/login");
      });
    });
    expect(decodeURIComponent(router.state.location.search))
      .toBe("?redirect=/invitations/accept?token=query-token");
    expect(getSession()).toBeUndefined();
  });
});
