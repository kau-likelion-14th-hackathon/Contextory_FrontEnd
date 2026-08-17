export type GitHubConnectionViewModel = {
  account: string;
  repository: string;
  visibility: string;
  defaultBranch: string;
  permission: string;
  lastSyncedAt: string;
  collectionScope: string;
};

export type SyncStatusViewModel = {
  status: string;
  lastSuccess: string;
  nextCheck: string;
};

export type TeamMemberViewModel = {
  id: string;
  name: string;
  email: string;
  role: string;
  permission: string;
  currentUser?: boolean;
};

export const githubConnectionMock: GitHubConnectionViewModel = {
  account: "hong-dev",
  repository: "team/contextory-web",
  visibility: "Private",
  defaultBranch: "main",
  permission: "PR / Commit 읽기 권한",
  lastSyncedAt: "5분 전",
  collectionScope: "PR 본문 · Diff · Commit · Issue 링크",
};

export const syncStatusMock: SyncStatusViewModel = {
  status: "정상",
  lastSuccess: "5분 전",
  nextCheck: "약 10분 후",
};

export const repositoryScopeMock = [
  "프로젝트당 저장소 1개",
  "읽기 중심 권한",
  "GitHub 로그인 계정과 저장소 연결은 별도 관리",
  "연결 해제 후에도 승인된 프로젝트 기록은 유지",
];

export const teamSeatsMock = {
  used: 8,
  total: 10,
};

export const teamMembersMock: TeamMemberViewModel[] = [
  {
    id: "member-hong",
    name: "홍길동",
    email: "hong@example.com",
    role: "프로젝트 관리자",
    permission: "전체 액세스",
    currentUser: true,
  },
  {
    id: "member-kim",
    name: "김태연",
    email: "taeyeon.kim@example.com",
    role: "프론트엔드",
    permission: "영향도 분석 생성, 설정 편집",
  },
  {
    id: "member-lee",
    name: "이준호",
    email: "junho.lee@example.com",
    role: "백엔드",
    permission: "영향도 분석 생성, 리포트 열람",
  },
  {
    id: "member-park",
    name: "박서연",
    email: "seoyeon.park@example.com",
    role: "QA",
    permission: "리포트 열람",
  },
  {
    id: "member-choi",
    name: "최민석",
    email: "minseok.choi@example.com",
    role: "백엔드",
    permission: "영향도 분석 생성, 리포트 열람",
  },
  {
    id: "member-jung",
    name: "정유진",
    email: "yujin.jung@example.com",
    role: "QA",
    permission: "리포트 열람",
  },
  {
    id: "member-yoon",
    name: "윤지훈",
    email: "jihoon.yoon@example.com",
    role: "리뷰어",
    permission: "리포트 열람, 코멘트 가능",
  },
  {
    id: "member-kwon",
    name: "권도현",
    email: "dohyeon.kwon@example.com",
    role: "게스트",
    permission: "리포트 열람 (읽기 전용)",
  },
];
