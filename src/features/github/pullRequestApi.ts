import { ApiError, requestApiResult } from "../../shared/api/client";

export type PullRequestState = "OPEN" | "CLOSED" | "ALL";

export type PullRequestSummary = {
  prNumber: number;
  title: string;
  state: string;
  draft: boolean;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  htmlUrl: string;
  sourceBranch: string | null;
  targetBranch: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PullRequestListResponse = {
  content: PullRequestSummary[];
  page: number;
  size: number;
  hasNext: boolean;
};

export type GetPullRequestsParams = {
  state: PullRequestState;
  page: number;
  size: number;
};

export type PullRequestDetail = {
  prNumber: number;
  title: string;
  body: string | null;
  state: string;
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  mergeableState: string | null;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  htmlUrl: string;
  sourceBranch: string | null;
  sourceSha: string | null;
  targetBranch: string | null;
  targetSha: string | null;
  additions: number | null;
  deletions: number | null;
  changedFiles: number | null;
  commits: number | null;
  comments: number | null;
  reviewComments: number | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
};

export type PullRequestFile = {
  sha: string;
  filename: string;
  previousFilename: string | null;
  status: string;
  additions: number | null;
  deletions: number | null;
  changes: number | null;
  patch: string | null;
  blobUrl: string | null;
  rawUrl: string | null;
  contentsUrl: string | null;
};

export type PullRequestFilesResponse = {
  prNumber: number;
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  files: PullRequestFile[];
};

export function getPullRequestApiErrorCode(error: unknown) {
  if (!(error instanceof ApiError)) return undefined;
  if (!error.bodyJson || typeof error.bodyJson !== "object") return undefined;
  if (!("code" in error.bodyJson) || typeof error.bodyJson.code !== "string") return undefined;
  return error.bodyJson.code;
}

export function getPullRequests(
  projectId: string | number,
  { state, page, size }: GetPullRequestsParams,
  signal?: AbortSignal,
) {
  const searchParams = new URLSearchParams({
    state,
    page: String(Math.max(1, page)),
    size: String(Math.min(100, Math.max(1, size))),
  });

  return requestApiResult<PullRequestListResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/pull-requests?${searchParams}`,
    { method: "GET", signal },
  );
}

export function getPullRequest(
  projectId: string | number,
  prNumber: string | number,
  signal?: AbortSignal,
) {
  return requestApiResult<PullRequestDetail>(
    `/api/projects/${encodeURIComponent(projectId)}/pull-requests/${encodeURIComponent(prNumber)}`,
    { method: "GET", signal },
  );
}

export function getPullRequestFiles(
  projectId: string | number,
  prNumber: string | number,
  signal?: AbortSignal,
) {
  return requestApiResult<PullRequestFilesResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/pull-requests/${encodeURIComponent(prNumber)}/files`,
    { method: "GET", signal },
  );
}
