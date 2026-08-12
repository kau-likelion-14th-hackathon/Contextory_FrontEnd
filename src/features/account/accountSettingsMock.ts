export const accountProfileMock = {
  avatar: "홍",
  name: "홍길동",
  email: "hong@example.com",
  joinedAt: "2026.07.30",
};

export const connectedAccountMock = {
  provider: "GitHub",
  account: "hong-dev",
  description: "로그인 수단으로 연결됨 · 프로젝트 저장소 연결과는 별도입니다.",
};

export const accountSections = [
  { id: "account-profile", label: "프로필" },
  { id: "account-security", label: "로그인 및 보안" },
  { id: "account-connections", label: "연결된 계정" },
] as const;

export type AccountSectionId = (typeof accountSections)[number]["id"];
