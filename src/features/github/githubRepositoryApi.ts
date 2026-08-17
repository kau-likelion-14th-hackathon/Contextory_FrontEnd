import { ApiError, requestApiResult } from "../../shared/api/client";

export type GitHubConnectResponse = {
  installUrl: string;
  stateExpiresInSeconds: number;
};

export type GitHubRepository = {
  githubRepositoryId: number;
  repositoryFullName: string;
  repositoryUrl: string;
  defaultBranch: string;
  private: boolean;
};

export type GitHubRepositoryListResponse = {
  content: GitHubRepository[];
  page: number;
  size: number;
  hasNext: boolean;
};

export type GetGitHubRepositoriesParams = {
  page: number;
  size?: number;
};

export type ProjectRepositoryDetail = {
  repositoryId: number;
  githubRepositoryId: number;
  repositoryFullName: string;
  repositoryUrl: string;
  defaultBranch: string;
  private: boolean;
  connectedBy: number;
  lastSyncedAt: string | null;
};

export type ProjectRepositoryConnectionResponse = {
  repositoryId: number;
  projectId: number;
  githubRepositoryId: number;
  repositoryFullName: string;
  connectedBy: number;
};

export type ConnectProjectRepositoryRequest = {
  githubRepositoryId: number;
  repositoryFullName: string;
};

export function getGitHubConnectUrl() {
  return requestApiResult<GitHubConnectResponse>("/api/github/connect", {
    method: "GET",
  });
}

export function getGitHubRepositories(
  { page, size = 30 }: GetGitHubRepositoriesParams,
  signal?: AbortSignal,
) {
  const searchParams = new URLSearchParams({
    page: String(Math.max(1, page)),
    size: String(Math.min(100, Math.max(1, size))),
  });

  return requestApiResult<GitHubRepositoryListResponse>(
    `/api/github/repositories?${searchParams}`,
    { method: "GET", signal },
  );
}

export function getProjectRepository(projectId: string | number, signal?: AbortSignal) {
  return requestApiResult<ProjectRepositoryDetail | null>(
    `/api/projects/${encodeURIComponent(projectId)}/repository`,
    { method: "GET", signal },
  );
}

export function isProjectRepositoryNotConnectedError(error: unknown) {
  if (!(error instanceof ApiError) || error.kind !== "notFound") return false;
  if (!error.bodyJson || typeof error.bodyJson !== "object") return false;
  if (!("code" in error.bodyJson)) return false;
  return error.bodyJson.code === "PROJECT_REPOSITORY_4041";
}

export function connectProjectRepository(
  projectId: string | number,
  body: ConnectProjectRepositoryRequest,
) {
  return requestApiResult<ProjectRepositoryConnectionResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/repository`,
    { body, method: "PUT" },
  );
}

export function disconnectProjectRepository(projectId: string | number) {
  return requestApiResult<null>(
    `/api/projects/${encodeURIComponent(projectId)}/repository`,
    { method: "DELETE" },
  );
}
