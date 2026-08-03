import { ProjectSidebar, type ProjectSidebarItem } from "../../../features/workspace/components/ProjectSidebar";
import { TopBar } from "../../../features/workspace/components/TopBar";
import "./ProjectLayout.css";

export type ProjectLayoutProps = {
  projectName: string;
  repositoryLabel?: string;
  sidebarItems: ProjectSidebarItem[];
  children: React.ReactNode;
  actions?: React.ReactNode;
  sidebarOpen?: boolean;
  onSidebarOpen?: () => void;
  onSidebarClose?: () => void;
};

export function ProjectLayout({
  projectName,
  repositoryLabel,
  sidebarItems,
  children,
  actions,
  sidebarOpen,
  onSidebarOpen,
  onSidebarClose,
}: ProjectLayoutProps) {
  return (
    <div className="project-layout">
      <TopBar
        title={projectName}
        subtitle={repositoryLabel}
        actions={actions}
        onMenuClick={onSidebarOpen}
      />
      <div className="project-layout__body">
        <ProjectSidebar
          projectName={projectName}
          repositoryLabel={repositoryLabel}
          items={sidebarItems}
          open={sidebarOpen}
          onClose={onSidebarClose}
        />
        <main className="project-layout__content">{children}</main>
      </div>
    </div>
  );
}
