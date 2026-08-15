const KAKAO_PERSISTENCE_KEY = "contextory.kakao.persist-session";

export function startKakaoAuthorization(persistSession: boolean) {
  const authorizationUrl = import.meta.env.VITE_KAKAO_AUTHORIZATION_URL;
  if (!authorizationUrl) return false;

  try {
    window.sessionStorage.setItem(KAKAO_PERSISTENCE_KEY, String(persistSession));
  } catch {
    // 저장소를 사용할 수 없어도 OAuth 인증은 계속 진행합니다.
  }
  window.location.assign(authorizationUrl);
  return true;
}

export function consumeKakaoPersistence() {
  try {
    const persistSession = window.sessionStorage.getItem(KAKAO_PERSISTENCE_KEY) === "true";
    window.sessionStorage.removeItem(KAKAO_PERSISTENCE_KEY);
    return persistSession;
  } catch {
    return false;
  }
}
