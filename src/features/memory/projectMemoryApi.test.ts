import { afterEach, describe, expect, it, vi } from "vitest";

async function loadProjectMemoryApi() {
  vi.resetModules();
  vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
  return import("./projectMemoryApi");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function apiResponse(result: unknown) {
  return Response.json({ code: "SUCCESS", isSuccess: true, message: "success", result });
}

describe("Project Memory API", () => {
  it("lists project memories with page and size query", async () => {
    const result = {
      content: [{
        analysisId: 12,
        analysisResult: { summary: "에러 응답 정리" },
        approvedAt: "2026-08-19T03:00:00Z",
        prNumber: 128,
        recordId: 90,
      }],
      hasNext: false,
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(result));
    vi.stubGlobal("fetch", fetchMock);
    const { getProjectMemories } = await loadProjectMemoryApi();
    const controller = new AbortController();

    await expect(getProjectMemories("39", { page: 0, size: 20 }, controller.signal))
      .resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/memories?page=0&size=20",
      expect.objectContaining({ method: "GET", signal: controller.signal }),
    );
  });

  it("uses default page 0 and clamps size for memory list", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(apiResponse({
      content: [],
      hasNext: false,
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    })));
    vi.stubGlobal("fetch", fetchMock);
    const { getProjectMemories } = await loadProjectMemoryApi();

    await getProjectMemories(39);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/memories?page=0&size=20",
      expect.objectContaining({ method: "GET" }),
    );

    await getProjectMemories(39, { page: -1, size: 500 });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://api.test/api/projects/39/memories?page=0&size=100",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("throws when memory list request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        { code: "PROJECT_4032", isSuccess: false, message: "forbidden", result: null },
        { status: 403 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getProjectMemories, getProjectMemoryApiErrorCode } = await loadProjectMemoryApi();

    const error = await getProjectMemories(39, { page: 0, size: 10 }).catch((caught) => caught);
    expect(error).toMatchObject({ status: 403 });
    expect(getProjectMemoryApiErrorCode(error)).toBe("PROJECT_4032");
  });
});
