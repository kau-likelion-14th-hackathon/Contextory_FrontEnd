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

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("PullRequestReviewScreen list context", () => {
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
            {
              path: "github",
              element: <div>github-list</div>,
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

  it("keeps list context when restoring existing analysis", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/pull-requests/123/files")) {
        return Promise.resolve(successResult({
          prNumber: 123,
          totalFiles: 0,
          totalAdditions: 0,
          totalDeletions: 0,
          files: [],
        }));
      }
      if (url.includes("/pull-requests/123")) {
        return Promise.resolve(successResult({
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
          sourceSha: null,
          targetBranch: "main",
          targetSha: null,
          additions: null,
          deletions: null,
          changedFiles: null,
          commits: null,
          comments: null,
          reviewComments: null,
          createdAt: "2026-08-01T00:00:00Z",
          updatedAt: "2026-08-02T00:00:00Z",
          closedAt: null,
          mergedAt: null,
        }));
      }
      if (url.includes("/analyses?") && url.includes("prNumber=123")) {
        return Promise.resolve(successResult({
          content: [{
            analysisId: 88,
            prNumber: 123,
            analyzedHeadSha: "abc",
            analysisStatus: "COMPLETED",
            modelName: null,
            requestedBy: { userId: 1, username: "dev" },
            requestedAt: "2026-08-01T00:00:00Z",
            completedAt: "2026-08-01T01:00:00Z",
          }],
          page: 0,
          size: 1,
          hasNext: false,
        }));
      }
      if (url.includes("/analyses/88")) {
        return Promise.resolve(successResult({
          analysisId: 88,
          projectId: 39,
          prNumber: 123,
          analyzedHeadSha: "abc",
          analysisStatus: "COMPLETED",
          modelName: null,
          analysisResult: null,
          errorMessage: null,
          requestedAt: "2026-08-01T00:00:00Z",
          startedAt: null,
          completedAt: "2026-08-01T01:00:00Z",
          recordId: null,
          recordStatus: "DRAFT",
          approvedAt: null,
          memoryEnabled: false,
        }));
      }
      return Promise.resolve(successResult(null));
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = await renderReview(
      "/projects/39/github/pulls/123?state=CLOSED&page=5",
    );

    await act(async () => {
      await vi.waitFor(() => {
        expect(router.state.location.pathname).toBe("/projects/39/analyses/88");
      });
    });

    expect(router.state.location.search).toBe("?state=CLOSED&page=5");
  });

  it("uses list context on GitHub return link for invalid analysis", async () => {
    vi.stubGlobal("fetch", vi.fn());

    await renderReview("/projects/39/analyses/abc?state=CLOSED&page=5");
    await flush();

    const returnLink = Array.from(container.querySelectorAll("a"))
      .find((anchor) => anchor.textContent?.includes("GitHub 작업 목록"));
    expect(returnLink?.getAttribute("href")).toBe(
      "/projects/39/github?state=CLOSED&page=5",
    );
  });
});
