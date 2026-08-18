const INVITATION_PATH_PREFIX = "/invitations/";
const KAKAO_INVITATION_RETURN_KEY = "contextory.kakao.invitation-return";

export function isSafeInvitationRedirectPath(path: string) {
  if (!path.startsWith(INVITATION_PATH_PREFIX)) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;

  const token = path.slice(INVITATION_PATH_PREFIX.length);
  return token.length > 0 && !token.includes("/");
}

export function getSafeInvitationRedirectPath(value: string | null | undefined) {
  if (!value) return undefined;
  if (!value.startsWith("/")) return undefined;
  return isSafeInvitationRedirectPath(value) ? value : undefined;
}

export function setKakaoInvitationReturnPath(path: string) {
  if (!isSafeInvitationRedirectPath(path)) return;

  try {
    window.sessionStorage.setItem(KAKAO_INVITATION_RETURN_KEY, path);
  } catch {
    // sessionStorage를 사용할 수 없으면 카카오 로그인 후 기본 경로로 이동합니다.
  }
}

export function clearKakaoInvitationReturnPath() {
  try {
    window.sessionStorage.removeItem(KAKAO_INVITATION_RETURN_KEY);
  } catch {
    // storage unavailable이면 무시
  }
}

export function consumeKakaoInvitationReturnPath() {
  try {
    const path = window.sessionStorage.getItem(KAKAO_INVITATION_RETURN_KEY);
    window.sessionStorage.removeItem(KAKAO_INVITATION_RETURN_KEY);
    return path && isSafeInvitationRedirectPath(path) ? path : undefined;
  } catch {
    return undefined;
  }
}
