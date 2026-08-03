import { Badge } from "../../../../shared/ui";
import "./ProjectCard.css";

export type ProjectCardProps = {
  name: string;
  description?: string;
  repositoryLabel?: string;
  memberCount?: number;
  status?: string;
  action?: React.ReactNode;
};

export function ProjectCard({
  name,
  description,
  repositoryLabel,
  memberCount,
  status,
  action,
}: ProjectCardProps) {
  return (
    <article className="project-card">
      <header className="project-card__header">
        <div>
          <h2>{name}</h2>
          {repositoryLabel ? <p>{repositoryLabel}</p> : null}
        </div>
        {status ? <Badge variant="info">{status}</Badge> : null}
      </header>
      {description ? <p className="project-card__description">{description}</p> : null}
      <footer className="project-card__footer">
        {memberCount !== undefined ? <span>{memberCount} members</span> : <span />}
        {action}
      </footer>
    </article>
  );
}
