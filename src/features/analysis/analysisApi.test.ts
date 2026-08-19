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

function analysisListItem(overrides: Record<string, unknown> = {}) {
  return {
    analysisId: 12,
    analysisStatus: "COMPLETED",
    analyzedHeadSha: "abc123",
    completedAt: "2026-08-17T01:00:00Z",
    modelName: "gpt-4",
    prNumber: 128,
    requestedAt: "2026-08-17T00:00:00Z",
    requestedBy: { userId: 1, username: "dev" },
    ...overrides,
  };
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
    const item = analysisListItem();
    const result = {
      content: [item],
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
    const summary = analysisListItem({
      analysisId: 15,
      analysisStatus: "PROCESSING",
      analyzedHeadSha: null,
      completedAt: null,
      modelName: null,
    });
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

  it("throws when analyses list request fails instead of returning null", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("upstream unavailable", {
        status: 502,
        headers: { "Content-Type": "text/plain" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getLatestAnalysisByPrNumber } = await loadAnalysisApi();

    await expect(getLatestAnalysisByPrNumber(39, 128)).rejects.toMatchObject({
      status: 502,
    });
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

  it("parses legacy five-field analysisResult safely", async () => {
    const { parseAnalysisResult } = await loadAnalysisApi();

    expect(parseAnalysisResult({
      changes: [{ description: "updated handler", filePath: "src/api.ts" }, { foo: "bar" }],
      impacts: ["frontend"],
      recommendations: ["add tests"],
      risks: ["regression"],
      summary: "Updated API error handling",
    })).toEqual({
      summary: "Updated API error handling",
      changes: [{ description: "updated handler", filePath: "src/api.ts" }],
      impacts: ["frontend"],
      recommendations: ["add tests"],
      risks: ["regression"],
      purpose: "",
      changeReason: "",
      before: "",
      after: "",
      relatedFeatures: [],
      affectedRoles: [],
      roleImpacts: [],
      followUpTasks: [],
      needsConfirmation: [],
      evidence: [],
      reviews: [],
    });
  });

  it("parses full latest analysisResult schema", async () => {
    const { parseAnalysisResult } = await loadAnalysisApi();

    expect(parseAnalysisResult({
      summary: "API 오류 응답 정리",
      purpose: "클라이언트 오류 처리 일관성 확보",
      changeReason: "기존 message 필드만 사용하던 구조를 확장",
      before: "message 문자열만 반환",
      after: "code/message/details 구조 반환",
      relatedFeatures: ["인증", "API 클라이언트"],
      affectedRoles: ["프론트엔드", "QA"],
      roleImpacts: [{
        role: "프론트엔드",
        impact: "오류 모델 수정 필요",
        basis: "응답 스키마 변경",
        evidenceRefs: ["ev-1"],
      }],
      followUpTasks: [{
        role: "QA",
        task: "회귀 테스트 추가",
        evidenceRefs: ["ev-2"],
      }],
      needsConfirmation: ["기존 message 필드 유지 여부"],
      evidence: [{
        id: "ev-1",
        source: "github",
        location: "src/api/client.ts",
        description: "오류 파싱 로직",
        chunkId: "chunk-1",
        similarityScore: 0.92,
      }],
      riskScore: 0.35,
      reviews: [{
        filePath: "src/api/client.ts",
        lineNumber: 42,
        comment: "null 체크 추가 필요",
      }],
      changes: [{ filePath: "src/api/client.ts", description: "오류 파싱 수정" }],
      impacts: ["frontend"],
      risks: ["regression"],
      recommendations: ["add tests"],
    })).toEqual({
      summary: "API 오류 응답 정리",
      purpose: "클라이언트 오류 처리 일관성 확보",
      changeReason: "기존 message 필드만 사용하던 구조를 확장",
      before: "message 문자열만 반환",
      after: "code/message/details 구조 반환",
      relatedFeatures: ["인증", "API 클라이언트"],
      affectedRoles: ["프론트엔드", "QA"],
      roleImpacts: [{
        role: "프론트엔드",
        impact: "오류 모델 수정 필요",
        basis: "응답 스키마 변경",
        evidenceRefs: ["ev-1"],
      }],
      followUpTasks: [{
        role: "QA",
        task: "회귀 테스트 추가",
        evidenceRefs: ["ev-2"],
      }],
      needsConfirmation: ["기존 message 필드 유지 여부"],
      evidence: [{
        id: "ev-1",
        source: "github",
        location: "src/api/client.ts",
        description: "오류 파싱 로직",
        chunkId: "chunk-1",
        similarityScore: 0.92,
      }],
      riskScore: 0.35,
      reviews: [{
        filePath: "src/api/client.ts",
        lineNumber: 42,
        comment: "null 체크 추가 필요",
      }],
      changes: [{ filePath: "src/api/client.ts", description: "오류 파싱 수정" }],
      impacts: ["frontend"],
      risks: ["regression"],
      recommendations: ["add tests"],
    });
  });

  it("parses nullable and optional analysisResult fields", async () => {
    const { parseAnalysisResult } = await loadAnalysisApi();

    expect(parseAnalysisResult({
      summary: "요약만 있는 결과",
      roleImpacts: [{
        role: "백엔드",
        impact: "영향",
        basis: null,
        evidenceRefs: [],
      }],
      followUpTasks: [{
        role: null,
        task: "문서화",
        evidenceRefs: [],
      }],
      evidence: [{
        id: "ev-3",
        source: "memory",
        location: "docs/api.md",
        description: null,
        chunkId: null,
        similarityScore: null,
      }],
      reviews: [{
        filePath: null,
        lineNumber: null,
        comment: "검토 의견",
      }],
    })).toEqual({
      summary: "요약만 있는 결과",
      changes: [],
      impacts: [],
      risks: [],
      recommendations: [],
      purpose: "",
      changeReason: "",
      before: "",
      after: "",
      relatedFeatures: [],
      affectedRoles: [],
      roleImpacts: [{
        role: "백엔드",
        impact: "영향",
        basis: null,
        evidenceRefs: [],
      }],
      followUpTasks: [{
        role: null,
        task: "문서화",
        evidenceRefs: [],
      }],
      needsConfirmation: [],
      evidence: [{
        id: "ev-3",
        source: "memory",
        location: "docs/api.md",
        description: null,
        chunkId: null,
        similarityScore: null,
      }],
      reviews: [{
        filePath: null,
        lineNumber: null,
        comment: "검토 의견",
      }],
    });
  });

  it("ignores invalid array items in analysisResult", async () => {
    const { parseAnalysisResult } = await loadAnalysisApi();

    expect(parseAnalysisResult({
      summary: "방어적 파싱",
      roleImpacts: [
        { role: "FE", impact: "ok", basis: "근거", evidenceRefs: ["ev-1", 42] },
        null,
        "invalid",
      ],
      followUpTasks: [
        { role: "QA", task: "테스트", evidenceRefs: ["ev-1"] },
        { task: 123 },
      ],
      evidence: [
        { id: "ev-1", source: "github", location: "src/a.ts", description: "desc" },
        { id: 1, source: "bad" },
      ],
      reviews: [
        { filePath: "src/a.ts", lineNumber: 10, comment: "ok" },
        { comment: "" },
      ],
      relatedFeatures: ["valid", 1, null],
    })).toEqual({
      summary: "방어적 파싱",
      changes: [],
      impacts: [],
      risks: [],
      recommendations: [],
      purpose: "",
      changeReason: "",
      before: "",
      after: "",
      relatedFeatures: ["valid"],
      affectedRoles: [],
      roleImpacts: [{
        role: "FE",
        impact: "ok",
        basis: "근거",
        evidenceRefs: ["ev-1"],
      }],
      followUpTasks: [{
        role: "QA",
        task: "테스트",
        evidenceRefs: ["ev-1"],
      }],
      needsConfirmation: [],
      evidence: [{
        id: "ev-1",
        source: "github",
        location: "src/a.ts",
        description: "desc",
      }],
      reviews: [{
        filePath: "src/a.ts",
        lineNumber: 10,
        comment: "ok",
      }],
    });
  });

  it("returns null for empty analysisResult", async () => {
    const { parseAnalysisResult } = await loadAnalysisApi();

    expect(parseAnalysisResult(null)).toBeNull();
    expect(parseAnalysisResult({
      summary: "",
      changes: [],
      impacts: [],
      risks: [],
      recommendations: [],
      purpose: "",
      changeReason: "",
      before: "",
      after: "",
      relatedFeatures: [],
      affectedRoles: [],
      roleImpacts: [],
      followUpTasks: [],
      needsConfirmation: [],
      evidence: [],
      reviews: [],
    })).toBeNull();
  });
});
