import { describe, expect, it } from "vitest";
import {
  canApproveAnalysisByRole,
  canManageAnalysisOwnedAction,
  canRegisterMemoryByRole,
  canRequestAnalysisByRole,
  canViewAnalysisContentByRole,
  isAnalysisAdmin,
  isAnalysisMemberOrAbove,
} from "./analysisPermissions";

describe("analysisPermissions", () => {
  it("allows analysis request for member-or-above only", () => {
    expect(canRequestAnalysisByRole("OWNER")).toBe(true);
    expect(canRequestAnalysisByRole("ADMIN")).toBe(true);
    expect(canRequestAnalysisByRole("MEMBER")).toBe(true);
    expect(canRequestAnalysisByRole("VIEWER")).toBe(false);
    expect(canRequestAnalysisByRole(undefined)).toBe(false);
  });

  it("allows approve for member-or-above without requester checks", () => {
    expect(canApproveAnalysisByRole("OWNER")).toBe(true);
    expect(canApproveAnalysisByRole("ADMIN")).toBe(true);
    expect(canApproveAnalysisByRole("MEMBER")).toBe(true);
    expect(canApproveAnalysisByRole("VIEWER")).toBe(false);
  });

  it("gates owned actions by role and requester identity", () => {
    expect(canManageAnalysisOwnedAction({
      permissionRole: "OWNER",
      currentUserId: 1,
      requestedByUserId: 99,
    })).toBe(true);
    expect(canManageAnalysisOwnedAction({
      permissionRole: "ADMIN",
      currentUserId: 1,
      requestedByUserId: 99,
    })).toBe(true);
    expect(canManageAnalysisOwnedAction({
      permissionRole: "MEMBER",
      currentUserId: 7,
      requestedByUserId: 7,
    })).toBe(true);
    expect(canManageAnalysisOwnedAction({
      permissionRole: "MEMBER",
      currentUserId: 7,
      requestedByUserId: 8,
    })).toBe(false);
    expect(canManageAnalysisOwnedAction({
      permissionRole: "MEMBER",
      currentUserId: 7,
      requestedByUserId: null,
    })).toBe(false);
    expect(canManageAnalysisOwnedAction({
      permissionRole: "MEMBER",
      currentUserId: 7,
      requestedByUserId: undefined,
    })).toBe(false);
    expect(canManageAnalysisOwnedAction({
      permissionRole: "MEMBER",
      currentUserId: undefined,
      requestedByUserId: 7,
    })).toBe(false);
    expect(canManageAnalysisOwnedAction({
      permissionRole: "VIEWER",
      currentUserId: 7,
      requestedByUserId: 7,
    })).toBe(false);
  });

  it("allows memory registration only for OWNER/ADMIN", () => {
    expect(canRegisterMemoryByRole("OWNER")).toBe(true);
    expect(canRegisterMemoryByRole("ADMIN")).toBe(true);
    expect(canRegisterMemoryByRole("MEMBER")).toBe(false);
    expect(canRegisterMemoryByRole("VIEWER")).toBe(false);
  });

  it("treats analysis/memory view access as member-or-above", () => {
    expect(isAnalysisMemberOrAbove("member")).toBe(true);
    expect(isAnalysisAdmin("admin")).toBe(true);
    expect(canViewAnalysisContentByRole("VIEWER")).toBe(false);
    expect(canViewAnalysisContentByRole("MEMBER")).toBe(true);
  });
});
