import { Link } from "react-router-dom";
import { Badge } from "../../../../shared/ui";
import "./ProjectCard.css";

export type ProjectCardProps = {
  id: string;
  icon: string;
  name: string;
  description?: string;
  role: string;
  plan: "Free" | "Starter" | "Team";
  repositoryConnected: boolean;
  approvedRecords: number;
  pendingTasks: number;
  creditsUsed?: number;
  creditsTotal?: number;
  members: string[];
};

export function ProjectCard({
  id, icon, name, description, role, plan,
  repositoryConnected, approvedRecords, pendingTasks,
  creditsUsed, creditsTotal, members,
}: ProjectCardProps) {
  return (
    <article className="project-card">
      <header className="project-card__header">
        <span aria-hidden="true" className="project-card__icon">{icon}</span>
        <div>
          <h2>{name}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </header>

      <dl className="project-card__info-list">
        <div><dt>내 역할</dt><dd>{role}</dd></div>
        <div><dt>플랜</dt><dd><Badge variant="success">{plan}</Badge></dd></div>
        <div>
          <dt>저장소 연결</dt>
          <dd className={repositoryConnected ? "project-card__status--on" : "project-card__status--off"}>
            {repositoryConnected ? "연결됨" : "연결 안됨"}
          </dd>
        </div>
      </dl>

      <div className="project-card__stats">
        <div><span>승인된 기록</span><strong>{approvedRecords.toLocaleString()}</strong></div>
        <div><span>대기 중 작업</span><strong>{pendingTasks}</strong></div>
        <div>
          <span>잔여 크레딧</span>
          <strong>{creditsTotal ? `${creditsUsed?.toLocaleString()} / ${creditsTotal.toLocaleString()}` : "—"}</strong>
        </div>
      </div>

      <div aria-label="프로젝트 멤버" className="project-card__members">
        <span>멤버</span>
        {members.map((initial) => <span className="project-card__avatar" key={initial}>{initial}</span>)}
      </div>

      <Link className="ui-button ui-button--secondary ui-button--md" to={`/projects/${id}/home`}>
        프로젝트 열기
      </Link>
    </article>
  );
}