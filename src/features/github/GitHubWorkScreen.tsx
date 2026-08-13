import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { PageContainer } from "../../shared/layouts";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  SearchInput,
} from "../../shared/ui";
import { PullRequestRow } from "./components";
import {
  DEFAULT_GITHUB_WORK_STATE,
  analysisFilters,
  analysisStatusVariants,
  githubPullRequestsMock,
  githubStatusVariants,
  githubWorkViewStates,
  type AnalysisFilter,
  type GitHubWorkViewState,
} from "./githubWorkMock";
import "./GitHubWorkScreen.css";

const PAGE_SIZE = 7;

function isGitHubWorkViewState(value: string | null): value is GitHubWorkViewState {
  return value !== null && githubWorkViewStates.includes(value as GitHubWorkViewState);
}

export function GitHubWorkScreen() {
  const { projectId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const stateParam = searchParams.get("state");
  const queryState = isGitHubWorkViewState(stateParam)
    ? stateParam
    : DEFAULT_GITHUB_WORK_STATE;
  const [viewState, setViewState] = useState<GitHubWorkViewState>(queryState);
  const [searchTerm, setSearchTerm] = useState(queryState === "search-empty" ? "login" : "");
  const [analysisFilter, setAnalysisFilter] = useState<AnalysisFilter>("전체");
  const [currentPage, setCurrentPage] = useState(1);
  const [syncStartedLocally, setSyncStartedLocally] = useState(false);

  useEffect(() => {
    setViewState(queryState);
    setSearchTerm(queryState === "search-empty" ? "login" : "");
    setAnalysisFilter("전체");
    setCurrentPage(1);
    setSyncStartedLocally(false);
  }, [queryState]);

  useEffect(() => {
    if (!syncStartedLocally || viewState !== "syncing") return;

    const timer = window.setTimeout(() => {
      setViewState("success");
      setSyncStartedLocally(false);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [syncStartedLocally, viewState]);

  const filteredPullRequests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("ko-KR");

    return githubPullRequestsMock.filter((pullRequest) => {
      const matchesSearch = !normalizedSearch || [
        pullRequest.title,
        String(pullRequest.number),
        `#${pullRequest.number}`,
        pullRequest.author,
      ].some((value) => value.toLocaleLowerCase("ko-KR").includes(normalizedSearch));
      const matchesStatus = analysisFilter === "전체"
        || pullRequest.analysisStatus === analysisFilter;

      return matchesSearch && matchesStatus;
    });
  }, [analysisFilter, searchTerm]);

  const resultState = viewState === "success" && filteredPullRequests.length === 0
    ? "search-empty"
    : viewState;
  const totalPages = Math.max(1, Math.ceil(filteredPullRequests.length / PAGE_SIZE));
  const pageItems = filteredPullRequests.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const showFilters = !["no-repository", "loading"].includes(resultState);

  const startSync = () => {
    setSyncStartedLocally(true);
    setViewState("syncing");
  };

  const updateSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    if (viewState === "search-empty") setViewState("success");
  };

  const resetSearch = () => {
    setSearchTerm("");
    setAnalysisFilter("전체");
    setCurrentPage(1);
    setViewState("success");
  };

  return (
    <main className="github-work">
      <PageContainer size="full">
        <div className="github-work__content">
          <header className="github-work__header">
            <div>
              <h1>GitHub 작업 목록</h1>
              <p>연결된 저장소의 Pull Request를 확인하고 AI 분석과 리뷰를 관리하세요.</p>
            </div>
            <Button
              aria-label="GitHub Pull Request 지금 동기화"
              disabled={resultState === "syncing"}
              onClick={startSync}
            >
              <span aria-hidden="true">↻</span> {resultState === "syncing" ? "동기화 중" : "지금 동기화"}
            </Button>
          </header>

          {showFilters ? (
            <section className="github-work__filters" aria-label="GitHub 작업 검색 및 필터">
              <SearchInput
                aria-label="PR 제목, 번호, 작성자 검색"
                onChange={(event) => updateSearch(event.target.value)}
                onClear={() => updateSearch("")}
                placeholder="PR 제목, 번호, 작성자 검색..."
                value={searchTerm}
              />
              <div className="github-work__repository-filter">
                <span className="github-work__repository-filter-label">연결된 저장소</span>
                <span className="github-work__repository-filter-value">team/contextory-web</span>
              </div>
              <div className="github-work__filter-chips" aria-label="AI 분석 상태 필터">
                {analysisFilters.map((filter) => (
                  <button
                    aria-pressed={analysisFilter === filter}
                    className="github-work__filter-chip"
                    key={filter}
                    onClick={() => {
                      setAnalysisFilter(filter);
                      setCurrentPage(1);
                      if (viewState === "search-empty") setViewState("success");
                    }}
                    type="button"
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section
            className={`github-work__panel github-work__panel--${resultState}`}
            aria-label="Pull Request 목록 및 상태"
          >
            {resultState === "success" ? (
              <>
                <div className="github-work__table-header" aria-hidden="true">
                  <span>PR / 제목</span>
                  <span>작성자</span>
                  <span>상태</span>
                  <span>브랜치</span>
                  <span>파일</span>
                  <span>변경 통계</span>
                  <span>AI 상태</span>
                  <span>작업</span>
                </div>
                <div className="github-work__list">
                  {pageItems.map((pullRequest) => (
                    <PullRequestRow
                      actionLabel={pullRequest.githubStatus === "닫힘" || pullRequest.githubStatus === "병합됨" ? "보기" : "열기"}
                      actionTo={`/projects/${projectId}/github/pulls/${pullRequest.number}`}
                      additions={pullRequest.additions}
                      analysisStatus={pullRequest.analysisStatus}
                      analysisStatusVariant={analysisStatusVariants[pullRequest.analysisStatus]}
                      author={pullRequest.author}
                      baseBranch={pullRequest.baseBranch}
                      deletions={pullRequest.deletions}
                      filesChanged={pullRequest.changedFiles}
                      githubStatus={pullRequest.githubStatus}
                      githubStatusVariant={githubStatusVariants[pullRequest.githubStatus]}
                      headBranch={pullRequest.headBranch}
                      key={pullRequest.number}
                      number={pullRequest.number}
                      status={pullRequest.analysisStatus}
                      title={pullRequest.title}
                      updatedAt="방금 전"
                    />
                  ))}
                </div>
                <footer className="github-work__pagination">
                  <p>
                    전체 {filteredPullRequests.length}개 중{" "}
                    {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredPullRequests.length)}개 표시
                  </p>
                  <Pagination
                    ariaLabel="Pull Request 목록 페이지"
                    currentPage={currentPage}
                    nextLabel="다음 페이지"
                    onPageChange={setCurrentPage}
                    previousLabel="이전 페이지"
                    totalPages={totalPages}
                  />
                </footer>
              </>
            ) : (
              <GitHubWorkFeedback
                onReset={resetSearch}
                onRetry={startSync}
                onSuccess={() => setViewState("success")}
                state={resultState}
              />
            )}
          </section>
        </div>
      </PageContainer>
    </main>
  );
}

type GitHubWorkFeedbackProps = {
  state: Exclude<GitHubWorkViewState, "success">;
  onReset: () => void;
  onRetry: () => void;
  onSuccess: () => void;
};

function GitHubWorkFeedback({ state, onReset, onRetry, onSuccess }: GitHubWorkFeedbackProps) {
  if (state === "loading") {
    return <LoadingState title="GitHub 작업을 불러오는 중입니다" description="수집된 Pull Request 목록을 확인하고 있습니다." />;
  }

  if (state === "no-repository") {
    return (
      <EmptyState
        action={{ label: "저장소 연결하기", onClick: onSuccess }}
        description="PR을 불러오려면 먼저 프로젝트에 GitHub 저장소를 연결해야 합니다."
        details={
          <aside className="github-work__state-info github-work__state-info--note" aria-label="저장소 연결 안내">
            <strong>GitHub 로그인 계정과 프로젝트 저장소 연결은 별도입니다.</strong>
            <span>팀 및 설정 → GitHub 저장소에서 연결할 수 있어요.</span>
          </aside>
        }
        title="GitHub 저장소를 연결해주세요"
      />
    );
  }

  if (state === "empty") {
    return (
      <EmptyState
        action={{ label: "지금 동기화", onClick: onRetry }}
        description="연결된 저장소에 PR이 생성되면 여기에서 AI 분석을 시작할 수 있습니다."
        title="아직 수집된 Pull Request가 없어요"
      />
    );
  }

  if (state === "syncing") {
    return (
      <LoadingState
        description="연결된 저장소에서 최신 Pull Request와 커밋을 확인하고 있습니다. 잠시만 기다려주세요."
        details={
          <div className="github-work__state-info github-work__state-info--progress" aria-label="동기화 진행 단계">
            <strong><span aria-hidden="true">○</span> 저장소 권한 확인 완료</strong>
            <strong><span aria-hidden="true">○</span> 최신 PR / Commit 불러오는 중</strong>
            <span>완료되면 목록이 자동으로 갱신됩니다.</span>
          </div>
        }
        title="GitHub 변경을 동기화하고 있어요"
      />
    );
  }

  if (state === "sync-failed") {
    return (
      <ErrorState
        action={{ label: "다시 동기화", onClick: onRetry }}
        description="저장소 권한 또는 일시적인 API 오류로 PR을 가져오지 못했습니다."
        details={
          <div className="github-work__state-info github-work__state-info--error" role="note">
            <strong>마지막 성공 동기화 · 23분 전</strong>
            <span>권한을 다시 확인한 뒤 재시도하세요. 반복되면 저장소 연결을 다시 설정할 수 있습니다.</span>
          </div>
        }
        secondaryAction={{ label: "저장소 설정", onClick: onSuccess }}
        title="GitHub 동기화에 실패했어요"
      />
    );
  }

  if (state === "search-empty") {
    return (
      <EmptyState
        action={{ label: "검색 조건 초기화", onClick: onReset }}
        description="입력한 조건과 일치하는 Pull Request가 없습니다. 검색어나 상태 필터를 변경해보세요."
        title="검색 결과가 없어요"
      />
    );
  }

  return (
    <ErrorState
      action={{ label: "다시 시도", onClick: onSuccess }}
      description="잠시 후 다시 시도해주세요. 현재 화면은 개발용 mock 상태입니다."
      title="GitHub 작업을 불러오지 못했습니다"
    />
  );
}
