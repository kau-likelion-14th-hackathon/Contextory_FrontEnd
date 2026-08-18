import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../shared/api/client";
import { PageContainer } from "../../shared/layouts";
import { Badge, Button, EmptyState, ErrorState, LoadingState, Modal } from "../../shared/ui";
import {
  getPullRequest,
  getPullRequestApiErrorCode,
  getPullRequestFiles,
  type PullRequestDetail,
  type PullRequestFilesResponse,
} from "../github/pullRequestApi";
import {
  pullRequestReviewMock,
  pullRequestReviewStates,
  type PullRequestReviewState,
  type ReviewFollowUp,
} from "./pullRequestReviewMock";
import "./PullRequestReviewScreen.css";

const stateCopy: Record<
  PullRequestReviewState,
  { label: string; variant: "warning" | "info" | "danger" | "success" }
> = {
  review: { label: "검토 필요", variant: "warning" },
  analyzing: { label: "분석 중", variant: "info" },
  failed: { label: "분석 실패", variant: "danger" },
  approved: { label: "승인 완료", variant: "success" },
};

function isReviewState(value: string | null): value is PullRequestReviewState {
  return value !== null && pullRequestReviewStates.includes(value as PullRequestReviewState);
}

type PullRequestSourceState =
  | "loading"
  | "success"
  | "invalid"
  | "not-found"
  | "no-repository"
  | "github-connection-required"
  | "error";

function classifySourceError(error: unknown): PullRequestSourceState {
  const code = getPullRequestApiErrorCode(error);
  if (code === "PROJECT_REPOSITORY_4041") return "no-repository";
  if (["GITHUB_4011", "GITHUB_4012", "GITHUB_4013"].includes(code ?? "")) {
    return "github-connection-required";
  }
  if (code === "GITHUB_4041") return "not-found";
  return "error";
}

function formatPullRequestDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
}

function getPullRequestStatus(pullRequest: PullRequestDetail) {
  if (pullRequest.merged) return "병합됨";
  const state = pullRequest.state.toLowerCase() === "open" ? "열림" : "닫힘";
  return pullRequest.draft ? `Draft · ${state}` : state;
}

type PullRequestSourceFeedbackProps = {
  state: Exclude<PullRequestSourceState, "success">;
  projectId: string;
  errorMessage: string;
  onRetry: () => void;
};

function PullRequestSourceFeedback({
  state,
  projectId,
  errorMessage,
  onRetry,
}: PullRequestSourceFeedbackProps) {
  let content: React.ReactNode;

  if (state === "loading") {
    content = (
      <LoadingState
        description="Pull Request 상세와 변경 파일을 확인하고 있습니다."
        title="Pull Request를 불러오는 중입니다"
      />
    );
  } else if (state === "no-repository") {
    content = (
      <EmptyState
        description="Pull Request를 확인하려면 프로젝트에 GitHub 저장소를 연결해야 합니다."
        details={(
          <Link className="ui-button ui-button--primary ui-button--md" to={`/projects/${projectId}/settings?tab=github`}>
            GitHub 저장소 설정
          </Link>
        )}
        title="GitHub 저장소를 연결해주세요"
      />
    );
  } else if (state === "github-connection-required") {
    content = (
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
  } else if (state === "not-found" || state === "invalid") {
    content = (
      <EmptyState
        description={state === "invalid" ? "유효한 Pull Request 번호가 필요합니다." : "저장소에서 해당 Pull Request를 찾을 수 없습니다."}
        details={(
          <Link className="ui-button ui-button--secondary ui-button--md" to={`/projects/${projectId}/github`}>
            GitHub 작업 목록
          </Link>
        )}
        title="Pull Request를 찾을 수 없습니다"
      />
    );
  } else {
    content = (
      <ErrorState
        action={{ label: "다시 시도", onClick: onRetry }}
        description={errorMessage || "잠시 후 다시 시도해주세요."}
        title="Pull Request를 불러오지 못했습니다"
      />
    );
  }

  return (
    <main className="pull-request-review pull-request-review--source-state">
      <PageContainer size="full">{content}</PageContainer>
    </main>
  );
}

export function PullRequestReviewScreen() {
  const { projectId = "", pullRequestId, analysisId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryState = searchParams.get("state");
  const viewState = isReviewState(queryState) ? queryState : "review";
  const [discardOpen, setDiscardOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [analysisStartedLocally, setAnalysisStartedLocally] = useState(false);
  const [followUps, setFollowUps] = useState<ReviewFollowUp[]>(
    pullRequestReviewMock.draft.followUps,
  );
  const [sourceState, setSourceState] = useState<PullRequestSourceState>("loading");
  const [sourceError, setSourceError] = useState("");
  const [pullRequest, setPullRequest] = useState<PullRequestDetail>();
  const [pullRequestFiles, setPullRequestFiles] = useState<PullRequestFilesResponse>();
  const [sourceRetryKey, setSourceRetryKey] = useState(0);
  const navigate = useNavigate();
  const routeReference = pullRequestId ?? analysisId ?? "";
  const isPullRequestRoute = pullRequestId !== undefined;
  const isAnalysisRoute = analysisId !== undefined;
  const validPullRequestId = pullRequestId && /^\d+$/.test(pullRequestId) && Number(pullRequestId) > 0
    ? pullRequestId
    : undefined;

  useEffect(() => {
    if (!isPullRequestRoute) return;

    if (!validPullRequestId) {
      setSourceState("invalid");
      setPullRequest(undefined);
      setPullRequestFiles(undefined);
      return;
    }

    const controller = new AbortController();
    setSourceState("loading");
    setSourceError("");

    void Promise.all([
      getPullRequest(projectId, validPullRequestId, controller.signal),
      getPullRequestFiles(projectId, validPullRequestId, controller.signal),
    ])
      .then(([detail, files]) => {
        if (controller.signal.aborted) return;
        setPullRequest(detail);
        setPullRequestFiles(files);
        setSourceState("success");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPullRequest(undefined);
        setPullRequestFiles(undefined);
        setSourceState(classifySourceError(error));
        setSourceError(getApiErrorMessage(error, "Pull Request 원본 정보를 불러오지 못했습니다."));
      });

    return () => controller.abort();
  }, [isPullRequestRoute, projectId, sourceRetryKey, validPullRequestId]);

  const setViewState = (
    nextState: PullRequestReviewState,
    options?: { replace?: boolean },
  ) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      if (nextState === "review") nextParams.delete("state");
      else nextParams.set("state", nextState);
      return nextParams;
    }, { replace: options?.replace });
  };

  useEffect(() => {
    if (!analysisStartedLocally || viewState !== "analyzing") return;

    const timer = window.setTimeout(() => {
      setAnalysisStartedLocally(false);
      setViewState("review", { replace: true });
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [analysisStartedLocally, viewState]);

  const startAnalysis = () => {
    setFeedback("");
    setAnalysisStartedLocally(true);
    setViewState("analyzing", { replace: true });
  };

  const approveReview = () => {
    setFeedback("");
    setViewState("approved");
  };

  const saveDraft = () => {
    setFeedback("임시 저장이 완료되었습니다.");
  };

  const copyDraft = async () => {
    const { draft } = pullRequestReviewMock;
    const content = [
      `[${draft.recordType}] ${isPullRequestRoute ? pullRequest?.title ?? "Pull Request" : `AI 분석 #${analysisId ?? ""}`}`,
      draft.summary,
      draft.purpose,
      `변경 전: ${draft.before}`,
      `변경 후: ${draft.after}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(content);
      setFeedback("분석 초안 내용을 복사했습니다.");
    } catch {
      setFeedback("내용을 복사하지 못했습니다.");
    }
  };

  const toggleFollowUp = (id: string) => {
    setFollowUps((items) =>
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
  };

  const confirmDiscard = () => {
    setDiscardOpen(false);
    navigate(`/projects/${projectId}/github`);
  };

  if (isPullRequestRoute && (sourceState !== "success" || !pullRequest || !pullRequestFiles)) {
    return (
      <PullRequestSourceFeedback
        errorMessage={sourceError}
        onRetry={() => setSourceRetryKey((key) => key + 1)}
        projectId={projectId}
        state={sourceState === "success" ? "error" : sourceState}
      />
    );
  }

  return (
    <main className="pull-request-review" data-route-reference={routeReference}>
      <PageContainer size="full">
        <div className="pull-request-review__content">
          <ReviewHeader
            analysisId={isAnalysisRoute ? analysisId : undefined}
            onAnalyze={startAnalysis}
            onApprove={approveReview}
            pullRequest={isPullRequestRoute ? pullRequest : undefined}
            projectId={projectId}
            state={viewState}
          />

          {viewState === "review" ? (
            isPullRequestRoute && pullRequest && pullRequestFiles ? (
              <ReviewWorkspace
                files={pullRequestFiles}
                followUps={followUps}
                onToggleFollowUp={toggleFollowUp}
                pullRequest={pullRequest}
              />
            ) : (
              <DraftPanel followUps={followUps} onToggleFollowUp={toggleFollowUp} />
            )
          ) : (
            <ReviewStatePanel
              onAnalyze={startAnalysis}
              pullRequest={isPullRequestRoute ? pullRequest : undefined}
              projectId={projectId}
              state={viewState}
            />
          )}

          {viewState === "review" ? (
            <footer className="pull-request-review__footer-actions">
              <div>
                <Button onClick={() => setDiscardOpen(true)} variant="secondary">
                  폐기
                </Button>
                <Button onClick={saveDraft} variant="secondary">
                  임시 저장
                </Button>
              </div>
              <div>
                <Button onClick={copyDraft} variant="secondary">
                  내용 복사
                </Button>
                <Button onClick={approveReview}>승인 요청</Button>
              </div>
            </footer>
          ) : null}

          <p aria-live="polite" className="pull-request-review__feedback">
            {feedback}
          </p>
        </div>
      </PageContainer>

      <Modal
        description="현재 AI 분석 초안과 사람이 수정한 내용이 삭제됩니다. GitHub 원본 PR에는 영향을 주지 않습니다."
        onClose={() => setDiscardOpen(false)}
        open={discardOpen}
        title="AI 분석 결과를 폐기할까요?"
      >
        <div className="pull-request-review__discard-dialog">
          <aside>
            <strong>폐기 후 되돌릴 수 없습니다.</strong>
            <span>다시 분석하면 새로운 초안이 생성됩니다.</span>
          </aside>
          <div>
            <Button onClick={() => setDiscardOpen(false)} variant="secondary">
              취소
            </Button>
            <Button onClick={confirmDiscard} variant="danger">
              분석 결과 폐기
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

type ReviewHeaderProps = {
  state: PullRequestReviewState;
  projectId: string;
  analysisId?: string;
  pullRequest?: PullRequestDetail;
  onAnalyze: () => void;
  onApprove: () => void;
};

function ReviewHeader({ state, projectId, analysisId, pullRequest, onAnalyze, onApprove }: ReviewHeaderProps) {
  const status = stateCopy[state];

  return (
    <header className="pull-request-review__header">
      <div className="pull-request-review__header-copy">
        <div>
          <h1>{pullRequest ? `PR #${pullRequest.prNumber} ${pullRequest.title}` : `AI 분석 #${analysisId ?? ""}`}</h1>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        {pullRequest ? (
          <p>
            작성자 {pullRequest.authorLogin ?? "—"} · {formatPullRequestDate(pullRequest.createdAt)} · {getPullRequestStatus(pullRequest)} ·{" "}
            <span className="branch-name">{pullRequest.sourceBranch ?? "—"} → {pullRequest.targetBranch ?? "—"}</span>
          </p>
        ) : (
          <p>AI 분석 결과와 프로젝트 기록 초안을 검토합니다.</p>
        )}
      </div>
      <div className="pull-request-review__header-actions">
        {pullRequest ? (
          <a
            aria-label={`GitHub에서 Pull Request #${pullRequest.prNumber} 보기 (새 탭)`}
            className="ui-button ui-button--secondary ui-button--sm"
            href={pullRequest.htmlUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub에서 보기
          </a>
        ) : null}
        {state === "approved" ? (
          <Link
            className="ui-button ui-button--secondary ui-button--sm"
            to={`/projects/${projectId}/records`}
          >
            메모리 보기
          </Link>
        ) : (
          <Button disabled={state === "analyzing"} onClick={onAnalyze} size="sm" variant={state === "failed" ? "primary" : "secondary"}>
            AI 재분석
          </Button>
        )}
        <Button disabled={state !== "review"} onClick={onApprove} size="sm">
          {state === "approved" ? "승인 완료" : "승인 요청"}
        </Button>
      </div>
    </header>
  );
}

type ReviewWorkspaceProps = {
  followUps: ReviewFollowUp[];
  onToggleFollowUp: (id: string) => void;
};

type ReviewWorkspaceDataProps = ReviewWorkspaceProps & {
  pullRequest: PullRequestDetail;
  files: PullRequestFilesResponse;
};

function ReviewWorkspace({ files, followUps, onToggleFollowUp, pullRequest }: ReviewWorkspaceDataProps) {
  return (
    <div className="pull-request-review__columns">
      <GitHubSourcePanel files={files} pullRequest={pullRequest} />
      <DraftPanel followUps={followUps} onToggleFollowUp={onToggleFollowUp} />
    </div>
  );
}

function getDiffLineClass(line: string) {
  if (line.startsWith("+") && !line.startsWith("+++")) return "added";
  if (line.startsWith("-") && !line.startsWith("---")) return "removed";
  return "context";
}

const DEFAULT_VISIBLE_FILES = 10;
const FILE_LOAD_STEP = 10;

function GitHubSourcePanel({
  pullRequest,
  files,
}: {
  pullRequest: PullRequestDetail;
  files: PullRequestFilesResponse;
}) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(() => new Set());
  const [fullyExpandedDiffs, setFullyExpandedDiffs] = useState<Set<string>>(() => new Set());
  const [visibleFileCount, setVisibleFileCount] = useState(DEFAULT_VISIBLE_FILES);
  const visibleFiles = files.files.slice(0, visibleFileCount);
  const remainingFileCount = Math.max(files.files.length - visibleFiles.length, 0);

  const toggleFile = (filename: string) => {
    const closing = expandedFiles.has(filename);
    setExpandedFiles((current) => {
      const next = new Set(current);
      if (closing) next.delete(filename);
      else next.add(filename);
      return next;
    });

    if (closing) {
      setFullyExpandedDiffs((current) => {
        const next = new Set(current);
        next.delete(filename);
        return next;
      });
    }
  };

  const toggleFullDiff = (filename: string) => {
    setFullyExpandedDiffs((current) => {
      const next = new Set(current);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  };

  const showMoreFiles = () => {
    setVisibleFileCount((current) => Math.min(current + FILE_LOAD_STEP, files.files.length));
  };

  const collapseFileList = () => {
    const hiddenFilenames = new Set(
      files.files.slice(DEFAULT_VISIBLE_FILES).map((file) => file.filename),
    );
    const removeHiddenFiles = (current: Set<string>) => new Set(
      [...current].filter((filename) => !hiddenFilenames.has(filename)),
    );

    setExpandedFiles(removeHiddenFiles);
    setFullyExpandedDiffs(removeHiddenFiles);
    setVisibleFileCount(DEFAULT_VISIBLE_FILES);
  };

  return (
    <section className="pull-request-review__panel pull-request-review__source" aria-labelledby="github-source-title">
      <div className="pull-request-review__source-tabs">
        <strong id="github-source-title">GitHub 원본</strong>
        <span>커밋 {pullRequest.commits ?? "—"}</span>
      </div>

      <div className="pull-request-review__summary">
        <h2>PR 설명</h2>
        <p>{pullRequest.body?.trim() || "PR 설명이 없습니다."}</p>
      </div>

      <section className="pull-request-review__files" aria-labelledby="changed-files-title">
        <header className="pull-request-review__files-header">
          <h2 id="changed-files-title">변경된 파일</h2>
          <div aria-label={`${files.totalFiles}개 파일 변경, ${files.totalAdditions}줄 추가, ${files.totalDeletions}줄 삭제`}>
            <span>{files.totalFiles} files changed</span>
            <b>+{files.totalAdditions}</b>
            <i>-{files.totalDeletions}</i>
          </div>
        </header>
        <ul>
          {visibleFiles.map((file, index) => {
            const isExpanded = expandedFiles.has(file.filename);
            const isFullyExpanded = fullyExpandedDiffs.has(file.filename);
            const diffLines = isExpanded ? file.patch?.split(/\r?\n/) ?? [] : [];
            const hasLongDiff = diffLines.length > 12;
            const buttonId = `pull-request-file-${index}`;
            const panelId = `pull-request-file-diff-${index}`;

            return (
              <li className="pull-request-review__file" key={file.filename}>
                <button
                  aria-controls={panelId}
                  aria-expanded={isExpanded}
                  className="pull-request-review__file-toggle"
                  id={buttonId}
                  onClick={() => toggleFile(file.filename)}
                  type="button"
                >
                  <span className="pull-request-review__file-name">
                    <code>{file.filename}</code>
                    {file.previousFilename ? <small>이전 경로 · {file.previousFilename}</small> : null}
                  </span>
                  <span className="pull-request-review__file-meta">
                    <em>{file.status}</em>
                    <b>+{file.additions ?? "—"}</b>
                    <i>-{file.deletions ?? "—"}</i>
                    <span aria-hidden="true" className="pull-request-review__file-chevron">
                      {isExpanded ? "▴" : "▾"}
                    </span>
                  </span>
                </button>

                {isExpanded ? (
                  <div
                    aria-labelledby={buttonId}
                    className="pull-request-review__file-diff"
                    id={panelId}
                    role="region"
                  >
                    {hasLongDiff ? (
                      <button
                        aria-expanded={isFullyExpanded}
                        className="pull-request-review__diff-toggle"
                        onClick={() => toggleFullDiff(file.filename)}
                        type="button"
                      >
                        {isFullyExpanded ? "접기" : "더 보기"}
                      </button>
                    ) : null}

                    {diffLines.length > 0 ? (
                      <div
                        className={[
                          "pull-request-review__diff-code",
                          isFullyExpanded ? "pull-request-review__diff-code--expanded" : "",
                        ].filter(Boolean).join(" ")}
                      >
                        {diffLines.map((line, lineIndex) => (
                          <div
                            className={`pull-request-review__diff-line pull-request-review__diff-line--${getDiffLineClass(line)}`}
                            key={`${lineIndex}-${line}`}
                          >
                            <code>{line || " "}</code>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="pull-request-review__diff-empty">
                        GitHub에서 이 파일의 diff를 제공하지 않습니다.
                      </p>
                    )}

                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {remainingFileCount > 0 || visibleFileCount > DEFAULT_VISIBLE_FILES ? (
          <div className="pull-request-review__file-list-controls">
            {remainingFileCount > 0 ? (
              <Button onClick={showMoreFiles} size="sm" variant="secondary">
                더 보기 ({remainingFileCount}개 남음)
              </Button>
            ) : null}
            {visibleFileCount > DEFAULT_VISIBLE_FILES ? (
              <Button onClick={collapseFileList} size="sm" variant="ghost">
                접기
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
    </section>
  );
}

function DraftPanel({ followUps, onToggleFollowUp }: ReviewWorkspaceProps) {
  const { draft } = pullRequestReviewMock;

  return (
    <section className="pull-request-review__panel pull-request-review__draft" aria-labelledby="draft-title">
      <header>
        <h2 id="draft-title">프로젝트 기록 초안 (AI 분석 결과)</h2>
        <Badge variant="success">{draft.version}</Badge>
      </header>

      <div className="pull-request-review__draft-grid">
        <div className="pull-request-review__draft-column">
          <DraftSection number="1" title="기록 유형">
            <Badge variant="info">{draft.recordType}</Badge>
          </DraftSection>
          <DraftSection number="2" title="작업 요약"><p>{draft.summary}</p></DraftSection>
          <DraftSection number="3" title="작업 목적"><p>{draft.purpose}</p></DraftSection>
          <DraftSection number="4" title="변경 전 / 변경 후">
            <div className="pull-request-review__before-after">
              <div><strong>변경 전</strong><span>{draft.before}</span></div>
              <div><strong>변경 후</strong><span>{draft.after}</span></div>
            </div>
          </DraftSection>
          <DraftSection number="5" title="관련 기능">
            <div className="pull-request-review__tags">
              {draft.featureTags.map((tag) => <Badge key={tag} variant="success">{tag}</Badge>)}
            </div>
          </DraftSection>
        </div>

        <div className="pull-request-review__draft-column">
          <DraftSection number="6" title="역할별 영향">
            <div className="pull-request-review__impacts">
              {draft.impacts.map((impact) => (
                <article key={impact.role}>
                  <Badge variant={impact.variant}>{impact.role}</Badge>
                  <p>{impact.description}</p>
                </article>
              ))}
            </div>
          </DraftSection>
          <DraftSection number="7" title="후속 작업">
            <div className="pull-request-review__follow-ups">
              {followUps.map((item) => (
                <button
                  aria-label={`${item.label} ${item.completed ? "완료 해제" : "완료 처리"}`}
                  aria-pressed={item.completed}
                  key={item.id}
                  onClick={() => onToggleFollowUp(item.id)}
                  type="button"
                >
                  <span aria-hidden="true">{item.completed ? "☑" : "☐"}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </DraftSection>
        </div>
      </div>

      <div className="pull-request-review__draft-bottom">
        <aside className="pull-request-review__checks">
          <h3>확인 필요 사항</h3>
          <ul>{draft.checks.map((check) => <li key={check}>{check}</li>)}</ul>
        </aside>
        <aside className="pull-request-review__evidence">
          <h3>분석 근거</h3>
          <dl>
            {draft.evidence.map((item) => (
              <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}

function DraftSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="pull-request-review__draft-section">
      <h3>{number}. {title}</h3>
      {children}
    </section>
  );
}

type ReviewStatePanelProps = {
  state: Exclude<PullRequestReviewState, "review">;
  projectId: string;
  onAnalyze: () => void;
  pullRequest?: PullRequestDetail;
};

function ReviewStatePanel({ state, projectId, onAnalyze, pullRequest }: ReviewStatePanelProps) {
  const { analysisStages, approval, draft, failure } = pullRequestReviewMock;

  if (state === "analyzing") {
    return (
      <section aria-labelledby="analysis-state-title" aria-live="polite" className="pull-request-review__state-panel" role="status">
        <div aria-hidden="true" className="pull-request-review__state-icon pull-request-review__state-icon--progress">○</div>
        <h2 id="analysis-state-title">AI가 PR을 분석하고 있어요</h2>
        <p>PR 본문, 코드 diff와 프로젝트 정보를 함께 확인하고 있습니다.</p>
        <ol className="pull-request-review__stages">
          {analysisStages.map((stage) => (
            <li className={stage.completed ? "pull-request-review__stage--complete" : ""} key={stage.label}>
              <span aria-hidden="true">{stage.completed ? "✓" : "○"}</span>
              {stage.label}
            </li>
          ))}
        </ol>
        <p className="pull-request-review__state-hint">분석 중에는 페이지를 나가도 작업이 계속됩니다.</p>
      </section>
    );
  }

  if (state === "failed") {
    return (
      <section aria-labelledby="analysis-state-title" className="pull-request-review__state-panel" role="alert">
        <div aria-hidden="true" className="pull-request-review__state-icon pull-request-review__state-icon--failed">!</div>
        <h2 id="analysis-state-title">AI 분석에 실패했어요</h2>
        <p>분석 중 오류가 발생했습니다. 원본 PR은 그대로 유지되며 다시 시도할 수 있습니다.</p>
        <aside className="pull-request-review__failure-detail">
          <strong>오류 코드 · {failure.code}</strong>
          <span>{failure.description}</span>
        </aside>
        <div className="pull-request-review__state-actions">
          <Button onClick={onAnalyze}>AI 재분석</Button>
          {pullRequest ? (
            <a
              aria-label={`GitHub에서 Pull Request #${pullRequest.prNumber} 보기 (새 탭)`}
              className="ui-button ui-button--secondary ui-button--md"
              href={pullRequest.htmlUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub에서 보기
            </a>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="analysis-state-title" className="pull-request-review__state-panel">
      <div aria-hidden="true" className="pull-request-review__state-icon pull-request-review__state-icon--approved">✓</div>
      <h2 id="analysis-state-title">프로젝트 기록이 승인됐어요</h2>
      <p>검토한 내용이 공식 프로젝트 메모리에 저장되었습니다.</p>
      <article className="pull-request-review__approved-summary">
        <h3>{pullRequest?.title ?? draft.summary}</h3>
        <p>승인자 · {approval.approver} · {approval.approvedAt}</p>
        <p>영향 역할 · {draft.impacts.map((impact) => impact.role).join(" / ")}</p>
      </article>
      <div className="pull-request-review__state-actions">
        <Link className="ui-button ui-button--primary ui-button--md" to={`/projects/${projectId}/records`}>
          프로젝트 메모리에서 보기
        </Link>
        <Link className="ui-button ui-button--secondary ui-button--md" to={`/projects/${projectId}/github`}>
          GitHub 작업 목록
        </Link>
      </div>
    </section>
  );
}
