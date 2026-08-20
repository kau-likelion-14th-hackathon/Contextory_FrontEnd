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

function createProject(role: string): ProjectDetailResponse {
  return {
    projectId: 12,
    name: "Demo Project",
    slug: "demo-project",
    summary: "요약",
    purpose: "목적",
    defaultLanguage: "ko",
    status: "ACTIVE",
    myPermissionRole: role,
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

describe("project info permission helpers", () => {
  it("allows edit for OWNER/ADMIN and delete only for OWNER", async () => {
    const {
      canDeleteProjectInfo,
      canEditProjectInfo,
    } = await import("./TeamProjectSettingsScreen");

    expect(canEditProjectInfo("OWNER")).toBe(true);
    expect(canEditProjectInfo("ADMIN")).toBe(true);
    expect(canEditProjectInfo("MEMBER")).toBe(false);
    expect(canEditProjectInfo("VIEWER")).toBe(false);

    expect(canDeleteProjectInfo("OWNER")).toBe(true);
    expect(canDeleteProjectInfo("ADMIN")).toBe(false);
    expect(canDeleteProjectInfo("MEMBER")).toBe(false);
    expect(canDeleteProjectInfo("VIEWER")).toBe(false);
  });
});

describe("ProjectInfoPanel permissions", () => {
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

  async function renderPanel(role: string, feedback = vi.fn()) {
    const project = createProject(role);
    const context: ProjectWorkspaceContextValue = {
      project,
      projectError: "",
      projectLoading: false,
      reloadProject: vi.fn().mockResolvedValue(project),
      setProjectDetail: vi.fn(),
    };

    const { ProjectInfoPanel } = await import("./TeamProjectSettingsScreen");
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Outlet context={context} />,
          children: [
            {
              index: true,
              element: <ProjectInfoPanel onFeedback={feedback} />,
            },
          ],
        },
      ],
      { initialEntries: ["/"] },
    );

    await act(async () => {
      root.render(<RouterProvider router={router} />);
    });
    await flush();
    return { context, feedback, project };
  }

  function getProjectFields() {
    const inputs = Array.from(container.querySelectorAll("input, textarea, select")) as HTMLInputElement[];
    const name = inputs.find((el) => el.getAttribute("maxlength") === "150");
    const summary = inputs.find((el) => el.getAttribute("maxlength") === "500");
    const purpose = inputs.find((el) => !el.getAttribute("maxlength") && el.tagName === "INPUT");
    const language = container.querySelector("#project-default-language") as HTMLSelectElement | null;
    return { name, summary, purpose, language };
  }

  it("OWNER can edit fields, save, and open delete", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResult({
      projectId: 12,
      name: "Demo Project Updated",
      status: "ACTIVE",
    }));
    vi.stubGlobal("fetch", fetchMock);

    await renderPanel("OWNER");
    const fields = getProjectFields();

    expect(fields.name?.disabled).toBe(false);
    expect(fields.summary?.disabled).toBe(false);
    expect(fields.language?.disabled).toBe(false);
    expect(container.textContent).toContain("변경사항 저장");
    expect(container.textContent).toContain("프로젝트 삭제");
    expect(container.textContent).not.toContain("프로젝트 삭제는 OWNER만 가능합니다.");

    await act(async () => {
      if (fields.name) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(fields.name, "Demo Project Updated");
        fields.name.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    const form = container.querySelector("form.settings-project-form") as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/12",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("ADMIN can edit and save but cannot delete", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResult({
      projectId: 12,
      name: "Demo Project Updated",
      status: "ACTIVE",
    }));
    vi.stubGlobal("fetch", fetchMock);

    await renderPanel("ADMIN");
    const fields = getProjectFields();

    expect(fields.name?.disabled).toBe(false);
    expect(fields.language?.disabled).toBe(false);
    expect(container.textContent).toContain("변경사항 저장");
    expect(container.textContent).toContain("프로젝트 삭제는 OWNER만 가능합니다.");
    expect(
      Array.from(container.querySelectorAll("button"))
        .some((button) => button.textContent === "프로젝트 삭제"),
    ).toBe(false);

    await act(async () => {
      if (fields.name) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(fields.name, "Demo Project Updated");
        fields.name.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    const form = container.querySelector("form.settings-project-form") as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock.mock.calls.some(([url, init]) => (
      url === "https://api.test/api/projects/12"
      && (init as RequestInit | undefined)?.method === "PATCH"
    ))).toBe(true);
    expect(fetchMock.mock.calls.some(([, init]) => (
      (init as RequestInit | undefined)?.method === "DELETE"
    ))).toBe(false);
  });

  it.each(["MEMBER", "VIEWER"] as const)(
    "%s is read-only and cannot call PATCH/DELETE",
    async (role) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      await renderPanel(role);
      const fields = getProjectFields();

      expect(fields.name?.disabled).toBe(true);
      expect(fields.summary?.disabled).toBe(true);
      expect(fields.language?.disabled).toBe(true);
      expect(container.textContent).toContain("현재 권한에서는 프로젝트 정보를 조회만 할 수 있습니다.");
      expect(container.textContent).toContain("프로젝트 정보 수정은 OWNER 또는 ADMIN만 가능합니다.");
      expect(container.textContent).not.toContain("변경사항 저장");
      expect(container.textContent).toContain("프로젝트 삭제는 OWNER만 가능합니다.");
      expect(
        Array.from(container.querySelectorAll("button"))
          .some((button) => button.textContent === "프로젝트 삭제"),
      ).toBe(false);

      const form = container.querySelector("form.settings-project-form") as HTMLFormElement;
      await act(async () => {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        await Promise.resolve();
      });

      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
