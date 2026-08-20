const INVITATION_PATH_PREFIX = "/invitations/";
const KAKAO_AUTH_RETURN_KEY = "contextory.kakao.invitation-return";

/** FE 내부 상대 경로만 허용한다. 외부 origin / protocol-relative URL은 거부한다. */
export function isSafeInternalRedirectPath(path: string) {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  if (path.includes("\\")) return false;
  if (path === "/auth" || path.startsWith("/auth/")) return false;
  return true;
}

export function getSafeInternalRedirectPath(value: string | null | undefined) {
  if (!value) return undefined;
  return isSafeInternalRedirectPath(value) ? value : undefined;
}

export function isSafeInvitationRedirectPath(path: string) {
  if (!isSafeInternalRedirectPath(path)) return false;
  if (!path.startsWith(INVITATION_PATH_PREFIX)) return false;

  const token = path.slice(INVITATION_PATH_PREFIX.length);
  return token.length > 0 && !token.includes("/") && !token.includes("?") && !token.includes("#");
}

export function getSafeInvitationRedirectPath(value: string | null | undefined) {
  if (!value) return undefined;
  if (!value.startsWith("/")) return undefined;
  return isSafeInvitationRedirectPath(value) ? value : undefined;
}

export function getLocationStateReturnPath(state: unknown) {
  if (!state || typeof state !== "object" || !("from" in state)) return undefined;
  const from = (state as { from?: unknown }).from;
  if (typeof from !== "string") return undefined;
  return getSafeInternalRedirectPath(from);
}

/**
 * 로그인 후 이동 경로 우선순위:
 * 1) 안전한 invitation redirect query
 * 2) 안전한 location.state.from
 * 3) /projects
 */
export function resolvePostAuthPath({
  redirectParam,
  locationState,
}: {
  redirectParam?: string | null;
  locationState?: unknown;
}) {
  return getSafeInvitationRedirectPath(redirectParam)
    ?? getLocationStateReturnPath(locationState)
    ?? "/projects";
}

export function setKakaoAuthReturnPath(path: string) {
  if (!isSafeInternalRedirectPath(path)) return;

  try {
    window.sessionStorage.setItem(KAKAO_AUTH_RETURN_KEY, path);
  } catch {
    // sessionStorage를 사용할 수 없으면 카카오 로그인 후 기본 경로로 이동합니다.
  }
}

export function clearKakaoAuthReturnPath() {
  try {
    window.sessionStorage.removeItem(KAKAO_AUTH_RETURN_KEY);
  } catch {
    // storage unavailable이면 무시
  }
}

export function consumeKakaoAuthReturnPath() {
  try {
    const path = window.sessionStorage.getItem(KAKAO_AUTH_RETURN_KEY);
    window.sessionStorage.removeItem(KAKAO_AUTH_RETURN_KEY);
    return path && isSafeInternalRedirectPath(path) ? path : undefined;
  } catch {
    return undefined;
  }
}

/** @deprecated Use setKakaoAuthReturnPath. Kept for invitation-era call sites. */
export function setKakaoInvitationReturnPath(path: string) {
  setKakaoAuthReturnPath(path);
}

/** @deprecated Use clearKakaoAuthReturnPath. */
export function clearKakaoInvitationReturnPath() {
  clearKakaoAuthReturnPath();
}

/** @deprecated Use consumeKakaoAuthReturnPath. */
export function consumeKakaoInvitationReturnPath() {
  return consumeKakaoAuthReturnPath();
}
