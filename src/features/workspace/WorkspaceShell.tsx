import { NavLink, Outlet, useParams } from "react-router-dom";
import { mainNavigation } from "../../shared/navigation/routes";

export function WorkspaceShell() {
  const { projectId = "unknown-project" } = useParams();

  return (
    <div className="workspace-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Contextory</p>
          <h1>{projectId}</h1>
        </div>
        <NavLink className="button button--secondary" to="/account">
          Account
        </NavLink>
      </header>

      <div className="workspace-body">
        <aside className="sidebar" aria-label="Project navigation">
          <div className="sidebar__summary">
            <strong>Contextory MVP</strong>
            <span>Repository not connected</span>
          </div>
          <nav className="sidebar__nav">
            {mainNavigation.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
                }
                key={item.path}
                to={item.path}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <Outlet />
      </div>
    </div>
  );
}
