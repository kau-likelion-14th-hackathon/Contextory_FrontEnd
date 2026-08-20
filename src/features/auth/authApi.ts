import {
  requestApiResult,
  setUnauthorizedHandler,
} from "../../shared/api/client";
import {
  clearSession,
  getAccessToken,
  getCurrentUser,
  hasAuthenticatedSession,
  hasPersistentLoginIntent,
  updateAccessToken,
  updateSessionUser,
  type AuthSession,
  type SessionUser,
} from "../../shared/api/session";
import { getMyInfo, type MyInfoResponse } from "../account/accountApi";

export type AuthResponse = {
  id: number;
  loginId: string;
  username: string;
  introduction: string;
  profileImage: string;
  accessToken: string;
};

export type LoginRequest = {
  loginId: string;
  password: string;
};

export type SignupRequest = {
  loginId: string;
  username: string;
  password: string;
  introduction: string;
};

export type KakaoLoginRequest = {
  code: string;
  isDevelop: boolean;
};

let reissuePromise: Promise<string> | undefined;
let kakaoLoginRequest: { code: string; promise: Promise<AuthResponse> } | undefined;

export function toAuthSession(response: AuthResponse): AuthSession {
  return {
    accessToken: response.accessToken,
    user: {
      id: response.id,
      loginId: response.loginId,
      username: response.username,
      introduction: response.introduction,
      profileImage: response.profileImage,
    },
  };
}

export function toSessionUser(response: MyInfoResponse): SessionUser {
  return {
    id: response.userId,
    loginId: response.loginId,
    username: response.username,
    introduction: response.introduction,
    profileImage: response.profileImage,
  };
}

export function login(body: LoginRequest) {
  return requestApiResult<AuthResponse>("/api/auth/login", {
    authenticated: false,
    body,
    method: "POST",
    retryUnauthorized: false,
  });
}

export function signup(body: SignupRequest) {
  return requestApiResult<AuthResponse>("/api/auth/signup", {
    authenticated: false,
    body,
    method: "POST",
    retryUnauthorized: false,
  });
}

export function kakaoLogin(body: KakaoLoginRequest) {
  if (kakaoLoginRequest?.code === body.code) return kakaoLoginRequest.promise;

  const promise = requestApiResult<AuthResponse>("/api/auth/kakao", {
    authenticated: false,
    body,
    method: "POST",
    retryUnauthorized: false,
  }).finally(() => {
    if (kakaoLoginRequest?.promise === promise) kakaoLoginRequest = undefined;
  });

  kakaoLoginRequest = { code: body.code, promise };
  return promise;
}

export function reissue() {
  if (!reissuePromise) {
    reissuePromise = requestApiResult<string>("/api/auth/reissue", {
      authenticated: false,
      method: "POST",
      retryUnauthorized: false,
    })
      .then((accessToken) => {
        updateAccessToken(accessToken);
        return accessToken;
      })
      .catch((error: unknown) => {
        clearSession();
        throw error;
      })
      .finally(() => {
        reissuePromise = undefined;
      });
  }

  return reissuePromise;
}

export async function hydrateCurrentUser() {
  const me = await getMyInfo();
  if (!getAccessToken()) {
    clearSession();
    throw new Error("Access token missing after user hydration.");
  }
  updateSessionUser(toSessionUser(me));
  if (!getCurrentUser()) {
    clearSession();
    throw new Error("Failed to store hydrated user.");
  }
}

/** AuthBoundary cold-start / incomplete-session bootstrap. Runtime 401 reissue와 분리된다. */
export async function bootstrapAuthSession(): Promise<"authenticated" | "unauthenticated"> {
  if (hasAuthenticatedSession()) return "authenticated";

  if (getAccessToken() && !getCurrentUser()) {
    try {
      await hydrateCurrentUser();
      return hasAuthenticatedSession() ? "authenticated" : "unauthenticated";
    } catch {
      clearSession();
      return "unauthenticated";
    }
  }

  if (!hasPersistentLoginIntent()) return "unauthenticated";

  try {
    await reissue();
    await hydrateCurrentUser();
    if (!hasAuthenticatedSession()) {
      clearSession();
      return "unauthenticated";
    }
    return "authenticated";
  } catch {
    clearSession();
    return "unauthenticated";
  }
}

export async function logout() {
  let logoutError: unknown;

  try {
    await requestApiResult<unknown>("/api/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    logoutError = error;
  } finally {
    clearSession();
  }

  if (logoutError) throw logoutError;
}

export function withdraw() {
  return requestApiResult<unknown>("/api/auth/withdraw", {
    method: "DELETE",
  });
}

setUnauthorizedHandler(reissue);
