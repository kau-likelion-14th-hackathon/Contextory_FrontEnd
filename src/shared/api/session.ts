import { setAuthHeaderProvider } from "./client";

const LOCAL_SESSION_KEY = "contextory.auth.session";
const SESSION_SESSION_KEY = "contextory.auth.session";
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

function parseSession(value: string | null): AuthSession | undefined {
  if (!value) return undefined;

  try {
    const session = JSON.parse(value) as AuthSession;
    return typeof session.accessToken === "string" && session.accessToken
      ? session
      : undefined;
  } catch {
    return undefined;
  }
}

function getStoredSession(): { session: AuthSession; source: SessionSource } | undefined {
  const localSession = parseSession(window.localStorage.getItem(LOCAL_SESSION_KEY));
  if (localSession) return { session: localSession, source: "local" };

  const sessionSession = parseSession(window.sessionStorage.getItem(SESSION_SESSION_KEY));
  if (sessionSession) return { session: sessionSession, source: "session" };

  return undefined;
}

function notifySessionChange() {
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function setSession(session: AuthSession, persist: boolean) {
  window.localStorage.removeItem(LOCAL_SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_SESSION_KEY);

  const storage = persist ? window.localStorage : window.sessionStorage;
  storage.setItem(persist ? LOCAL_SESSION_KEY : SESSION_SESSION_KEY, JSON.stringify(session));
  notifySessionChange();
}

export function getSession() {
  return getStoredSession()?.session;
}

export function getCurrentUser() {
  return getSession()?.user;
}

export function getAccessToken() {
  return getSession()?.accessToken;
}

export function updateAccessToken(accessToken: string) {
  const stored = getStoredSession();
  const source = stored?.source ?? "session";
  const nextSession: AuthSession = {
    ...stored?.session,
    accessToken,
  };
  const storage = source === "local" ? window.localStorage : window.sessionStorage;
  const key = source === "local" ? LOCAL_SESSION_KEY : SESSION_SESSION_KEY;

  storage.setItem(key, JSON.stringify(nextSession));
  notifySessionChange();
}

export function updateSessionUser(user: SessionUser) {
  const stored = getStoredSession();
  if (!stored) return;

  const storage = stored.source === "local" ? window.localStorage : window.sessionStorage;
  const key = stored.source === "local" ? LOCAL_SESSION_KEY : SESSION_SESSION_KEY;
  storage.setItem(key, JSON.stringify({ ...stored.session, user }));
  notifySessionChange();
}

export function clearSession() {
  window.localStorage.removeItem(LOCAL_SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_SESSION_KEY);
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
