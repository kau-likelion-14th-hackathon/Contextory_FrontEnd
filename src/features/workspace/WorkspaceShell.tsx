import { useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { mainNavigation } from "../../shared/navigation/routes";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { TopBar } from "./components/TopBar";

export function WorkspaceShell() {
  const { projectId = "unknown-project" } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="workspace-route-shell">
      <TopBar
        title={projectId}
        subtitle="Repository not connected"
        onMenuClick={() => setSidebarOpen(true)}
        actions={
          <NavLink className="ui-button ui-button--secondary ui-button--md" to="/account">
            Account
          </NavLink>
        }
      />

      <div className="workspace-route-shell__body">
        <ProjectSidebar
          projectName="Contextory MVP"
          repositoryLabel="Repository not connected"
          items={mainNavigation.map((item) => ({ label: item.label, to: item.path }))}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <Outlet />
      </div>
    </div>
  );
}
