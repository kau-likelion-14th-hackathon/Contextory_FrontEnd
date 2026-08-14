import { setAuthHeaderProvider } from "./client";

export type AuthUser = {
  id: number;
  loginId: string;
  username: string;
  introduction?: string;
  profileImage?: string;
};

export type AuthResult = AuthUser & { accessToken: string };

type SessionState = {
  accessToken: string | null;
  user: AuthUser | null;
};

const STORAGE_KEY = "contextory.session";
const EMPTY_STATE: SessionState = { accessToken: null, user: null };

function readStorage(storage: Storage): SessionState | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionState) : null;
  } catch {
    return null;
  }
}

function readStoredSession(): SessionState {
  // "로그인 상태 유지"를 체크했으면 localStorage, 안 했으면 sessionStorage에 저장돼 있음
  return readStorage(localStorage) ?? readStorage(sessionStorage) ?? EMPTY_STATE;
}

let state: SessionState = readStoredSession();

function persist(remember: boolean) {
  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;

  try {
    target.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 프라이빗 모드 등으로 저장소를 쓸 수 없는 경우 — 새로고침 시 로그인 상태만 유지 안 됨
  }

  try {
    other.removeItem(STORAGE_KEY);
  } catch {
    // 반대쪽 저장소 정리는 실패해도 무시 — 주 저장(target)은 이미 성공했고,
    // 여기서 에러가 난다는 건 그 저장소를 애초에 못 쓰는 환경이라 지울 것도 없었을 가능성이 높음
  }
}

export function setSession(result: AuthResult, remember = false) {
  const { accessToken, ...user } = result;
  state = { accessToken, user };
  persist(remember);
}

export function clearSession() {
  state = EMPTY_STATE;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장소 삭제가 실패해도 무시 — state는 위에서 이미 메모리상 초기화됐으므로 로그아웃 자체는 정상 처리됨
  }

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 위와 동일한 이유로 무시
  }
}

export function getAccessToken() {
  return state.accessToken;
}

setAuthHeaderProvider(() => (state.accessToken ? `Bearer ${state.accessToken}` : undefined));
