import { Navigate, useParams } from "react-router-dom";

/** 레거시 records/:analysisId 진입을 기존 분석 상세로 연결한다. */
export function ProjectMemoryDetailScreen() {
  const { projectId = "", analysisId } = useParams();

  if (!analysisId || !/^\d+$/.test(analysisId) || Number(analysisId) <= 0) {
    return <Navigate replace to={`/projects/${projectId}/records`} />;
  }

  return <Navigate replace to={`/projects/${projectId}/analyses/${analysisId}`} />;
}
