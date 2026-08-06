import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageContainer } from "../../shared/layouts";
import { Badge, Button, Modal } from "../../shared/ui";
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
  const navigate = useNavigate();
  const routeReference = pullRequestId ?? analysisId ?? String(pullRequestReviewMock.pullRequest.number);

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
      `[${draft.recordType}] ${pullRequestReviewMock.pullRequest.title}`,
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

  return (
    <main className="pull-request-review" data-route-reference={routeReference}>
      <PageContainer size="full">
        <div className="pull-request-review__content">
          <ReviewHeader
            onAnalyze={startAnalysis}
            onApprove={approveReview}
            projectId={projectId}
            state={viewState}
          />

          {viewState === "review" ? (
            <ReviewWorkspace followUps={followUps} onToggleFollowUp={toggleFollowUp} />
          ) : (
            <ReviewStatePanel
              onAnalyze={startAnalysis}
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
  onAnalyze: () => void;
  onApprove: () => void;
};

function ReviewHeader({ state, projectId, onAnalyze, onApprove }: ReviewHeaderProps) {
  const { pullRequest } = pullRequestReviewMock;
  const status = stateCopy[state];

  return (
    <header className="pull-request-review__header">
      <div className="pull-request-review__header-copy">
        <div>
          <h1>PR #{pullRequest.number} {pullRequest.title}</h1>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p>
          작성자 {pullRequest.author} · {pullRequest.createdAt} · {pullRequest.githubStatus} ·{" "}
          <span className="branch-name">{pullRequest.headBranch} → {pullRequest.baseBranch}</span>
        </p>
      </div>
      <div className="pull-request-review__header-actions">
        <a
          aria-label={`GitHub에서 Pull Request #${pullRequest.number} 보기 (새 탭)`}
          className="ui-button ui-button--secondary ui-button--sm"
          href={pullRequest.githubUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub에서 보기
        </a>
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

function ReviewWorkspace({ followUps, onToggleFollowUp }: ReviewWorkspaceProps) {
  return (
    <div className="pull-request-review__columns">
      <GitHubSourcePanel />
      <DraftPanel followUps={followUps} onToggleFollowUp={onToggleFollowUp} />
    </div>
  );
}

function GitHubSourcePanel() {
  const { pullRequest, files, diff } = pullRequestReviewMock;

  return (
    <section className="pull-request-review__panel pull-request-review__source" aria-labelledby="github-source-title">
      <div className="pull-request-review__source-tabs">
        <strong id="github-source-title">GitHub 원본</strong>
        <span>파일 변경 {files.length}</span>
        <span>커밋 {pullRequest.commitCount}</span>
        <span>관련 이슈 {pullRequest.relatedIssueCount}</span>
      </div>

      <div className="pull-request-review__summary">
        <h2>PR 설명</h2>
        <p>{pullRequest.description}</p>
      </div>

      <section className="pull-request-review__files" aria-labelledby="changed-files-title">
        <h2 id="changed-files-title">변경된 파일 ({files.length})</h2>
        <ul>
          {files.slice(0, 4).map((file) => (
            <li key={file.path}>
              <code>{file.path}</code>
              <span><b>+{file.additions}</b> <i>-{file.deletions}</i></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="pull-request-review__diff" aria-labelledby="diff-title">
        <h2 id="diff-title">Diff 미리보기 · <code>{diff.path}</code></h2>
        <div className="pull-request-review__diff-code">
          {diff.lines.map((line) => (
            <div
              className={`pull-request-review__diff-line pull-request-review__diff-line--${line.marker === "+" ? "added" : line.marker === "-" ? "removed" : "context"}`}
              key={`${line.lineNumber}-${line.marker}`}
            >
              <code>{line.lineNumber} {line.marker} {line.content}</code>
            </div>
          ))}
        </div>
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
};

function ReviewStatePanel({ state, projectId, onAnalyze }: ReviewStatePanelProps) {
  const { analysisStages, approval, draft, failure, pullRequest } = pullRequestReviewMock;

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
          <a
            aria-label={`GitHub에서 Pull Request #${pullRequest.number} 보기 (새 탭)`}
            className="ui-button ui-button--secondary ui-button--md"
            href={pullRequest.githubUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub에서 보기
          </a>
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
        <h3>{pullRequest.title}</h3>
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
