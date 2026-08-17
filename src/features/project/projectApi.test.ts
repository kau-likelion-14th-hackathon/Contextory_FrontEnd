import { afterEach, describe, expect, it, vi } from "vitest";

async function loadProjectApi() {
  vi.resetModules();
  vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
  return import("./projectApi");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("project API", () => {
  it("requests the Swagger project list query with a zero-based API page", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      code: "SUCCESS",
      isSuccess: true,
      message: "success",
      result: {
        content: [{
          creditBalance: null,
          myPermissionRole: "OWNER",
          name: "Contextory Web",
          planName: null,
          projectId: 1,
          repositoryConnected: false,
        }],
        hasNext: false,
        page: 1,
        size: 3,
        totalElements: 4,
      },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getProjects } = await loadProjectApi();

    await expect(getProjects({ size: 3, status: "ACTIVE", uiPage: 2 })).resolves.toMatchObject({
      content: [{ creditBalance: null, planName: null }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects?page=1&size=3&status=ACTIVE",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns a nullable project detail from the common API envelope", async () => {
    const detail = {
      defaultLanguage: null,
      myPermissionRole: "OWNER",
      name: "Contextory Web",
      projectId: 37,
      purpose: null,
      repository: {
        connected: false,
        repositoryFullName: null,
      },
      slug: "contextory-web",
      status: "ACTIVE",
      subscription: {
        creditBalance: null,
        planName: null,
      },
      summary: null,
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      code: "SUCCESS",
      isSuccess: true,
      message: "success",
      result: detail,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getProject } = await loadProjectApi();

    await expect(getProject(37)).resolves.toEqual(detail);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/37",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("sends a partial project update to the project path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      code: "SUCCESS",
      isSuccess: true,
      message: "success",
      result: {
        name: "Contextory Web Updated",
        projectId: 37,
        status: "ACTIVE",
      },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { updateProject } = await loadProjectApi();
    const body = { name: "Contextory Web Updated", summary: "변경된 설명" };

    await expect(updateProject(37, body)).resolves.toMatchObject({ projectId: 37 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/37",
      expect.objectContaining({ body: JSON.stringify(body), method: "PATCH" }),
    );
  });

  it("deletes the project through the project path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      code: "SUCCESS",
      isSuccess: true,
      message: "success",
      result: null,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { deleteProject } = await loadProjectApi();

    await expect(deleteProject(37)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/37",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("sends only fields defined by the Swagger create project request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      code: "SUCCESS",
      isSuccess: true,
      message: "success",
      result: {
        myPermissionRole: "ADMIN",
        name: "Contextory Web",
        ownerId: 1,
        projectId: 34,
        slug: "contextory-web",
        status: "ACTIVE",
      },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { createProject } = await loadProjectApi();
    const request = {
      defaultLanguage: "ko" as const,
      name: "Contextory Web",
      purpose: "프로젝트 맥락 관리",
      slug: "contextory-web",
      summary: "AI 프로젝트 메모리",
    };

    await expect(createProject(request)).resolves.toMatchObject({ projectId: 34 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe("https://api.test/api/projects");
    expect(init).toEqual(expect.objectContaining({ method: "POST" }));
    expect(body).toEqual(request);
    expect(body).not.toHaveProperty("features");
    expect(body).not.toHaveProperty("roles");
    expect(body).not.toHaveProperty("repository");
    expect(body).not.toHaveProperty("team");
  });
});
