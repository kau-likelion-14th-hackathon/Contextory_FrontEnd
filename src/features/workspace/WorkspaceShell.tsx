import { useCallback, useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate, useParams } from "react-router-dom";
import { ApiError, getApiErrorMessage } from "../../shared/api/client";
import { getCurrentUser } from "../../shared/api/session";
import { PageContainer } from "../../shared/layouts";
import { mainNavigation } from "../../shared/navigation/routes";
import { ErrorState, LoadingState } from "../../shared/ui";
import {
  getProject,
  type ProjectDetailResponse,
} from "../project/projectApi";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { TopBar } from "./components/TopBar";

export type ProjectWorkspaceContextValue = {
  project?: ProjectDetailResponse;
  projectError: string;
  projectLoading: boolean;
  reloadProject: () => Promise<ProjectDetailResponse | undefined>;
  setProjectDetail: (project: ProjectDetailResponse) => void;
};

export function WorkspaceShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [project, setProject] = useState<ProjectDetailResponse>();
  const [projectError, setProjectError] = useState("");
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const navigate = useNavigate();
  const { projectId } = useParams();
  const currentUser = getCurrentUser();

  const loadProject = useCallback(async (signal?: AbortSignal) => {
    if (!projectId) {
      setProject(undefined);
      setProjectError("프로젝트 식별자를 확인할 수 없습니다.");
      setProjectLoading(false);
      return undefined;
    }

    setProjectLoading(true);
    setProjectError("");
    setProjectNotFound(false);

    try {
      const result = await getProject(projectId, signal);
      if (signal?.aborted) return undefined;
      setProject(result);
      return result;
    } catch (error) {
      if (signal?.aborted) return undefined;
      if (error instanceof ApiError && error.kind === "notFound") {
        setProjectNotFound(true);
      } else {
        setProjectError(getApiErrorMessage(error, "프로젝트 정보를 불러오지 못했습니다."));
      }
      return undefined;
    } finally {
      if (!signal?.aborted) setProjectLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const controller = new AbortController();
    setProject(undefined);
    setProjectNotFound(false);
    void loadProject(controller.signal);
    return () => controller.abort();
  }, [loadProject]);

  if (projectNotFound) {
    return <Navigate replace to="/projects" />;
  }

  const hasCurrentProject = Boolean(project && String(project.projectId) === projectId);
  const projectName = hasCurrentProject && project ? project.name : "프로젝트";
  const repositoryLabel = hasCurrentProject
    ? project?.repository?.repositoryFullName?.trim() || undefined
    : undefined;
  const outletContext: ProjectWorkspaceContextValue = {
    project,
    projectError,
    projectLoading,
    reloadProject: loadProject,
    setProjectDetail: setProject,
  };

  return (
    <div className="workspace-route-shell">
      <TopBar
        title={projectName}
        subtitle={repositoryLabel}
        user={currentUser?.username}
        userEmail={currentUser?.loginId}
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
        {hasCurrentProject ? (
          <Outlet context={outletContext} />
        ) : (
          <PageContainer size="full">
            {projectLoading ? (
              <LoadingState
                description="프로젝트 정보를 확인하고 있습니다."
                title="프로젝트를 불러오는 중입니다"
              />
            ) : (
              <ErrorState
                action={{ label: "다시 시도", onClick: () => void loadProject() }}
                description={projectError || "프로젝트 정보를 불러오지 못했습니다."}
                secondaryAction={{
                  label: "프로젝트 목록으로 돌아가기",
                  onClick: () => navigate("/projects"),
                }}
                title="프로젝트를 불러오지 못했습니다"
              />
            )}
          </PageContainer>
        )}
      </div>
    </div>
  );
}
