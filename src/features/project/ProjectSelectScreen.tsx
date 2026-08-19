import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../shared/api/client";
import { getCurrentUser } from "../../shared/api/session";
import { PageContainer, ResponsiveGrid } from "../../shared/layouts";
import { EmptyState, ErrorState, LoadingState, Pagination, SearchInput } from "../../shared/ui";
import { TopBar } from "../workspace/components/TopBar";
import { ProjectCard } from "./components";
import {
  getProjects,
  type ProjectListResponse,
} from "./projectApi";
import "./ProjectSelectScreen.css";

const PAGE_SIZE = 3;
const projectStatusOptions = ["전체 상태", "연결됨", "연결 안됨"] as const;
type RequestState = "loading" | "success" | "error";

export function ProjectSelectScreen() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [currentPage, setCurrentPage] = useState(1);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [projectList, setProjectList] = useState<ProjectListResponse>();
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setRequestState("loading");
    setErrorMessage("");

    getProjects(
      { size: PAGE_SIZE, status: "ACTIVE", uiPage: currentPage },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        const totalPages = Math.max(1, Math.ceil(result.totalElements / result.size));
        if (result.totalElements > 0 && currentPage > totalPages) {
          setCurrentPage(totalPages);
          return;
        }
        setProjectList(result);
        setRequestState("success");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setErrorMessage(getApiErrorMessage(error, "프로젝트 목록을 불러오지 못했습니다."));
        setRequestState("error");
      });

    return () => controller.abort();
  }, [currentPage, retryKey]);

  const totalPages = projectList
    ? Math.max(1, Math.ceil(projectList.totalElements / projectList.size))
    : 1;
  const isProjectsEmpty = projectList?.totalElements === 0;

  return (
    <main className="project-select">
      <TopBar
        title="내 프로젝트"
        user={currentUser?.username}
        userEmail={currentUser?.loginId}
      />

      <PageContainer size="full">
        <div className="project-select__content">
          <div className="project-select__heading">
            <div>
              <h1>내 프로젝트</h1>
              <p>참여 중인 프로젝트를 선택하거나 새 프로젝트를 생성하세요.</p>
            </div>
            <Link className="ui-button ui-button--primary ui-button--md" to="/projects/new">
              + 새 프로젝트
            </Link>
          </div>

          <div className="project-select__toolbar">
            <SearchInput
              aria-describedby="project-select-filter-scope"
              aria-label="프로젝트 이름 검색 준비 중"
              disabled
              placeholder="프로젝트 이름으로 검색"
              value=""
            />
            <div className="project-select__toolbar-actions">
              <label className="project-select__visually-hidden" htmlFor="project-select-status">
                저장소 연결 상태
              </label>
              <select
                aria-describedby="project-select-filter-scope"
                disabled
                id="project-select-status"
                value="전체 상태"
              >
                {projectStatusOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <label className="project-select__visually-hidden" htmlFor="project-select-sort">
                프로젝트 정렬
              </label>
              <select disabled id="project-select-sort" value="서버 기본 순서">
                <option>서버 기본 순서</option>
              </select>
            </div>
          </div>

          <p className="project-select__filter-scope" id="project-select-filter-scope">
            서버 검색 및 저장소 연결 필터 API가 아직 제공되지 않아 현재 사용할 수 없습니다.
          </p>

          {requestState === "loading" ? (
            <LoadingState
              description="참여 중인 프로젝트 정보를 가져오고 있습니다."
              title="프로젝트 목록을 불러오는 중입니다"
            />
          ) : requestState === "error" ? (
            <ErrorState
              action={{ label: "다시 불러오기", onClick: () => setRetryKey((value) => value + 1) }}
              description={errorMessage}
              title="프로젝트 목록을 불러오지 못했습니다"
            />
          ) : isProjectsEmpty ? (
            <EmptyState
              icon={<span aria-hidden="true" className="project-select__empty-icon" />}
              action={{ label: "새 프로젝트 만들기", onClick: () => navigate("/projects/new") }}
              description="새 프로젝트를 만들거나 초대 링크를 통해 팀 프로젝트에 참여할 수 있습니다."
              title="아직 참여 중인 프로젝트가 없어요"
            />
          ) : (
            <>
              <ResponsiveGrid desktopColumns={3} tabletColumns={2}>
                {projectList?.content.map((project) => (
                  <ProjectCard
                    creditBalance={project.creditBalance}
                    id={project.projectId}
                    key={project.projectId}
                    name={project.name}
                    plan={project.planName}
                    repositoryConnected={project.repositoryConnected}
                    role={project.myPermissionRole}
                  />
                ))}
              </ResponsiveGrid>
              {totalPages > 1 ? (
                <div className="project-select__pagination">
                  <Pagination
                    ariaLabel="내 프로젝트 페이지"
                    currentPage={currentPage}
                    nextLabel="다음 페이지"
                    onPageChange={setCurrentPage}
                    previousLabel="이전 페이지"
                    totalPages={totalPages}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </PageContainer>
    </main>
  );
}
