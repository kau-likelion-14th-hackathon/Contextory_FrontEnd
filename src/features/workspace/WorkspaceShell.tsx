import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { mainNavigation } from "../../shared/navigation/routes";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { TopBar } from "./components/TopBar";

export function WorkspaceShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const locationProjectName = (location.state as { projectName?: unknown } | null)?.projectName;
  const projectName = typeof locationProjectName === "string" && locationProjectName.trim()
    ? locationProjectName
    : "프로젝트";

  return (
    <div className="workspace-route-shell">
      <TopBar
        title={projectName}
        user="홍길동"
        userEmail="hong@example.com"
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="workspace-route-shell__body">
        <ProjectSidebar
          projectName={projectName}
          items={mainNavigation.map((item) => ({ label: item.label, to: item.path }))}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <Outlet />
      </div>
    </div>
  );
}
