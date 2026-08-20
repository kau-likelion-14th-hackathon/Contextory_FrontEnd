export function getAnalysisRequestActionLabel({
  isInitialAnalysis,
  requesting,
}: {
  isInitialAnalysis: boolean;
  requesting: boolean;
}) {
  if (requesting) return "분석 요청 중...";
  return isInitialAnalysis ? "AI 분석" : "AI 재분석";
}
