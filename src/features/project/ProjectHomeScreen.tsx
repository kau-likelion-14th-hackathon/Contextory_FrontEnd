import { useEffect, useState, type ReactNode } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { getApiErrorMessage } from "../../shared/api/client";
import { PageContainer, ResponsiveGrid } from "../../shared/layouts";
import { Badge, EmptyState, ErrorState, LoadingState } from "../../shared/ui";
import {
  getAnalyses,
  getAnalysisApiErrorCode,
  type AnalysisListResponse,
  type AnalysisStatus,
  type AnalysisSummary,
} from "../analysis/analysisApi";
import {
  getPullRequestApiErrorCode,
  getPullRequests,
  type PullRequestListResponse,
  type PullRequestSummary,
} from "../github/pullRequestApi";
import type { ProjectWorkspaceContextValue } from "../workspace/WorkspaceShell";
import { KpiCard } from "./components";
import "./ProjectHomeScreen.css";

const HOME_LIST_SIZE = 5;

const ANALYSIS_STATUS_COPY: Record<
  AnalysisStatus,
  { label: string; variant: "warning" | "info" | "danger" | "success" }
> = {
  PENDING: { label: "분석 대기", variant: "warning" },
  PROCESSING: { label: "분석 중", variant: "info" },
  COMPLETED: { label: "분석 완료", variant: "success" },
  FAILED: { label: "분석 실패", variant: "danger" },
  CANCELED: { label: "분석 취소", variant: "warning" },
};

const PERMISSION_ROLE_LABELS: Record<string, string> = {
  OWNER: "소유자",
  ADMIN: "관리자",
  MEMBER: "멤버",
  VIEWER: "뷰어",
};

type HomeLoadState = "loading" | "success" | "error";

function formatPermissionRole(role?: string | null) {
  if (!role?.trim()) return "—";
  const normalized = role.trim().toUpperCase();
  return PERMISSION_ROLE_LABELS[normalized] ?? role;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getAnalysisStatusCopy(status: string) {
  return ANALYSIS_STATUS_COPY[status as AnalysisStatus]
    ?? { label: status || "상태 미확인", variant: "info" as const };
}

function getPullRequestStatus(pullRequest: PullRequestSummary) {
  const state = pullRequest.state.toLowerCase() === "open" ? "열림" : "닫힘";
  return pullRequest.draft ? `Draft · ${state}` : state;
}

function describeRepository(connected: boolean, fullName?: string | null) {
  if (!connected) return { value: "미연결", description: "GitHub 저장소가 연결되어 있지 않습니다." };
  const name = fullName?.trim();
  return {
    value: "연결됨",
    description: name || "저장소 이름을 확인할 수 없습니다.",
  };
}

export function ProjectHomeScreen() {
  const { projectId = "" } = useParams();
  const { project } = useOutletContext<ProjectWorkspaceContextValue>();
  const [loadState, setLoadState] = useState<HomeLoadState>("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [analyses, setAnalyses] = useState<AnalysisListResponse>();
  const [pullRequests, setPullRequests] = useState<PullRequestListResponse>();
  const [analysesError, setAnalysesError] = useState("");
  const [pullRequestsError, setPullRequestsError] = useState("");

  useEffect(() => {
    if (!projectId) return;

    const controller = new AbortController();
    setLoadState("loading");
    setErrorMessage("");
    setAnalysesError("");
    setPullRequestsError("");

    void (async () => {
      const [analysesResult, pullRequestsResult] = await Promise.all([
        getAnalyses(projectId, { page: 0, size: HOME_LIST_SIZE }, controller.signal)
          .then((response) => ({ ok: true as const, response }))
          .catch((error: unknown) => ({ ok: false as const, error })),
        getPullRequests(
          projectId,
          { state: "ALL", page: 1, size: HOME_LIST_SIZE },
          controller.signal,
        )
          .then((response) => ({ ok: true as const, response }))
          .catch((error: unknown) => ({ ok: false as const, error })),
      ]);

      if (controller.signal.aborted) return;

      if (analysesResult.ok) {
        setAnalyses(analysesResult.response);
        setAnalysesError("");
      } else {
        setAnalyses(undefined);
        setAnalysesError(
          getApiErrorMessage(analysesResult.error, "AI 분석 목록을 불러오지 못했습니다."),
        );
      }

      if (pullRequestsResult.ok) {
        setPullRequests(pullRequestsResult.response);
        setPullRequestsError("");
      } else {
        setPullRequests(undefined);
        const code = getPullRequestApiErrorCode(pullRequestsResult.error);
        if (code === "PROJECT_REPOSITORY_4041") {
          setPullRequestsError("연결된 GitHub 저장소가 없습니다.");
        } else if (["GITHUB_4011", "GITHUB_4012", "GITHUB_4013"].includes(code ?? "")) {
          setPullRequestsError("GitHub 연결이 필요합니다.");
        } else {
          setPullRequestsError(
            getApiErrorMessage(pullRequestsResult.error, "Pull Request 목록을 불러오지 못했습니다."),
          );
        }
      }

      if (!analysesResult.ok && !pullRequestsResult.ok) {
        const analysisCode = getAnalysisApiErrorCode(analysesResult.error);
        setErrorMessage(
          analysisCode
            ? getApiErrorMessage(analysesResult.error, "프로젝트 홈을 불러오지 못했습니다.")
            : getApiErrorMessage(
              pullRequestsResult.error,
              "프로젝트 홈을 불러오지 못했습니다.",
            ),
        );
        setLoadState("error");
        return;
      }

      setLoadState("success");
    })();

    return () => controller.abort();
  }, [projectId, retryKey]);

  const repositoryConnected = Boolean(project?.repository?.connected);
  const repositoryFullName = project?.repository?.repositoryFullName ?? null;
  const repositoryKpi = describeRepository(repositoryConnected, repositoryFullName);
  const latestAnalysis = analyses?.content[0];
  const latestAnalysisStatus = latestAnalysis
    ? getAnalysisStatusCopy(latestAnalysis.analysisStatus)
    : null;
  const description = [
    project?.summary?.trim(),
    project?.purpose?.trim(),
  ].filter(Boolean).join(" · ") || "프로젝트 요약 정보가 없습니다.";

  return (
    <main className="project-home">
      <PageContainer size="full">
        <div className="project-home__content">
          <header className="project-home__header">
            <div className="project-home__heading">
              <h1>{project?.name ?? "프로젝트"}</h1>
              <p>{description}</p>
            </div>
            <aside className="project-home__repo" aria-label="GitHub 저장소 연결 상태">
              <div>
                <strong>{repositoryConnected ? "저장소 연결됨" : "저장소 미연결"}</strong>
                <span>{repositoryFullName?.trim() || "설정에서 GitHub 저장소를 연결하세요."}</span>
              </div>
              <Link
                className="ui-button ui-button--secondary ui-button--sm"
                to={repositoryConnected ? "../github" : "../settings"}
              >
                {repositoryConnected ? "GitHub 작업" : "설정으로 이동"}
              </Link>
            </aside>
          </header>

          {loadState === "loading" ? (
            <LoadingState
              description="최근 AI 분석과 Pull Request를 확인하고 있습니다."
              title="프로젝트 홈을 불러오는 중입니다"
            />
          ) : null}

          {loadState === "error" ? (
            <ErrorState
              action={{ label: "다시 시도", onClick: () => setRetryKey((key) => key + 1) }}
              description={errorMessage || "잠시 후 다시 시도해주세요."}
              title="프로젝트 홈을 불러오지 못했습니다"
            />
          ) : null}

          {loadState === "success" ? (
            <div className="project-home__sections">
              <section aria-labelledby="project-home-kpis">
                <h2 className="project-home__visually-hidden" id="project-home-kpis">프로젝트 요약</h2>
                <ResponsiveGrid desktopColumns={4} tabletColumns={2}>
                  <KpiCard
                    description={analyses ? "프로젝트 전체 AI 분석 수" : (analysesError || "분석 수를 확인할 수 없습니다.")}
                    label="전체 AI 분석"
                    value={analyses ? analyses.totalElements : "—"}
                  />
                  <KpiCard
                    description={
                      latestAnalysis
                        ? `PR #${latestAnalysis.prNumber}`
                        : (analysesError || "아직 분석 기록이 없습니다.")
                    }
                    label="최신 분석 상태"
                    value={latestAnalysisStatus?.label ?? "—"}
                  />
                  <KpiCard
                    description={repositoryKpi.description}
                    label="GitHub 저장소"
                    value={repositoryKpi.value}
                  />
                  <KpiCard
                    description="현재 프로젝트에서의 내 권한"
                    label="내 프로젝트 권한"
                    value={formatPermissionRole(project?.myPermissionRole)}
                  />
                </ResponsiveGrid>
              </section>

              <div className="project-home__columns">
                <section className="project-home__panel" aria-labelledby="recent-analyses-title">
                  <div className="project-home__panel-header">
                    <h2 id="recent-analyses-title">최근 AI 분석</h2>
                    <Link className="ui-button ui-button--secondary ui-button--sm" to="../github">
                      GitHub에서 분석
                    </Link>
                  </div>
                  <HomeListBody
                    emptyDescription="AI 분석을 요청하면 최근 결과가 여기에 표시됩니다."
                    emptyTitle="최근 AI 분석이 없습니다"
                    errorMessage={analysesError}
                    items={analyses?.content}
                    renderItem={(item) => (
                      <AnalysisListItem analysis={item} key={item.analysisId} />
                    )}
                  />
                </section>

                <section className="project-home__panel" aria-labelledby="recent-prs-title">
                  <div className="project-home__panel-header">
                    <h2 id="recent-prs-title">최근 Pull Request</h2>
                    <Link className="ui-button ui-button--secondary ui-button--sm" to="../github">
                      전체 보기
                    </Link>
                  </div>
                  <HomeListBody
                    emptyDescription="연결된 저장소의 Pull Request가 여기에 표시됩니다."
                    emptyTitle="최근 Pull Request가 없습니다"
                    errorMessage={pullRequestsError}
                    items={pullRequests?.content}
                    renderItem={(item) => (
                      <PullRequestListItem key={item.prNumber} pullRequest={item} />
                    )}
                  />
                </section>
              </div>
            </div>
          ) : null}
        </div>
      </PageContainer>
    </main>
  );
}

function HomeListBody<T>({
  emptyDescription,
  emptyTitle,
  errorMessage,
  items,
  renderItem,
}: {
  emptyDescription: string;
  emptyTitle: string;
  errorMessage: string;
  items?: T[];
  renderItem: (item: T) => ReactNode;
}) {
  if (errorMessage) {
    return (
      <div className="project-home__section-state">
        <ErrorState description={errorMessage} title="목록을 불러오지 못했습니다" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="project-home__section-state">
        <EmptyState description={emptyDescription} title={emptyTitle} />
      </div>
    );
  }

  return <div className="project-home__list">{items.map(renderItem)}</div>;
}

function AnalysisListItem({ analysis }: { analysis: AnalysisSummary }) {
  const status = getAnalysisStatusCopy(analysis.analysisStatus);

  return (
    <Link className="project-home__list-item" to={`../analyses/${analysis.analysisId}`}>
      <div className="project-home__list-badge">
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className="project-home__list-copy">
        <h3>PR #{analysis.prNumber} 분석</h3>
        <p>
          {analysis.modelName?.trim() || "모델 정보 없음"}
          {" · "}
          요청 {formatDateTime(analysis.requestedAt)}
        </p>
      </div>
      <time dateTime={analysis.completedAt ?? analysis.requestedAt}>
        {formatDateTime(analysis.completedAt ?? analysis.requestedAt)}
      </time>
    </Link>
  );
}

function PullRequestListItem({ pullRequest }: { pullRequest: PullRequestSummary }) {
  return (
    <Link className="project-home__list-item" to={`../github/pulls/${pullRequest.prNumber}`}>
      <div className="project-home__list-badge">
        <Badge variant={pullRequest.state.toLowerCase() === "open" ? "success" : "info"}>
          {getPullRequestStatus(pullRequest)}
        </Badge>
      </div>
      <div className="project-home__list-copy">
        <h3>#{pullRequest.prNumber} {pullRequest.title}</h3>
        <p>
          {pullRequest.authorLogin ?? "작성자 미상"}
          {" · "}
          {pullRequest.sourceBranch ?? "—"} → {pullRequest.targetBranch ?? "—"}
        </p>
      </div>
      <time dateTime={pullRequest.updatedAt}>{formatDateTime(pullRequest.updatedAt)}</time>
    </Link>
  );
}
