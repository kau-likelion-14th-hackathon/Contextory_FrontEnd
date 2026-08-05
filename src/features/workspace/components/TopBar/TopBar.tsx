import "./TopBar.css";

export type TopBarProps = {
  title: string;
  subtitle?: string;
  user?: string;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
};

export function TopBar({ title, subtitle, user, actions, onMenuClick }: TopBarProps) {
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
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {actions || user ? (
        <div className="top-bar__actions">
          {actions}
          {user ? <strong className="top-bar__user">{user}</strong> : null}
        </div>
      ) : null}
    </header>
  );
}
