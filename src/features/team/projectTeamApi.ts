import { ApiError, requestApiResult } from "../../shared/api/client";

export type ProjectPermissionRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export type EditableProjectPermissionRole = "ADMIN" | "MEMBER" | "VIEWER";

export type ProjectMember = {
  projectMemberId: number;
  userId: number;
  username: string;
  permissionRole: string;
  projectRole: string | null;
  status: string;
};

export type UpdateProjectMemberRequest = {
  permissionRole?: EditableProjectPermissionRole;
  projectRole?: string;
};

export type UpdateProjectMemberResponse = {
  projectMemberId: number;
  permissionRole: string;
  projectRole: string | null;
};

export type ProjectInvitationStatus = "PENDING" | "ACCEPTED" | "CANCELED" | "EXPIRED";

export type CreateProjectInvitationRequest = {
  inviteEmail: string;
  permissionRole: "MEMBER" | "VIEWER";
  projectRole?: string;
};

export type CreateProjectInvitationResponse = {
  invitationId: number;
  inviteEmail: string;
  status: string;
  expiresAt: string;
};

export type ProjectInvitation = {
  invitationId: number;
  inviteEmail: string;
  status: string;
  expiresAt: string;
};

export type AcceptProjectInvitationResponse = {
  projectId: number;
  projectName: string;
  projectMemberId: number;
  permissionRole: string;
  projectRole: string | null;
  joinedAt: string;
};

export function getProjectTeamApiErrorCode(error: unknown) {
  if (!(error instanceof ApiError)) return undefined;
  if (!error.bodyJson || typeof error.bodyJson !== "object") return undefined;
  if (!("code" in error.bodyJson) || typeof error.bodyJson.code !== "string") return undefined;
  return error.bodyJson.code;
}

export function getProjectMembers(
  projectId: string | number,
  signal?: AbortSignal,
) {
  return requestApiResult<ProjectMember[]>(
    `/api/projects/${encodeURIComponent(projectId)}/members`,
    { method: "GET", signal },
  );
}

export function updateProjectMember(
  projectId: string | number,
  projectMemberId: string | number,
  body: UpdateProjectMemberRequest,
  signal?: AbortSignal,
) {
  return requestApiResult<UpdateProjectMemberResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(projectMemberId)}`,
    { method: "PATCH", body, signal },
  );
}

export function removeProjectMember(
  projectId: string | number,
  projectMemberId: string | number,
  signal?: AbortSignal,
) {
  return requestApiResult<null>(
    `/api/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(projectMemberId)}`,
    { method: "DELETE", signal },
  );
}

export function createProjectInvitation(
  projectId: string | number,
  body: CreateProjectInvitationRequest,
  signal?: AbortSignal,
) {
  return requestApiResult<CreateProjectInvitationResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/invitations`,
    { method: "POST", body, signal },
  );
}

export function getProjectInvitations(
  projectId: string | number,
  status: ProjectInvitationStatus = "PENDING",
  signal?: AbortSignal,
) {
  const searchParams = new URLSearchParams({ status });
  return requestApiResult<ProjectInvitation[]>(
    `/api/projects/${encodeURIComponent(projectId)}/invitations?${searchParams}`,
    { method: "GET", signal },
  );
}

export function cancelProjectInvitation(
  projectId: string | number,
  invitationId: string | number,
  signal?: AbortSignal,
) {
  return requestApiResult<null>(
    `/api/projects/${encodeURIComponent(projectId)}/invitations/${encodeURIComponent(invitationId)}`,
    { method: "DELETE", signal },
  );
}

export function acceptProjectInvitation(
  inviteToken: string,
  signal?: AbortSignal,
) {
  return requestApiResult<AcceptProjectInvitationResponse>(
    `/api/invitations/${encodeURIComponent(inviteToken)}/accept`,
    { method: "POST", signal },
  );
}
