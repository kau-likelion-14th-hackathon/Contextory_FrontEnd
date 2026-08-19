import { describe, expect, it } from "vitest";
import {
  ANALYSIS_APPROVED_COPY,
  canApproveAnalysisWhileEditing,
  canEnterAnalysisEditMode,
  canRequestAnalysisWhileEditing,
  canSaveAnalysisEditDraft,
  commitAnalysisEditDraft,
  createAnalysisEditDraft,
  isAnalysisEditDraftDirty,
  withDraftStringField,
  withDraftStringList,
} from "./analysisEditDraft";
import { parseAnalysisResult, serializeAnalysisResultForApi } from "./analysisApi";

function extendedSource() {
  return parseAnalysisResult({
    summary: "요약",
    purpose: "목적",
    changeReason: "이유",
    before: "이전",
    after: "이후",
    relatedFeatures: ["인증"],
    affectedRoles: ["FE"],
    roleImpacts: [{
      role: "FE",
      impact: "영향",
      basis: "근거",
      evidenceRefs: ["ev-1"],
    }],
    followUpTasks: [{
      role: "QA",
      task: "테스트",
      evidenceRefs: ["ev-1"],
    }],
    needsConfirmation: ["확인"],
    changes: [{ filePath: "a.ts", description: "변경" }],
    evidence: [{
      id: "ev-1",
      source: "pr_diff",
      location: "a.ts",
      description: "diff",
      chunkId: "c1",
      similarityScore: 0.9,
    }],
    confidence: 0.8,
    retrievalQualityWarning: true,
  })!;
}

describe("analysisEditDraft", () => {
  it("initializes draft from server result without sharing references", () => {
    const source = extendedSource();
    const draft = createAnalysisEditDraft(source);

    expect(draft).toEqual(source);
    expect(draft).not.toBe(source);
    expect(draft.evidence).not.toBe(source.evidence);
    expect(draft.roleImpacts[0]).not.toBe(source.roleImpacts[0]);
  });

  it("does not mutate original analysisResult when draft changes", () => {
    const source = extendedSource();
    const originalSnapshot = structuredClone(source);
    let draft = createAnalysisEditDraft(source);
    draft = withDraftStringField(draft, "summary", "수정된 요약");
    draft = withDraftStringList(draft, "relatedFeatures", ["새 기능"]);

    expect(source).toEqual(originalSnapshot);
    expect(draft.summary).toBe("수정된 요약");
  });

  it("preserves non-editable fields when committing draft", () => {
    const source = extendedSource();
    let draft = createAnalysisEditDraft(source);
    draft = withDraftStringField(draft, "summary", "새 요약");
    draft = {
      ...draft,
      roleImpacts: [{
        ...draft.roleImpacts[0]!,
        impact: "수정된 영향",
      }],
    };

    const committed = commitAnalysisEditDraft(draft);
    expect(committed.summary).toBe("새 요약");
    expect(committed.roleImpacts[0]?.impact).toBe("수정된 영향");
    expect(committed.roleImpacts[0]?.evidenceRefs).toEqual(["ev-1"]);
    expect(committed.evidence).toEqual(source.evidence);
    expect(committed.confidence).toBe(0.8);
    expect(committed.retrievalQualityWarning).toBe(true);
    expect(committed.hasExtendedFields).toBe(true);
    expect(committed.hasRisksField).toBe(false);
  });

  it("keeps risks absent for extended drafts until user adds risks", () => {
    const source = extendedSource();
    expect(source.hasRisksField).toBe(false);

    const committed = commitAnalysisEditDraft(createAnalysisEditDraft(source));
    expect(committed.hasRisksField).toBe(false);
    expect(serializeAnalysisResultForApi(committed)).not.toHaveProperty("risks");

    const withRisks = commitAnalysisEditDraft(
      withDraftStringList(createAnalysisEditDraft(source), "risks", ["새 리스크"]),
    );
    expect(withRisks.hasRisksField).toBe(true);
    expect(serializeAnalysisResultForApi(withRisks)).toMatchObject({ risks: ["새 리스크"] });
  });

  it("serializes committed draft with edited values for PATCH", () => {
    const source = extendedSource();
    const draft = withDraftStringField(createAnalysisEditDraft(source), "purpose", "새 목적");
    const payload = serializeAnalysisResultForApi(commitAnalysisEditDraft(draft));

    expect(payload.purpose).toBe("새 목적");
    expect(payload.evidence).toEqual(source.evidence.map((item) => ({
      id: item.id,
      source: item.source,
      location: item.location,
      description: item.description,
      chunkId: item.chunkId,
      similarityScore: item.similarityScore,
    })));
  });

  it("restores original when edit draft is discarded", () => {
    const source = extendedSource();
    let draft = createAnalysisEditDraft(source);
    draft = withDraftStringField(draft, "summary", "임시 수정");
    expect(isAnalysisEditDraftDirty(source, draft)).toBe(true);

    draft = createAnalysisEditDraft(source);
    expect(isAnalysisEditDraftDirty(source, draft)).toBe(false);
    expect(draft.summary).toBe(source.summary);
  });

  it("blocks edit entry when approved or pending", () => {
    expect(canEnterAnalysisEditMode({
      analysisStatus: "COMPLETED",
      recordStatus: null,
      isEditing: false,
      pending: false,
    })).toBe(true);

    expect(canEnterAnalysisEditMode({
      analysisStatus: "COMPLETED",
      recordStatus: "APPROVED",
      isEditing: false,
      pending: false,
    })).toBe(false);

    expect(canEnterAnalysisEditMode({
      analysisStatus: "COMPLETED",
      recordStatus: null,
      isEditing: true,
      pending: false,
    })).toBe(false);

    expect(canEnterAnalysisEditMode({
      analysisStatus: "COMPLETED",
      recordStatus: null,
      isEditing: false,
      pending: true,
    })).toBe(false);
  });

  it("blocks approve while editing", () => {
    expect(canApproveAnalysisWhileEditing(false)).toBe(true);
    expect(canApproveAnalysisWhileEditing(true)).toBe(false);
  });

  it("blocks AI reanalysis while editing", () => {
    expect(canRequestAnalysisWhileEditing(false)).toBe(true);
    expect(canRequestAnalysisWhileEditing(true)).toBe(false);
  });

  it("allows save only when edit draft is dirty", () => {
    const source = extendedSource();
    const cleanDraft = createAnalysisEditDraft(source);
    const dirtyDraft = withDraftStringField(cleanDraft, "summary", "변경됨");

    expect(canSaveAnalysisEditDraft({
      isEditing: true,
      original: source,
      draft: cleanDraft,
      pending: false,
      recordStatus: null,
    })).toBe(false);

    expect(canSaveAnalysisEditDraft({
      isEditing: true,
      original: source,
      draft: dirtyDraft,
      pending: false,
      recordStatus: null,
    })).toBe(true);

    expect(canSaveAnalysisEditDraft({
      isEditing: true,
      original: source,
      draft: dirtyDraft,
      pending: true,
      recordStatus: null,
    })).toBe(false);

    expect(canSaveAnalysisEditDraft({
      isEditing: false,
      original: source,
      draft: dirtyDraft,
      pending: false,
      recordStatus: null,
    })).toBe(false);
  });

  it("keeps approval copy free of memory registration wording", () => {
    expect(ANALYSIS_APPROVED_COPY.title).toContain("승인");
    expect(ANALYSIS_APPROVED_COPY.description).toContain("승인");
    expect(ANALYSIS_APPROVED_COPY.description).not.toMatch(/메모리/);
    expect(ANALYSIS_APPROVED_COPY.title).not.toMatch(/메모리/);
  });

  it("supports legacy field edits without dropping risks", () => {
    const legacy = parseAnalysisResult({
      summary: "legacy",
      changes: [{ filePath: "a.ts", description: "d" }],
      impacts: ["i"],
      risks: ["r"],
      recommendations: ["rec"],
    })!;

    let draft = createAnalysisEditDraft(legacy);
    draft = withDraftStringField(draft, "summary", "legacy 수정");
    draft = withDraftStringList(draft, "recommendations", ["새 권장"]);
    const committed = commitAnalysisEditDraft(draft);
    expect(committed.hasExtendedFields).toBe(false);
    expect(serializeAnalysisResultForApi(committed)).toEqual({
      summary: "legacy 수정",
      changes: [{ filePath: "a.ts", description: "d" }],
      impacts: ["i"],
      risks: ["r"],
      recommendations: ["새 권장"],
    });
  });
});
