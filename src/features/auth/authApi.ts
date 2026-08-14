import { requestJson } from "../../shared/api/client";
import type { AuthResult } from "../../shared/api/session";

type ApiEnvelope<TResult> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: TResult;
};

export type LoginPayload = {
  loginId: string;
  password: string;
};

export type SignupPayload = {
  loginId: string;
  username: string;
  password: string;
  introduction: string;
};

export async function login(payload: LoginPayload) {
  const response = await requestJson<ApiEnvelope<AuthResult>>("/api/auth/login", {
    method: "POST",
    body: payload,
  });
  return response.result;
}

export async function signup(payload: SignupPayload) {
  const response = await requestJson<ApiEnvelope<AuthResult>>("/api/auth/signup", {
    method: "POST",
    body: payload,
  });
  return response.result;
}
