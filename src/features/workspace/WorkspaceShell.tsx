import { useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { mainNavigation } from "../../shared/navigation/routes";
import { projectSelectMock } from "../project/projectSelectMock";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { TopBar } from "./components/TopBar";

export function WorkspaceShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { projectId } = useParams();
  const project = projectSelectMock.find((candidate) => candidate.id === projectId);
  const projectName = project?.name ?? "프로젝트를 찾을 수 없어요";
  const repositoryLabel = project?.repository;

  return (
    <div className="workspace-route-shell">
      <TopBar
        title={projectName}
        subtitle={repositoryLabel}
        user="홍길동"
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="workspace-route-shell__body">
        <ProjectSidebar
          projectName={projectName}
          repositoryLabel={repositoryLabel}
          items={mainNavigation.map((item) => ({ label: item.label, to: item.path }))}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <Outlet />
      </div>
    </div>
  );
}
