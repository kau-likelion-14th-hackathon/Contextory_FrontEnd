import { setAuthHeaderProvider } from "./client";

const SESSION_KEY = "contextory.session";
const SESSION_CHANGE_EVENT = "contextory:session-change";

export type SessionUser = {
  id: number;
  loginId: string;
  username: string;
  introduction: string;
  profileImage: string;
};

export type AuthSession = {
  accessToken: string;
  user?: SessionUser;
};

type SessionSource = "local" | "session";
type StoredSession = { session: AuthSession; source: SessionSource };

function getStorage(source: SessionSource) {
  try {
    return source === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
}

function readSession(source: SessionSource): StoredSession | undefined {
  const storage = getStorage(source);
  if (!storage) return undefined;

  try {
    const value = storage.getItem(SESSION_KEY);
    if (!value) return undefined;

    const session = JSON.parse(value) as AuthSession;
    return typeof session.accessToken === "string" && session.accessToken
      ? { session, source }
      : undefined;
  } catch {
    return undefined;
  }
}

function writeSession(stored: StoredSession) {
  const storage = getStorage(stored.source);
  if (!storage) return;

  try {
    storage.setItem(SESSION_KEY, JSON.stringify(stored.session));
  } catch {
    // Storage를 사용할 수 없어도 현재 페이지의 메모리 세션은 유지합니다.
  }
}

function removeSession(source: SessionSource) {
  const storage = getStorage(source);
  if (!storage) return;

  try {
    storage.removeItem(SESSION_KEY);
  } catch {
    // Storage 정리 실패가 현재 페이지의 로그아웃을 막지 않게 합니다.
  }
}

let storedSession = readSession("local") ?? readSession("session");

function notifySessionChange() {
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function setSession(session: AuthSession, persist: boolean) {
  const source: SessionSource = persist ? "local" : "session";
  storedSession = { session, source };

  writeSession(storedSession);
  removeSession(source === "local" ? "session" : "local");
  notifySessionChange();
}

export function getSession() {
  return storedSession?.session;
}

export function getCurrentUser() {
  return getSession()?.user;
}

export function getAccessToken() {
  return getSession()?.accessToken;
}

export function updateAccessToken(accessToken: string) {
  storedSession = {
    session: {
      ...storedSession?.session,
      accessToken,
    },
    source: storedSession?.source ?? "session",
  };

  writeSession(storedSession);
  notifySessionChange();
}

export function updateSessionUser(user: SessionUser) {
  if (!storedSession) return;

  storedSession = {
    ...storedSession,
    session: { ...storedSession.session, user },
  };
  writeSession(storedSession);
  notifySessionChange();
}

export function clearSession() {
  storedSession = undefined;
  removeSession("local");
  removeSession("session");
  notifySessionChange();
}

export function subscribeToSession(listener: () => void) {
  window.addEventListener(SESSION_CHANGE_EVENT, listener);
  return () => window.removeEventListener(SESSION_CHANGE_EVENT, listener);
}

setAuthHeaderProvider(() => {
  const accessToken = getAccessToken();
  return accessToken ? `Bearer ${accessToken}` : undefined;
});
