import { Link } from "react-router-dom";
import { Badge, type BadgeVariant } from "../../../../shared/ui";
import "./PullRequestRow.css";

export type PullRequestRowProps = {
  title: string;
  number: number;
  author: string;
  status: string;
  updatedAt: string;
  filesChanged?: number;
  action?: React.ReactNode;
  githubStatus?: string;
  githubStatusVariant?: BadgeVariant;
  headBranch?: string;
  baseBranch?: string;
  actionLabel?: string;
  actionTo?: string;
};

export function PullRequestRow({
  title,
  number,
  author,
  status,
  updatedAt,
  filesChanged,
  action,
  githubStatus,
  githubStatusVariant = "neutral",
  headBranch,
  baseBranch,
  actionLabel = "열기",
  actionTo,
}: PullRequestRowProps) {
  const isDetailed = Boolean(
    githubStatus || headBranch || baseBranch || actionTo,
  );

  if (isDetailed) {
    return (
      <article className="pull-request-row pull-request-row--detailed">
        <div className="pull-request-row__title-cell">
          <h3><span>#{number}</span> {title}</h3>
        </div>
        <div className="pull-request-row__detail" data-label="작성자">{author}</div>
        <div className="pull-request-row__detail" data-label="상태">
          <Badge variant={githubStatusVariant}>{githubStatus ?? status}</Badge>
        </div>
        <div className="pull-request-row__branch" data-label="브랜치">
          <span>{headBranch ?? "-"}</span>
          {baseBranch ? <small>→ {baseBranch}</small> : null}
        </div>
        <div className="pull-request-row__detail" data-label="업데이트">{updatedAt}</div>
        <div className="pull-request-row__action">
          {action ?? (actionTo ? (
            <Link
              aria-label={`Pull Request #${number} ${actionLabel}`}
              className="ui-button ui-button--secondary ui-button--sm"
              to={actionTo}
            >
              {actionLabel}
            </Link>
          ) : null)}
        </div>
      </article>
    );
  }

  return (
    <article className="pull-request-row">
      <div className="pull-request-row__main">
        <h3>
          #{number} {title}
        </h3>
        <p>
          {author} · {updatedAt}
          {filesChanged !== undefined ? ` · ${filesChanged} files` : ""}
        </p>
      </div>
      <div className="pull-request-row__meta">
        <Badge variant="info">{status}</Badge>
        {action}
      </div>
    </article>
  );
}
