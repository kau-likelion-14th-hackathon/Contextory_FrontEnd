import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageContainer, ResponsiveGrid } from "../../shared/layouts";
import { Badge, Button, EmptyState, ErrorState, LoadingState } from "../../shared/ui";
import { KpiCard } from "./components";
import {
  DEFAULT_PROJECT_HOME_ROLE,
  DEFAULT_PROJECT_HOME_STATE,
  projectHomeActivityMock,
  projectHomeMockByRole,
  projectHomePlanMock,
  projectHomeTrialMock,
  type ProjectHomeRole,
  type ProjectHomeViewState,
} from "./projectHomeMock";
import "./ProjectHomeScreen.css";

const viewStates: ProjectHomeViewState[] = ["loading", "empty", "error", "success"];

function isProjectHomeRole(value: string | null): value is ProjectHomeRole {
  return value === "admin" || value === "member";
}

function isProjectHomeViewState(value: string | null): value is ProjectHomeViewState {
  return value !== null && viewStates.includes(value as ProjectHomeViewState);
}

export function ProjectHomeScreen() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const stateParam = searchParams.get("state");
  const role = isProjectHomeRole(roleParam) ? roleParam : DEFAULT_PROJECT_HOME_ROLE;
  const viewState = isProjectHomeViewState(stateParam) ? stateParam : DEFAULT_PROJECT_HOME_STATE;
  const data = projectHomeMockByRole[role];
  const [followUps, setFollowUps] = useState(data.followUps);
  const [feedback, setFeedback] = useState({ message: "", revision: 0 });

  useEffect(() => {
    setFollowUps(data.followUps);
  }, [data.followUps]);

  const toggleFollowUp = (id: string) => {
    setFollowUps((items) =>
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
  };

  const announceFeedback = (message: string) => {
    setFeedback((current) => ({ message, revision: current.revision + 1 }));
  };

  return (
    <main className="project-home">
      <PageContainer size="full">
        <div className="project-home__content">
          <header className="project-home__header">
            <div className="project-home__heading">
              <h1>{data.title}</h1>
              <p>{data.description}</p>
            </div>
            <aside className="project-home__trial" aria-label="무료 체험 안내">
              <div>
                <strong>{projectHomeTrialMock.title}</strong>
                <span>{projectHomeTrialMock.description}</span>
              </div>
              <Link
                aria-label="프로젝트 플랜 변경"
                className="ui-button ui-button--secondary ui-button--sm"
                to="../settings?tab=billing"
              >
                플랜 변경
              </Link>
            </aside>
          </header>
          <p aria-atomic="true" aria-live="polite" className="project-home__feedback">
            {feedback.message ? <span key={feedback.revision}>{feedback.message}</span> : null}
          </p>

          {viewState === "loading" ? (
            <LoadingState title="프로젝트 홈을 불러오는 중입니다" description="최근 프로젝트 변경과 후속 작업을 확인하고 있습니다." />
          ) : null}
          {viewState === "empty" ? (
            <EmptyState title="표시할 프로젝트 활동이 없습니다" description="새로운 변경이나 프로젝트 기록이 수집되면 이곳에서 확인할 수 있습니다." />
          ) : null}
          {viewState === "error" ? (
            <ErrorState
              title="프로젝트 홈을 불러오지 못했습니다"
              description="잠시 후 다시 시도해주세요. 현재 화면은 개발용 mock 상태입니다."
              action={{ label: "다시 시도", onClick: () => undefined }}
            />
          ) : null}

          {viewState === "success" ? (
            <div className="project-home__sections">
              <section aria-labelledby="project-home-kpis">
                <h2 className="project-home__visually-hidden" id="project-home-kpis">프로젝트 요약</h2>
                <ResponsiveGrid desktopColumns={4} tabletColumns={2}>
                  {data.kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
                </ResponsiveGrid>
              </section>

              <div className="project-home__columns">
                <section className="project-home__panel project-home__updates" aria-labelledby="project-updates-title">
                  <div className="project-home__panel-header">
                    <h2 id="project-updates-title">{data.updateSectionTitle}</h2>
                    <Link className="ui-button ui-button--secondary ui-button--sm" to="../records">
                      모든 변경 보기
                    </Link>
                  </div>
                  <div className="project-home__update-list">
                    {data.updates.map((update) => (
                      <article className="project-home__update" key={update.id}>
                        <div className="project-home__update-badge">
                          <Badge variant={update.badgeVariant}>{update.badge}</Badge>
                        </div>
                        <div className="project-home__update-copy">
                          <h3>{update.title}</h3>
                          <p>{update.summary}</p>
                        </div>
                        <time>{update.createdAt}</time>
                      </article>
                    ))}
                  </div>
                </section>

                <div className="project-home__right-column">
                  <section className="project-home__panel project-home__tasks" aria-labelledby="follow-up-title">
                    <div className="project-home__panel-header">
                      <h2 id="follow-up-title">{data.taskSectionTitle}</h2>
                      <Button
                        onClick={() => announceFeedback("후속 작업 전체 보기 기능은 아직 연결되지 않았습니다.")}
                        size="sm"
                        variant="secondary"
                      >
                        전체 보기
                      </Button>
                    </div>
                    <div className="project-home__task-list">
                      {followUps.map((item) => (
                        <article className="project-home__task" key={item.id}>
                          <Button
                            aria-label={`${item.content} ${item.completed ? "완료 해제" : "완료 처리"}`}
                            aria-pressed={item.completed}
                            className="project-home__task-check"
                            onClick={() => toggleFollowUp(item.id)}
                            size="sm"
                            variant="ghost"
                          >
                            {item.completed ? "✓" : "□"}
                          </Button>
                          <div className="project-home__task-copy">
                            <h3>{item.content}</h3>
                            <p>{item.targetRole} · {item.assignee}</p>
                          </div>
                          <Badge variant={item.completed ? "success" : item.priorityVariant}>
                            {item.completed ? "완료" : item.priority}
                          </Badge>
                          <time>{item.due}</time>
                        </article>
                      ))}
                    </div>
                  </section>

                  <div className="project-home__bottom-cards">
                    <section className="project-home__compact-card" aria-labelledby="plan-credit-title">
                      <h2 id="plan-credit-title">플랜 및 크레딧</h2>
                      <Badge variant="success">{projectHomePlanMock.name}</Badge>
                      <strong>{projectHomePlanMock.used} / {projectHomePlanMock.total}</strong>
                      <div
                        aria-label={`크레딧 ${projectHomePlanMock.usagePercent}% 사용`}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={projectHomePlanMock.usagePercent}
                        className="project-home__progress"
                        role="progressbar"
                      >
                        <span style={{ width: `${projectHomePlanMock.usagePercent}%` }} />
                      </div>
                      <Link
                        className="ui-button ui-button--primary ui-button--sm project-home__billing-link"
                        to="../settings?tab=billing"
                      >
                        결제 및 플랜 관리
                      </Link>
                    </section>

                    <section className="project-home__compact-card" aria-labelledby="recent-activity-title">
                      <h2 id="recent-activity-title">최근 활동</h2>
                      <ul className="project-home__activity-list">
                        {projectHomeActivityMock.map((activity) => (
                          <li key={activity}><span aria-hidden="true" />{activity}</li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </PageContainer>
    </main>
  );
}
