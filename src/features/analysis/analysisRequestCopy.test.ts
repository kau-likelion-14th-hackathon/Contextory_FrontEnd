import { describe, expect, it } from "vitest";
import { getAnalysisRequestActionLabel } from "./analysisRequestCopy";

describe("getAnalysisRequestActionLabel", () => {
  it("returns initial analysis label", () => {
    expect(getAnalysisRequestActionLabel({
      isInitialAnalysis: true,
      requesting: false,
    })).toBe("AI 분석");
  });

  it("returns requesting label while pending", () => {
    expect(getAnalysisRequestActionLabel({
      isInitialAnalysis: true,
      requesting: true,
    })).toBe("분석 요청 중...");
    expect(getAnalysisRequestActionLabel({
      isInitialAnalysis: false,
      requesting: true,
    })).toBe("분석 요청 중...");
  });

  it("returns re-analysis label for existing analysis context", () => {
    expect(getAnalysisRequestActionLabel({
      isInitialAnalysis: false,
      requesting: false,
    })).toBe("AI 재분석");
  });
});
