import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { PageContainer, ResponsiveGrid } from "../../shared/layouts";
import { EmptyState, Pagination, SearchInput } from "../../shared/ui";
import { TopBar } from "../workspace/components/TopBar";
import { ProjectCard } from "./components";
import {
  DEFAULT_PROJECT_SELECT_STATE,
  DEFAULT_PROJECT_SORT_OPTION,
  DEFAULT_PROJECT_STATUS_OPTION,
  projectSelectMock,
  projectSortOptions,
  projectStatusOptions,
  type ProjectSelectViewState,
  type ProjectSortOption,
  type ProjectStatusOption,
} from "./projectSelectMock";
import "./ProjectSelectScreen.css";

const viewStates: ProjectSelectViewState[] = ["success", "empty"];
const PAGE_SIZE = 3;

function isProjectSelectViewState(value: string | null): value is ProjectSelectViewState {
  return value !== null && viewStates.includes(value as ProjectSelectViewState);
}

export function ProjectSelectScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const stateParam = searchParams.get("state");
  const viewState = isProjectSelectViewState(stateParam) ? stateParam : DEFAULT_PROJECT_SELECT_STATE;

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<ProjectSortOption>(DEFAULT_PROJECT_SORT_OPTION);
  const [statusOption, setStatusOption] = useState<ProjectStatusOption>(DEFAULT_PROJECT_STATUS_OPTION);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("ko-KR");

    return projectSelectMock
      .filter((project) => project.name.toLocaleLowerCase("ko-KR").includes(normalizedSearch))
      .filter((project) => {
        if (statusOption === "연결됨") return project.repositoryConnected;
        if (statusOption === "연결 안됨") return !project.repositoryConnected;
        return true;
      })
      .sort((left, right) => {
        const direction = sortOption === "최근 활동 순" ? -1 : 1;
        return left.lastActivityAt.localeCompare(right.lastActivityAt) * direction;
      });
  }, [searchTerm, sortOption, statusOption]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pageProjects = filteredProjects.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const isProjectsEmpty = viewState === "empty";
  const isSearchEmpty = !isProjectsEmpty && filteredProjects.length === 0;
  const emptyResultDescription = searchTerm.trim()
    ? `"${searchTerm.trim()}"와 일치하는 프로젝트가 없습니다. 다른 검색어나 필터를 사용해보세요.`
    : "선택한 필터와 일치하는 프로젝트가 없습니다. 다른 조건을 사용해보세요.";

  function updateSearchTerm(value: string) {
    setSearchTerm(value);
    setCurrentPage(1);
  }

  function updateSortOption(value: ProjectSortOption) {
    setSortOption(value);
    setCurrentPage(1);
  }

  function updateStatusOption(value: ProjectStatusOption) {
    setStatusOption(value);
    setCurrentPage(1);
  }

  function resetFilters() {
    setSearchTerm("");
    setSortOption(DEFAULT_PROJECT_SORT_OPTION);
    setStatusOption(DEFAULT_PROJECT_STATUS_OPTION);
    setCurrentPage(1);
  }

  return (
    <main className="project-select">
      {/* TODO: 실제 로그인 사용자 이름으로 교체 */}
      <TopBar title="내 프로젝트" user="홍길동" />

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
              aria-label="프로젝트 이름으로 검색"
              onChange={(event) => updateSearchTerm(event.target.value)}
              onClear={() => updateSearchTerm("")}
              placeholder="프로젝트 이름으로 검색"
              value={searchTerm}
            />
            <div className="project-select__toolbar-actions">
              <label className="project-select__visually-hidden" htmlFor="project-select-status">
                저장소 연결 상태
              </label>
              <select
                id="project-select-status"
                onChange={(event) => updateStatusOption(event.target.value as ProjectStatusOption)}
                value={statusOption}
              >
                {projectStatusOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <label className="project-select__visually-hidden" htmlFor="project-select-sort">
                프로젝트 정렬
              </label>
              <select
                id="project-select-sort"
                onChange={(event) => updateSortOption(event.target.value as ProjectSortOption)}
                value={sortOption}
              >
                {projectSortOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
          </div>

            {isProjectsEmpty ? (
            <EmptyState
                icon={<span aria-hidden="true" className="project-select__empty-icon" />}
                action={{ label: "새 프로젝트 만들기", onClick: () => navigate("/projects/new") }}
                description="새 프로젝트를 만들거나 초대 링크를 통해 팀 프로젝트에 참여할 수 있습니다."
                title="아직 참여 중인 프로젝트가 없어요"
            />
            ) : isSearchEmpty ? (
            <EmptyState
                icon={<span aria-hidden="true" className="project-select__empty-icon" />}
                action={{ label: "검색 조건 초기화", onClick: resetFilters }}
                description={emptyResultDescription}
                title="검색 결과가 없어요"
            />
            ) : (
            <>
              <ResponsiveGrid desktopColumns={3} tabletColumns={2}>
                  {pageProjects.map((project) => (
                  <ProjectCard key={project.id} {...project} />
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
