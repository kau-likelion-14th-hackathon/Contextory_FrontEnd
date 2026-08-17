import { requestApiResult } from "../../shared/api/client";

export type ProjectStatus = "ACTIVE" | "ARCHIVED";
export type ProjectLanguage = "ko" | "en";

export type ProjectSummaryResponse = {
  projectId: number;
  name: string;
  myPermissionRole: string;
  repositoryConnected: boolean;
  planName: string | null;
  creditBalance: number | null;
};

export type ProjectListResponse = {
  content: ProjectSummaryResponse[];
  page: number;
  size: number;
  totalElements: number;
  hasNext: boolean;
};

export type GetProjectsParams = {
  uiPage: number;
  size: number;
  status: ProjectStatus;
};

export type CreateProjectRequest = {
  name: string;
  slug: string;
  summary?: string;
  purpose?: string;
  defaultLanguage?: ProjectLanguage;
};

export type CreateProjectResponse = {
  projectId: number;
  ownerId: number;
  name: string;
  slug: string;
  status: string;
  myPermissionRole: string;
};

export type ProjectRepositoryInfo = {
  connected: boolean;
  repositoryFullName: string | null;
};

export type ProjectSubscriptionInfo = {
  planName: string | null;
  creditBalance: number | null;
};

export type ProjectDetailResponse = {
  projectId: number;
  name: string;
  slug: string;
  summary: string | null;
  purpose: string | null;
  defaultLanguage: ProjectLanguage | null;
  status: ProjectStatus;
  myPermissionRole: string;
  repository: ProjectRepositoryInfo | null;
  subscription: ProjectSubscriptionInfo | null;
};

export type UpdateProjectRequest = Partial<{
  name: string;
  summary: string;
  purpose: string;
  defaultLanguage: ProjectLanguage;
  status: ProjectStatus;
}>;

export type UpdateProjectResponse = {
  projectId: number;
  name: string;
  status: ProjectStatus;
};

export function getProjects({ uiPage, size, status }: GetProjectsParams, signal?: AbortSignal) {
  const searchParams = new URLSearchParams({
    page: String(Math.max(0, uiPage - 1)),
    size: String(size),
    status,
  });

  return requestApiResult<ProjectListResponse>(`/api/projects?${searchParams}`, {
    method: "GET",
    signal,
  });
}

export function createProject(body: CreateProjectRequest) {
  return requestApiResult<CreateProjectResponse>("/api/projects", {
    body,
    method: "POST",
  });
}

export function getProject(projectId: string | number, signal?: AbortSignal) {
  return requestApiResult<ProjectDetailResponse>(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "GET",
    signal,
  });
}

export function updateProject(projectId: string | number, body: UpdateProjectRequest) {
  return requestApiResult<UpdateProjectResponse>(`/api/projects/${encodeURIComponent(projectId)}`, {
    body,
    method: "PATCH",
  });
}

export function deleteProject(projectId: string | number) {
  return requestApiResult<null>(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}
