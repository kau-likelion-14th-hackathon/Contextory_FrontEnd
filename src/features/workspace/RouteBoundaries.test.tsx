/// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createMemoryRouter,
  Navigate,
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

const sampleUser = {
  id: 1,
  introduction: "",
  loginId: "user@example.com",
  profileImage: "",
  username: "사용자",
};

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("auth entry routing", () => {
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
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function renderApp(initialEntry: string) {
    const { AuthBoundary, GuestBoundary } = await import("./RouteBoundaries");
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Navigate to="/projects" replace />,
        },
        {
          element: <GuestBoundary />,
          children: [
            { path: "/auth/login", element: <div>login-screen</div> },
            { path: "/auth/signup", element: <div>signup-screen</div> },
          ],
        },
        {
          element: <AuthBoundary />,
          children: [
            { path: "/projects", element: <div>projects-screen</div> },
            {
              path: "/projects/:projectId/home",
              element: <div>protected-home</div>,
            },
          ],
        },
      ],
      { initialEntries: [initialEntry] },
    );

    await act(async () => {
      root.render(<RouterProvider router={router} />);
    });
    await flushEffects();
    return router;
  }

  it("sends unauthenticated / through /projects to /auth/login", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const router = await renderApp("/");
    await flushEffects();

    expect(router.state.location.pathname).toBe("/auth/login");
    expect(container.textContent).toContain("login-screen");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps authenticated persistent session on / as /projects", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { setSession } = await import("../../shared/api/session");
    setSession({ accessToken: "token", user: sampleUser }, true);

    const router = await renderApp("/");
    await flushEffects();

    expect(router.state.location.pathname).toBe("/projects");
    expect(container.textContent).toContain("projects-screen");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects authenticated users from /auth/login to /projects", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { setSession } = await import("../../shared/api/session");
    setSession({ accessToken: "token", user: sampleUser }, true);

    const router = await renderApp("/auth/login");
    await flushEffects();

    expect(router.state.location.pathname).toBe("/projects");
    expect(container.textContent).toContain("projects-screen");
  });

  it("redirects authenticated users from /auth/signup to /projects", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { setSession } = await import("../../shared/api/session");
    setSession({ accessToken: "token", user: sampleUser }, true);

    const router = await renderApp("/auth/signup");
    await flushEffects();

    expect(router.state.location.pathname).toBe("/projects");
    expect(container.textContent).toContain("projects-screen");
  });

  it("keeps login screen for keepSignedIn=false cold start without reissue", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const router = await renderApp("/auth/login");
    await flushEffects();

    expect(router.state.location.pathname).toBe("/auth/login");
    expect(container.textContent).toContain("login-screen");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("restores persistent intent on /auth/login then moves to /projects", async () => {
    window.localStorage.setItem("contextory.persist-login", "1");

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(successResult("restored-token"))
      .mockResolvedValueOnce(successResult({
        userId: 7,
        loginId: "user@example.com",
        username: "사용자",
        introduction: "소개",
        profileImage: "",
      }));
    vi.stubGlobal("fetch", fetchMock);

    const router = await renderApp("/auth/login");

    await act(async () => {
      await vi.waitFor(() => {
        expect(router.state.location.pathname).toBe("/projects");
      });
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.test/api/auth/reissue",
      "https://api.test/api/users/me",
    ]);
    expect(container.textContent).toContain("projects-screen");
  });

  it("preserves protected URL return path through AuthBoundary (#65-1)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const router = await renderApp("/projects/12/home");
    await flushEffects();

    expect(router.state.location.pathname).toBe("/auth/login");
    expect(router.state.location.state).toEqual({ from: "/projects/12/home" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("invitation redirect regression", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("still resolves invitation redirect ahead of state.from", async () => {
    const { resolvePostAuthPath } = await import("../auth/invitationRedirect");

    expect(resolvePostAuthPath({
      redirectParam: "/invitations/abc",
      locationState: { from: "/projects/1/home" },
    })).toBe("/invitations/abc");
  });
});
