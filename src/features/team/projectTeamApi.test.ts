import { afterEach, describe, expect, it, vi } from "vitest";

async function loadProjectTeamApi() {
  vi.resetModules();
  vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
  return import("./projectTeamApi");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function apiResponse(result: unknown) {
  return Response.json({ code: "SUCCESS", isSuccess: true, message: "success", result });
}

describe("project team API", () => {
  it("gets project members from the members URL and forwards AbortSignal", async () => {
    const members = [{
      permissionRole: "OWNER",
      projectMemberId: 1,
      projectRole: "관리자",
      status: "ACTIVE",
      userId: 10,
      username: "owner",
    }];
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(members));
    vi.stubGlobal("fetch", fetchMock);
    const { getProjectMembers } = await loadProjectTeamApi();
    const controller = new AbortController();

    await expect(getProjectMembers("39", controller.signal)).resolves.toEqual(members);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/members",
      expect.objectContaining({ method: "GET", signal: controller.signal }),
    );
  });

  it("patches a project member with changed fields only", async () => {
    const result = {
      permissionRole: "MEMBER",
      projectMemberId: 2,
      projectRole: "프론트엔드",
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(result));
    vi.stubGlobal("fetch", fetchMock);
    const { updateProjectMember } = await loadProjectTeamApi();

    await expect(updateProjectMember(39, 2, {
      permissionRole: "MEMBER",
      projectRole: "프론트엔드",
    })).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/members/2",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          permissionRole: "MEMBER",
          projectRole: "프론트엔드",
        }),
      }),
    );
  });

  it("deletes a project member", async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(null));
    vi.stubGlobal("fetch", fetchMock);
    const { removeProjectMember } = await loadProjectTeamApi();

    await expect(removeProjectMember("39", 3)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/members/3",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("creates a project invitation with inviteEmail and permissionRole", async () => {
    const result = {
      expiresAt: "2026-08-24T00:00:00Z",
      invitationId: 7,
      inviteEmail: "member@example.com",
      status: "PENDING",
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(result));
    vi.stubGlobal("fetch", fetchMock);
    const { createProjectInvitation } = await loadProjectTeamApi();

    await expect(createProjectInvitation(39, {
      inviteEmail: "member@example.com",
      permissionRole: "MEMBER",
      projectRole: "QA",
    })).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/invitations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          inviteEmail: "member@example.com",
          permissionRole: "MEMBER",
          projectRole: "QA",
        }),
      }),
    );
  });

  it("gets pending invitations with status query", async () => {
    const invitations = [{
      expiresAt: "2026-08-24T00:00:00Z",
      invitationId: 7,
      inviteEmail: "member@example.com",
      status: "PENDING",
    }];
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(invitations));
    vi.stubGlobal("fetch", fetchMock);
    const { getProjectInvitations } = await loadProjectTeamApi();

    await expect(getProjectInvitations(39, "PENDING")).resolves.toEqual(invitations);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/invitations?status=PENDING",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("cancels a project invitation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(null));
    vi.stubGlobal("fetch", fetchMock);
    const { cancelProjectInvitation } = await loadProjectTeamApi();

    await expect(cancelProjectInvitation("39", 7)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/projects/39/invitations/7",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("accepts an invitation from the invite token URL", async () => {
    const result = {
      joinedAt: "2026-08-17T00:00:00Z",
      permissionRole: "MEMBER",
      projectId: 39,
      projectMemberId: 12,
      projectName: "Contextory Web",
      projectRole: "프론트엔드",
    };
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(result));
    vi.stubGlobal("fetch", fetchMock);
    const { acceptProjectInvitation } = await loadProjectTeamApi();
    const controller = new AbortController();

    await expect(acceptProjectInvitation("invite-token", controller.signal)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/api/invitations/invite-token/accept",
      expect.objectContaining({ method: "POST", signal: controller.signal }),
    );
  });

  it("extracts project team API error codes from ApiError", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CONTEXTORY_API_BASE_URL", "https://api.test");
    const { ApiError } = await import("../../shared/api/client");
    const { getProjectTeamApiErrorCode } = await import("./projectTeamApi");

    expect(getProjectTeamApiErrorCode(new ApiError("failed", {
      kind: "unknown",
      bodyJson: { code: "PROJECT_INVITATION_4031" },
    }))).toBe("PROJECT_INVITATION_4031");
  });
});
