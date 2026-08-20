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

function successResult<T>(result: T) {
  return Response.json({
    code: "SUCCESS",
    isSuccess: true,
    message: "success",
    result,
  });
}

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
    repository: null,
    subscription: null,
  };
}

function createPullRequestDetail() {
  return {
    prNumber: 123,
    title: "Demo PR",
    body: null,
    state: "open",
    draft: false,
    merged: false,
    mergeable: null,
    mergeableState: null,
    authorLogin: "dev",
    authorAvatarUrl: null,
    htmlUrl: "https://github.com/team/repo/pull/123",
    sourceBranch: "feature",
    sourceSha: "abc",
    targetBranch: "main",
    targetSha: "def",
    additions: 1,
    deletions: 0,
    changedFiles: 1,
    commits: 1,
    comments: 0,
    reviewComments: 0,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-02T00:00:00Z",
    closedAt: null,
    mergedAt: null,
  };
}

function createFilesResponse() {
  return {
    prNumber: 123,
    totalFiles: 0,
    totalAdditions: 0,
    totalDeletions: 0,
    files: [],
  };
}

function createAnalysisDetail(status: "COMPLETED" | "CANCELED" | "FAILED") {
  return {
    analysisId: 88,
    projectId: 39,
    prNumber: 123,
    analyzedHeadSha: "abc",
    analysisStatus: status,
    modelName: null,
    analysisResult: status === "COMPLETED"
      ? {
        summary: "summary",
        impacts: [],
        affectedRoles: [],
        changes: [],
        decisions: [],
        risks: [],
        followUpTasks: [],
        evidence: [],
      }
      : null,
    errorMessage: status === "FAILED" ? "boom" : null,
    requestedAt: "2026-08-01T00:00:00Z",
    startedAt: null,
    completedAt: status === "COMPLETED" ? "2026-08-01T01:00:00Z" : null,
    recordId: status === "COMPLETED" ? 1 : null,
    recordStatus: status === "COMPLETED" ? "DRAFT" : null,
    approvedAt: null,
    memoryEnabled: false,
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("PullRequestReviewScreen analysis action copy", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
    window.localStorage.clear();
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

  async function renderReview(initialEntry: string) {
    const context: ProjectWorkspaceContextValue = {
      project: createProject(),
      projectError: "",
      projectLoading: false,
      reloadProject: vi.fn(),
      setProjectDetail: vi.fn(),
    };
    const { PullRequestReviewScreen } = await import("./PullRequestReviewScreen");
    const router = createMemoryRouter(
      [
        {
          path: "/projects/:projectId",
          element: <Outlet context={context} />,
          children: [
            {
              path: "github/pulls/:pullRequestId",
              element: <PullRequestReviewScreen />,
            },
            {
              path: "analyses/:analysisId",
              element: <PullRequestReviewScreen />,
            },
          ],
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

  function mockNoExistingAnalysis(fetchMock?: ReturnType<typeof vi.fn>) {
    const mock = fetchMock ?? vi.fn();
    mock.mockImplementation((url: string) => {
      if (url.includes("/pull-requests/123/files")) {
        return Promise.resolve(successResult(createFilesResponse()));
      }
      if (url.includes("/pull-requests/123")) {
        return Promise.resolve(successResult(createPullRequestDetail()));
      }
      if (url.includes("/analyses?") && url.includes("prNumber=123")) {
        return Promise.resolve(successResult({
          content: [],
          page: 0,
          size: 1,
          hasNext: false,
        }));
      }
      return Promise.resolve(successResult(null));
    });
    vi.stubGlobal("fetch", mock);
    return mock;
  }

  function mockAnalysisRoute(status: "COMPLETED" | "CANCELED" | "FAILED") {
    const detail = createAnalysisDetail(status);
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/analyses/88")) {
        return Promise.resolve(successResult(detail));
      }
      if (url.includes("/pull-requests/123/files")) {
        return Promise.resolve(successResult(createFilesResponse()));
      }
      if (url.includes("/pull-requests/123")) {
        return Promise.resolve(successResult(createPullRequestDetail()));
      }
      if (url.includes("/analyses?") && url.includes("prNumber=123")) {
        return Promise.resolve(successResult({
          content: [{
            analysisId: 88,
            prNumber: 123,
            analyzedHeadSha: "abc",
            analysisStatus: status,
            modelName: null,
            requestedBy: { userId: 1, username: "dev" },
            requestedAt: "2026-08-01T00:00:00Z",
            completedAt: null,
          }],
          page: 0,
          size: 1,
          hasNext: false,
        }));
      }
      return Promise.resolve(successResult(null));
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("shows AI 분석 for PR without existing analysis history", async () => {
    mockNoExistingAnalysis();
    await renderReview("/projects/39/github/pulls/123");

    await act(async () => {
      await vi.waitFor(() => {
        expect(container.textContent).toContain("AI 분석");
      });
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "AI 분석");
    expect(analyzeButton).toBeTruthy();
    expect(container.textContent).not.toContain("AI 재분석");
    expect(container.textContent).toContain("상단의 AI 분석 버튼으로 분석을 시작할 수 있습니다.");
  });

  it("shows 분석 요청 중... while requestAnalysis is pending", async () => {
    let resolveRequest!: (value: Response) => void;
    const requestPromise = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url.endsWith("/analyses")) {
        return requestPromise;
      }
      if (url.includes("/pull-requests/123/files")) {
        return Promise.resolve(successResult(createFilesResponse()));
      }
      if (url.includes("/pull-requests/123")) {
        return Promise.resolve(successResult(createPullRequestDetail()));
      }
      if (url.includes("/analyses?") && url.includes("prNumber=123")) {
        return Promise.resolve(successResult({
          content: [],
          page: 0,
          size: 1,
          hasNext: false,
        }));
      }
      return Promise.resolve(successResult(null));
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderReview("/projects/39/github/pulls/123");
    await act(async () => {
      await vi.waitFor(() => {
        expect(Array.from(container.querySelectorAll("button"))
          .some((button) => button.textContent === "AI 분석")).toBe(true);
      });
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "AI 분석");
    await act(async () => {
      analyzeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(container.textContent).toContain("분석 요청 중...");
    expect(fetchMock.mock.calls.some(([url, init]) => (
      String(url).endsWith("/analyses") && (init as RequestInit | undefined)?.method === "POST"
    ))).toBe(true);

    await act(async () => {
      resolveRequest(successResult({
        analysisId: 99,
        projectId: 39,
        repositoryId: 1,
        prNumber: 123,
        analyzedHeadSha: "abc",
        analysisStatus: "PENDING",
        requestedAt: "2026-08-01T00:00:00Z",
      }));
      await flush();
    });
  });

  it("shows AI 재분석 on COMPLETED analysis route", async () => {
    mockAnalysisRoute("COMPLETED");
    await renderReview("/projects/39/analyses/88");

    await act(async () => {
      await vi.waitFor(() => {
        expect(container.textContent).toContain("AI 재분석");
      });
    });

    const reanalyze = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "AI 재분석");
    expect(reanalyze).toBeTruthy();
    expect(Array.from(container.querySelectorAll("button"))
      .some((button) => button.textContent === "AI 분석")).toBe(false);
  });

  it("shows AI 재분석 on CANCELED analysis and keeps requestAnalysis", async () => {
    const fetchMock = mockAnalysisRoute("CANCELED");
    await renderReview("/projects/39/analyses/88");

    await act(async () => {
      await vi.waitFor(() => {
        expect(container.textContent).toContain("AI 재분석");
      });
    });

    const reanalyze = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "AI 재분석");
    expect(reanalyze).toBeTruthy();

    let resolveRequest!: (value: Response) => void;
    const requestPromise = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url.endsWith("/analyses")) {
        return requestPromise;
      }
      if (url.includes("/analyses/88")) {
        return Promise.resolve(successResult(createAnalysisDetail("CANCELED")));
      }
      if (url.includes("/pull-requests/123/files")) {
        return Promise.resolve(successResult(createFilesResponse()));
      }
      if (url.includes("/pull-requests/123")) {
        return Promise.resolve(successResult(createPullRequestDetail()));
      }
      return Promise.resolve(successResult(null));
    });

    await act(async () => {
      reanalyze?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetchMock.mock.calls.some(([url, init]) => (
      String(url).endsWith("/analyses")
      && (init as RequestInit | undefined)?.method === "POST"
      && !String(url).includes("/retry")
    ))).toBe(true);

    await act(async () => {
      resolveRequest(successResult({
        analysisId: 100,
        projectId: 39,
        repositoryId: 1,
        prNumber: 123,
        analyzedHeadSha: "abc",
        analysisStatus: "PENDING",
        requestedAt: "2026-08-01T00:00:00Z",
      }));
      await flush();
    });
  });

  it("keeps FAILED retry copy and uses retryAnalysis", async () => {
    const fetchMock = mockAnalysisRoute("FAILED");
    await renderReview("/projects/39/analyses/88");

    await act(async () => {
      await vi.waitFor(() => {
        expect(container.textContent).toContain("AI 재분석");
      });
    });

    expect(Array.from(container.querySelectorAll("button"))
      .some((button) => button.textContent === "AI 분석")).toBe(false);

    const retryButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "AI 재분석");

    let resolveRetry!: (value: Response) => void;
    const retryPromise = new Promise<Response>((resolve) => {
      resolveRetry = resolve;
    });
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/analyses/88/retry") && init?.method === "POST") {
        return retryPromise;
      }
      if (url.includes("/analyses/88")) {
        return Promise.resolve(successResult(createAnalysisDetail("FAILED")));
      }
      if (url.includes("/pull-requests/123/files")) {
        return Promise.resolve(successResult(createFilesResponse()));
      }
      if (url.includes("/pull-requests/123")) {
        return Promise.resolve(successResult(createPullRequestDetail()));
      }
      return Promise.resolve(successResult(null));
    });

    await act(async () => {
      retryButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(container.textContent).toContain("재시도 중...");
    expect(fetchMock.mock.calls.some(([url, init]) => (
      String(url).includes("/analyses/88/retry")
      && (init as RequestInit | undefined)?.method === "POST"
    ))).toBe(true);

    await act(async () => {
      resolveRetry(successResult({
        previousAnalysisId: 88,
        newAnalysisId: 101,
        analysisStatus: "PENDING",
      }));
      await flush();
    });
  });
});
