const KAKAO_PERSISTENCE_KEY = "contextory.kakao.persist-session";

export function startKakaoAuthorization(persistSession: boolean) {
  const authorizationUrl = import.meta.env.VITE_KAKAO_AUTHORIZATION_URL;
  if (!authorizationUrl) return false;

  window.sessionStorage.setItem(KAKAO_PERSISTENCE_KEY, String(persistSession));
  window.location.assign(authorizationUrl);
  return true;
}

export function consumeKakaoPersistence() {
  const persistSession = window.sessionStorage.getItem(KAKAO_PERSISTENCE_KEY) === "true";
  window.sessionStorage.removeItem(KAKAO_PERSISTENCE_KEY);
  return persistSession;
}
