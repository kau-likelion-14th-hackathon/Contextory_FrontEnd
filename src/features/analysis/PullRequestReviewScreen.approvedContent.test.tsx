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

function createProject(role = "OWNER"): ProjectDetailResponse {
  return {
    projectId: 39,
    name: "Demo",
    slug: "demo",
    summary: null,
    purpose: null,
    defaultLanguage: "ko",
    status: "ACTIVE",
    myPermissionRole: role,
    repository: null,
    subscription: null,
  };
}

function createExtendedAnalysisResult() {
  return {
    summary: "승인된 작업 요약입니다",
    purpose: "승인된 작업 목적입니다",
    changeReason: "승인된 변경 이유입니다",
    before: "변경 전 상태",
    after: "변경 후 상태",
    relatedFeatures: ["검색"],
    affectedRoles: ["Frontend"],
    roleImpacts: [
      {
        role: "Frontend",
        impact: "UI 영향",
        basis: null,
        evidenceRefs: [],
      },
    ],
    risks: ["회귀 가능"],
    needsConfirmation: ["배포 확인"],
    changes: [
      {
        filePath: "src/app.tsx",
        description: "라우팅 수정",
      },
    ],
    followUpTasks: [
      {
        role: "QA",
        task: "회귀 테스트",
        evidenceRefs: [],
      },
    ],
    evidence: [
      {
        id: "e1",
        source: "diff",
        location: "src/app.tsx",
        description: "변경 근거",
      },
    ],
    impacts: [],
    recommendations: [],
    reviews: [],
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("approved analysis detail content", () => {
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

  async function renderApprovedAnalysis() {
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
              path: "analyses/:analysisId",
              element: <PullRequestReviewScreen />,
            },
          ],
        },
      ],
      { initialEntries: ["/projects/39/analyses/88"] },
    );

    await act(async () => {
      root.render(<RouterProvider router={router} />);
    });
    await flush();
    return router;
  }

  it("shows ApprovedPanel and read-only ReviewWorkspace for APPROVED analysis", async () => {
    const analysisResult = createExtendedAnalysisResult();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/analyses/88")) {
        return Promise.resolve(successResult({
          analysisId: 88,
          projectId: 39,
          prNumber: 123,
          analyzedHeadSha: "abc",
          analysisStatus: "COMPLETED",
          modelName: null,
          analysisResult,
          errorMessage: null,
          requestedAt: "2026-08-01T00:00:00Z",
          startedAt: null,
          completedAt: "2026-08-01T01:00:00Z",
          recordId: 7,
          recordStatus: "APPROVED",
          approvedAt: "2026-08-02T00:00:00Z",
          memoryEnabled: true,
        }));
      }
      if (url.includes("/pull-requests/123/files")) {
        return Promise.resolve(successResult({
          prNumber: 123,
          totalFiles: 1,
          totalAdditions: 1,
          totalDeletions: 0,
          files: [{
            sha: "f1",
            filename: "src/app.tsx",
            previousFilename: null,
            status: "modified",
            additions: 1,
            deletions: 0,
            changes: 1,
            patch: "@@ -1 +1 @@\n+route",
            blobUrl: null,
            rawUrl: null,
            contentsUrl: null,
          }],
        }));
      }
      if (url.includes("/pull-requests/123")) {
        return Promise.resolve(successResult({
          prNumber: 123,
          title: "메모리 상세 PR",
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
        }));
      }
      return Promise.resolve(successResult(null));
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderApprovedAnalysis();

    await act(async () => {
      await vi.waitFor(() => {
        expect(container.textContent).toContain("승인된 작업 요약입니다");
      });
    });

    expect(container.textContent).toContain("승인 완료");
    expect(container.textContent).toContain("프로젝트 메모리 등록 완료");
    expect(container.textContent).toContain("작업 요약");
    expect(container.textContent).toContain("작업 목적");
    expect(container.textContent).toContain("변경 이유");
    expect(container.textContent).toContain("변경 전");
    expect(container.textContent).toContain("변경 후");
    expect(container.textContent).toContain("관련 기능");
    expect(container.textContent).toContain("영향 역할");
    expect(container.textContent).toContain("역할별 영향");
    expect(container.textContent).toContain("리스크");
    expect(container.textContent).toContain("확인 필요 사항");
    expect(container.textContent).toContain("변경 파일");
    expect(container.textContent).toContain("후속 작업");
    expect(container.textContent).toContain("분석 근거");
    expect(container.textContent).toContain("GitHub 원본");
    expect(container.textContent).toContain("src/app.tsx");

    const editButtons = Array.from(container.querySelectorAll("button"))
      .filter((button) => button.textContent === "수정" || button.textContent === "임시 저장");
    expect(editButtons).toHaveLength(0);
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector('input[type="text"]')).toBeNull();
    expect(container.querySelector(".pull-request-review__edit-input")).toBeNull();
    expect(container.querySelector(".pull-request-review__analysis-result--editing")).toBeNull();

    expect(fetchMock.mock.calls.some(([url, init]) => (
      String(url).includes("/approve") || (init as RequestInit | undefined)?.method === "PUT"
    ))).toBe(false);
  });
});
