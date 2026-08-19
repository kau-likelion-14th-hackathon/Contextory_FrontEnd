import { afterEach, describe, expect, it, vi } from "vitest";

async function loadAnalysisApi() {
  vi.resetModules();
  vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
  return import("./analysisApi");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function apiResponse(result: unknown) {
  return Response.json({ code: "SUCCESS", isSuccess: true, message: "success", result });
}

describe("Analysis API", () => {
  it("requests analysis with prNumber in POST body", async () => {
    const result = {
      analysisId: 12,
      analysisStatus: "PENDING",
      analyzedHeadSha: "abc123",
      prNumber: 128,
      projectId: 39,
      repositoryId: 7,
      requestedAt: "2026-08-17T00:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(result));
    vi.stubGlobal("fetch", fetchMock);
    const { requestAnalysis } = await loadAnalysisApi();

    await expect(requestAnalysis("39", 128)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/analyses",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ prNumber: 128 }),
      }),
    );
  });

  it("gets analyses with prNumber page and size query", async () => {
    const result = {
      content: [{
        analysisId: 12,
        analysisStatus: "COMPLETED",
        analyzedHeadSha: "abc123",
        prNumber: 128,
        projectId: 39,
        requestedAt: "2026-08-17T00:00:00Z",
      }],
      hasNext: false,
      page: 0,
      size: 1,
      totalElements: 1,
      totalPages: 1,
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(result));
    vi.stubGlobal("fetch", fetchMock);
    const { getAnalyses } = await loadAnalysisApi();
    const controller = new AbortController();

    await expect(getAnalyses("39", { prNumber: 128, page: 0, size: 1 }, controller.signal)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/analyses?prNumber=128&page=0&size=1",
      expect.objectContaining({ method: "GET", signal: controller.signal }),
    );
  });

  it("returns the latest analysis summary for a PR number", async () => {
    const summary = {
      analysisId: 15,
      analysisStatus: "PROCESSING",
      analyzedHeadSha: null,
      prNumber: 128,
      projectId: 39,
      requestedAt: "2026-08-17T00:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse({
      content: [summary],
      hasNext: false,
      page: 0,
      size: 1,
      totalElements: 1,
      totalPages: 1,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getLatestAnalysisByPrNumber } = await loadAnalysisApi();

    await expect(getLatestAnalysisByPrNumber(39, 128)).resolves.toEqual(summary);
  });

  it("returns null when no analysis exists for a PR number", async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse({
      content: [],
      hasNext: false,
      page: 0,
      size: 1,
      totalElements: 0,
      totalPages: 0,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getLatestAnalysisByPrNumber } = await loadAnalysisApi();

    await expect(getLatestAnalysisByPrNumber(39, 128)).resolves.toBeNull();
  });

  it("gets analysis detail from the analysis URL and forwards AbortSignal", async () => {
    const detail = {
      analysisId: 12,
      analysisResult: null,
      analysisStatus: "PROCESSING",
      analyzedHeadSha: null,
      completedAt: null,
      errorMessage: null,
      modelName: null,
      prNumber: 128,
      projectId: 39,
      requestedAt: "2026-08-17T00:00:00Z",
      startedAt: null,
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(detail));
    vi.stubGlobal("fetch", fetchMock);
    const { getAnalysis } = await loadAnalysisApi();
    const controller = new AbortController();

    await expect(getAnalysis("39", 12, controller.signal)).resolves.toEqual(detail);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/analyses/12",
      expect.objectContaining({ method: "GET", signal: controller.signal }),
    );
  });

  it("retries analysis from the retry URL", async () => {
    const result = {
      analysisStatus: "PENDING",
      newAnalysisId: 13,
      previousAnalysisId: 12,
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(result));
    vi.stubGlobal("fetch", fetchMock);
    const { retryAnalysis } = await loadAnalysisApi();

    await expect(retryAnalysis(39, 12)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/analyses/12/retry",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("cancels analysis from the cancel URL", async () => {
    const result = {
      analysisId: 12,
      analysisStatus: "CANCELED",
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(result));
    vi.stubGlobal("fetch", fetchMock);
    const { cancelAnalysis } = await loadAnalysisApi();

    await expect(cancelAnalysis("39", 12)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/analyses/12/cancel",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("parses nullable analysisResult fields safely", async () => {
    const { parseAnalysisResult } = await loadAnalysisApi();

    expect(parseAnalysisResult(null)).toBeNull();
    expect(parseAnalysisResult({
      changes: [{ description: "updated handler", filePath: "src/api.ts" }, { foo: "bar" }],
      impacts: ["frontend"],
      recommendations: ["add tests"],
      risks: ["regression"],
      summary: "Updated API error handling",
    })).toEqual({
      changes: [{ description: "updated handler", filePath: "src/api.ts" }],
      impacts: ["frontend"],
      recommendations: ["add tests"],
      risks: ["regression"],
      summary: "Updated API error handling",
    });
    expect(parseAnalysisResult({ summary: "", changes: [], impacts: [], risks: [], recommendations: [] })).toBeNull();
  });
});
