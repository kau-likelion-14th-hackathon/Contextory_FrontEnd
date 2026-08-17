export type ProjectRole =
  | "프론트엔드"
  | "백엔드"
  | "AI"
  | "기획"
  | "디자인"
  | "QA"
  | "프로젝트 관리자";

export type RepositoryConnectionResult = "success" | "permission-error" | "connection-error";

export type RepositoryOption = {
  id: string;
  name: string;
  description: string;
  visibility: "Public" | "Private";
  defaultBranch: string;
  connectionResult: RepositoryConnectionResult;
};

export const projectRoleOptions: ProjectRole[] = [
  "프론트엔드",
  "백엔드",
  "AI",
  "기획",
  "디자인",
  "QA",
  "프로젝트 관리자",
];

export const projectLanguageOptions = [
  "한국어",
  "English",
] as const;

export const repositoryOptions: RepositoryOption[] = [
  {
    id: "contextory-web",
    name: "team/contextory-web",
    description: "Contextory 웹 클라이언트",
    visibility: "Private",
    defaultBranch: "develop",
    connectionResult: "success",
  },
  {
    id: "contextory-api",
    name: "team/contextory-api",
    description: "Contextory API 서버 · 관리자 승인이 필요합니다.",
    visibility: "Private",
    defaultBranch: "develop",
    connectionResult: "permission-error",
  },
  {
    id: "contextory-archive",
    name: "hong-dev/contextory-archive",
    description: "보관 저장소 · 연결 오류 확인용 mock",
    visibility: "Public",
    defaultBranch: "main",
    connectionResult: "connection-error",
  },
];

export const projectCreatorMock = {
  id: "creator-hong",
  name: "홍길동",
  email: "hong@example.com",
  roles: ["프로젝트 관리자"] as ProjectRole[],
};

export const invitationLinkMock = "https://contextory.example/invitations/project-preview";
