import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { getApiErrorMessage } from "../../shared/api/client";
import { getCurrentUser } from "../../shared/api/session";
import { PageContainer } from "../../shared/layouts";
import { Badge, Button, EmptyState, ErrorState, LoadingState } from "../../shared/ui";
import {
  approveAnalysis,
  cancelAnalysis,
  canApproveAnalysisRecord,
  canRegisterAnalysisMemory,
  canManageAnalysisMemory,
  getAnalysis,
  getAnalysisApiErrorCode,
  getAnalysisFeedbackMessage,
  getAnalysisSummaryById,
  getLatestAnalysisByPrNumber,
  isActiveAnalysisStatus,
  mapAnalysisDetailRecord,
  mapAnalysisRecordResponse,
  parseAnalysisResult,
  registerAnalysisMemory,
  requestAnalysis,
  retryAnalysis,
  serializeAnalysisResultForApi,
  updateAnalysis,
  type AnalysisDetail,
  type AnalysisRecordResponse,
  type AnalysisRecordStatus,
  type AnalysisResult,
  type AnalysisResultEvidence,
  type AnalysisStatus,
} from "./analysisApi";
import {
  canApproveAnalysisByRole,
  canManageAnalysisOwnedAction,
  canRequestAnalysisByRole,
  canViewAnalysisContentByRole,
  isAnalysisAdmin,
  normalizePermissionRole,
} from "./analysisPermissions";
import {
  getPullRequest,
  getPullRequestApiErrorCode,
  getPullRequestFiles,
  type PullRequestDetail,
  type PullRequestFilesResponse,
} from "../github/pullRequestApi";
import {
  appendPullRequestListContext,
  buildGithubListReturnTo,
} from "../github/pullRequestListNavigation";
import {
  ANALYSIS_APPROVED_COPY,
  canApproveAnalysisWhileEditing,
  canEnterAnalysisEditMode,
  canRequestAnalysisAction,
  canSaveAnalysisEditDraft,
  commitAnalysisEditDraft,
  createAnalysisEditDraft,
  withDraftStringField,
  withDraftStringList,
} from "./analysisEditDraft";
import { PullRequestBodyMarkdown } from "./PullRequestBodyMarkdown";
import type { ProjectWorkspaceContextValue } from "../workspace/WorkspaceShell";
import "./PullRequestReviewScreen.css";

const POLLING_INTERVAL_MS = 2000;
const DEFAULT_VISIBLE_ANALYSIS_CHANGES = 8;
const OWNED_ACTION_UNKNOWN_REQUESTER =
  "분석 요청자 정보를 확인하지 못해 이 작업을 사용할 수 없습니다.";
const OWNED_ACTION_DENIED =
  "분석 수정·재시도·취소는 요청자 또는 OWNER/ADMIN만 가능합니다.";
const VIEWER_ANALYSIS_DENIED =
  "VIEWER 권한에서는 AI 분석을 요청하거나 조회할 수 없습니다.";


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

type AnalysisLoadState = "loading" | "success" | "invalid" | "not-found" | "error" | "forbidden";

type AnalysisRestoreState = "idle" | "loading" | "ready" | "error" | "forbidden";

/** GET analysis 상세 또는 수정/승인/메모리 API 응답으로 복원한 기록 상태. */
type AnalysisRecordState = {
  recordStatus: AnalysisRecordStatus;
  recordId: number | null;
  approvedAt: string | null;
  memoryEnabled: boolean;
  memoryEnabledAt: string | null;
};

type FollowUpTaskState = {
  id: string;
  role: string | null;
  task: string;
  evidenceRefs: string[];
  completed: boolean;
};

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
  githubListReturnTo: string;
  onRetry: () => void;
};

function PullRequestSourceFeedback({
  state,
  projectId,
  errorMessage,
  githubListReturnTo,
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
          <Link className="ui-button ui-button--secondary ui-button--md" to={githubListReturnTo}>
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
  githubListReturnTo,
  errorMessage,
  onRetry,
}: {
  state: Exclude<AnalysisLoadState, "success">;
  githubListReturnTo: string;
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
          <Link className="ui-button ui-button--secondary ui-button--md" to={githubListReturnTo}>
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
          <Link className="ui-button ui-button--secondary ui-button--md" to={githubListReturnTo}>
            GitHub 작업 목록
          </Link>
        )}
        title="AI 분석을 찾을 수 없습니다"
      />
    );
  } else if (state === "forbidden") {
    content = (
      <EmptyState
        description={VIEWER_ANALYSIS_DENIED}
        details={(
          <Link className="ui-button ui-button--secondary ui-button--md" to={githubListReturnTo}>
            GitHub 작업 목록
          </Link>
        )}
        title="AI 분석을 조회할 수 없습니다"
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
  const [searchParams] = useSearchParams();
  const { project } = useOutletContext<ProjectWorkspaceContextValue>();
  const currentUser = getCurrentUser();
  const permissionRole = project?.myPermissionRole;
  const canViewAnalysisContent = canViewAnalysisContentByRole(permissionRole);
  const canRequestByRole = canRequestAnalysisByRole(permissionRole);
  const canApproveByRole = canApproveAnalysisByRole(permissionRole);
  const githubListReturnTo = buildGithubListReturnTo(projectId, searchParams);
  const [feedback, setFeedback] = useState("");
  const [analysisRequesting, setAnalysisRequesting] = useState(false);
  const [analysisActionPending, setAnalysisActionPending] = useState(false);
  const [recordActionPending, setRecordActionPending] = useState(false);
  const [analysisRecord, setAnalysisRecord] = useState<AnalysisRecordState | null>(null);
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [editDraft, setEditDraft] = useState<AnalysisResult | null>(null);
  const [followUpTaskState, setFollowUpTaskState] = useState<FollowUpTaskState[]>([]);
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
  /** MEMBER owned-action용. undefined=로딩/미확인, null=조회 실패, number=요청자 */
  const [analysisRequesterUserId, setAnalysisRequesterUserId] = useState<number | null | undefined>(
    undefined,
  );
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
  const isApprovedView = analysisRecord?.recordStatus === "APPROVED";
  const canShowCompletedWorkspace = isAnalysisRoute
    && analysisStatus === "COMPLETED"
    && !isApprovedView;
  const displayedAnalysisResult = isEditingResult && editDraft
    ? editDraft
    : parsedAnalysisResult;
  const normalizedRole = normalizePermissionRole(permissionRole);
  const needsRequesterLookup = normalizedRole === "MEMBER"
    && isAnalysisRoute
    && Boolean(validAnalysisId);
  const canManageOwnedAction = canManageAnalysisOwnedAction({
    permissionRole,
    currentUserId: currentUser?.id,
    requestedByUserId: needsRequesterLookup ? analysisRequesterUserId : undefined,
  });
  const ownedActionDeniedMessage = needsRequesterLookup && !canManageOwnedAction
    ? (analysisRequesterUserId === null
      ? OWNED_ACTION_UNKNOWN_REQUESTER
      : analysisRequesterUserId === undefined
        ? ""
        : OWNED_ACTION_DENIED)
    : "";
  const canStartEditing = canEnterAnalysisEditMode({
    analysisStatus,
    recordStatus: analysisRecord?.recordStatus,
    isEditing: isEditingResult,
    pending: recordActionPending,
  }) && Boolean(parsedAnalysisResult) && canManageOwnedAction;
  const canSaveRecord = canSaveAnalysisEditDraft({
    isEditing: isEditingResult,
    original: parsedAnalysisResult,
    draft: editDraft,
    pending: recordActionPending,
    recordStatus: analysisRecord?.recordStatus,
  }) && Boolean(validAnalysisId) && canManageOwnedAction;
  const canApproveRecord = canApproveAnalysisRecord(analysisRecord?.recordStatus, recordActionPending)
    && canApproveAnalysisWhileEditing(isEditingResult)
    && Boolean(validAnalysisId)
    && analysisStatus === "COMPLETED"
    && canApproveByRole;
  const canRegisterMemory = canRegisterAnalysisMemory({
    recordStatus: analysisRecord?.recordStatus,
    memoryEnabled: analysisRecord?.memoryEnabled,
    pending: recordActionPending,
    permissionRole,
  }) && Boolean(validAnalysisId);
  const canManageMemory = canManageAnalysisMemory(permissionRole);
  const canRetryFailedAnalysis = analysisStatus === "FAILED" && canManageOwnedAction;
  const canCancelInProgressAnalysis = isAnalysisInProgress && canManageOwnedAction;
  const canRequestAnalysis = (
    !isPullRequestRoute || analysisRestoreState === "ready"
  ) && canRequestAnalysisAction({
    isEditing: isEditingResult,
    recordActionPending,
  }) && canRequestByRole;
  useEffect(() => {
    setAnalysisRecord(null);
    setRecordActionPending(false);
    setIsEditingResult(false);
    setEditDraft(null);
    setAnalysisRequesterUserId(undefined);
  }, [validAnalysisId]);

  useEffect(() => {
    const tasks = analysis?.analysisResult
      ? parseAnalysisResult(analysis.analysisResult)?.followUpTasks ?? []
      : [];

    setFollowUpTaskState(
      tasks.map((task, index) => ({
        id: `${analysis?.analysisId ?? "analysis"}-follow-up-${index}`,
        role: task.role,
        task: task.task,
        evidenceRefs: task.evidenceRefs,
        completed: false,
      })),
    );
  }, [analysis?.analysisId, analysis?.analysisResult]);

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

    if (!canViewAnalysisContent) {
      setAnalysisRestoreState("forbidden");
      setAnalysisRestoreError("");
      return;
    }

    const controller = new AbortController();
    setAnalysisRestoreState("loading");
    setAnalysisRestoreError("");

    void getLatestAnalysisByPrNumber(projectId, pullRequest.prNumber, controller.signal)
      .then((latestAnalysis) => {
        if (controller.signal.aborted) return;

        if (latestAnalysis?.analysisId) {
          navigate(
            appendPullRequestListContext(
              `/projects/${projectId}/analyses/${latestAnalysis.analysisId}`,
              searchParams,
            ),
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
    canViewAnalysisContent,
    isPullRequestRoute,
    navigate,
    projectId,
    pullRequest,
    searchParams,
    sourceState,
  ]);

  useEffect(() => {
    if (!isAnalysisRoute) return;

    if (!validAnalysisId) {
      setAnalysisLoadState("invalid");
      setAnalysis(undefined);
      return;
    }

    if (!canViewAnalysisContent) {
      setAnalysisLoadState("forbidden");
      setAnalysis(undefined);
      setAnalysisError("");
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
        setAnalysisRecord(mapAnalysisDetailRecord(detail));
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
  }, [analysisRetryKey, canViewAnalysisContent, isAnalysisRoute, projectId, validAnalysisId]);

  useEffect(() => {
    if (!needsRequesterLookup || !validAnalysisId || !analysisPrNumber) {
      if (!needsRequesterLookup) setAnalysisRequesterUserId(undefined);
      return;
    }

    const controller = new AbortController();
    setAnalysisRequesterUserId(undefined);

    void getAnalysisSummaryById(projectId, analysisPrNumber, validAnalysisId, controller.signal)
      .then((summary) => {
        if (controller.signal.aborted) return;
        const userId = summary?.requestedBy?.userId;
        setAnalysisRequesterUserId(typeof userId === "number" ? userId : null);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setAnalysisRequesterUserId(null);
      });

    return () => controller.abort();
  }, [analysisPrNumber, needsRequesterLookup, projectId, validAnalysisId]);

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

  const applyRecordResponse = (response: AnalysisRecordResponse) => {
    setAnalysisRecord(mapAnalysisRecordResponse(response));

    if (response.analysisResult != null) {
      setAnalysis((current) => (
        current
          ? { ...current, analysisResult: response.analysisResult }
          : current
      ));
    }
  };

  const requestNewAnalysis = async (prNumber: number) => {
    if (analysisRequesting) return;
    if (recordActionPending) return;
    if (isEditingResult) return;
    if (!canRequestByRole) {
      setFeedback(VIEWER_ANALYSIS_DENIED);
      return;
    }

    setAnalysisRequesting(true);
    setFeedback("");

    try {
      const response = await requestAnalysis(projectId, prNumber);
      navigate(appendPullRequestListContext(
        `/projects/${projectId}/analyses/${response.analysisId}`,
        searchParams,
      ));
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
    if (!canRetryFailedAnalysis) {
      setFeedback(ownedActionDeniedMessage || OWNED_ACTION_DENIED);
      return;
    }

    setAnalysisActionPending(true);
    setFeedback("");

    try {
      const response = await retryAnalysis(projectId, validAnalysisId);
      navigate(appendPullRequestListContext(
        `/projects/${projectId}/analyses/${response.newAnalysisId}`,
        searchParams,
      ));
    } catch (error: unknown) {
      setFeedback(getAnalysisFeedbackMessage(error, "분석 재시도에 실패했습니다."));
    } finally {
      setAnalysisActionPending(false);
    }
  };

  const cancelInProgressAnalysis = async () => {
    if (!validAnalysisId || analysisActionPending) return;
    if (!canCancelInProgressAnalysis) {
      setFeedback(ownedActionDeniedMessage || OWNED_ACTION_DENIED);
      return;
    }

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

  const startEditingResult = () => {
    if (!parsedAnalysisResult || !canStartEditing) return;
    setEditDraft(createAnalysisEditDraft(parsedAnalysisResult));
    setIsEditingResult(true);
    setFeedback("");
  };

  const cancelEditingResult = () => {
    if (recordActionPending) return;
    setEditDraft(null);
    setIsEditingResult(false);
    setFeedback("편집을 취소했습니다.");
  };

  const updateEditDraft = (updater: (current: AnalysisResult) => AnalysisResult) => {
    setEditDraft((current) => (current ? updater(current) : current));
  };

  const saveDraft = async () => {
    if (!validAnalysisId || !canSaveRecord) return;
    if (!canManageOwnedAction) {
      setFeedback(ownedActionDeniedMessage || OWNED_ACTION_DENIED);
      return;
    }
    if (!isEditingResult || !editDraft) {
      setFeedback("수정 모드에서 내용을 변경한 뒤 저장할 수 있습니다.");
      return;
    }

    setRecordActionPending(true);
    setFeedback("");

    try {
      const committed = commitAnalysisEditDraft(editDraft);
      const response = await updateAnalysis(
        projectId,
        validAnalysisId,
        serializeAnalysisResultForApi(committed),
      );
      applyRecordResponse(response);
      setIsEditingResult(false);
      setEditDraft(null);
      setFeedback("임시 저장이 완료되었습니다.");
    } catch (error: unknown) {
      setFeedback(getAnalysisFeedbackMessage(error, "분석 결과 저장에 실패했습니다."));
    } finally {
      setRecordActionPending(false);
    }
  };

  const approveReview = async () => {
    if (!validAnalysisId) return;
    if (isEditingResult) {
      setFeedback("수정 중인 내용이 있습니다. 먼저 저장하거나 편집을 취소해주세요.");
      return;
    }
    if (!canApproveRecord) return;

    setRecordActionPending(true);
    setFeedback("");

    try {
      const response = await approveAnalysis(projectId, validAnalysisId);
      applyRecordResponse(response);
      setIsEditingResult(false);
      setEditDraft(null);
      if (response.recordStatus !== "APPROVED") {
        setFeedback("승인 요청은 처리되었지만 승인 완료 상태가 아닙니다.");
      }
    } catch (error: unknown) {
      setFeedback(getAnalysisFeedbackMessage(error, "분석 승인에 실패했습니다."));
    } finally {
      setRecordActionPending(false);
    }
  };

  const registerMemory = async () => {
    if (!validAnalysisId || !canRegisterMemory) return;
    if (!isAnalysisAdmin(permissionRole)) {
      setFeedback("프로젝트 메모리를 등록할 권한이 없습니다. OWNER 또는 ADMIN만 등록할 수 있습니다.");
      return;
    }

    setRecordActionPending(true);
    setFeedback("");

    try {
      const response = await registerAnalysisMemory(projectId, validAnalysisId);
      applyRecordResponse(response);
      if (!response.memoryEnabled || response.recordStatus !== "APPROVED") {
        setFeedback("메모리 등록 요청은 처리되었지만 등록 완료 상태가 아닙니다.");
        return;
      }
      setFeedback("프로젝트 메모리에 등록되었습니다.");
    } catch (error: unknown) {
      setFeedback(getAnalysisFeedbackMessage(error, "프로젝트 메모리 등록에 실패했습니다."));
    } finally {
      setRecordActionPending(false);
    }
  };

  const copyDraft = async () => {
    const title = pullRequest
      ? `PR #${pullRequest.prNumber} ${pullRequest.title}`
      : `AI 분석 #${analysisId ?? ""}`;

    let content = title;

    if (parsedAnalysisResult) {
      if (parsedAnalysisResult.hasExtendedFields) {
        content = [
          title,
          parsedAnalysisResult.summary,
          parsedAnalysisResult.purpose,
          parsedAnalysisResult.changeReason,
          parsedAnalysisResult.before,
          parsedAnalysisResult.after,
          ...parsedAnalysisResult.relatedFeatures.map((feature) => `관련 기능: ${feature}`),
          ...parsedAnalysisResult.affectedRoles.map((role) => `영향 역할: ${role}`),
          ...parsedAnalysisResult.roleImpacts.map((item) => `${item.role}: ${item.impact}`),
          ...parsedAnalysisResult.risks.map((risk) => `리스크: ${risk}`),
          ...parsedAnalysisResult.needsConfirmation.map((item) => `확인 필요: ${item}`),
          ...parsedAnalysisResult.changes.map((change) => `${change.filePath}: ${change.description}`),
          ...parsedAnalysisResult.followUpTasks.map((item) => `후속 작업: ${item.task}`),
        ].filter(Boolean).join("\n");
      } else {
        content = [
          title,
          parsedAnalysisResult.summary,
          ...parsedAnalysisResult.changes.map((change) => `${change.filePath}: ${change.description}`),
          ...parsedAnalysisResult.impacts.map((impact) => `영향: ${impact}`),
          ...parsedAnalysisResult.risks.map((risk) => `리스크: ${risk}`),
          ...parsedAnalysisResult.recommendations.map((item) => `권장: ${item}`),
        ].filter(Boolean).join("\n");
      }
    }

    try {
      await navigator.clipboard.writeText(content);
      setFeedback(parsedAnalysisResult ? "분석 결과를 복사했습니다." : "내용을 복사했습니다.");
    } catch {
      setFeedback("내용을 복사하지 못했습니다.");
    }
  };

  const toggleFollowUpTask = (id: string) => {
    setFollowUpTaskState((items) =>
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
  };

  if (isAnalysisRoute) {
    if (!validAnalysisId || analysisLoadState !== "success") {
      return (
        <AnalysisFeedback
          errorMessage={analysisError}
          githubListReturnTo={githubListReturnTo}
          onRetry={() => setAnalysisRetryKey((key) => key + 1)}
          state={analysisLoadState === "success" ? "loading" : analysisLoadState}
        />
      );
    }

    if (sourceState !== "success" || !pullRequest || !pullRequestFiles || !analysis) {
      return (
        <PullRequestSourceFeedback
          errorMessage={sourceError}
          githubListReturnTo={githubListReturnTo}
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
        githubListReturnTo={githubListReturnTo}
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
            canApprove={canApproveRecord}
            canRequestAnalysis={canRequestAnalysis}
            isApprovedView={isApprovedView}
            isEditingResult={isEditingResult}
            onAnalyze={startAnalysis}
            onApprove={() => void approveReview()}
            pullRequest={pullRequest}
            recordActionPending={recordActionPending}
          />

          {isApprovedView ? (
            <ApprovedPanel
              analysisResult={parsedAnalysisResult}
              approvedAt={analysisRecord?.approvedAt}
              canManageMemory={canManageMemory}
              canRegisterMemory={canRegisterMemory}
              githubListReturnTo={githubListReturnTo}
              memoryEnabled={Boolean(analysisRecord?.memoryEnabled)}
              memoryEnabledAt={analysisRecord?.memoryEnabledAt}
              onRegisterMemory={() => void registerMemory()}
              pullRequest={pullRequest}
              recordActionPending={recordActionPending}
            />
          ) : isAnalysisRoute && analysisStatus === "FAILED" ? (
            <AnalysisFailedPanel
              actionPending={analysisActionPending}
              canRetry={canRetryFailedAnalysis}
              deniedMessage={ownedActionDeniedMessage}
              errorMessage={analysis?.errorMessage}
              onRetry={retryFailedAnalysis}
              pullRequest={pullRequest}
            />
          ) : isAnalysisRoute && analysisStatus === "CANCELED" ? (
            <AnalysisCanceledPanel
              canRequestAnalysis={canRequestByRole}
              githubListReturnTo={githubListReturnTo}
              onAnalyze={startAnalysis}
              pullRequest={pullRequest}
            />
          ) : isAnalysisRoute && isAnalysisInProgress ? (
            <AnalysisInProgressPanel
              actionPending={analysisActionPending}
              analysisStatus={analysisStatus!}
              canCancel={canCancelInProgressAnalysis}
              deniedMessage={ownedActionDeniedMessage}
              onCancel={cancelInProgressAnalysis}
            />
          ) : canShowCompletedWorkspace && pullRequest && pullRequestFiles && displayedAnalysisResult ? (
            <ReviewWorkspace
              analysisResult={displayedAnalysisResult}
              disabled={recordActionPending}
              files={pullRequestFiles}
              followUpTasks={followUpTaskState}
              isEditing={isEditingResult}
              onChangeDraft={updateEditDraft}
              onToggleFollowUpTask={toggleFollowUpTask}
              pullRequest={pullRequest}
            />
          ) : isPullRequestRoute && pullRequest && pullRequestFiles ? (
            <div className="pull-request-review__columns">
              <GitHubSourcePanel files={pullRequestFiles} pullRequest={pullRequest} />
              {analysisRestoreState === "forbidden" ? (
                <ViewerAnalysisUnavailablePanel />
              ) : analysisRestoreState === "error" ? (
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
                {isEditingResult ? (
                  <Button
                    disabled={recordActionPending}
                    onClick={cancelEditingResult}
                    variant="secondary"
                  >
                    편집 취소
                  </Button>
                ) : canStartEditing ? (
                  <Button
                    onClick={startEditingResult}
                    variant="secondary"
                  >
                    수정
                  </Button>
                ) : null}
                {isEditingResult ? (
                  <Button
                    disabled={!canSaveRecord}
                    onClick={() => void saveDraft()}
                    variant="secondary"
                  >
                    {recordActionPending ? "저장 중..." : "임시 저장"}
                  </Button>
                ) : null}
              </div>
              <div>
                <Button disabled={recordActionPending || isEditingResult} onClick={copyDraft} variant="secondary">
                  내용 복사
                </Button>
                <Button disabled={!canApproveRecord} onClick={() => void approveReview()}>
                  {recordActionPending ? "승인 중..." : "승인 요청"}
                </Button>
              </div>
            </footer>
          ) : null}

          {ownedActionDeniedMessage && canShowCompletedWorkspace && !canManageOwnedAction ? (
            <p className="pull-request-review__permission-hint" role="status">
              {ownedActionDeniedMessage}
            </p>
          ) : null}

          <p aria-live="polite" className="pull-request-review__feedback">
            {feedback}
          </p>
        </div>
      </PageContainer>
    </main>
  );
}

type ReviewHeaderProps = {
  analysisId?: string;
  analysisStatus?: AnalysisStatus;
  analysisRequesting: boolean;
  canRequestAnalysis?: boolean;
  canApprove?: boolean;
  isApprovedView: boolean;
  isEditingResult?: boolean;
  pullRequest?: PullRequestDetail;
  onAnalyze: () => void;
  onApprove: () => void;
  recordActionPending?: boolean;
};

function ReviewHeader({
  analysisId,
  analysisRequesting,
  analysisStatus,
  canApprove = false,
  canRequestAnalysis = true,
  isApprovedView,
  isEditingResult = false,
  onAnalyze,
  onApprove,
  pullRequest,
  recordActionPending = false,
}: ReviewHeaderProps) {
  const status = isApprovedView
    ? { label: "승인 완료", variant: "success" as const }
    : analysisStatus
      ? analysisStatusCopy[analysisStatus]
      : { label: "검토 필요", variant: "warning" as const };
  const analyzeDisabled = analysisRequesting
    || !canRequestAnalysis
    || isApprovedView
    || isEditingResult
    || recordActionPending
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
        {isApprovedView || analysisStatus === "FAILED" || !canRequestAnalysis ? null : (
          <Button
            disabled={analyzeDisabled || !pullRequest}
            onClick={onAnalyze}
            size="sm"
            variant={analysisStatus === "CANCELED" ? "primary" : "secondary"}
          >
            {analysisRequesting ? "분석 요청 중..." : "AI 재분석"}
          </Button>
        )}
        {canApprove || isApprovedView ? (
          <Button
            disabled={isApprovedView || !canApprove || recordActionPending}
            onClick={onApprove}
            size="sm"
          >
            {isApprovedView
              ? "승인 완료"
              : recordActionPending
                ? "승인 중..."
                : "승인 요청"}
          </Button>
        ) : null}
      </div>
    </header>
  );
}

type ReviewWorkspaceProps = {
  followUpTasks: FollowUpTaskState[];
  onToggleFollowUpTask: (id: string) => void;
  analysisResult?: AnalysisResult | null;
  isEditing?: boolean;
  disabled?: boolean;
  onChangeDraft?: (updater: (current: AnalysisResult) => AnalysisResult) => void;
};

type ReviewWorkspaceDataProps = ReviewWorkspaceProps & {
  pullRequest: PullRequestDetail;
  files: PullRequestFilesResponse;
};

function ReviewWorkspace({
  analysisResult,
  disabled = false,
  files,
  followUpTasks,
  isEditing = false,
  onChangeDraft,
  onToggleFollowUpTask,
  pullRequest,
}: ReviewWorkspaceDataProps) {
  return (
    <div className="pull-request-review__columns">
      <GitHubSourcePanel files={files} pullRequest={pullRequest} />
      {analysisResult ? (
        <AnalysisResultPanel
          analysisResult={analysisResult}
          disabled={disabled}
          followUpTasks={followUpTasks}
          isEditing={isEditing}
          onChangeDraft={onChangeDraft}
          onToggleFollowUpTask={onToggleFollowUpTask}
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
        <PullRequestBodyMarkdown body={pullRequest.body} />
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

function buildEvidenceMap(evidence: AnalysisResultEvidence[]) {
  return new Map(evidence.filter((item) => item.id).map((item) => [item.id, item]));
}

function isContextEvidenceWithoutUserFacingInfo(item: AnalysisResultEvidence) {
  return item.source === "context" && !item.description?.trim();
}

function EvidenceRefsList({
  evidenceMap,
  refs,
}: {
  evidenceMap: Map<string, AnalysisResultEvidence>;
  refs: string[];
}) {
  if (refs.length === 0) return null;

  return (
    <ul className="pull-request-review__evidence-refs">
      {refs.map((ref) => {
        const evidence = evidenceMap.get(ref);

        if (evidence) {
          if (isContextEvidenceWithoutUserFacingInfo(evidence)) {
            return (
              <li key={ref}>
                <strong>{evidence.source}</strong>
                <span>프로젝트 컨텍스트</span>
              </li>
            );
          }

          return (
            <li key={ref}>
              <strong>{evidence.source}</strong>
              <span>{evidence.location}</span>
              {evidence.description ? <span>{evidence.description}</span> : null}
            </li>
          );
        }

        return (
          <li key={ref}>
            <code>{ref}</code>
            <span>연결된 근거를 찾을 수 없습니다.</span>
          </li>
        );
      })}
    </ul>
  );
}

function AnalysisTextSection({
  emptyText,
  id,
  text,
  title,
}: {
  emptyText?: string;
  id: string;
  text: string;
  title: string;
}) {
  return (
    <section aria-labelledby={id} className="pull-request-review__analysis-summary">
      <h3 id={id}>{title}</h3>
      <p>{text || emptyText || "정보가 없습니다."}</p>
    </section>
  );
}

function AnalysisEditableTextSection({
  disabled,
  id,
  onChange,
  rows = 3,
  title,
  value,
}: {
  disabled?: boolean;
  id: string;
  onChange: (value: string) => void;
  rows?: number;
  title: string;
  value: string;
}) {
  return (
    <section aria-labelledby={id} className="pull-request-review__analysis-summary">
      <h3 id={id}>{title}</h3>
      <textarea
        aria-labelledby={id}
        className="pull-request-review__edit-textarea"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
    </section>
  );
}

function AnalysisTagSection({
  emptyText,
  id,
  items,
  title,
}: {
  emptyText: string;
  id: string;
  items: string[];
  title: string;
}) {
  return (
    <section aria-labelledby={id} className="pull-request-review__analysis-tags">
      <h3 id={id}>{title}</h3>
      {items.length > 0 ? (
        <ul className="pull-request-review__analysis-tag-list">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="pull-request-review__analysis-empty">{emptyText}</p>
      )}
    </section>
  );
}

function AnalysisEditableStringList({
  addLabel,
  disabled,
  emptyText,
  id,
  items,
  onChange,
  title,
}: {
  addLabel: string;
  disabled?: boolean;
  emptyText: string;
  id: string;
  items: string[];
  onChange: (items: string[]) => void;
  title: string;
}) {
  return (
    <section aria-labelledby={id} className="pull-request-review__analysis-tags">
      <div className="pull-request-review__analysis-section-heading">
        <h3 id={id}>{title}</h3>
        <Button
          disabled={disabled}
          onClick={() => onChange([...items, ""])}
          size="sm"
          variant="secondary"
        >
          {addLabel}
        </Button>
      </div>
      {items.length > 0 ? (
        <ul className="pull-request-review__edit-list">
          {items.map((item, index) => (
            <li key={`${id}-${index}`}>
              <input
                aria-label={`${title} ${index + 1}`}
                className="pull-request-review__edit-input"
                disabled={disabled}
                onChange={(event) => {
                  const next = [...items];
                  next[index] = event.target.value;
                  onChange(next);
                }}
                value={item}
              />
              <Button
                aria-label={`${title} ${index + 1} 삭제`}
                disabled={disabled}
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                size="sm"
                variant="ghost"
              >
                삭제
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pull-request-review__analysis-empty">{emptyText}</p>
      )}
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

function ViewerAnalysisUnavailablePanel() {
  return (
    <section className="pull-request-review__panel pull-request-review__draft" aria-labelledby="viewer-analysis-title">
      <header>
        <h2 id="viewer-analysis-title">AI 분석을 이용할 수 없습니다</h2>
        <Badge variant="neutral">권한 없음</Badge>
      </header>
      <div className="pull-request-review__draft-empty">
        <p>{VIEWER_ANALYSIS_DENIED}</p>
      </div>
    </section>
  );
}

function AnalysisResultPanel({
  analysisResult,
  disabled = false,
  followUpTasks,
  isEditing = false,
  onChangeDraft,
  onToggleFollowUpTask,
}: ReviewWorkspaceProps & { analysisResult: AnalysisResult }) {
  const evidenceMap = buildEvidenceMap(analysisResult.evidence);
  const [showAllChanges, setShowAllChanges] = useState(false);
  const hiddenChangeCount = Math.max(
    analysisResult.changes.length - DEFAULT_VISIBLE_ANALYSIS_CHANGES,
    0,
  );
  const visibleChanges = showAllChanges || hiddenChangeCount === 0 || isEditing
    ? analysisResult.changes
    : analysisResult.changes.slice(0, DEFAULT_VISIBLE_ANALYSIS_CHANGES);
  const isLegacyResult = !analysisResult.hasExtendedFields;
  const visibleEvidence = analysisResult.evidence.filter(
    (item) => !isContextEvidenceWithoutUserFacingInfo(item),
  );

  const updateDraft = (updater: (current: AnalysisResult) => AnalysisResult) => {
    onChangeDraft?.(updater);
  };

  const changesSection = (
    <section
      aria-labelledby="analysis-changes-title"
      className="pull-request-review__analysis-changes"
    >
      <div className="pull-request-review__analysis-section-heading">
        <h3 id="analysis-changes-title">변경 파일</h3>
        {isEditing ? (
          <Button
            disabled={disabled}
            onClick={() => updateDraft((current) => ({
              ...current,
              changes: [...current.changes, { filePath: "", description: "" }],
            }))}
            size="sm"
            variant="secondary"
          >
            변경 파일 추가
          </Button>
        ) : analysisResult.changes.length > 0 ? (
          <span className="pull-request-review__analysis-count">
            {analysisResult.changes.length}개
          </span>
        ) : null}
      </div>

      {analysisResult.changes.length > 0 ? (
        <>
          <ul className="pull-request-review__analysis-change-list">
            {visibleChanges.map((change, index) => (
              <li key={`change-${index}`}>
                {isEditing ? (
                  <div className="pull-request-review__edit-change-row">
                    <input
                      aria-label={`변경 파일 경로 ${index + 1}`}
                      className="pull-request-review__edit-input"
                      disabled={disabled}
                      onChange={(event) => updateDraft((current) => {
                        const changes = [...current.changes];
                        changes[index] = { ...changes[index]!, filePath: event.target.value };
                        return { ...current, changes };
                      })}
                      value={change.filePath}
                    />
                    <textarea
                      aria-label={`변경 파일 설명 ${index + 1}`}
                      className="pull-request-review__edit-textarea"
                      disabled={disabled}
                      onChange={(event) => updateDraft((current) => {
                        const changes = [...current.changes];
                        changes[index] = { ...changes[index]!, description: event.target.value };
                        return { ...current, changes };
                      })}
                      rows={2}
                      value={change.description}
                    />
                    <Button
                      aria-label={`변경 파일 ${index + 1} 삭제`}
                      disabled={disabled}
                      onClick={() => updateDraft((current) => ({
                        ...current,
                        changes: current.changes.filter((_, itemIndex) => itemIndex !== index),
                      }))}
                      size="sm"
                      variant="ghost"
                    >
                      삭제
                    </Button>
                  </div>
                ) : (
                  <>
                    <code>{change.filePath}</code>
                    <span>{change.description}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
          {!isEditing && hiddenChangeCount > 0 ? (
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
  );

  return (
    <section
      aria-labelledby="analysis-result-title"
      className={[
        "pull-request-review__panel",
        "pull-request-review__draft",
        "pull-request-review__analysis-result",
        isEditing ? "pull-request-review__analysis-result--editing" : "",
      ].filter(Boolean).join(" ")}
    >
      <header className="pull-request-review__analysis-header">
        <div>
          <h2 id="analysis-result-title">AI 분석 결과</h2>
          <div className="pull-request-review__analysis-header-meta">
            <Badge variant="success">분석 완료</Badge>
            {isEditing ? <Badge variant="warning">수정 중</Badge> : null}
            {analysisResult.riskScore !== undefined ? (
              <Badge variant="warning">리스크 점수 {analysisResult.riskScore}</Badge>
            ) : null}
          </div>
        </div>
      </header>

      {isLegacyResult ? (
        <>
          <p className="pull-request-review__legacy-notice" role="status">
            이 분석은 이전 형식으로 생성된 결과입니다. 상세 분석 항목은 제공되지 않습니다.
          </p>

          {isEditing ? (
            <AnalysisEditableTextSection
              disabled={disabled}
              id="analysis-summary-title"
              onChange={(value) => updateDraft((current) => withDraftStringField(current, "summary", value))}
              title="작업 요약"
              value={analysisResult.summary}
            />
          ) : (
            <AnalysisTextSection
              id="analysis-summary-title"
              text={analysisResult.summary}
              title="작업 요약"
            />
          )}

          {isEditing ? (
            <div className="pull-request-review__analysis-insights pull-request-review__analysis-insights--editing">
              <AnalysisEditableStringList
                addLabel="영향 추가"
                disabled={disabled}
                emptyText="영향 정보가 없습니다."
                id="analysis-impacts-title"
                items={analysisResult.impacts}
                onChange={(items) => updateDraft((current) => withDraftStringList(current, "impacts", items))}
                title="영향"
              />
              <AnalysisEditableStringList
                addLabel="리스크 추가"
                disabled={disabled}
                emptyText="식별된 리스크가 없습니다."
                id="analysis-risks-title"
                items={analysisResult.risks}
                onChange={(items) => updateDraft((current) => withDraftStringList(current, "risks", items))}
                title="리스크"
              />
              <AnalysisEditableStringList
                addLabel="권장 사항 추가"
                disabled={disabled}
                emptyText="권장 사항이 없습니다."
                id="analysis-recommendations-title"
                items={analysisResult.recommendations}
                onChange={(items) => updateDraft((current) => withDraftStringList(current, "recommendations", items))}
                title="권장 사항"
              />
            </div>
          ) : (
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
          )}

          {changesSection}
        </>
      ) : (
        <>
          {analysisResult.retrievalQualityWarning ? (
            <p className="pull-request-review__retrieval-warning" role="status">
              검색된 프로젝트 근거의 품질 확인이 필요합니다.
            </p>
          ) : null}

          {isEditing ? (
            <AnalysisEditableTextSection
              disabled={disabled}
              id="analysis-summary-title"
              onChange={(value) => updateDraft((current) => withDraftStringField(current, "summary", value))}
              title="작업 요약"
              value={analysisResult.summary}
            />
          ) : (
            <AnalysisTextSection
              emptyText="요약 정보가 없습니다."
              id="analysis-summary-title"
              text={analysisResult.summary}
              title="작업 요약"
            />
          )}

          {isEditing ? (
            <AnalysisEditableTextSection
              disabled={disabled}
              id="analysis-purpose-title"
              onChange={(value) => updateDraft((current) => withDraftStringField(current, "purpose", value))}
              title="작업 목적"
              value={analysisResult.purpose}
            />
          ) : (
            <AnalysisTextSection
              emptyText="작업 목적 정보가 없습니다."
              id="analysis-purpose-title"
              text={analysisResult.purpose}
              title="작업 목적"
            />
          )}

          {isEditing ? (
            <AnalysisEditableTextSection
              disabled={disabled}
              id="analysis-change-reason-title"
              onChange={(value) => updateDraft((current) => withDraftStringField(current, "changeReason", value))}
              title="변경 이유"
              value={analysisResult.changeReason}
            />
          ) : (
            <AnalysisTextSection
              emptyText="변경 이유 정보가 없습니다."
              id="analysis-change-reason-title"
              text={analysisResult.changeReason}
              title="변경 이유"
            />
          )}

          <section aria-labelledby="analysis-diff-title" className="pull-request-review__analysis-diff">
            <h3 id="analysis-diff-title">변경 전 / 변경 후</h3>
            <div className="pull-request-review__analysis-diff-grid">
              <article>
                <h4>변경 전</h4>
                {isEditing ? (
                  <textarea
                    aria-label="변경 전"
                    className="pull-request-review__edit-textarea"
                    disabled={disabled}
                    onChange={(event) => updateDraft((current) => withDraftStringField(current, "before", event.target.value))}
                    rows={4}
                    value={analysisResult.before}
                  />
                ) : (
                  <p>{analysisResult.before || "정보가 없습니다."}</p>
                )}
              </article>
              <article>
                <h4>변경 후</h4>
                {isEditing ? (
                  <textarea
                    aria-label="변경 후"
                    className="pull-request-review__edit-textarea"
                    disabled={disabled}
                    onChange={(event) => updateDraft((current) => withDraftStringField(current, "after", event.target.value))}
                    rows={4}
                    value={analysisResult.after}
                  />
                ) : (
                  <p>{analysisResult.after || "정보가 없습니다."}</p>
                )}
              </article>
            </div>
          </section>

          {isEditing ? (
            <AnalysisEditableStringList
              addLabel="관련 기능 추가"
              disabled={disabled}
              emptyText="관련 기능 정보가 없습니다."
              id="analysis-related-features-title"
              items={analysisResult.relatedFeatures}
              onChange={(items) => updateDraft((current) => withDraftStringList(current, "relatedFeatures", items))}
              title="관련 기능"
            />
          ) : (
            <AnalysisTagSection
              emptyText="관련 기능 정보가 없습니다."
              id="analysis-related-features-title"
              items={analysisResult.relatedFeatures}
              title="관련 기능"
            />
          )}

          {isEditing ? (
            <AnalysisEditableStringList
              addLabel="영향 역할 추가"
              disabled={disabled}
              emptyText="영향 역할 정보가 없습니다."
              id="analysis-affected-roles-title"
              items={analysisResult.affectedRoles}
              onChange={(items) => updateDraft((current) => withDraftStringList(current, "affectedRoles", items))}
              title="영향 역할"
            />
          ) : (
            <AnalysisTagSection
              emptyText="영향 역할 정보가 없습니다."
              id="analysis-affected-roles-title"
              items={analysisResult.affectedRoles}
              title="영향 역할"
            />
          )}

          <section
            aria-labelledby="analysis-role-impacts-title"
            className="pull-request-review__analysis-role-impacts"
          >
            <div className="pull-request-review__analysis-section-heading">
              <h3 id="analysis-role-impacts-title">역할별 영향</h3>
              {isEditing ? (
                <Button
                  disabled={disabled}
                  onClick={() => updateDraft((current) => ({
                    ...current,
                    roleImpacts: [
                      ...current.roleImpacts,
                      { role: "", impact: "", basis: null, evidenceRefs: [] },
                    ],
                  }))}
                  size="sm"
                  variant="secondary"
                >
                  역할별 영향 추가
                </Button>
              ) : null}
            </div>
            {analysisResult.roleImpacts.length > 0 ? (
              <ul className="pull-request-review__role-impact-list">
                {analysisResult.roleImpacts.map((item, index) => (
                  <li key={`role-impact-${index}`}>
                    {isEditing ? (
                      <div className="pull-request-review__edit-role-impact">
                        <input
                          aria-label={`역할 ${index + 1}`}
                          className="pull-request-review__edit-input"
                          disabled={disabled}
                          onChange={(event) => updateDraft((current) => {
                            const roleImpacts = [...current.roleImpacts];
                            roleImpacts[index] = { ...roleImpacts[index]!, role: event.target.value };
                            return { ...current, roleImpacts };
                          })}
                          placeholder="역할"
                          value={item.role}
                        />
                        <textarea
                          aria-label={`역할 영향 ${index + 1}`}
                          className="pull-request-review__edit-textarea"
                          disabled={disabled}
                          onChange={(event) => updateDraft((current) => {
                            const roleImpacts = [...current.roleImpacts];
                            roleImpacts[index] = { ...roleImpacts[index]!, impact: event.target.value };
                            return { ...current, roleImpacts };
                          })}
                          placeholder="영향"
                          rows={2}
                          value={item.impact}
                        />
                        <textarea
                          aria-label={`역할 영향 근거 ${index + 1}`}
                          className="pull-request-review__edit-textarea"
                          disabled={disabled}
                          onChange={(event) => updateDraft((current) => {
                            const roleImpacts = [...current.roleImpacts];
                            roleImpacts[index] = {
                              ...roleImpacts[index]!,
                              basis: event.target.value || null,
                            };
                            return { ...current, roleImpacts };
                          })}
                          placeholder="근거"
                          rows={2}
                          value={item.basis ?? ""}
                        />
                        <EvidenceRefsList evidenceMap={evidenceMap} refs={item.evidenceRefs} />
                        <Button
                          aria-label={`역할별 영향 ${index + 1} 삭제`}
                          disabled={disabled}
                          onClick={() => updateDraft((current) => ({
                            ...current,
                            roleImpacts: current.roleImpacts.filter((_, itemIndex) => itemIndex !== index),
                          }))}
                          size="sm"
                          variant="ghost"
                        >
                          삭제
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="pull-request-review__role-impact-header">
                          <strong>{item.role || "역할 미지정"}</strong>
                          <span>{item.impact}</span>
                        </div>
                        {item.basis ? (
                          <p className="pull-request-review__role-impact-basis">근거 · {item.basis}</p>
                        ) : null}
                        <EvidenceRefsList evidenceMap={evidenceMap} refs={item.evidenceRefs} />
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pull-request-review__analysis-empty">역할별 영향 정보가 없습니다.</p>
            )}
          </section>

          {isEditing ? (
            <AnalysisEditableStringList
              addLabel="리스크 추가"
              disabled={disabled}
              emptyText={analysisResult.hasRisksField
                ? "식별된 리스크가 없습니다."
                : "리스크 상세가 분석 결과에 제공되지 않았습니다. 필요하면 추가할 수 있습니다."}
              id="analysis-risks-title"
              items={analysisResult.risks}
              onChange={(items) => updateDraft((current) => withDraftStringList(current, "risks", items))}
              title="리스크"
            />
          ) : (
            <section
              aria-labelledby="analysis-risks-title"
              className="pull-request-review__analysis-confirmation"
            >
              <h3 id="analysis-risks-title">리스크</h3>
              {analysisResult.risks.length > 0 ? (
                <ul className="pull-request-review__insight-list">
                  {analysisResult.risks.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : (
                <p className="pull-request-review__analysis-empty">
                  {analysisResult.hasRisksField
                    ? "식별된 리스크가 없습니다."
                    : "리스크 상세가 분석 결과에 제공되지 않았습니다."}
                </p>
              )}
            </section>
          )}

          {isEditing ? (
            <AnalysisEditableStringList
              addLabel="확인 필요 사항 추가"
              disabled={disabled}
              emptyText="확인이 필요한 사항이 없습니다."
              id="analysis-confirmation-title"
              items={analysisResult.needsConfirmation}
              onChange={(items) => updateDraft((current) => withDraftStringList(current, "needsConfirmation", items))}
              title="확인 필요 사항"
            />
          ) : (
            <section
              aria-labelledby="analysis-confirmation-title"
              className="pull-request-review__analysis-confirmation"
            >
              <h3 id="analysis-confirmation-title">확인 필요 사항</h3>
              {analysisResult.needsConfirmation.length > 0 ? (
                <ul className="pull-request-review__insight-list">
                  {analysisResult.needsConfirmation.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : (
                <p className="pull-request-review__analysis-empty">확인이 필요한 사항이 없습니다.</p>
              )}
            </section>
          )}

          {changesSection}

          <section
            aria-labelledby="analysis-follow-ups-title"
            className="pull-request-review__analysis-follow-ups"
          >
            <div className="pull-request-review__analysis-section-heading">
              <h3 id="analysis-follow-ups-title">후속 작업</h3>
              {isEditing ? (
                <Button
                  disabled={disabled}
                  onClick={() => updateDraft((current) => ({
                    ...current,
                    followUpTasks: [
                      ...current.followUpTasks,
                      { role: null, task: "", evidenceRefs: [] },
                    ],
                  }))}
                  size="sm"
                  variant="secondary"
                >
                  후속 작업 추가
                </Button>
              ) : null}
            </div>
            {isEditing ? (
              analysisResult.followUpTasks.length > 0 ? (
                <ul className="pull-request-review__edit-list">
                  {analysisResult.followUpTasks.map((item, index) => (
                    <li key={`follow-up-edit-${index}`}>
                      <input
                        aria-label={`후속 작업 역할 ${index + 1}`}
                        className="pull-request-review__edit-input"
                        disabled={disabled}
                        onChange={(event) => updateDraft((current) => {
                          const followUpTasks = [...current.followUpTasks];
                          followUpTasks[index] = {
                            ...followUpTasks[index]!,
                            role: event.target.value || null,
                          };
                          return { ...current, followUpTasks };
                        })}
                        placeholder="역할 (선택)"
                        value={item.role ?? ""}
                      />
                      <textarea
                        aria-label={`후속 작업 ${index + 1}`}
                        className="pull-request-review__edit-textarea"
                        disabled={disabled}
                        onChange={(event) => updateDraft((current) => {
                          const followUpTasks = [...current.followUpTasks];
                          followUpTasks[index] = {
                            ...followUpTasks[index]!,
                            task: event.target.value,
                          };
                          return { ...current, followUpTasks };
                        })}
                        placeholder="작업 내용"
                        rows={2}
                        value={item.task}
                      />
                      <EvidenceRefsList evidenceMap={evidenceMap} refs={item.evidenceRefs} />
                      <Button
                        aria-label={`후속 작업 ${index + 1} 삭제`}
                        disabled={disabled}
                        onClick={() => updateDraft((current) => ({
                          ...current,
                          followUpTasks: current.followUpTasks.filter((_, itemIndex) => itemIndex !== index),
                        }))}
                        size="sm"
                        variant="ghost"
                      >
                        삭제
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pull-request-review__analysis-empty">후속 작업이 없습니다.</p>
              )
            ) : followUpTasks.length > 0 ? (
              <>
                <p className="pull-request-review__analysis-follow-ups-note">
                  프로젝트 기록 승인 전 로컬 체크리스트입니다.
                </p>
                <div className="pull-request-review__follow-ups">
                  {followUpTasks.map((item) => (
                    <div className="pull-request-review__follow-up-item" key={item.id}>
                      <button
                        aria-label={`${item.task} ${item.completed ? "완료 해제" : "완료 처리"}`}
                        aria-pressed={item.completed}
                        onClick={() => onToggleFollowUpTask(item.id)}
                        type="button"
                      >
                        <span aria-hidden="true">{item.completed ? "☑" : "☐"}</span>
                        {item.role ? (
                          <span className="pull-request-review__follow-up-role">{item.role}</span>
                        ) : null}
                        {item.task}
                      </button>
                      <EvidenceRefsList evidenceMap={evidenceMap} refs={item.evidenceRefs} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="pull-request-review__analysis-empty">후속 작업이 없습니다.</p>
            )}
          </section>

          <section
            aria-labelledby="analysis-evidence-title"
            className="pull-request-review__analysis-evidence"
          >
            <h3 id="analysis-evidence-title">분석 근거</h3>
            {visibleEvidence.length > 0 ? (
              <ul className="pull-request-review__evidence-list">
                {visibleEvidence.map((item) => (
                  <li key={item.id || `${item.source}-${item.location}`}>
                    <div className="pull-request-review__evidence-item-header">
                      <strong>{item.source}</strong>
                      {item.id ? <code>{item.id}</code> : null}
                    </div>
                    <p>{item.location}</p>
                    {item.description ? <p>{item.description}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pull-request-review__analysis-empty">표시할 분석 근거가 없습니다.</p>
            )}
          </section>
        </>
      )}
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
  canCancel,
  deniedMessage,
  onCancel,
}: {
  analysisStatus: AnalysisStatus;
  actionPending: boolean;
  canCancel: boolean;
  deniedMessage?: string;
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
        {canCancel ? (
          <Button disabled={actionPending} onClick={onCancel} variant="secondary">
            {actionPending ? "취소 요청 중..." : "분석 취소"}
          </Button>
        ) : (
          <p className="pull-request-review__permission-hint" role="status">
            {deniedMessage || "분석 취소는 요청자 또는 OWNER/ADMIN만 가능합니다."}
          </p>
        )}
      </div>
    </section>
  );
}

function AnalysisFailedPanel({
  actionPending,
  canRetry,
  deniedMessage,
  errorMessage,
  onRetry,
  pullRequest,
}: {
  actionPending: boolean;
  canRetry: boolean;
  deniedMessage?: string;
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
        {canRetry ? (
          <Button disabled={actionPending} onClick={onRetry}>
            {actionPending ? "재시도 중..." : "AI 재분석"}
          </Button>
        ) : (
          <p className="pull-request-review__permission-hint" role="status">
            {deniedMessage || OWNED_ACTION_DENIED}
          </p>
        )}
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
  canRequestAnalysis,
  githubListReturnTo,
  onAnalyze,
  pullRequest,
}: {
  canRequestAnalysis: boolean;
  githubListReturnTo: string;
  onAnalyze: () => void;
  pullRequest?: PullRequestDetail;
}) {
  return (
    <section aria-labelledby="analysis-state-title" className="pull-request-review__state-panel">
      <div aria-hidden="true" className="pull-request-review__state-icon pull-request-review__state-icon--failed">×</div>
      <h2 id="analysis-state-title">AI 분석이 취소되었습니다</h2>
      <p>요청한 분석이 중단되었습니다. 필요하면 다시 분석을 시작할 수 있습니다.</p>
      <div className="pull-request-review__state-actions">
        {canRequestAnalysis ? (
          <Button onClick={onAnalyze}>AI 재분석</Button>
        ) : (
          <p className="pull-request-review__permission-hint" role="status">
            {VIEWER_ANALYSIS_DENIED}
          </p>
        )}
        <Link className="ui-button ui-button--secondary ui-button--md" to={githubListReturnTo}>
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
  approvedAt,
  canManageMemory,
  canRegisterMemory,
  githubListReturnTo,
  memoryEnabled,
  memoryEnabledAt,
  onRegisterMemory,
  pullRequest,
  recordActionPending,
}: {
  analysisResult: AnalysisResult | null;
  approvedAt?: string | null;
  canManageMemory: boolean;
  canRegisterMemory: boolean;
  githubListReturnTo: string;
  memoryEnabled: boolean;
  memoryEnabledAt?: string | null;
  onRegisterMemory: () => void;
  pullRequest?: PullRequestDetail;
  recordActionPending: boolean;
}) {
  const roleSummary = analysisResult?.affectedRoles.length
    ? analysisResult.affectedRoles.join(" / ")
    : analysisResult?.impacts.join(" / ");

  return (
    <section aria-labelledby="analysis-state-title" className="pull-request-review__state-panel">
      <div aria-hidden="true" className="pull-request-review__state-icon pull-request-review__state-icon--approved">✓</div>
      <h2 id="analysis-state-title">{ANALYSIS_APPROVED_COPY.title}</h2>
      <p>{ANALYSIS_APPROVED_COPY.description}</p>
      <article className="pull-request-review__approved-summary">
        <h3>{pullRequest?.title ?? analysisResult?.summary ?? "승인된 기록"}</h3>
        {approvedAt ? <p>승인 · {formatPullRequestDate(approvedAt)}</p> : null}
        {roleSummary ? <p>영향 · {roleSummary}</p> : null}
        {memoryEnabled ? (
          <p>
            프로젝트 메모리 등록 완료
            {memoryEnabledAt ? ` · ${formatPullRequestDate(memoryEnabledAt)}` : ""}
          </p>
        ) : null}
      </article>
      <div className="pull-request-review__state-actions">
        {!memoryEnabled && canManageMemory ? (
          <Button
            disabled={!canRegisterMemory}
            onClick={onRegisterMemory}
          >
            {recordActionPending ? "등록 중..." : "프로젝트 메모리에 등록"}
          </Button>
        ) : null}
        <Link className="ui-button ui-button--secondary ui-button--md" to={githubListReturnTo}>
          GitHub 작업 목록
        </Link>
      </div>
    </section>
  );
}
