import { afterEach, describe, expect, it, vi } from "vitest";

async function loadGitHubRepositoryApi() {
  vi.resetModules();
  vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
  return import("./githubRepositoryApi");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GitHub repository API", () => {
  it("unwraps the GitHub App install URL", async () => {
    const result = { installUrl: "https://github.com/apps/contextory/installations/new", stateExpiresInSeconds: 600 };
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      code: "SUCCESS",
      isSuccess: true,
      message: "success",
      result,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getGitHubConnectUrl } = await loadGitHubRepositoryApi();

    await expect(getGitHubConnectUrl(39)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/github/connect?projectId=39",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("requests and unwraps a 1-based GitHub repository page", async () => {
    const result = {
      content: [{
        defaultBranch: "main",
        githubRepositoryId: 128,
        private: true,
        repositoryFullName: "team/contextory-web",
        repositoryUrl: "https://github.com/team/contextory-web",
      }],
      hasNext: true,
      page: 2,
      size: 30,
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      code: "SUCCESS",
      isSuccess: true,
      message: "success",
      result,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getGitHubRepositories } = await loadGitHubRepositoryApi();

    await expect(getGitHubRepositories({ page: 2 })).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/github/repositories?page=2&size=30",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("gets a nullable project repository detail", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      code: "SUCCESS",
      isSuccess: true,
      message: "success",
      result: null,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getProjectRepository } = await loadGitHubRepositoryApi();

    await expect(getProjectRepository(39)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/repository",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("identifies only the official unconnected repository error code", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        code: "PROJECT_REPOSITORY_4041",
        isSuccess: false,
        message: "project repository not found",
        result: null,
      }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({
        code: "PROJECT_4041",
        isSuccess: false,
        message: "project not found",
        result: null,
      }, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const {
      getProjectRepository,
      isProjectRepositoryNotConnectedError,
    } = await loadGitHubRepositoryApi();

    const unconnectedError = await getProjectRepository(39).catch((error: unknown) => error);
    const projectNotFoundError = await getProjectRepository(404).catch((error: unknown) => error);

    expect(isProjectRepositoryNotConnectedError(unconnectedError)).toBe(true);
    expect(isProjectRepositoryNotConnectedError(projectNotFoundError)).toBe(false);
  });

  it("puts only the selected repository identity", async () => {
    const request = {
      githubRepositoryId: 128,
      repositoryFullName: "team/contextory-web",
    };
    const result = {
      connectedBy: 1,
      githubRepositoryId: 128,
      projectId: 39,
      repositoryFullName: "team/contextory-web",
      repositoryId: 3,
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      code: "SUCCESS",
      isSuccess: true,
      message: "success",
      result,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { connectProjectRepository } = await loadGitHubRepositoryApi();

    await expect(connectProjectRepository(39, request)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/repository",
      expect.objectContaining({ body: JSON.stringify(request), method: "PUT" }),
    );
  });

  it("deletes the project repository and unwraps null", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      code: "SUCCESS",
      isSuccess: true,
      message: "success",
      result: null,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { disconnectProjectRepository } = await loadGitHubRepositoryApi();

    await expect(disconnectProjectRepository(39)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/repository",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
