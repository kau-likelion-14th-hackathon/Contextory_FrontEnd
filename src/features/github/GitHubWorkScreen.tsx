import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../shared/api/client";
import { PageContainer } from "../../shared/layouts";
import { Button, EmptyState, ErrorState, LoadingState } from "../../shared/ui";
import type { ProjectWorkspaceContextValue } from "../workspace/WorkspaceShell";
import { PullRequestRow } from "./components";
import {
  getPullRequestApiErrorCode,
  getPullRequests,
  type PullRequestListResponse,
  type PullRequestState,
} from "./pullRequestApi";
import {
  buildPullRequestDetailPath,
  buildPullRequestListSearch,
  getPullRequestPaginationItems,
  isCanonicalPullRequestListSearch,
  parsePullRequestListQuery,
  type PullRequestListQuery,
} from "./pullRequestListNavigation";
import "./GitHubWorkScreen.css";

const PAGE_SIZE = 7;

const stateFilters: Array<{ label: string; value: PullRequestState }> = [
  { label: "열림", value: "OPEN" },
  { label: "닫힘", value: "CLOSED" },
  { label: "전체", value: "ALL" },
];

type GitHubWorkRequestState =
  | "loading"
  | "success"
  | "empty"
  | "no-repository"
  | "github-connection-required"
  | "error";

function getGitHubStatus(state: string, draft: boolean) {
  const stateLabel = state.toLowerCase() === "open" ? "열림" : "닫힘";
  return draft ? `Draft · ${stateLabel}` : stateLabel;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function classifyRequestError(error: unknown): GitHubWorkRequestState {
  const code = getPullRequestApiErrorCode(error);
  if (code === "PROJECT_REPOSITORY_4041") return "no-repository";
  if (["GITHUB_4011", "GITHUB_4012", "GITHUB_4013"].includes(code ?? "")) {
    return "github-connection-required";
  }
  return "error";
}

export function GitHubWorkScreen() {
  const { projectId = "" } = useParams();
  const { project } = useOutletContext<ProjectWorkspaceContextValue>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state: pullRequestState, page: currentPage } = parsePullRequestListQuery(searchParams);
  const [retryKey, setRetryKey] = useState(0);
  const [requestState, setRequestState] = useState<GitHubWorkRequestState>("loading");
  const [result, setResult] = useState<PullRequestListResponse>();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isCanonicalPullRequestListSearch(searchParams)) return;
    setSearchParams(
      buildPullRequestListSearch({ state: pullRequestState, page: currentPage }),
      { replace: true },
    );
  }, [currentPage, pullRequestState, searchParams, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    setRequestState("loading");
    setErrorMessage("");

    void getPullRequests(
      projectId,
      { page: currentPage, size: PAGE_SIZE, state: pullRequestState },
      controller.signal,
    )
      .then((response) => {
        if (controller.signal.aborted) return;
        if (response.content.length === 0 && currentPage > 1) {
          setSearchParams(
            buildPullRequestListSearch({ state: pullRequestState, page: 1 }),
            { replace: true },
          );
          return;
        }
        setResult(response);
        setRequestState(response.content.length === 0 ? "empty" : "success");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult(undefined);
        setRequestState(classifyRequestError(error));
        setErrorMessage(getApiErrorMessage(error, "Pull Request 목록을 불러오지 못했습니다."));
      });

    return () => controller.abort();
  }, [currentPage, projectId, pullRequestState, retryKey, setSearchParams]);

  const updateListQuery = (next: PullRequestListQuery) => {
    if (next.state === pullRequestState && next.page === currentPage) return;
    setSearchParams(buildPullRequestListSearch(next));
  };

  const refresh = () => setRetryKey((key) => key + 1);
  const repositoryName = project?.repository?.repositoryFullName?.trim() || "연결된 저장소 없음";
  const paginationItems = result
    ? getPullRequestPaginationItems({
      currentPage: result.page,
      hasNext: result.hasNext,
    })
    : [];

  return (
    <main className="github-work">
      <PageContainer size="full">
        <div className="github-work__content">
          <header className="github-work__header">
            <div>
              <h1>GitHub 작업 목록</h1>
              <p>연결된 저장소의 Pull Request 원본 정보를 확인하세요.</p>
            </div>
            <Button
              aria-label="GitHub Pull Request 목록 새로고침"
              loading={requestState === "loading"}
              onClick={refresh}
            >
              <span aria-hidden="true">↻</span> 새로고침
            </Button>
          </header>

          <section className="github-work__filters" aria-label="GitHub Pull Request 필터">
            <div className="github-work__repository-filter">
              <span className="github-work__repository-filter-label">연결된 저장소</span>
              <span className="github-work__repository-filter-value">{repositoryName}</span>
            </div>
            <div className="github-work__filter-chips" aria-label="GitHub Pull Request 상태 필터">
              {stateFilters.map((filter) => (
                <button
                  aria-pressed={pullRequestState === filter.value}
                  className="github-work__filter-chip"
                  key={filter.value}
                  onClick={() => {
                    updateListQuery({ state: filter.value, page: 1 });
                  }}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </section>

          <section
            className={`github-work__panel github-work__panel--${requestState}`}
            aria-label="Pull Request 목록 및 상태"
          >
            {requestState === "success" && result ? (
              <>
                <div className="github-work__table-header" aria-hidden="true">
                  <span>PR / 제목</span>
                  <span>작성자</span>
                  <span>상태</span>
                  <span>브랜치</span>
                  <span>업데이트</span>
                  <span>작업</span>
                </div>
                <div className="github-work__list">
                  {result.content.map((pullRequest) => (
                    <PullRequestRow
                      actionLabel="보기"
                      actionTo={buildPullRequestDetailPath(
                        projectId,
                        pullRequest.prNumber,
                        { state: pullRequestState, page: currentPage },
                      )}
                      author={pullRequest.authorLogin ?? "—"}
                      baseBranch={pullRequest.targetBranch ?? undefined}
                      githubStatus={getGitHubStatus(pullRequest.state, pullRequest.draft)}
                      githubStatusVariant={pullRequest.draft ? "info" : pullRequest.state.toLowerCase() === "open" ? "success" : "neutral"}
                      headBranch={pullRequest.sourceBranch ?? undefined}
                      key={pullRequest.prNumber}
                      number={pullRequest.prNumber}
                      status={pullRequest.state}
                      title={pullRequest.title}
                      updatedAt={formatUpdatedAt(pullRequest.updatedAt)}
                    />
                  ))}
                </div>
                <footer className="github-work__pagination">
                  <p>페이지 {result.page} · 현재 {result.content.length}개</p>
                  <nav aria-label="Pull Request 목록 페이지" className="github-work__pagination-controls">
                    <Button
                      aria-label="이전 Pull Request 페이지"
                      disabled={currentPage <= 1}
                      onClick={() => {
                        updateListQuery({
                          state: pullRequestState,
                          page: Math.max(1, currentPage - 1),
                        });
                      }}
                      size="sm"
                      variant="secondary"
                    >
                      이전
                    </Button>
                    <div className="github-work__pagination-pages">
                      {paginationItems.map((item, index) => (
                        item === "ellipsis" ? (
                          <span
                            aria-hidden="true"
                            className="github-work__pagination-ellipsis"
                            key={`ellipsis-${index}`}
                          >
                            …
                          </span>
                        ) : (
                          <button
                            aria-current={item === currentPage ? "page" : undefined}
                            aria-label={`${item}페이지`}
                            className={
                              item === currentPage
                                ? "github-work__pagination-page github-work__pagination-page--current"
                                : "github-work__pagination-page"
                            }
                            key={item}
                            onClick={() => {
                              updateListQuery({ state: pullRequestState, page: item });
                            }}
                            type="button"
                          >
                            {item}
                          </button>
                        )
                      ))}
                    </div>
                    <Button
                      aria-label="다음 Pull Request 페이지"
                      disabled={!result.hasNext}
                      onClick={() => {
                        updateListQuery({
                          state: pullRequestState,
                          page: currentPage + 1,
                        });
                      }}
                      size="sm"
                      variant="secondary"
                    >
                      다음
                    </Button>
                  </nav>
                </footer>
              </>
            ) : (
              <GitHubWorkFeedback
                errorMessage={errorMessage}
                onRetry={refresh}
                projectId={projectId}
                state={requestState === "success" ? "error" : requestState}
              />
            )}
          </section>
        </div>
      </PageContainer>
    </main>
  );
}

type GitHubWorkFeedbackProps = {
  state: Exclude<GitHubWorkRequestState, "success">;
  projectId: string;
  errorMessage: string;
  onRetry: () => void;
};

function GitHubWorkFeedback({ state, projectId, errorMessage, onRetry }: GitHubWorkFeedbackProps) {
  if (state === "loading") {
    return <LoadingState title="GitHub 작업을 불러오는 중입니다" description="Pull Request 목록을 확인하고 있습니다." />;
  }

  if (state === "no-repository") {
    return (
      <EmptyState
        description="PR을 불러오려면 먼저 프로젝트에 GitHub 저장소를 연결해야 합니다."
        details={(
          <Link className="ui-button ui-button--primary ui-button--md" to={`/projects/${projectId}/settings?tab=github`}>
            GitHub 저장소 설정
          </Link>
        )}
        title="GitHub 저장소를 연결해주세요"
      />
    );
  }

  if (state === "github-connection-required") {
    return (
      <ErrorState
        description="GitHub 연결이 만료되었거나 접근 권한을 확인할 수 없습니다. GitHub App을 다시 연결해주세요."
        details={(
          <Link className="ui-button ui-button--primary ui-button--md" to={`/projects/${projectId}/settings?tab=github`}>
            GitHub 연결 설정
          </Link>
        )}
        title="GitHub 연결이 필요합니다"
      />
    );
  }

  if (state === "empty") {
    return (
      <EmptyState
        action={{ label: "목록 새로고침", onClick: onRetry }}
        description="현재 조건에 해당하는 Pull Request가 없습니다."
        title="Pull Request가 없습니다"
      />
    );
  }

  return (
    <ErrorState
      action={{ label: "다시 시도", onClick: onRetry }}
      description={errorMessage || "잠시 후 다시 시도해주세요."}
      title="GitHub 작업을 불러오지 못했습니다"
    />
  );
}
