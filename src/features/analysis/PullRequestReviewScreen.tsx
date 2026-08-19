import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../shared/api/client";
import { PageContainer } from "../../shared/layouts";
import { Badge, Button, EmptyState, ErrorState, LoadingState, Modal } from "../../shared/ui";
import {
  cancelAnalysis,
  getAnalysis,
  getAnalysisApiErrorCode,
  getLatestAnalysisByPrNumber,
  isActiveAnalysisStatus,
  parseAnalysisResult,
  requestAnalysis,
  retryAnalysis,
  type AnalysisDetail,
  type AnalysisResult,
  type AnalysisStatus,
} from "./analysisApi";
import {
  getPullRequest,
  getPullRequestApiErrorCode,
  getPullRequestFiles,
  type PullRequestDetail,
  type PullRequestFilesResponse,
} from "../github/pullRequestApi";
import {
  pullRequestReviewMock,
  type ReviewFollowUp,
} from "./pullRequestReviewMock";
import "./PullRequestReviewScreen.css";

const POLLING_INTERVAL_MS = 2000;
const DEFAULT_VISIBLE_ANALYSIS_CHANGES = 8;

const analysisStatusCopy: Record<
  AnalysisStatus,
  { label: string; variant: "warning" | "info" | "danger" | "success" }
> = {
  PENDING: { label: "분석 대기", variant: "warning" },
  PROCESSING: { label: "분석 중", variant: "info" },
  COMPLETED: { label: "분석 완료", variant: "success" },
  FAILED: { label: "분석 실패", variant: "danger" },
  CANCELED: { label: "분석 취소", variant: "warning" },
};

type PullRequestSourceState =
  | "loading"
  | "success"
  | "invalid"
  | "not-found"
  | "no-repository"
  | "github-connection-required"
  | "error";

type AnalysisLoadState = "loading" | "success" | "invalid" | "not-found" | "error";

type AnalysisRestoreState = "idle" | "loading" | "ready" | "error";

function classifySourceError(error: unknown): PullRequestSourceState {
  const code = getPullRequestApiErrorCode(error);
  if (code === "PROJECT_REPOSITORY_4041") return "no-repository";
  if (["GITHUB_4011", "GITHUB_4012", "GITHUB_4013"].includes(code ?? "")) {
    return "github-connection-required";
  }
  if (code === "GITHUB_4041") return "not-found";
  return "error";
}

function getAnalysisFeedbackMessage(error: unknown, fallback: string) {
  const code = getAnalysisApiErrorCode(error);
  if (code === "AI_ANALYSIS_4041") return "요청한 AI 분석을 찾을 수 없습니다.";
  if (code === "AI_ANALYSIS_4001") return "분석을 요청할 수 없는 상태입니다.";
  if (code === "AI_ANALYSIS_4031") return "이 분석에 접근할 권한이 없습니다.";
  if (code === "AI_ANALYSIS_5031") return "AI 분석 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.";
  return getApiErrorMessage(error, fallback);
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

function AnalysisFeedback({
  state,
  projectId,
  errorMessage,
  onRetry,
}: {
  state: Exclude<AnalysisLoadState, "success">;
  projectId: string;
  errorMessage: string;
  onRetry: () => void;
}) {
  let content: React.ReactNode;

  if (state === "loading") {
    content = (
      <LoadingState
        description="AI 분석 상태와 연결된 Pull Request를 확인하고 있습니다."
        title="AI 분석을 불러오는 중입니다"
      />
    );
  } else if (state === "invalid") {
    content = (
      <EmptyState
        description="유효한 분석 ID가 필요합니다."
        details={(
          <Link className="ui-button ui-button--secondary ui-button--md" to={`/projects/${projectId}/github`}>
            GitHub 작업 목록
          </Link>
        )}
        title="분석을 찾을 수 없습니다"
      />
    );
  } else if (state === "not-found") {
    content = (
      <EmptyState
        description="요청한 AI 분석이 존재하지 않거나 삭제되었습니다."
        details={(
          <Link className="ui-button ui-button--secondary ui-button--md" to={`/projects/${projectId}/github`}>
            GitHub 작업 목록
          </Link>
        )}
        title="AI 분석을 찾을 수 없습니다"
      />
    );
  } else {
    content = (
      <ErrorState
        action={{ label: "다시 시도", onClick: onRetry }}
        description={errorMessage || "잠시 후 다시 시도해주세요."}
        title="AI 분석을 불러오지 못했습니다"
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
  const isApprovedView = queryState === "approved";
  const [discardOpen, setDiscardOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [analysisRequesting, setAnalysisRequesting] = useState(false);
  const [analysisActionPending, setAnalysisActionPending] = useState(false);
  const [followUps, setFollowUps] = useState<ReviewFollowUp[]>(
    pullRequestReviewMock.draft.followUps,
  );
  const [sourceState, setSourceState] = useState<PullRequestSourceState>("loading");
  const [sourceError, setSourceError] = useState("");
  const [pullRequest, setPullRequest] = useState<PullRequestDetail>();
  const [pullRequestFiles, setPullRequestFiles] = useState<PullRequestFilesResponse>();
  const [sourceRetryKey, setSourceRetryKey] = useState(0);
  const [analysisRestoreState, setAnalysisRestoreState] = useState<AnalysisRestoreState>("idle");
  const [analysisRestoreError, setAnalysisRestoreError] = useState("");
  const [analysisRestoreRetryKey, setAnalysisRestoreRetryKey] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisDetail>();
  const [analysisLoadState, setAnalysisLoadState] = useState<AnalysisLoadState>("loading");
  const [analysisError, setAnalysisError] = useState("");
  const [analysisRetryKey, setAnalysisRetryKey] = useState(0);
  const navigate = useNavigate();
  const routeReference = pullRequestId ?? analysisId ?? "";
  const isPullRequestRoute = pullRequestId !== undefined;
  const isAnalysisRoute = analysisId !== undefined;
  const validPullRequestId = pullRequestId && /^\d+$/.test(pullRequestId) && Number(pullRequestId) > 0
    ? pullRequestId
    : undefined;
  const validAnalysisId = analysisId && /^\d+$/.test(analysisId) && Number(analysisId) > 0
    ? analysisId
    : undefined;
  const analysisPrNumber = analysis?.prNumber;
  const parsedAnalysisResult = analysis?.analysisResult
    ? parseAnalysisResult(analysis.analysisResult)
    : null;
  const analysisStatus = analysis?.analysisStatus;
  const isAnalysisInProgress = analysisStatus ? isActiveAnalysisStatus(analysisStatus) : false;
  const canShowCompletedWorkspace = isAnalysisRoute
    && analysisStatus === "COMPLETED"
    && !isApprovedView;

  useEffect(() => {
    if (!isPullRequestRoute) return;

    if (!validPullRequestId) {
      setSourceState("invalid");
      setPullRequest(undefined);
      setPullRequestFiles(undefined);
      setAnalysisRestoreState("idle");
      setAnalysisRestoreError("");
      return;
    }

    const controller = new AbortController();
    setSourceState("loading");
    setSourceError("");
    setAnalysisRestoreState("idle");
    setAnalysisRestoreError("");

    void Promise.all([
      getPullRequest(projectId, validPullRequestId, controller.signal),
      getPullRequestFiles(projectId, validPullRequestId, controller.signal),
    ])
      .then(([detail, files]) => {
        if (controller.signal.aborted) return;
        setPullRequest(detail);
        setPullRequestFiles(files);
        setSourceState("success");
        setAnalysisRestoreState("loading");
        setAnalysisRestoreError("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPullRequest(undefined);
        setPullRequestFiles(undefined);
        setSourceState(classifySourceError(error));
        setSourceError(getApiErrorMessage(error, "Pull Request 원본 정보를 불러오지 못했습니다."));
        setAnalysisRestoreState("idle");
        setAnalysisRestoreError("");
      });

    return () => controller.abort();
  }, [isPullRequestRoute, projectId, sourceRetryKey, validPullRequestId]);

  useEffect(() => {
    if (!isPullRequestRoute) return;
    if (sourceState !== "success" || !pullRequest) return;

    const controller = new AbortController();
    setAnalysisRestoreState("loading");
    setAnalysisRestoreError("");

    void getLatestAnalysisByPrNumber(projectId, pullRequest.prNumber, controller.signal)
      .then((latestAnalysis) => {
        if (controller.signal.aborted) return;

        if (latestAnalysis?.analysisId) {
          navigate(
            `/projects/${projectId}/analyses/${latestAnalysis.analysisId}`,
            { replace: true },
          );
          return;
        }

        setAnalysisRestoreState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAnalysisRestoreState("error");
        setAnalysisRestoreError(
          getAnalysisFeedbackMessage(error, "기존 AI 분석을 확인하지 못했습니다."),
        );
      });

    return () => controller.abort();
  }, [
    analysisRestoreRetryKey,
    isPullRequestRoute,
    navigate,
    projectId,
    pullRequest,
    sourceState,
  ]);

  useEffect(() => {
    if (!isAnalysisRoute) return;

    if (!validAnalysisId) {
      setAnalysisLoadState("invalid");
      setAnalysis(undefined);
      return;
    }

    let cancelled = false;
    let pollTimer: number | undefined;
    let requestController: AbortController | undefined;
    let requestGeneration = 0;

    const clearPollTimer = () => {
      if (pollTimer !== undefined) {
        window.clearTimeout(pollTimer);
        pollTimer = undefined;
      }
    };

    const schedulePoll = () => {
      clearPollTimer();
      pollTimer = window.setTimeout(() => {
        void loadAnalysis({ isPoll: true });
      }, POLLING_INTERVAL_MS);
    };

    const loadAnalysis = async ({ isPoll = false }: { isPoll?: boolean } = {}) => {
      requestController?.abort();
      requestController = new AbortController();
      const currentGeneration = ++requestGeneration;
      const signal = requestController.signal;

      if (!isPoll) {
        setAnalysisLoadState("loading");
        setAnalysisError("");
      }

      try {
        const detail = await getAnalysis(projectId, validAnalysisId, signal);
        if (cancelled || signal.aborted || currentGeneration !== requestGeneration) return;

        setAnalysis(detail);
        setAnalysisLoadState("success");

        if (isActiveAnalysisStatus(detail.analysisStatus)) {
          schedulePoll();
        } else {
          clearPollTimer();
        }
      } catch (error: unknown) {
        if (cancelled || signal.aborted || currentGeneration !== requestGeneration) return;

        setAnalysis(undefined);
        const code = getAnalysisApiErrorCode(error);
        setAnalysisLoadState(code === "AI_ANALYSIS_4041" ? "not-found" : "error");
        setAnalysisError(getAnalysisFeedbackMessage(error, "분석 정보를 불러오지 못했습니다."));
        clearPollTimer();
      }
    };

    void loadAnalysis();

    return () => {
      cancelled = true;
      clearPollTimer();
      requestController?.abort();
    };
  }, [analysisRetryKey, isAnalysisRoute, projectId, validAnalysisId]);

  useEffect(() => {
    if (!isAnalysisRoute || !analysisPrNumber) return;

    const controller = new AbortController();
    setSourceState("loading");
    setSourceError("");

    void Promise.all([
      getPullRequest(projectId, analysisPrNumber, controller.signal),
      getPullRequestFiles(projectId, analysisPrNumber, controller.signal),
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
  }, [analysisPrNumber, isAnalysisRoute, projectId, sourceRetryKey]);

  const setApprovedView = (options?: { replace?: boolean }) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set("state", "approved");
      return nextParams;
    }, { replace: options?.replace });
  };

  const requestNewAnalysis = async (prNumber: number) => {
    if (analysisRequesting) return;

    setAnalysisRequesting(true);
    setFeedback("");

    try {
      const response = await requestAnalysis(projectId, prNumber);
      navigate(`/projects/${projectId}/analyses/${response.analysisId}`);
    } catch (error: unknown) {
      setFeedback(getAnalysisFeedbackMessage(error, "AI 분석을 요청하지 못했습니다."));
    } finally {
      setAnalysisRequesting(false);
    }
  };

  const startAnalysis = () => {
    const prNumber = pullRequest?.prNumber;
    if (!prNumber) return;
    void requestNewAnalysis(prNumber);
  };

  const retryFailedAnalysis = async () => {
    if (!validAnalysisId || analysisActionPending) return;

    setAnalysisActionPending(true);
    setFeedback("");

    try {
      const response = await retryAnalysis(projectId, validAnalysisId);
      navigate(`/projects/${projectId}/analyses/${response.newAnalysisId}`);
    } catch (error: unknown) {
      setFeedback(getAnalysisFeedbackMessage(error, "분석 재시도에 실패했습니다."));
    } finally {
      setAnalysisActionPending(false);
    }
  };

  const cancelInProgressAnalysis = async () => {
    if (!validAnalysisId || analysisActionPending) return;

    setAnalysisActionPending(true);
    setFeedback("");

    try {
      const response = await cancelAnalysis(projectId, validAnalysisId);
      setAnalysis((current) => (
        current
          ? { ...current, analysisStatus: response.analysisStatus }
          : current
      ));
    } catch (error: unknown) {
      setFeedback(getAnalysisFeedbackMessage(error, "분석 취소에 실패했습니다."));
    } finally {
      setAnalysisActionPending(false);
    }
  };

  const approveReview = () => {
    setFeedback("");
    setApprovedView();
  };

  const saveDraft = () => {
    setFeedback("임시 저장이 완료되었습니다.");
  };

  const copyDraft = async () => {
    const title = pullRequest
      ? `PR #${pullRequest.prNumber} ${pullRequest.title}`
      : `AI 분석 #${analysisId ?? ""}`;

    let content = title;

    if (parsedAnalysisResult) {
      content = [
        title,
        parsedAnalysisResult.summary,
        ...parsedAnalysisResult.changes.map((change) => `${change.filePath}: ${change.description}`),
        ...parsedAnalysisResult.impacts.map((impact) => `영향: ${impact}`),
        ...parsedAnalysisResult.risks.map((risk) => `리스크: ${risk}`),
        ...parsedAnalysisResult.recommendations.map((item) => `권장: ${item}`),
      ].join("\n");
    }

    try {
      await navigator.clipboard.writeText(content);
      setFeedback(parsedAnalysisResult ? "분석 결과를 복사했습니다." : "내용을 복사했습니다.");
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

  if (isAnalysisRoute) {
    if (!validAnalysisId || analysisLoadState !== "success") {
      return (
        <AnalysisFeedback
          errorMessage={analysisError}
          onRetry={() => setAnalysisRetryKey((key) => key + 1)}
          projectId={projectId}
          state={analysisLoadState === "success" ? "loading" : analysisLoadState}
        />
      );
    }

    if (sourceState !== "success" || !pullRequest || !pullRequestFiles || !analysis) {
      return (
        <PullRequestSourceFeedback
          errorMessage={sourceError}
          onRetry={() => setSourceRetryKey((key) => key + 1)}
          projectId={projectId}
          state={sourceState === "success" ? "loading" : sourceState}
        />
      );
    }
  }

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

  const showFooterActions = canShowCompletedWorkspace && !isApprovedView;

  return (
    <main className="pull-request-review" data-route-reference={routeReference}>
      <PageContainer size="full">
        <div className="pull-request-review__content">
          <ReviewHeader
            analysisId={isAnalysisRoute ? analysisId : undefined}
            analysisRequesting={analysisRequesting}
            analysisStatus={isAnalysisRoute ? analysis?.analysisStatus : undefined}
            isApprovedView={isApprovedView}
            canRequestAnalysis={!isPullRequestRoute || analysisRestoreState === "ready"}
            onAnalyze={startAnalysis}
            onApprove={approveReview}
            pullRequest={pullRequest}
            projectId={projectId}
          />

          {isApprovedView ? (
            <ApprovedPanel
              analysisResult={parsedAnalysisResult}
              projectId={projectId}
              pullRequest={pullRequest}
            />
          ) : isAnalysisRoute && analysisStatus === "FAILED" ? (
            <AnalysisFailedPanel
              actionPending={analysisActionPending}
              errorMessage={analysis?.errorMessage}
              onRetry={retryFailedAnalysis}
              pullRequest={pullRequest}
            />
          ) : isAnalysisRoute && analysisStatus === "CANCELED" ? (
            <AnalysisCanceledPanel
              onAnalyze={startAnalysis}
              projectId={projectId}
              pullRequest={pullRequest}
            />
          ) : isAnalysisRoute && isAnalysisInProgress ? (
            <AnalysisInProgressPanel
              actionPending={analysisActionPending}
              analysisStatus={analysisStatus!}
              onCancel={cancelInProgressAnalysis}
            />
          ) : canShowCompletedWorkspace && pullRequest && pullRequestFiles ? (
            <ReviewWorkspace
              analysisResult={parsedAnalysisResult}
              files={pullRequestFiles}
              followUps={followUps}
              onToggleFollowUp={toggleFollowUp}
              pullRequest={pullRequest}
            />
          ) : isPullRequestRoute && pullRequest && pullRequestFiles ? (
            <div className="pull-request-review__columns">
              <GitHubSourcePanel files={pullRequestFiles} pullRequest={pullRequest} />
              {analysisRestoreState === "error" ? (
                <AnalysisRestoreErrorPanel
                  errorMessage={analysisRestoreError}
                  onRetry={() => setAnalysisRestoreRetryKey((key) => key + 1)}
                />
              ) : analysisRestoreState === "ready" ? (
                <DraftPlaceholderPanel />
              ) : (
                <AnalysisRestoreLoadingPanel />
              )}
            </div>
          ) : null}

          {showFooterActions ? (
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
  projectId: string;
  analysisId?: string;
  analysisStatus?: AnalysisStatus;
  analysisRequesting: boolean;
  canRequestAnalysis?: boolean;
  isApprovedView: boolean;
  pullRequest?: PullRequestDetail;
  onAnalyze: () => void;
  onApprove: () => void;
};

function ReviewHeader({
  analysisId,
  analysisRequesting,
  analysisStatus,
  canRequestAnalysis = true,
  isApprovedView,
  onAnalyze,
  onApprove,
  projectId,
  pullRequest,
}: ReviewHeaderProps) {
  const status = isApprovedView
    ? { label: "승인 완료", variant: "success" as const }
    : analysisStatus
      ? analysisStatusCopy[analysisStatus]
      : { label: "검토 필요", variant: "warning" as const };
  const analyzeDisabled = analysisRequesting
    || !canRequestAnalysis
    || (analysisStatus ? isActiveAnalysisStatus(analysisStatus) : false);

  return (
    <header className="pull-request-review__header">
      <div className="pull-request-review__header-copy">
        <div>
          <h1>
            {pullRequest
              ? `PR #${pullRequest.prNumber} ${pullRequest.title}`
              : `AI 분석 #${analysisId ?? ""}`}
          </h1>
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
        {isApprovedView ? (
          <Link
            className="ui-button ui-button--secondary ui-button--sm"
            to={`/projects/${projectId}/records`}
          >
            메모리 보기
          </Link>
        ) : analysisStatus === "FAILED" ? null : (
          <Button
            disabled={analyzeDisabled || !pullRequest}
            onClick={onAnalyze}
            size="sm"
            variant={analysisStatus === "CANCELED" ? "primary" : "secondary"}
          >
            {analysisRequesting ? "분석 요청 중..." : "AI 재분석"}
          </Button>
        )}
        <Button disabled={!isApprovedView && analysisStatus !== "COMPLETED"} onClick={onApprove} size="sm">
          {isApprovedView ? "승인 완료" : "승인 요청"}
        </Button>
      </div>
    </header>
  );
}

type ReviewWorkspaceProps = {
  followUps: ReviewFollowUp[];
  onToggleFollowUp: (id: string) => void;
  analysisResult?: AnalysisResult | null;
};

type ReviewWorkspaceDataProps = ReviewWorkspaceProps & {
  pullRequest: PullRequestDetail;
  files: PullRequestFilesResponse;
};

function ReviewWorkspace({
  analysisResult,
  files,
  followUps,
  onToggleFollowUp,
  pullRequest,
}: ReviewWorkspaceDataProps) {
  return (
    <div className="pull-request-review__columns">
      <GitHubSourcePanel files={files} pullRequest={pullRequest} />
      {analysisResult ? (
        <AnalysisResultPanel
          analysisResult={analysisResult}
          followUps={followUps}
          onToggleFollowUp={onToggleFollowUp}
        />
      ) : (
        <DraftPlaceholderPanel />
      )}
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

function AnalysisRestoreLoadingPanel() {
  return (
    <section
      aria-labelledby="analysis-restore-title"
      aria-live="polite"
      className="pull-request-review__panel pull-request-review__draft"
      role="status"
    >
      <header>
        <h2 id="analysis-restore-title">프로젝트 기록 초안 (AI 분석 결과)</h2>
        <Badge variant="info">확인 중</Badge>
      </header>
      <div className="pull-request-review__draft-empty">
        <p>이 Pull Request의 기존 AI 분석을 확인하고 있습니다.</p>
      </div>
    </section>
  );
}

function AnalysisRestoreErrorPanel({
  errorMessage,
  onRetry,
}: {
  errorMessage: string;
  onRetry: () => void;
}) {
  return (
    <section
      aria-labelledby="analysis-restore-title"
      className="pull-request-review__panel pull-request-review__draft"
      role="alert"
    >
      <header>
        <h2 id="analysis-restore-title">프로젝트 기록 초안 (AI 분석 결과)</h2>
        <Badge variant="danger">조회 실패</Badge>
      </header>
      <div className="pull-request-review__draft-empty">
        <p>기존 AI 분석 이력을 불러오지 못했습니다. 새 분석을 요청하기 전에 다시 시도해주세요.</p>
        {errorMessage ? <p>{errorMessage}</p> : null}
        <Button onClick={onRetry} size="sm">다시 시도</Button>
      </div>
    </section>
  );
}

function DraftPlaceholderPanel() {
  return (
    <section className="pull-request-review__panel pull-request-review__draft" aria-labelledby="draft-title">
      <header>
        <h2 id="draft-title">프로젝트 기록 초안 (AI 분석 결과)</h2>
        <Badge variant="neutral">대기 중</Badge>
      </header>
      <div className="pull-request-review__draft-empty">
        <p>AI 분석을 실행하면 PR 변경 내용을 바탕으로 프로젝트 기록 초안이 생성됩니다.</p>
        <p>상단의 <strong>AI 재분석</strong> 버튼으로 분석을 시작할 수 있습니다.</p>
      </div>
    </section>
  );
}

function AnalysisResultPanel({
  analysisResult,
  followUps,
  onToggleFollowUp,
}: ReviewWorkspaceProps & { analysisResult: AnalysisResult }) {
  const { draft } = pullRequestReviewMock;
  const [showAllChanges, setShowAllChanges] = useState(false);
  const hiddenChangeCount = Math.max(
    analysisResult.changes.length - DEFAULT_VISIBLE_ANALYSIS_CHANGES,
    0,
  );
  const visibleChanges = showAllChanges || hiddenChangeCount === 0
    ? analysisResult.changes
    : analysisResult.changes.slice(0, DEFAULT_VISIBLE_ANALYSIS_CHANGES);

  return (
    <section
      aria-labelledby="analysis-result-title"
      className="pull-request-review__panel pull-request-review__draft pull-request-review__analysis-result"
    >
      <header className="pull-request-review__analysis-header">
        <div>
          <h2 id="analysis-result-title">AI 분석 결과</h2>
          <div className="pull-request-review__analysis-header-meta">
            <Badge variant="success">분석 완료</Badge>
            <Badge variant="info">{draft.recordType}</Badge>
          </div>
        </div>
      </header>

      <section
        aria-labelledby="analysis-summary-title"
        className="pull-request-review__analysis-summary"
      >
        <h3 id="analysis-summary-title">작업 요약</h3>
        <p>{analysisResult.summary || "요약 정보가 없습니다."}</p>
      </section>

      <section aria-label="분석 인사이트" className="pull-request-review__analysis-insights">
        <AnalysisInsightCard
          count={analysisResult.impacts.length}
          emptyText="영향 정보가 없습니다."
          items={analysisResult.impacts}
          title="영향"
          variant="impact"
        />
        <AnalysisInsightCard
          count={analysisResult.risks.length}
          emptyText="식별된 리스크가 없습니다."
          items={analysisResult.risks}
          title="리스크"
          variant="risk"
        />
        <AnalysisInsightCard
          count={analysisResult.recommendations.length}
          emptyText="권장 사항이 없습니다."
          items={analysisResult.recommendations}
          title="권장 사항"
          variant="recommendation"
        />
      </section>

      <section
        aria-labelledby="analysis-changes-title"
        className="pull-request-review__analysis-changes"
      >
        <div className="pull-request-review__analysis-section-heading">
          <h3 id="analysis-changes-title">변경 파일</h3>
          {analysisResult.changes.length > 0 ? (
            <span className="pull-request-review__analysis-count">
              {analysisResult.changes.length}개
            </span>
          ) : null}
        </div>

        {analysisResult.changes.length > 0 ? (
          <>
            <ul className="pull-request-review__analysis-change-list">
              {visibleChanges.map((change) => (
                <li key={`${change.filePath}-${change.description}`}>
                  <code>{change.filePath}</code>
                  <span>{change.description}</span>
                </li>
              ))}
            </ul>
            {hiddenChangeCount > 0 ? (
              <div className="pull-request-review__analysis-change-controls">
                {!showAllChanges ? (
                  <Button onClick={() => setShowAllChanges(true)} size="sm" variant="secondary">
                    전체 변경 파일 {analysisResult.changes.length}개 보기
                  </Button>
                ) : (
                  <Button onClick={() => setShowAllChanges(false)} size="sm" variant="ghost">
                    접기
                  </Button>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <p className="pull-request-review__analysis-empty">변경 파일 정보가 없습니다.</p>
        )}
      </section>

      <section
        aria-labelledby="analysis-follow-ups-title"
        className="pull-request-review__analysis-follow-ups"
      >
        <h3 id="analysis-follow-ups-title">후속 작업</h3>
        <p className="pull-request-review__analysis-follow-ups-note">
          프로젝트 기록 승인 전 로컬 체크리스트입니다.
        </p>
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
      </section>
    </section>
  );
}

function AnalysisInsightCard({
  count,
  emptyText,
  items,
  title,
  variant,
}: {
  count: number;
  emptyText: string;
  items: string[];
  title: string;
  variant: "impact" | "risk" | "recommendation";
}) {
  return (
    <article className={`pull-request-review__insight-card pull-request-review__insight-card--${variant}`}>
      <header className="pull-request-review__insight-card-header">
        <h4>{title}</h4>
        {count > 0 ? <Badge variant="neutral">{count}</Badge> : null}
      </header>
      {items.length > 0 ? (
        <ul className="pull-request-review__insight-list">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="pull-request-review__analysis-empty">{emptyText}</p>
      )}
    </article>
  );
}

function AnalysisInProgressPanel({
  analysisStatus,
  actionPending,
  onCancel,
}: {
  analysisStatus: AnalysisStatus;
  actionPending: boolean;
  onCancel: () => void;
}) {
  const statusLabel = analysisStatusCopy[analysisStatus].label;

  return (
    <section aria-labelledby="analysis-state-title" aria-live="polite" className="pull-request-review__state-panel" role="status">
      <div aria-hidden="true" className="pull-request-review__state-icon pull-request-review__state-icon--progress">○</div>
      <h2 id="analysis-state-title">AI가 PR을 분석하고 있어요</h2>
      <p>PR 본문, 코드 diff와 프로젝트 정보를 함께 확인하고 있습니다.</p>
      <p className="pull-request-review__state-status">현재 상태 · {statusLabel}</p>
      <p className="pull-request-review__state-hint">분석 중에는 페이지를 나가도 작업이 계속됩니다.</p>
      <div className="pull-request-review__state-actions">
        <Button disabled={actionPending} onClick={onCancel} variant="secondary">
          {actionPending ? "취소 요청 중..." : "분석 취소"}
        </Button>
      </div>
    </section>
  );
}

function AnalysisFailedPanel({
  actionPending,
  errorMessage,
  onRetry,
  pullRequest,
}: {
  actionPending: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  pullRequest?: PullRequestDetail;
}) {
  return (
    <section aria-labelledby="analysis-state-title" className="pull-request-review__state-panel" role="alert">
      <div aria-hidden="true" className="pull-request-review__state-icon pull-request-review__state-icon--failed">!</div>
      <h2 id="analysis-state-title">AI 분석에 실패했어요</h2>
      <p>분석 중 오류가 발생했습니다. 원본 PR은 그대로 유지되며 다시 시도할 수 있습니다.</p>
      <aside className="pull-request-review__failure-detail">
        <strong>오류 메시지</strong>
        <span>{errorMessage?.trim() || "상세 오류 메시지가 제공되지 않았습니다."}</span>
      </aside>
      <div className="pull-request-review__state-actions">
        <Button disabled={actionPending} onClick={onRetry}>
          {actionPending ? "재시도 중..." : "AI 재분석"}
        </Button>
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

function AnalysisCanceledPanel({
  onAnalyze,
  projectId,
  pullRequest,
}: {
  onAnalyze: () => void;
  projectId: string;
  pullRequest?: PullRequestDetail;
}) {
  return (
    <section aria-labelledby="analysis-state-title" className="pull-request-review__state-panel">
      <div aria-hidden="true" className="pull-request-review__state-icon pull-request-review__state-icon--failed">×</div>
      <h2 id="analysis-state-title">AI 분석이 취소되었습니다</h2>
      <p>요청한 분석이 중단되었습니다. 필요하면 다시 분석을 시작할 수 있습니다.</p>
      <div className="pull-request-review__state-actions">
        <Button onClick={onAnalyze}>AI 재분석</Button>
        <Link className="ui-button ui-button--secondary ui-button--md" to={`/projects/${projectId}/github`}>
          GitHub 작업 목록
        </Link>
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

function ApprovedPanel({
  analysisResult,
  projectId,
  pullRequest,
}: {
  analysisResult: AnalysisResult | null;
  projectId: string;
  pullRequest?: PullRequestDetail;
}) {
  const { approval } = pullRequestReviewMock;

  return (
    <section aria-labelledby="analysis-state-title" className="pull-request-review__state-panel">
      <div aria-hidden="true" className="pull-request-review__state-icon pull-request-review__state-icon--approved">✓</div>
      <h2 id="analysis-state-title">프로젝트 기록이 승인됐어요</h2>
      <p>검토한 내용이 공식 프로젝트 메모리에 저장되었습니다.</p>
      <article className="pull-request-review__approved-summary">
        <h3>{pullRequest?.title ?? analysisResult?.summary ?? "승인된 기록"}</h3>
        <p>승인자 · {approval.approver} · {approval.approvedAt}</p>
        {analysisResult && analysisResult.impacts.length > 0 ? (
          <p>영향 · {analysisResult.impacts.join(" / ")}</p>
        ) : null}
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
