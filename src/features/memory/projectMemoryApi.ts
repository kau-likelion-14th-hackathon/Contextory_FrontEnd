import { ApiError, requestApiResult } from "../../shared/api/client";

export type ProjectMemoryListItem = {
  recordId: number;
  analysisId: number;
  prNumber: number;
  approvedAt: string;
  analysisResult: unknown;
};

export type ProjectMemoryListResponse = {
  content: ProjectMemoryListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

export type GetProjectMemoriesParams = {
  page?: number;
  size?: number;
};

export function getProjectMemoryApiErrorCode(error: unknown) {
  if (!(error instanceof ApiError)) return undefined;
  if (!error.bodyJson || typeof error.bodyJson !== "object") return undefined;
  if (!("code" in error.bodyJson) || typeof error.bodyJson.code !== "string") return undefined;
  return error.bodyJson.code;
}

export function getProjectMemories(
  projectId: string | number,
  { page = 0, size = 20 }: GetProjectMemoriesParams = {},
  signal?: AbortSignal,
) {
  const searchParams = new URLSearchParams({
    page: String(Math.max(0, page)),
    size: String(Math.min(100, Math.max(1, size))),
  });

  return requestApiResult<ProjectMemoryListResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/memories?${searchParams}`,
    { method: "GET", signal },
  );
}
