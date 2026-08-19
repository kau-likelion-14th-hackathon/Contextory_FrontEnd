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

export type AnalysisRecordStatus = "DRAFT" | "APPROVED" | string;

export type AnalysisRecordResponse = {
  recordId: number;
  projectId: number;
  analysisId: number;
  prNumber: number;
  recordStatus: AnalysisRecordStatus;
  analysisResult: unknown | null;
  editedBy: number | null;
  approvedBy: number | null;
  approvedAt: string | null;
  memoryEnabled: boolean;
  memoryEnabledBy: number | null;
  memoryEnabledAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export type AnalysisResultEvidence = {
  id: string;
  source: string;
  location: string;
  description: string | null;
  chunkId?: string | null;
  similarityScore?: number | null;
};

export type AnalysisResultRoleImpact = {
  role: string;
  impact: string;
  basis: string | null;
  evidenceRefs: string[];
};

export type AnalysisResultFollowUpTask = {
  role: string | null;
  task: string;
  evidenceRefs: string[];
};

export type AnalysisResultReview = {
  filePath: string | null;
  lineNumber: number | null;
  comment: string;
};

export type AnalysisResult = {
  summary: string;
  changes: AnalysisResultChange[];
  impacts: string[];
  risks: string[];
  recommendations: string[];
  purpose: string;
  changeReason: string;
  before: string;
  after: string;
  relatedFeatures: string[];
  affectedRoles: string[];
  roleImpacts: AnalysisResultRoleImpact[];
  followUpTasks: AnalysisResultFollowUpTask[];
  needsConfirmation: string[];
  evidence: AnalysisResultEvidence[];
  confidence?: number;
  retrievalQualityWarning?: boolean;
  hasExtendedFields: boolean;
  hasRisksField: boolean;
  riskScore?: number;
  reviews: AnalysisResultReview[];
};

export function isActiveAnalysisStatus(status: AnalysisStatus) {
  return status === "PENDING" || status === "PROCESSING";
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseNullableString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value === null) return null;
  return null;
}

function parseOptionalNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  return parseNullableString(value);
}

function parseOptionalNullableNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

export function parseAnalysisResult(value: unknown): AnalysisResult | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const summary = typeof record.summary === "string" ? record.summary : "";
  const purpose = typeof record.purpose === "string" ? record.purpose : "";
  const changeReason = typeof record.changeReason === "string" ? record.changeReason : "";
  const before = typeof record.before === "string" ? record.before : "";
  const after = typeof record.after === "string" ? record.after : "";
  const changes = Array.isArray(record.changes)
    ? record.changes
        .filter((item): item is Record<string, unknown> => item && typeof item === "object")
        .map((item) => ({
          filePath: typeof item.filePath === "string" ? item.filePath : "",
          description: typeof item.description === "string" ? item.description : "",
        }))
        .filter((item) => item.filePath || item.description)
    : [];
  const impacts = parseStringArray(record.impacts);
  const risks = parseStringArray(record.risks);
  const recommendations = parseStringArray(record.recommendations);
  const relatedFeatures = parseStringArray(record.relatedFeatures);
  const affectedRoles = parseStringArray(record.affectedRoles);
  const needsConfirmation = parseStringArray(record.needsConfirmation);
  const roleImpacts = Array.isArray(record.roleImpacts)
    ? record.roleImpacts
        .filter((item): item is Record<string, unknown> => item && typeof item === "object")
        .map((item) => ({
          role: typeof item.role === "string" ? item.role : "",
          impact: typeof item.impact === "string" ? item.impact : "",
          basis: parseNullableString(item.basis),
          evidenceRefs: parseStringArray(item.evidenceRefs),
        }))
        .filter((item) => item.role || item.impact || item.basis)
    : [];
  const followUpTasks = Array.isArray(record.followUpTasks)
    ? record.followUpTasks
        .filter((item): item is Record<string, unknown> => item && typeof item === "object")
        .map((item) => ({
          role: parseNullableString(item.role),
          task: typeof item.task === "string" ? item.task : "",
          evidenceRefs: parseStringArray(item.evidenceRefs),
        }))
        .filter((item) => item.task)
    : [];
  const evidence = Array.isArray(record.evidence)
    ? record.evidence
        .filter((item): item is Record<string, unknown> => item && typeof item === "object")
        .map((item) => {
          const parsed: AnalysisResultEvidence = {
            id: typeof item.id === "string" ? item.id : "",
            source: typeof item.source === "string" ? item.source : "",
            location: typeof item.location === "string" ? item.location : "",
            description: parseNullableString(item.description),
          };
          const chunkId = parseOptionalNullableString(item.chunkId);
          if (chunkId !== undefined) parsed.chunkId = chunkId;
          const similarityScore = parseOptionalNullableNumber(item.similarityScore);
          if (similarityScore !== undefined) parsed.similarityScore = similarityScore;
          return parsed;
        })
        .filter((item) => item.id)
    : [];
  const reviews = Array.isArray(record.reviews)
    ? record.reviews
        .filter((item): item is Record<string, unknown> => item && typeof item === "object")
        .map((item) => ({
          filePath: parseNullableString(item.filePath),
          lineNumber: typeof item.lineNumber === "number" && Number.isFinite(item.lineNumber)
            ? item.lineNumber
            : item.lineNumber === null
              ? null
              : null,
          comment: typeof item.comment === "string" ? item.comment : "",
        }))
        .filter((item) => item.comment || item.filePath)
    : [];
  const riskScore = typeof record.riskScore === "number" && Number.isFinite(record.riskScore)
    ? record.riskScore
    : undefined;
  const confidence = typeof record.confidence === "number" && Number.isFinite(record.confidence)
    ? record.confidence
    : undefined;
  const retrievalQualityWarning = record.retrievalQualityWarning === true;
  const extendedFieldKeys = [
    "purpose",
    "changeReason",
    "before",
    "after",
    "relatedFeatures",
    "affectedRoles",
    "roleImpacts",
    "followUpTasks",
    "needsConfirmation",
    "evidence",
    "confidence",
    "retrievalQualityWarning",
  ] as const;
  const hasExtendedFields = extendedFieldKeys.some((key) => key in record);
  const hasRisksField = "risks" in record;

  const hasContent = Boolean(
    summary
    || purpose
    || changeReason
    || before
    || after
    || changes.length > 0
    || impacts.length > 0
    || risks.length > 0
    || recommendations.length > 0
    || relatedFeatures.length > 0
    || affectedRoles.length > 0
    || roleImpacts.length > 0
    || followUpTasks.length > 0
    || needsConfirmation.length > 0
    || evidence.length > 0
    || reviews.length > 0
    || riskScore !== undefined,
  );

  if (!hasContent) return null;

  const result: AnalysisResult = {
    summary,
    changes,
    impacts,
    risks,
    recommendations,
    purpose,
    changeReason,
    before,
    after,
    relatedFeatures,
    affectedRoles,
    roleImpacts,
    followUpTasks,
    needsConfirmation,
    evidence,
    reviews,
    hasExtendedFields,
    hasRisksField,
  };

  if (riskScore !== undefined) result.riskScore = riskScore;
  if (confidence !== undefined) result.confidence = confidence;
  if (retrievalQualityWarning) result.retrievalQualityWarning = true;

  return result;
}

export function getAnalysisApiErrorCode(error: unknown) {
  if (!(error instanceof ApiError)) return undefined;
  if (!error.bodyJson || typeof error.bodyJson !== "object") return undefined;
  if (!("code" in error.bodyJson) || typeof error.bodyJson.code !== "string") return undefined;
  return error.bodyJson.code;
}

export function canEditAnalysisRecord(
  recordStatus: AnalysisRecordStatus | null | undefined,
  pending: boolean,
) {
  return !pending && recordStatus !== "APPROVED";
}

export function canApproveAnalysisRecord(
  recordStatus: AnalysisRecordStatus | null | undefined,
  pending: boolean,
) {
  return !pending && recordStatus !== "APPROVED";
}

/** FE 전용 메타를 제외한 분석 결과 페이로드를 PATCH body용으로 만든다. */
export function serializeAnalysisResultForApi(result: AnalysisResult): Record<string, unknown> {
  if (!result.hasExtendedFields) {
    return {
      summary: result.summary,
      changes: result.changes,
      impacts: result.impacts,
      risks: result.risks,
      recommendations: result.recommendations,
    };
  }

  const payload: Record<string, unknown> = {
    summary: result.summary,
    changes: result.changes,
    impacts: result.impacts,
    recommendations: result.recommendations,
    purpose: result.purpose,
    changeReason: result.changeReason,
    before: result.before,
    after: result.after,
    relatedFeatures: result.relatedFeatures,
    affectedRoles: result.affectedRoles,
    roleImpacts: result.roleImpacts,
    followUpTasks: result.followUpTasks,
    needsConfirmation: result.needsConfirmation,
    evidence: result.evidence.map((item) => {
      const evidence: Record<string, unknown> = {
        id: item.id,
        source: item.source,
        location: item.location,
        description: item.description,
      };
      if (item.chunkId !== undefined) evidence.chunkId = item.chunkId;
      if (item.similarityScore !== undefined) evidence.similarityScore = item.similarityScore;
      return evidence;
    }),
  };

  if (result.hasRisksField) {
    payload.risks = result.risks;
  }

  if (result.confidence !== undefined) payload.confidence = result.confidence;
  if (result.retrievalQualityWarning) payload.retrievalQualityWarning = true;
  if (result.riskScore !== undefined) payload.riskScore = result.riskScore;
  if (result.reviews.length > 0) payload.reviews = result.reviews;

  return payload;
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

export function updateAnalysis(
  projectId: string | number,
  analysisId: string | number,
  analysisResult: unknown,
  signal?: AbortSignal,
) {
  return requestApiResult<AnalysisRecordResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/analyses/${encodeURIComponent(analysisId)}`,
    { method: "PATCH", body: { analysisResult }, signal },
  );
}

export function approveAnalysis(
  projectId: string | number,
  analysisId: string | number,
  signal?: AbortSignal,
) {
  return requestApiResult<AnalysisRecordResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/analyses/${encodeURIComponent(analysisId)}/approve`,
    { method: "POST", signal },
  );
}
