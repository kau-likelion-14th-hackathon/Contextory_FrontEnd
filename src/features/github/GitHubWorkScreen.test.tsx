/// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectDetailResponse } from "../project/projectApi";
import type { ProjectWorkspaceContextValue } from "../workspace/WorkspaceShell";
import type { PullRequestSummary } from "./pullRequestApi";

function createProject(): ProjectDetailResponse {
  return {
    projectId: 39,
    name: "Demo",
    slug: "demo",
    summary: null,
    purpose: null,
    defaultLanguage: "ko",
    status: "ACTIVE",
    myPermissionRole: "OWNER",
    repository: {
      connected: true,
      repositoryFullName: "team/repo",
    },
    subscription: null,
  };
}

function successResult<T>(result: T) {
  return Response.json({
    code: "SUCCESS",
    isSuccess: true,
    message: "success",
    result,
  });
}

function createPr(prNumber: number): PullRequestSummary {
  return {
    prNumber,
    title: `PR ${prNumber}`,
    state: "open",
    draft: false,
    authorLogin: "dev",
    authorAvatarUrl: null,
    htmlUrl: `https://github.com/team/repo/pull/${prNumber}`,
    sourceBranch: "feature",
    targetBranch: "main",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-02T00:00:00Z",
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("GitHubWorkScreen list navigation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
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

  async function renderScreen(initialEntry: string) {
    const context: ProjectWorkspaceContextValue = {
      project: createProject(),
      projectError: "",
      projectLoading: false,
      reloadProject: vi.fn(),
      setProjectDetail: vi.fn(),
    };
    const { GitHubWorkScreen } = await import("./GitHubWorkScreen");
    const router = createMemoryRouter(
      [
        {
          path: "/projects/:projectId/github",
          element: <Outlet context={context} />,
          children: [{ index: true, element: <GitHubWorkScreen /> }],
        },
        {
          path: "/projects/:projectId/github/pulls/:pullRequestId",
          element: <div>pr-detail</div>,
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

  function listCalls(fetchMock: ReturnType<typeof vi.fn>) {
    return fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.includes("/pull-requests?"));
  }

  it("requests CLOSED/page5 from the initial URL without OPEN/page1 first", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResult({
      content: [createPr(10)],
      page: 5,
      size: 7,
      hasNext: true,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const router = await renderScreen("/projects/39/github?state=CLOSED&page=5");
    await act(async () => {
      await vi.waitFor(() => {
        expect(listCalls(fetchMock).length).toBeGreaterThan(0);
      });
    });

    expect(listCalls(fetchMock)[0]).toContain("state=CLOSED&page=5&size=7");
    expect(listCalls(fetchMock).some((url) => url.includes("state=OPEN&page=1"))).toBe(false);
    expect(router.state.location.search).toBe("?state=CLOSED&page=5");
  });

  it("canonicalizes invalid query to OPEN/page1 once", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResult({
      content: [createPr(1)],
      page: 1,
      size: 7,
      hasNext: false,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const router = await renderScreen("/projects/39/github?state=INVALID&page=abc");
    await act(async () => {
      await vi.waitFor(() => {
        expect(router.state.location.search).toBe("?state=OPEN&page=1");
      });
    });

    await flush();
    expect(listCalls(fetchMock).every((url) => url.includes("state=OPEN&page=1&size=7"))).toBe(true);
    expect(listCalls(fetchMock).length).toBeLessThanOrEqual(2);
  });

  it("resets page to 1 when filter changes and preserves state on page move", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const parsed = new URL(url);
      const page = Number(parsed.searchParams.get("page") ?? "1");
      const state = parsed.searchParams.get("state");
      return Promise.resolve(successResult({
        content: [createPr(page)],
        page,
        size: 7,
        hasNext: state === "OPEN" ? page < 5 : page < 2,
      }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = await renderScreen("/projects/39/github?state=OPEN&page=5");
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("5");
      });
    });

    const closedFilter = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "닫힘");
    await act(async () => {
      closedFilter?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await vi.waitFor(() => {
        expect(router.state.location.search).toBe("?state=CLOSED&page=1");
      });
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(listCalls(fetchMock).at(-1)).toContain("state=CLOSED&page=1&size=7");
      });
    });

    const nextButton = container.querySelector('[aria-label="다음 Pull Request 페이지"]');
    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await vi.waitFor(() => {
        expect(router.state.location.search).toBe("?state=CLOSED&page=2");
      });
    });
  });

  it("renders pagination items and navigates by page number", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResult({
      content: [createPr(50)],
      page: 5,
      size: 7,
      hasNext: true,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const router = await renderScreen("/projects/39/github?state=OPEN&page=5");
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("5");
      });
    });

    const pageButtons = Array.from(
      container.querySelectorAll(".github-work__pagination-page"),
    ).map((button) => button.textContent);
    expect(pageButtons).toEqual(["1", "4", "5", "6"]);
    expect(container.querySelector(".github-work__pagination-ellipsis")?.textContent).toBe("…");

    const page4 = Array.from(container.querySelectorAll(".github-work__pagination-page"))
      .find((button) => button.textContent === "4");
    await act(async () => {
      page4?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await vi.waitFor(() => {
        expect(router.state.location.search).toBe("?state=OPEN&page=4");
      });
    });
  });

  it("disables previous on page 1 and does not invent next page when hasNext is false", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(successResult({
        content: [createPr(1)],
        page: 1,
        size: 7,
        hasNext: false,
      }))
      .mockResolvedValueOnce(successResult({
        content: [createPr(5)],
        page: 5,
        size: 7,
        hasNext: false,
      }));
    vi.stubGlobal("fetch", fetchMock);

    await renderScreen("/projects/39/github?state=OPEN&page=1");
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");
      });
    });
    expect(
      (container.querySelector('[aria-label="이전 Pull Request 페이지"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (container.querySelector('[aria-label="다음 Pull Request 페이지"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(Array.from(container.querySelectorAll(".github-work__pagination-page")).map((n) => n.textContent))
      .toEqual(["1"]);

    act(() => {
      root.unmount();
    });
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const router = await renderScreen("/projects/39/github?state=CLOSED&page=5");
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("5");
      });
    });
    expect(
      (container.querySelector('[aria-label="다음 Pull Request 페이지"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(Array.from(container.querySelectorAll(".github-work__pagination-page")).map((n) => n.textContent))
      .toEqual(["1", "4", "5"]);
    expect(router.state.location.search).toBe("?state=CLOSED&page=5");
  });

  it("falls back out-of-range page to page 1 once", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(successResult({
        content: [],
        page: 999,
        size: 7,
        hasNext: false,
      }))
      .mockResolvedValueOnce(successResult({
        content: [createPr(1)],
        page: 1,
        size: 7,
        hasNext: false,
      }));
    vi.stubGlobal("fetch", fetchMock);

    const router = await renderScreen("/projects/39/github?state=CLOSED&page=999");
    await act(async () => {
      await vi.waitFor(() => {
        expect(router.state.location.search).toBe("?state=CLOSED&page=1");
      });
    });
    await act(async () => {
      await vi.waitFor(() => {
        expect(listCalls(fetchMock)).toEqual([
          expect.stringContaining("state=CLOSED&page=999&size=7"),
          expect.stringContaining("state=CLOSED&page=1&size=7"),
        ]);
      });
    });
    expect(listCalls(fetchMock).some((url) => url.includes("page=998"))).toBe(false);
  });

  it("re-fetches current URL state/page on refresh without resetting query", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResult({
      content: [createPr(5)],
      page: 5,
      size: 7,
      hasNext: false,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const router = await renderScreen("/projects/39/github?state=CLOSED&page=5");
    await act(async () => {
      await vi.waitFor(() => {
        expect(listCalls(fetchMock).length).toBe(1);
      });
    });

    const refresh = container.querySelector('[aria-label="GitHub Pull Request 목록 새로고침"]');
    await act(async () => {
      refresh?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await vi.waitFor(() => {
        expect(listCalls(fetchMock).length).toBe(2);
      });
    });

    expect(router.state.location.search).toBe("?state=CLOSED&page=5");
    expect(listCalls(fetchMock)[1]).toContain("state=CLOSED&page=5&size=7");
  });

  it("includes list context in PR detail links", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResult({
      content: [createPr(123)],
      page: 5,
      size: 7,
      hasNext: false,
    }));
    vi.stubGlobal("fetch", fetchMock);

    await renderScreen("/projects/39/github?state=CLOSED&page=5");
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('a[href*="/github/pulls/123"]')).not.toBeNull();
      });
    });

    const detailLink = container.querySelector('a[href*="/github/pulls/123"]') as HTMLAnchorElement;
    expect(detailLink.getAttribute("href")).toBe(
      "/projects/39/github/pulls/123?state=CLOSED&page=5",
    );
  });
});
