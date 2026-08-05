import { useState } from "react";
import { Outlet } from "react-router-dom";
import { mainNavigation } from "../../shared/navigation/routes";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { TopBar } from "./components/TopBar";

export function WorkspaceShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="workspace-route-shell">
      <TopBar
        title="Contextory Web"
        subtitle="team/contextory-web"
        user="홍길동"
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="workspace-route-shell__body">
        <ProjectSidebar
          projectName="Contextory Web"
          repositoryLabel="team/contextory-web"
          items={mainNavigation.map((item) => ({ label: item.label, to: item.path }))}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <Outlet />
      </div>
    </div>
  );
}
