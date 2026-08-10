import { useNavigate, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { PageContainer, ResponsiveGrid } from "../../shared/layouts";
import { Button, EmptyState, SearchInput } from "../../shared/ui";
import { TopBar } from "../workspace/components/TopBar";
import { ProjectCard } from "./components";
import {
  DEFAULT_PROJECT_SELECT_STATE,
  projectSelectMock,
  type ProjectSelectViewState,
} from "./projectSelectMock";
import "./ProjectSelectScreen.css";

const viewStates: ProjectSelectViewState[] = ["success", "empty"];

function isProjectSelectViewState(value: string | null): value is ProjectSelectViewState {
  return value !== null && viewStates.includes(value as ProjectSelectViewState);
}

export function ProjectSelectScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const stateParam = searchParams.get("state");
  const viewState = isProjectSelectViewState(stateParam) ? stateParam : DEFAULT_PROJECT_SELECT_STATE;

  return (
    <main className="project-select">
      {/* TODO: 실제 로그인 사용자 이름으로 교체 */}
      <TopBar title="내 프로젝트" user="홍길동" />

      <PageContainer size="full">
        <div className="project-select__content">
          <div className="project-select__heading">
            <div>
              <h2>내 프로젝트</h2>
              <p>참여 중인 프로젝트를 선택하거나 새 프로젝트를 생성하세요.</p>
            </div>
            <Link className="ui-button ui-button--primary ui-button--md" to="/projects/new">
              + 새 프로젝트
            </Link>
          </div>

          <div className="project-select__toolbar">
            <SearchInput
              aria-label="프로젝트 검색 (준비 중)"
              disabled
              placeholder="프로젝트 검색 (준비 중)"
            />
            <div className="project-select__toolbar-actions">
              <Button disabled size="md" variant="secondary">전체 상태 ⌄</Button>
              <Button disabled size="md" variant="secondary">최근 활동 순 ⌄</Button>
            </div>
          </div>

            {viewState === "success" ? (
            <ResponsiveGrid desktopColumns={3} tabletColumns={2}>
                {projectSelectMock.map((project) => (
                <ProjectCard key={project.id} {...project} />
                ))}
            </ResponsiveGrid>
            ) : (
            <EmptyState
                icon={<span aria-hidden="true" className="project-select__empty-icon" />}
                action={{ label: "새 프로젝트 만들기", onClick: () => navigate("/projects/new") }}
                description="새 프로젝트를 만들거나 초대 링크를 통해 팀 프로젝트에 참여할 수 있습니다."
                title="아직 참여 중인 프로젝트가 없어요"
            />
            )}
        </div>
      </PageContainer>
    </main>
  );
}