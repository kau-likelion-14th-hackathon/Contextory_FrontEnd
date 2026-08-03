import { Badge } from "../../../../shared/ui";
import "./MemoryItem.css";

export type MemoryItemProps = {
  title: string;
  summary: string;
  type: string;
  approvedAt?: string;
  affectedRoles?: string[];
};

export function MemoryItem({
  title,
  summary,
  type,
  approvedAt,
  affectedRoles = [],
}: MemoryItemProps) {
  return (
    <article className="memory-item">
      <header className="memory-item__header">
        <Badge variant="neutral">{type}</Badge>
        {approvedAt ? <span>{approvedAt}</span> : null}
      </header>
      <h3>{title}</h3>
      <p>{summary}</p>
      {affectedRoles.length ? (
        <div className="memory-item__roles">
          {affectedRoles.map((role) => (
            <Badge key={role} variant="info">
              {role}
            </Badge>
          ))}
        </div>
      ) : null}
    </article>
  );
}
