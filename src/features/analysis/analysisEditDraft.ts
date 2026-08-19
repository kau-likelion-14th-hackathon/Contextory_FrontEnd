import type { AnalysisRecordStatus, AnalysisResult, AnalysisStatus } from "./analysisApi";

function cloneAnalysisResult(source: AnalysisResult): AnalysisResult {
  return structuredClone(source);
}

/** 서버에서 받은 분석 결과로 편집 draft를 초기화한다. 원본 참조를 끊는다. */
export function createAnalysisEditDraft(source: AnalysisResult): AnalysisResult {
  return cloneAnalysisResult(source);
}

function normalizeStringList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function normalizeNullableString(value: string | null) {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * 편집 draft를 저장용 AnalysisResult로 만든다.
 * evidence / confidence 등 비편집 필드는 draft에 보존된 값을 그대로 유지한다.
 * extended에서 risks가 원래 없었더라도 사용자가 리스크를 추가하면 hasRisksField를 true로 올린다.
 */
export function commitAnalysisEditDraft(draft: AnalysisResult): AnalysisResult {
  const risks = normalizeStringList(draft.risks);
  const hasRisksField = draft.hasExtendedFields
    ? draft.hasRisksField || risks.length > 0
    : draft.hasRisksField;

  const result: AnalysisResult = {
    summary: draft.summary.trim(),
    purpose: draft.purpose.trim(),
    changeReason: draft.changeReason.trim(),
    before: draft.before.trim(),
    after: draft.after.trim(),
    changes: draft.changes
      .map((item) => ({
        filePath: item.filePath.trim(),
        description: item.description.trim(),
      }))
      .filter((item) => item.filePath || item.description),
    impacts: normalizeStringList(draft.impacts),
    risks,
    recommendations: normalizeStringList(draft.recommendations),
    relatedFeatures: normalizeStringList(draft.relatedFeatures),
    affectedRoles: normalizeStringList(draft.affectedRoles),
    roleImpacts: draft.roleImpacts
      .map((item) => ({
        role: item.role.trim(),
        impact: item.impact.trim(),
        basis: normalizeNullableString(item.basis),
        evidenceRefs: [...item.evidenceRefs],
      }))
      .filter((item) => item.role || item.impact || item.basis),
    followUpTasks: draft.followUpTasks
      .map((item) => ({
        role: normalizeNullableString(item.role),
        task: item.task.trim(),
        evidenceRefs: [...item.evidenceRefs],
      }))
      .filter((item) => item.task),
    needsConfirmation: normalizeStringList(draft.needsConfirmation),
    evidence: draft.evidence.map((item) => {
      const next: AnalysisResult["evidence"][number] = {
        id: item.id,
        source: item.source,
        location: item.location,
        description: item.description,
      };
      if (item.chunkId !== undefined) next.chunkId = item.chunkId;
      if (item.similarityScore !== undefined) next.similarityScore = item.similarityScore;
      return next;
    }),
    reviews: draft.reviews.map((item) => ({ ...item })),
    hasExtendedFields: draft.hasExtendedFields,
    hasRisksField,
  };

  if (draft.confidence !== undefined) result.confidence = draft.confidence;
  if (draft.retrievalQualityWarning) result.retrievalQualityWarning = true;
  if (draft.riskScore !== undefined) result.riskScore = draft.riskScore;

  return result;
}

export function isAnalysisEditDraftDirty(
  original: AnalysisResult,
  draft: AnalysisResult,
) {
  return JSON.stringify(commitAnalysisEditDraft(draft))
    !== JSON.stringify(commitAnalysisEditDraft(original));
}

export function canEnterAnalysisEditMode({
  analysisStatus,
  recordStatus,
  isEditing,
  pending,
}: {
  analysisStatus?: AnalysisStatus;
  recordStatus?: AnalysisRecordStatus | null;
  isEditing: boolean;
  pending: boolean;
}) {
  return analysisStatus === "COMPLETED"
    && recordStatus !== "APPROVED"
    && !isEditing
    && !pending;
}

export function canApproveAnalysisWhileEditing(isEditing: boolean) {
  return !isEditing;
}

export function withDraftStringField(
  draft: AnalysisResult,
  field: "summary" | "purpose" | "changeReason" | "before" | "after",
  value: string,
): AnalysisResult {
  return { ...draft, [field]: value };
}

export function withDraftStringList(
  draft: AnalysisResult,
  field: "relatedFeatures" | "affectedRoles" | "risks" | "needsConfirmation" | "impacts" | "recommendations",
  values: string[],
): AnalysisResult {
  const next: AnalysisResult = { ...draft, [field]: values };
  if (field === "risks" && draft.hasExtendedFields && values.some((value) => value.trim())) {
    next.hasRisksField = true;
  }
  return next;
}
