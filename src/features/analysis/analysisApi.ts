import { ApiError, requestApiResult } from "../../shared/api/client";

export type AnalysisStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED";

export type AnalysisRequestResponse = {
  analysisId: number;
  projectId: number;
  repositoryId: number;
  prNumber: number;
  analyzedHeadSha: string;
  analysisStatus: AnalysisStatus;
  requestedAt: string;
};

export type AnalysisDetail = {
  analysisId: number;
  projectId: number;
  prNumber: number;
  analyzedHeadSha: string | null;
  analysisStatus: AnalysisStatus;
  modelName: string | null;
  analysisResult: unknown | null;
  errorMessage: string | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type AnalysisRetryResponse = {
  previousAnalysisId: number;
  newAnalysisId: number;
  analysisStatus: AnalysisStatus;
};

export type AnalysisCancelResponse = {
  analysisId: number;
  analysisStatus: AnalysisStatus;
};

export type AnalysisRequestedBy = {
  userId: number;
  username: string;
};

export type AnalysisSummary = {
  analysisId: number;
  prNumber: number;
  analyzedHeadSha: string | null;
  analysisStatus: AnalysisStatus;
  modelName: string | null;
  requestedBy: AnalysisRequestedBy;
  requestedAt: string;
  completedAt: string | null;
};

export type AnalysisListResponse = {
  content: AnalysisSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

export type GetAnalysesParams = {
  prNumber: number;
  page?: number;
  size?: number;
};

export type AnalysisResultChange = {
  filePath: string;
  description: string;
};

export type AnalysisResult = {
  summary: string;
  changes: AnalysisResultChange[];
  impacts: string[];
  risks: string[];
  recommendations: string[];
};

export function isActiveAnalysisStatus(status: AnalysisStatus) {
  return status === "PENDING" || status === "PROCESSING";
}

export function parseAnalysisResult(value: unknown): AnalysisResult | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const summary = typeof record.summary === "string" ? record.summary : "";
  const changes = Array.isArray(record.changes)
    ? record.changes
        .filter((item): item is Record<string, unknown> => item && typeof item === "object")
        .map((item) => ({
          filePath: typeof item.filePath === "string" ? item.filePath : "",
          description: typeof item.description === "string" ? item.description : "",
        }))
        .filter((item) => item.filePath || item.description)
    : [];
  const impacts = Array.isArray(record.impacts)
    ? record.impacts.filter((item): item is string => typeof item === "string")
    : [];
  const risks = Array.isArray(record.risks)
    ? record.risks.filter((item): item is string => typeof item === "string")
    : [];
  const recommendations = Array.isArray(record.recommendations)
    ? record.recommendations.filter((item): item is string => typeof item === "string")
    : [];

  if (
    !summary
    && changes.length === 0
    && impacts.length === 0
    && risks.length === 0
    && recommendations.length === 0
  ) {
    return null;
  }

  return { summary, changes, impacts, risks, recommendations };
}

export function getAnalysisApiErrorCode(error: unknown) {
  if (!(error instanceof ApiError)) return undefined;
  if (!error.bodyJson || typeof error.bodyJson !== "object") return undefined;
  if (!("code" in error.bodyJson) || typeof error.bodyJson.code !== "string") return undefined;
  return error.bodyJson.code;
}

export function requestAnalysis(
  projectId: string | number,
  prNumber: number,
  signal?: AbortSignal,
) {
  return requestApiResult<AnalysisRequestResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/analyses`,
    { method: "POST", body: { prNumber }, signal },
  );
}

export function getAnalysis(
  projectId: string | number,
  analysisId: string | number,
  signal?: AbortSignal,
) {
  return requestApiResult<AnalysisDetail>(
    `/api/projects/${encodeURIComponent(projectId)}/analyses/${encodeURIComponent(analysisId)}`,
    { method: "GET", signal },
  );
}

export function getAnalyses(
  projectId: string | number,
  { prNumber, page = 0, size = 1 }: GetAnalysesParams,
  signal?: AbortSignal,
) {
  const searchParams = new URLSearchParams({
    prNumber: String(prNumber),
    page: String(page),
    size: String(size),
  });

  return requestApiResult<AnalysisListResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/analyses?${searchParams}`,
    { method: "GET", signal },
  );
}

export async function getLatestAnalysisByPrNumber(
  projectId: string | number,
  prNumber: number,
  signal?: AbortSignal,
) {
  const result = await getAnalyses(projectId, { prNumber, page: 0, size: 1 }, signal);
  return result.content[0] ?? null;
}

export function retryAnalysis(
  projectId: string | number,
  analysisId: string | number,
  signal?: AbortSignal,
) {
  return requestApiResult<AnalysisRetryResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/analyses/${encodeURIComponent(analysisId)}/retry`,
    { method: "POST", signal },
  );
}

export function cancelAnalysis(
  projectId: string | number,
  analysisId: string | number,
  signal?: AbortSignal,
) {
  return requestApiResult<AnalysisCancelResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/analyses/${encodeURIComponent(analysisId)}/cancel`,
    { method: "POST", signal },
  );
}
