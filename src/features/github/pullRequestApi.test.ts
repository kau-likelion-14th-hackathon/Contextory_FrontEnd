import { afterEach, describe, expect, it, vi } from "vitest";

async function loadPullRequestApi() {
  vi.resetModules();
  vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
  return import("./pullRequestApi");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function apiResponse(result: unknown) {
  return Response.json({ code: "SUCCESS", isSuccess: true, message: "success", result });
}

describe("Pull Request API", () => {
  it("requests a 1-based OPEN Pull Request page", async () => {
    const result = { content: [], hasNext: false, page: 1, size: 20 };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(result));
    vi.stubGlobal("fetch", fetchMock);
    const { getPullRequests } = await loadPullRequestApi();

    await expect(getPullRequests("39", { state: "OPEN", page: 1, size: 20 })).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/pull-requests?state=OPEN&page=1&size=20",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it.each(["CLOSED", "ALL"] as const)("uses the exact %s state query", async (state) => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse({ content: [], hasNext: false, page: 2, size: 7 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getPullRequests } = await loadPullRequestApi();

    await getPullRequests(39, { state, page: 2, size: 7 });

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.test/api/projects/39/pull-requests?state=${state}&page=2&size=7`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("gets a nullable Pull Request detail and forwards AbortSignal", async () => {
    const detail = {
      additions: null,
      authorAvatarUrl: null,
      authorLogin: null,
      body: null,
      changedFiles: null,
      closedAt: null,
      comments: null,
      commits: null,
      createdAt: "2026-08-17T00:00:00Z",
      deletions: null,
      draft: false,
      htmlUrl: "https://github.com/team/repository/pull/128",
      mergeable: null,
      mergeableState: null,
      merged: false,
      mergedAt: null,
      prNumber: 128,
      reviewComments: null,
      sourceBranch: null,
      sourceSha: null,
      state: "open",
      targetBranch: null,
      targetSha: null,
      title: "Nullable PR",
      updatedAt: "2026-08-17T00:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(detail));
    vi.stubGlobal("fetch", fetchMock);
    const { getPullRequest } = await loadPullRequestApi();
    const controller = new AbortController();

    await expect(getPullRequest("39", 128, controller.signal)).resolves.toEqual(detail);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/pull-requests/128",
      expect.objectContaining({ method: "GET", signal: controller.signal }),
    );
  });

  it("gets Pull Request files with nullable patch fields", async () => {
    const result = {
      files: [{
        additions: null,
        blobUrl: null,
        changes: null,
        contentsUrl: null,
        deletions: null,
        filename: "assets/logo.png",
        patch: null,
        previousFilename: null,
        rawUrl: null,
        sha: "abc123",
        status: "modified",
      }],
      prNumber: 128,
      totalAdditions: 0,
      totalDeletions: 0,
      totalFiles: 1,
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(result));
    vi.stubGlobal("fetch", fetchMock);
    const { getPullRequestFiles } = await loadPullRequestApi();

    await expect(getPullRequestFiles("39", 128)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/pull-requests/128/files",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
