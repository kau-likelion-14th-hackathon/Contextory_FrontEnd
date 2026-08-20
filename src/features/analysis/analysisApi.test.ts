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

  it("lists analyses without prNumber when omitted", async () => {
    const result = {
      content: [analysisListItem()],
      hasNext: false,
      page: 0,
      size: 5,
      totalElements: 1,
      totalPages: 1,
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(result));
    vi.stubGlobal("fetch", fetchMock);
    const { getAnalyses } = await loadAnalysisApi();

    await expect(getAnalyses("39", { page: 0, size: 5 })).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/analyses?page=0&size=5",
      expect.objectContaining({ method: "GET" }),
    );
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).not.toContain("prNumber=");
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

  it("finds an analysis summary by id on the first page", async () => {
    const target = analysisListItem({ analysisId: 42, requestedBy: { userId: 7, username: "me" } });
    const other = analysisListItem({ analysisId: 41, requestedBy: { userId: 9, username: "other" } });
    const fetchMock = vi.fn().mockResolvedValue(apiResponse({
      content: [other, target],
      hasNext: false,
      page: 0,
      size: 100,
      totalElements: 2,
      totalPages: 1,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAnalysisSummaryById } = await loadAnalysisApi();

    await expect(getAnalysisSummaryById(39, 128, 42)).resolves.toEqual(target);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("continues to the next page until the analysis id is found", async () => {
    const target = analysisListItem({ analysisId: 99, requestedBy: { userId: 3, username: "owner" } });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse({
        content: [analysisListItem({ analysisId: 1 })],
        hasNext: true,
        page: 0,
        size: 100,
        totalElements: 2,
        totalPages: 2,
      }))
      .mockResolvedValueOnce(apiResponse({
        content: [target],
        hasNext: false,
        page: 1,
        size: 100,
        totalElements: 2,
        totalPages: 2,
      }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAnalysisSummaryById } = await loadAnalysisApi();

    await expect(getAnalysisSummaryById(39, 128, 99)).resolves.toEqual(target);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("page=1");
  });

  it("returns null when the analysis id is never found", async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse({
      content: [analysisListItem({ analysisId: 1 })],
      hasNext: false,
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAnalysisSummaryById } = await loadAnalysisApi();

    await expect(getAnalysisSummaryById(39, 128, 404)).resolves.toBeNull();
  });

  it("does not use a different analysis requester when looking up by id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse({
      content: [
        analysisListItem({ analysisId: 10, requestedBy: { userId: 1, username: "a" } }),
        analysisListItem({ analysisId: 11, requestedBy: { userId: 2, username: "b" } }),
      ],
      hasNext: false,
      page: 0,
      size: 100,
      totalElements: 2,
      totalPages: 1,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAnalysisSummaryById } = await loadAnalysisApi();

    await expect(getAnalysisSummaryById(39, 128, 11)).resolves.toMatchObject({
      analysisId: 11,
      requestedBy: { userId: 2, username: "b" },
    });
  });

  it("aborts summary lookup when the signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getAnalysisSummaryById } = await loadAnalysisApi();

    await expect(getAnalysisSummaryById(39, 128, 12, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gets analysis detail from the analysis URL and forwards AbortSignal", async () => {
    const detail = {
      analysisId: 12,
      analysisResult: null,
      analysisStatus: "PROCESSING",
      analyzedHeadSha: null,
      approvedAt: null,
      completedAt: null,
      errorMessage: null,
      memoryEnabled: null,
      modelName: null,
      prNumber: 128,
      projectId: 39,
      recordId: null,
      recordStatus: null,
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

  it("maps analysis detail record fields without inventing missing values", async () => {
    const { mapAnalysisDetailRecord, mapAnalysisRecordResponse } = await loadAnalysisApi();

    expect(mapAnalysisDetailRecord({
      approvedAt: null,
      memoryEnabled: null,
      recordId: null,
      recordStatus: null,
    })).toBeNull();

    expect(mapAnalysisDetailRecord({
      approvedAt: null,
      memoryEnabled: false,
      recordId: 90,
      recordStatus: null,
    })).toBeNull();

    expect(mapAnalysisDetailRecord({
      approvedAt: null,
      memoryEnabled: false,
      recordId: null,
      recordStatus: "DRAFT",
    })).toBeNull();

    expect(mapAnalysisDetailRecord({
      approvedAt: null,
      memoryEnabled: false,
      recordId: 90,
      recordStatus: "DRAFT",
    })).toEqual({
      approvedAt: null,
      memoryEnabled: false,
      memoryEnabledAt: null,
      recordId: 90,
      recordStatus: "DRAFT",
    });

    expect(mapAnalysisDetailRecord({
      approvedAt: "2026-08-19T02:00:00Z",
      memoryEnabled: false,
      recordId: 91,
      recordStatus: "APPROVED",
    })).toEqual({
      approvedAt: "2026-08-19T02:00:00Z",
      memoryEnabled: false,
      memoryEnabledAt: null,
      recordId: 91,
      recordStatus: "APPROVED",
    });

    expect(mapAnalysisDetailRecord({
      approvedAt: "2026-08-19T02:00:00Z",
      memoryEnabled: true,
      recordId: 92,
      recordStatus: "APPROVED",
    })).toEqual({
      approvedAt: "2026-08-19T02:00:00Z",
      memoryEnabled: true,
      memoryEnabledAt: null,
      recordId: 92,
      recordStatus: "APPROVED",
    });

    const mappedFromRecordApi = mapAnalysisRecordResponse({
      analysisId: 12,
      analysisResult: null,
      approvedAt: "2026-08-19T02:00:00Z",
      approvedBy: 2,
      createdAt: "2026-08-19T00:00:00Z",
      editedBy: null,
      memoryEnabled: true,
      memoryEnabledAt: "2026-08-19T03:00:00Z",
      memoryEnabledBy: 2,
      prNumber: 128,
      projectId: 39,
      recordId: 90,
      recordStatus: "APPROVED",
      updatedAt: "2026-08-19T03:00:00Z",
    });
    expect(mappedFromRecordApi.memoryEnabledAt).toBe("2026-08-19T03:00:00Z");
    expect(mappedFromRecordApi.memoryEnabled).toBe(true);
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
      hasExtendedFields: false,
      hasRisksField: true,
    });
  });

  it("marks legacy five-field results without extended keys", async () => {
    const { parseAnalysisResult } = await loadAnalysisApi();

    const result = parseAnalysisResult({
      summary: "legacy",
      changes: [],
      impacts: ["frontend"],
      risks: [],
      recommendations: [],
    });

    expect(result?.hasExtendedFields).toBe(false);
  });

  it("marks extended format when keys exist with empty values", async () => {
    const { parseAnalysisResult } = await loadAnalysisApi();

    const result = parseAnalysisResult({
      summary: "extended empty",
      relatedFeatures: [],
      affectedRoles: [],
      roleImpacts: [],
      followUpTasks: [],
      needsConfirmation: [],
      evidence: [],
      retrievalQualityWarning: false,
    });

    expect(result?.hasExtendedFields).toBe(true);
    expect(result?.hasRisksField).toBe(false);
  });

  it("distinguishes legacy results from extended empty sections", async () => {
    const { parseAnalysisResult } = await loadAnalysisApi();

    const legacy = parseAnalysisResult({
      summary: "legacy",
      impacts: ["api"],
      risks: [],
      recommendations: [],
      changes: [],
    });
    const extended = parseAnalysisResult({
      summary: "extended",
      relatedFeatures: [],
      needsConfirmation: [],
    });

    expect(legacy?.hasExtendedFields).toBe(false);
    expect(legacy?.hasRisksField).toBe(true);
    expect(extended?.hasExtendedFields).toBe(true);
    expect(extended?.hasRisksField).toBe(false);
  });

  it("parses async AnalysisResultPayload callback contract", async () => {
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
      evidence: [
        {
          id: "ev-1",
          source: "github",
          location: "src/api/client.ts",
          description: "오류 파싱 로직",
          chunkId: "chunk-1",
          similarityScore: 0.92,
        },
        {
          id: "ev-2",
          source: "memory",
          location: "docs/testing.md",
          description: "회귀 테스트 가이드",
        },
      ],
      confidence: 0.87,
      retrievalQualityWarning: true,
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
      evidence: [
        {
          id: "ev-1",
          source: "github",
          location: "src/api/client.ts",
          description: "오류 파싱 로직",
          chunkId: "chunk-1",
          similarityScore: 0.92,
        },
        {
          id: "ev-2",
          source: "memory",
          location: "docs/testing.md",
          description: "회귀 테스트 가이드",
        },
      ],
      confidence: 0.87,
      retrievalQualityWarning: true,
      changes: [],
      impacts: [],
      risks: [],
      recommendations: [],
      reviews: [],
      hasExtendedFields: true,
      hasRisksField: false,
    });
  });

  it("parses confidence and ignores invalid retrievalQualityWarning values", async () => {
    const { parseAnalysisResult } = await loadAnalysisApi();

    expect(parseAnalysisResult({
      summary: "신뢰도만 있는 결과",
      confidence: 92,
      retrievalQualityWarning: false,
    })).toEqual({
      summary: "신뢰도만 있는 결과",
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
      confidence: 92,
      hasExtendedFields: true,
      hasRisksField: false,
    });
  });

  it("parses legacy extra fields riskScore and reviews for backward compatibility", async () => {
    const { parseAnalysisResult } = await loadAnalysisApi();

    expect(parseAnalysisResult({
      summary: "레거시 extra 필드",
      riskScore: 0.35,
      reviews: [{
        filePath: "src/api/client.ts",
        lineNumber: 42,
        comment: "null 체크 추가 필요",
      }],
    })).toEqual({
      summary: "레거시 extra 필드",
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
      reviews: [{
        filePath: "src/api/client.ts",
        lineNumber: 42,
        comment: "null 체크 추가 필요",
      }],
      riskScore: 0.35,
      hasExtendedFields: false,
      hasRisksField: false,
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
      reviews: [],
      hasExtendedFields: true,
      hasRisksField: false,
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
      hasExtendedFields: true,
      hasRisksField: false,
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

  it("updates analysis with PATCH method url and analysisResult body", async () => {
    const record = {
      analysisId: 12,
      analysisResult: { summary: "saved", changes: [], impacts: [], risks: [], recommendations: [] },
      approvedAt: null,
      approvedBy: null,
      createdAt: "2026-08-19T00:00:00Z",
      editedBy: 1,
      memoryEnabled: false,
      memoryEnabledAt: null,
      memoryEnabledBy: null,
      prNumber: 128,
      projectId: 39,
      recordId: 90,
      recordStatus: "DRAFT",
      updatedAt: "2026-08-19T01:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(record));
    vi.stubGlobal("fetch", fetchMock);
    const { updateAnalysis } = await loadAnalysisApi();
    const payload = { summary: "saved", changes: [], impacts: [], risks: [], recommendations: [] };

    await expect(updateAnalysis("39", 12, payload)).resolves.toEqual(record);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/analyses/12",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ analysisResult: payload }),
      }),
    );
  });

  it("throws when update analysis fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        { code: "AI_ANALYSIS_4031", isSuccess: false, message: "forbidden", result: null },
        { status: 403 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { updateAnalysis } = await loadAnalysisApi();

    await expect(updateAnalysis(39, 12, { summary: "x" })).rejects.toMatchObject({
      status: 403,
    });
  });

  it("approves analysis with POST approve url and empty body", async () => {
    const record = {
      analysisId: 12,
      analysisResult: { summary: "approved" },
      approvedAt: "2026-08-19T02:00:00Z",
      approvedBy: 2,
      createdAt: "2026-08-19T00:00:00Z",
      editedBy: null,
      memoryEnabled: true,
      memoryEnabledAt: "2026-08-19T02:00:00Z",
      memoryEnabledBy: 2,
      prNumber: 128,
      projectId: 39,
      recordId: 90,
      recordStatus: "APPROVED",
      updatedAt: "2026-08-19T02:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(record));
    vi.stubGlobal("fetch", fetchMock);
    const { approveAnalysis } = await loadAnalysisApi();

    await expect(approveAnalysis("39", 12)).resolves.toEqual(record);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/analyses/12/approve",
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  it("throws when approve analysis fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        { code: "AI_ANALYSIS_4091", isSuccess: false, message: "conflict", result: null },
        { status: 409 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { approveAnalysis } = await loadAnalysisApi();

    await expect(approveAnalysis(39, 12)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("blocks edit and approve when pending or already approved", async () => {
    const { canApproveAnalysisRecord, canEditAnalysisRecord } = await loadAnalysisApi();

    expect(canEditAnalysisRecord(null, false)).toBe(true);
    expect(canEditAnalysisRecord("DRAFT", false)).toBe(true);
    expect(canEditAnalysisRecord("DRAFT", true)).toBe(false);
    expect(canEditAnalysisRecord("APPROVED", false)).toBe(false);
    expect(canEditAnalysisRecord("APPROVED", true)).toBe(false);

    expect(canApproveAnalysisRecord(null, false)).toBe(true);
    expect(canApproveAnalysisRecord("DRAFT", true)).toBe(false);
    expect(canApproveAnalysisRecord("APPROVED", false)).toBe(false);
  });

  it("registers analysis memory with POST memory url and empty body", async () => {
    const record = {
      analysisId: 12,
      analysisResult: { summary: "approved" },
      approvedAt: "2026-08-19T02:00:00Z",
      approvedBy: 2,
      createdAt: "2026-08-19T00:00:00Z",
      editedBy: null,
      memoryEnabled: true,
      memoryEnabledAt: "2026-08-19T03:00:00Z",
      memoryEnabledBy: 2,
      prNumber: 128,
      projectId: 39,
      recordId: 90,
      recordStatus: "APPROVED",
      updatedAt: "2026-08-19T03:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(record));
    vi.stubGlobal("fetch", fetchMock);
    const { registerAnalysisMemory } = await loadAnalysisApi();

    await expect(registerAnalysisMemory("39", 12)).resolves.toEqual(record);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/analyses/12/memory",
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  it("throws when register analysis memory fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        { code: "PROJECT_RECORD_4031", isSuccess: false, message: "forbidden", result: null },
        { status: 403 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getAnalysisApiErrorCode, registerAnalysisMemory } = await loadAnalysisApi();

    const error = await registerAnalysisMemory(39, 12).catch((caught) => caught);
    expect(error).toMatchObject({ status: 403 });
    expect(getAnalysisApiErrorCode(error)).toBe("PROJECT_RECORD_4031");
  });

  it("allows memory registration only for approved records with manage permission", async () => {
    const { canRegisterAnalysisMemory } = await loadAnalysisApi();

    expect(canRegisterAnalysisMemory({
      recordStatus: "APPROVED",
      memoryEnabled: false,
      pending: false,
      permissionRole: "OWNER",
    })).toBe(true);

    expect(canRegisterAnalysisMemory({
      recordStatus: "APPROVED",
      memoryEnabled: false,
      pending: false,
      permissionRole: "ADMIN",
    })).toBe(true);

    expect(canRegisterAnalysisMemory({
      recordStatus: "DRAFT",
      memoryEnabled: false,
      pending: false,
      permissionRole: "OWNER",
    })).toBe(false);

    expect(canRegisterAnalysisMemory({
      recordStatus: null,
      memoryEnabled: false,
      pending: false,
      permissionRole: "OWNER",
    })).toBe(false);

    expect(canRegisterAnalysisMemory({
      recordStatus: "APPROVED",
      memoryEnabled: false,
      pending: false,
      permissionRole: "MEMBER",
    })).toBe(false);
  });

  it("blocks memory registration while pending or already enabled", async () => {
    const { canRegisterAnalysisMemory, mapAnalysisRecordResponse } = await loadAnalysisApi();

    expect(canRegisterAnalysisMemory({
      recordStatus: "APPROVED",
      memoryEnabled: false,
      pending: true,
      permissionRole: "OWNER",
    })).toBe(false);

    expect(canRegisterAnalysisMemory({
      recordStatus: "APPROVED",
      memoryEnabled: true,
      pending: false,
      permissionRole: "OWNER",
    })).toBe(false);

    const mapped = mapAnalysisRecordResponse({
      analysisId: 12,
      analysisResult: null,
      approvedAt: "2026-08-19T02:00:00Z",
      approvedBy: 2,
      createdAt: "2026-08-19T00:00:00Z",
      editedBy: null,
      memoryEnabled: true,
      memoryEnabledAt: "2026-08-19T03:00:00Z",
      memoryEnabledBy: 2,
      prNumber: 128,
      projectId: 39,
      recordId: 90,
      recordStatus: "APPROVED",
      updatedAt: "2026-08-19T03:00:00Z",
    });

    expect(mapped.memoryEnabled).toBe(true);
    expect(mapped.memoryEnabledAt).toBe("2026-08-19T03:00:00Z");
    expect(canRegisterAnalysisMemory({
      ...mapped,
      pending: false,
      permissionRole: "ADMIN",
    })).toBe(false);
  });

  it("serializes analysis result without FE-only metadata fields", async () => {
    const { parseAnalysisResult, serializeAnalysisResultForApi } = await loadAnalysisApi();
    const parsed = parseAnalysisResult({
      summary: "요약",
      purpose: "목적",
      relatedFeatures: [],
      risks: ["회귀"],
    });

    expect(parsed).not.toBeNull();
    expect(serializeAnalysisResultForApi(parsed!)).toEqual({
      summary: "요약",
      changes: [],
      impacts: [],
      risks: ["회귀"],
      recommendations: [],
      purpose: "목적",
      changeReason: "",
      before: "",
      after: "",
      relatedFeatures: [],
      affectedRoles: [],
      roleImpacts: [],
      followUpTasks: [],
      needsConfirmation: [],
      evidence: [],
    });
    expect(serializeAnalysisResultForApi(parsed!)).not.toHaveProperty("hasExtendedFields");
    expect(serializeAnalysisResultForApi(parsed!)).not.toHaveProperty("hasRisksField");
  });

  it("omits risks from extended serialize when risks field was absent", async () => {
    const { parseAnalysisResult, serializeAnalysisResultForApi } = await loadAnalysisApi();
    const parsed = parseAnalysisResult({
      summary: "요약",
      purpose: "목적",
      relatedFeatures: [],
      needsConfirmation: [],
    });

    expect(parsed?.hasExtendedFields).toBe(true);
    expect(parsed?.hasRisksField).toBe(false);
    expect(serializeAnalysisResultForApi(parsed!)).not.toHaveProperty("risks");
  });

  it("keeps empty risks array in extended serialize when risks field existed", async () => {
    const { parseAnalysisResult, serializeAnalysisResultForApi } = await loadAnalysisApi();
    const parsed = parseAnalysisResult({
      summary: "요약",
      purpose: "목적",
      relatedFeatures: [],
      risks: [],
    });

    expect(parsed?.hasRisksField).toBe(true);
    expect(serializeAnalysisResultForApi(parsed!)).toMatchObject({ risks: [] });
  });

  it("keeps risks in legacy serialize for backward compatibility", async () => {
    const { parseAnalysisResult, serializeAnalysisResultForApi } = await loadAnalysisApi();
    const parsed = parseAnalysisResult({
      summary: "legacy",
      changes: [],
      impacts: ["frontend"],
      risks: ["regression"],
      recommendations: [],
    });

    expect(parsed?.hasExtendedFields).toBe(false);
    expect(serializeAnalysisResultForApi(parsed!)).toEqual({
      summary: "legacy",
      changes: [],
      impacts: ["frontend"],
      risks: ["regression"],
      recommendations: [],
    });
  });

  it("maps PROJECT_RECORD and PROJECT_4032 feedback messages to BE meanings", async () => {
    const { getAnalysisFeedbackMessage } = await loadAnalysisApi();
    const { ApiError } = await import("../../shared/api/client");

    const withCode = (code: string) => new ApiError("failed", {
      kind: "unknown",
      status: 400,
      bodyJson: { code, isSuccess: false, message: "server", result: null },
    });

    expect(getAnalysisFeedbackMessage(withCode("PROJECT_RECORD_4001"), "fallback"))
      .toBe("완료된 AI 분석만 수정하거나 승인할 수 있습니다.");
    expect(getAnalysisFeedbackMessage(withCode("PROJECT_RECORD_4002"), "fallback"))
      .toBe("저장할 AI 분석 결과가 없습니다.");
    expect(getAnalysisFeedbackMessage(withCode("PROJECT_RECORD_4003"), "fallback"))
      .toBe("승인된 AI 분석 기록만 프로젝트 메모리에 등록할 수 있습니다.");
    expect(getAnalysisFeedbackMessage(withCode("PROJECT_RECORD_4031"), "fallback"))
      .toBe("해당 AI 분석 결과를 수정할 권한이 없습니다.");
    expect(getAnalysisFeedbackMessage(withCode("PROJECT_RECORD_4091"), "fallback"))
      .toBe("이미 승인된 기록은 수정할 수 없습니다.");
    expect(getAnalysisFeedbackMessage(withCode("PROJECT_4032"), "fallback"))
      .toBe("프로젝트 메모리를 등록할 권한이 없습니다. OWNER 또는 ADMIN만 등록할 수 있습니다.");

    expect(getAnalysisFeedbackMessage(withCode("PROJECT_RECORD_4001"), "fallback"))
      .not.toMatch(/메모리/);
    expect(getAnalysisFeedbackMessage(withCode("PROJECT_RECORD_4031"), "fallback"))
      .not.toMatch(/메모리/);
    expect(getAnalysisFeedbackMessage(withCode("PROJECT_RECORD_4003"), "fallback"))
      .toMatch(/메모리/);
    expect(getAnalysisFeedbackMessage(withCode("PROJECT_4032"), "fallback"))
      .toMatch(/OWNER|ADMIN/);
  });
});
