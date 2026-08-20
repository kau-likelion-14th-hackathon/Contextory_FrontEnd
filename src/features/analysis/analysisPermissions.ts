/** AI 분석 / 프로젝트 메모리 권한은 ProjectDetailResponse.myPermissionRole 기준이다. */

export function normalizePermissionRole(role?: string | null) {
  return role?.trim().toUpperCase() || "";
}

/** OWNER / ADMIN / MEMBER — VIEWER와 unknown은 false */
export function isAnalysisMemberOrAbove(role?: string | null) {
  const normalized = normalizePermissionRole(role);
  return normalized === "OWNER"
    || normalized === "ADMIN"
    || normalized === "MEMBER";
}

export function isAnalysisAdmin(role?: string | null) {
  const normalized = normalizePermissionRole(role);
  return normalized === "OWNER" || normalized === "ADMIN";
}

/** POST /analyses 신규 요청 (재분석 포함). retry endpoint와 별개. */
export function canRequestAnalysisByRole(role?: string | null) {
  return isAnalysisMemberOrAbove(role);
}

/** POST .../approve — requester 제한 없음 */
export function canApproveAnalysisByRole(role?: string | null) {
  return isAnalysisMemberOrAbove(role);
}

/**
 * edit / retry / cancel 공통.
 * OWNER·ADMIN은 항상 가능. MEMBER는 requestedBy.userId와 현재 사용자가 일치할 때만.
 * requester/user 불명확 시 fail closed.
 */
export function canManageAnalysisOwnedAction({
  permissionRole,
  currentUserId,
  requestedByUserId,
}: {
  permissionRole?: string | null;
  currentUserId?: number;
  requestedByUserId?: number | null;
}) {
  const role = normalizePermissionRole(permissionRole);
  if (role === "OWNER" || role === "ADMIN") return true;
  if (role !== "MEMBER") return false;
  if (typeof currentUserId !== "number" || typeof requestedByUserId !== "number") {
    return false;
  }
  return currentUserId === requestedByUserId;
}

/** POST .../memory — OWNER/ADMIN만 */
export function canRegisterMemoryByRole(role?: string | null) {
  return isAnalysisAdmin(role);
}

/** GET memories / analyses 목록·상세 조회 */
export function canViewAnalysisContentByRole(role?: string | null) {
  return isAnalysisMemberOrAbove(role);
}
