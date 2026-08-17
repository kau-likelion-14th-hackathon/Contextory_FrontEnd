import { requestApiResult } from "../../shared/api/client";

export type MyInfoResponse = {
  userId: number;
  loginId: string;
  username: string;
  introduction: string;
  profileImage: string;
};

export type UpdateMyInfoRequest = {
  username?: string;
  introduction?: string;
};

export type UpdateMyInfoResponse = {
  userId: number;
  username: string;
  introduction: string;
};

export function getMyInfo() {
  return requestApiResult<MyInfoResponse>("/api/users/me");
}

export function updateMyInfo(body: UpdateMyInfoRequest) {
  return requestApiResult<UpdateMyInfoResponse>("/api/users/me", {
    body,
    method: "PATCH",
  });
}
