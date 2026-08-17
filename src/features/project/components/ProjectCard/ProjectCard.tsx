import { Link } from "react-router-dom";
import { Badge } from "../../../../shared/ui";
import "./ProjectCard.css";

export type ProjectCardProps = {
  id: string | number;
  icon?: string;
  name: string;
  description?: string;
  role?: string;
  plan?: string | null;
  repositoryConnected?: boolean;
  approvedRecords?: number;
  pendingTasks?: number;
  creditBalance?: number | null;
  creditsUsed?: number;
  creditsTotal?: number;
  members?: string[];
};

export function ProjectCard({
  id, icon, name, description, role, plan,
  repositoryConnected, approvedRecords, pendingTasks,
  creditBalance, creditsUsed, creditsTotal, members,
}: ProjectCardProps) {
  const hasProjectInfo = role !== undefined || plan !== undefined || repositoryConnected !== undefined;
  const showCreditBalance = creditBalance !== undefined
    || (repositoryConnected !== undefined && creditsUsed === undefined && creditsTotal === undefined);
  const hasProjectStats = approvedRecords !== undefined
    || pendingTasks !== undefined
    || showCreditBalance
    || (creditsUsed !== undefined && creditsTotal !== undefined);

  return (
    <article className="project-card">
      <header className="project-card__header">
        <span aria-hidden="true" className="project-card__icon">{icon ?? name.slice(0, 1)}</span>
        <div>
          <h2>{name}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </header>

      {hasProjectInfo ? (
        <dl className="project-card__info-list">
          {role !== undefined ? <div><dt>내 역할</dt><dd>{role}</dd></div> : null}
          <div>
            <dt>플랜</dt>
            <dd>{plan == null ? "—" : <Badge variant="success">{plan}</Badge>}</dd>
          </div>
          {repositoryConnected !== undefined ? (
            <div>
              <dt>저장소 연결</dt>
              <dd className={repositoryConnected ? "project-card__status--on" : "project-card__status--off"}>
                {repositoryConnected ? "연결됨" : "연결 안됨"}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {hasProjectStats ? (
        <div className="project-card__stats">
          {approvedRecords !== undefined ? <div><span>승인된 기록</span><strong>{approvedRecords.toLocaleString()}</strong></div> : null}
          {pendingTasks !== undefined ? <div><span>대기 중 작업</span><strong>{pendingTasks}</strong></div> : null}
          {showCreditBalance ? (
            <div>
              <span>잔여 크레딧</span>
              <strong>{typeof creditBalance === "number" ? creditBalance.toLocaleString() : "—"}</strong>
            </div>
          ) : null}
          {creditsUsed !== undefined && creditsTotal !== undefined ? (
            <div>
              <span>크레딧 사용량</span>
              <strong>{`${creditsUsed.toLocaleString()} / ${creditsTotal.toLocaleString()}`}</strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {members?.length ? (
        <div aria-label="프로젝트 멤버" className="project-card__members">
          <span>멤버</span>
          {members.map((initial, index) => (
            <span className="project-card__avatar" key={`${initial}-${index}`}>{initial}</span>
          ))}
        </div>
      ) : null}

      <Link
        className="ui-button ui-button--secondary ui-button--md"
        state={{ projectName: name }}
        to={`/projects/${id}/home`}
      >
        프로젝트 열기
      </Link>
    </article>
  );
}
