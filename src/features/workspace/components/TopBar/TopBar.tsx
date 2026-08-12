import "./TopBar.css";
import { ProfileMenu } from "./ProfileMenu";

export type TopBarProps = {
  title?: string;
  subtitle?: string;
  user?: string;
  userEmail?: string;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
  onProfileFeedback?: (message: string) => void;
};

export function TopBar({
  title,
  subtitle,
  user,
  userEmail = "hong@example.com",
  actions,
  onMenuClick,
  onProfileFeedback,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar__leading">
        {onMenuClick ? (
          <button
            aria-label="Open project navigation"
            className="top-bar__menu"
            onClick={onMenuClick}
            type="button"
          >
            ☰
          </button>
        ) : null}
        <div>
          <p className="eyebrow">Contextory</p>
          {title ? <h1>{title}</h1> : null}
          {subtitle ? <p className="top-bar__subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {actions || user ? (
        <div className="top-bar__actions">
          {actions}
          {user ? (
            <ProfileMenu email={userEmail} name={user} onFeedback={onProfileFeedback} />
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
