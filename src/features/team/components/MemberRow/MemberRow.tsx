import { RoleBadge } from "../../../../shared/ui";
import "./MemberRow.css";

export type MemberRowProps = {
  name: string;
  email: string;
  role: string;
  status?: string;
  action?: React.ReactNode;
};

export function MemberRow({ name, email, role, status, action }: MemberRowProps) {
  return (
    <article className="member-row">
      <div className="member-row__identity">
        <span className="member-row__avatar" aria-hidden="true">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h3>{name}</h3>
          <p>{email}</p>
        </div>
      </div>
      <div className="member-row__meta">
        <RoleBadge role={role} />
        {status ? <span>{status}</span> : null}
        {action}
      </div>
    </article>
  );
}
