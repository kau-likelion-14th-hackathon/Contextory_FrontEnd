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

function createProject(role: string): ProjectDetailResponse {
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

describe("ProjectMemoryScreen permissions", () => {
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

  async function renderScreen(role: string) {
    const context: ProjectWorkspaceContextValue = {
      project: createProject(role),
      projectError: "",
      projectLoading: false,
      reloadProject: vi.fn(),
      setProjectDetail: vi.fn(),
    };
    const { ProjectMemoryScreen } = await import("./ProjectMemoryScreen");
    const router = createMemoryRouter(
      [
        {
          path: "/projects/:projectId/records",
          element: <Outlet context={context} />,
          children: [{ index: true, element: <ProjectMemoryScreen /> }],
        },
      ],
      { initialEntries: ["/projects/39/records"] },
    );

    await act(async () => {
      root.render(<RouterProvider router={router} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("does not call memory API for VIEWER and shows permission guidance", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await renderScreen("VIEWER");

    expect(container.textContent).toContain("VIEWER 권한에서는 프로젝트 메모리를 조회할 수 없습니다.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads memories for MEMBER", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      code: "SUCCESS",
      isSuccess: true,
      message: "success",
      result: {
        content: [],
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
        hasNext: false,
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await renderScreen("MEMBER");
    await act(async () => {
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/projects/39/memories");
  });
});
