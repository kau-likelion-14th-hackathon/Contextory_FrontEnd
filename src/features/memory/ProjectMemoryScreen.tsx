import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { getApiErrorMessage } from "../../shared/api/client";
import { PageContainer } from "../../shared/layouts";
import { Badge, EmptyState, ErrorState, LoadingState, Pagination } from "../../shared/ui";
import { parseAnalysisResult } from "../analysis/analysisApi";
import { canViewAnalysisContentByRole } from "../analysis/analysisPermissions";
import type { ProjectWorkspaceContextValue } from "../workspace/WorkspaceShell";
import {
  getProjectMemories,
  type ProjectMemoryListItem,
  type ProjectMemoryListResponse,
} from "./projectMemoryApi";
import "./ProjectMemoryScreen.css";

const DEFAULT_PAGE_SIZE = 20;
const pageSizeOptions = [10, 20, 50] as const;

type MemoryLoadState = "loading" | "success" | "empty" | "error" | "forbidden";

function formatApprovedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
}

function getMemoryListTitle(item: ProjectMemoryListItem) {
  const parsed = parseAnalysisResult(item.analysisResult);
  const summary = parsed?.summary.trim();
  if (summary) return summary;
  return `PR #${item.prNumber} 분석`;
}

function getMemoryListDescription(item: ProjectMemoryListItem) {
  const parsed = parseAnalysisResult(item.analysisResult);
  if (!parsed) return null;
  if (parsed.hasExtendedFields) {
    const purpose = parsed.purpose.trim();
    if (purpose) return purpose;
  }
  return null;
}

export function ProjectMemoryScreen() {
  const { projectId = "" } = useParams();
  const { project } = useOutletContext<ProjectWorkspaceContextValue>();
  const canViewMemories = canViewAnalysisContentByRole(project?.myPermissionRole);
  const [loadState, setLoadState] = useState<MemoryLoadState>(
    canViewMemories ? "loading" : "forbidden",
  );
  const [retryKey, setRetryKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<ProjectMemoryListResponse>();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!projectId) return;

    if (!canViewMemories) {
      setLoadState("forbidden");
      setResult(undefined);
      setErrorMessage("");
      return;
    }

    const controller = new AbortController();
    setLoadState("loading");
    setErrorMessage("");

    void getProjectMemories(
      projectId,
      { page: currentPage - 1, size: pageSize },
      controller.signal,
    )
      .then((response) => {
        if (controller.signal.aborted) return;
        if (response.content.length === 0 && currentPage > 1 && response.totalElements > 0) {
          setCurrentPage((page) => Math.max(1, page - 1));
          return;
        }
        setResult(response);
        setLoadState(response.totalElements === 0 ? "empty" : "success");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult(undefined);
        setLoadState("error");
        setErrorMessage(getApiErrorMessage(error, "프로젝트 메모리 목록을 불러오지 못했습니다."));
      });

    return () => controller.abort();
  }, [canViewMemories, currentPage, pageSize, projectId, retryKey]);

  const totalPages = Math.max(1, result?.totalPages ?? 1);

  return (
    <main className="project-memory">
      <PageContainer size="full">
        <div className="project-memory__content">
          <header className="project-memory__header">
            <div>
              <h1>프로젝트 메모리</h1>
              <p>승인 후 메모리에 등록된 프로젝트 기록을 확인하세요.</p>
            </div>
            <Badge className="project-memory__approved-pill" variant="success">
              메모리 등록된 기록만 표시
            </Badge>
          </header>

          {loadState === "forbidden" ? (
            <EmptyState
              description="VIEWER 권한에서는 프로젝트 메모리를 조회할 수 없습니다."
              details={(
                <Link className="ui-button ui-button--secondary ui-button--md" to={`/projects/${projectId}/home`}>
                  프로젝트 홈
                </Link>
              )}
              title="프로젝트 메모리를 조회할 수 없습니다"
            />
          ) : null}

          {loadState === "loading" ? (
            <LoadingState
              description="승인된 프로젝트 메모리 목록을 확인하고 있습니다."
              title="프로젝트 메모리를 불러오는 중입니다"
            />
          ) : null}

          {loadState === "error" ? (
            <ErrorState
              action={{ label: "다시 시도", onClick: () => setRetryKey((key) => key + 1) }}
              description={errorMessage || "잠시 후 다시 시도해주세요."}
              title="프로젝트 메모리를 불러오지 못했습니다"
            />
          ) : null}

          {loadState === "empty" ? (
            <MemoryEmptyState projectId={projectId} />
          ) : null}

          {loadState === "success" && result ? (
            <>
              <span aria-live="polite" className="project-memory__visually-hidden">
                {result.totalElements}개의 프로젝트 메모리
              </span>
              <section className="project-memory__list" aria-label="프로젝트 메모리 목록">
                {result.content.map((item) => (
                  <MemoryRecordItem key={item.recordId} projectId={projectId} item={item} />
                ))}
              </section>
              <footer className="project-memory__pagination">
                <p>총 {result.totalElements}개 기록</p>
                <div className="project-memory__pagination-controls">
                  <label htmlFor="project-memory-page-size">페이지당 기록 수</label>
                  <select
                    id="project-memory-page-size"
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    value={pageSize}
                  >
                    {pageSizeOptions.map((size) => (
                      <option key={size} value={size}>{size}개씩 보기</option>
                    ))}
                  </select>
                  <Pagination
                    ariaLabel="프로젝트 메모리 페이지"
                    currentPage={currentPage}
                    nextLabel="다음 페이지"
                    onPageChange={setCurrentPage}
                    previousLabel="이전 페이지"
                    totalPages={totalPages}
                  />
                </div>
              </footer>
            </>
          ) : null}
        </div>
      </PageContainer>
    </main>
  );
}

function MemoryRecordItem({
  projectId,
  item,
}: {
  projectId: string;
  item: ProjectMemoryListItem;
}) {
  const title = getMemoryListTitle(item);
  const description = getMemoryListDescription(item);
  const parsed = parseAnalysisResult(item.analysisResult);
  const roles = parsed?.affectedRoles.filter(Boolean) ?? [];

  return (
    <Link
      aria-label={`${title} 상세 보기`}
      className="project-memory__record"
      to={`/projects/${projectId}/analyses/${item.analysisId}`}
    >
      <div className="project-memory__record-copy">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {roles.length > 0 ? (
          <div className="project-memory__roles" aria-label={`영향 역할: ${roles.join(", ")}`}>
            {roles.map((role) => (
              <Badge key={role} variant="neutral">{role}</Badge>
            ))}
          </div>
        ) : null}
      </div>
      <dl className="project-memory__record-meta">
        <div>
          <dt>승인일</dt>
          <dd>{formatApprovedAt(item.approvedAt)}</dd>
        </div>
        <div>
          <dt>연결 PR</dt>
          <dd>#{item.prNumber}</dd>
        </div>
        <div>
          <dt>분석 ID</dt>
          <dd>{item.analysisId}</dd>
        </div>
      </dl>
    </Link>
  );
}

function MemoryEmptyState({ projectId }: { projectId: string }) {
  return (
    <section className="project-memory__state" aria-label="프로젝트 기록 없음">
      <EmptyState
        description="AI 분석을 승인하고 프로젝트 메모리에 등록하면 이곳에 표시됩니다."
        details={
          <Link className="ui-button ui-button--primary ui-button--sm" to={`/projects/${projectId}/github`}>
            GitHub 작업으로 이동
          </Link>
        }
        icon={<span aria-hidden="true">○</span>}
        title="아직 등록된 프로젝트 메모리가 없어요"
      />
    </section>
  );
}
