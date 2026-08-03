import { Badge } from "../../../../shared/ui";
import "./PullRequestRow.css";

export type PullRequestRowProps = {
  title: string;
  number: number;
  author: string;
  status: string;
  updatedAt: string;
  filesChanged?: number;
  action?: React.ReactNode;
};

export function PullRequestRow({
  title,
  number,
  author,
  status,
  updatedAt,
  filesChanged,
  action,
}: PullRequestRowProps) {
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
