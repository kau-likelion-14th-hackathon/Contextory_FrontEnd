import type { BadgeVariant } from "../../shared/ui";

export type GitHubWorkViewState =
  | "success"
  | "no-repository"
  | "empty"
  | "syncing"
  | "sync-failed"
  | "search-empty"
  | "loading"
  | "error";

export type AnalysisStatus =
  | "분석 전"
  | "분석 중"
  | "검토 필요"
  | "승인 요청"
  | "승인 완료"
  | "분석 실패";

export type GitHubPullRequestMock = {
  number: number;
  title: string;
  author: string;
  githubStatus: "열림" | "검토 중" | "승인 요청" | "병합됨" | "닫힘";
  headBranch: string;
  baseBranch: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  analysisStatus: AnalysisStatus;
};

export const DEFAULT_GITHUB_WORK_STATE: GitHubWorkViewState = "success";

export const githubWorkViewStates: GitHubWorkViewState[] = [
  "success",
  "no-repository",
  "empty",
  "syncing",
  "sync-failed",
  "search-empty",
  "loading",
  "error",
];

export const analysisFilters = [
  "전체",
  "분석 전",
  "검토 필요",
  "승인 요청",
  "승인 완료",
] as const;

export type AnalysisFilter = (typeof analysisFilters)[number];

export const githubPullRequestsMock: GitHubPullRequestMock[] = [
  {
    number: 128,
    title: "로그인 API 오류 응답 구조 변경",
    author: "김혜연",
    githubStatus: "열림",
    headBranch: "develop",
    baseBranch: "main",
    changedFiles: 12,
    additions: 142,
    deletions: 28,
    analysisStatus: "검토 필요",
  },
  {
    number: 127,
    title: "사용자 프로필 이미지 업로드 기능 추가",
    author: "이하린",
    githubStatus: "열림",
    headBranch: "feature/profile-image",
    baseBranch: "main",
    changedFiles: 8,
    additions: 210,
    deletions: 12,
    analysisStatus: "승인 요청",
  },
  {
    number: 126,
    title: "모바일 내비게이션 UI 개선",
    author: "박서연",
    githubStatus: "검토 중",
    headBranch: "feature/mobile-navigation",
    baseBranch: "develop",
    changedFiles: 24,
    additions: 312,
    deletions: 45,
    analysisStatus: "분석 중",
  },
  {
    number: 125,
    title: "결제 실패 시 재시도 로직 개선",
    author: "최진우",
    githubStatus: "검토 중",
    headBranch: "bugfix/payment-retry",
    baseBranch: "main",
    changedFiles: 9,
    additions: 86,
    deletions: 18,
    analysisStatus: "분석 실패",
  },
  {
    number: 124,
    title: "이메일 인증 플로우 개선",
    author: "김혜연",
    githubStatus: "승인 요청",
    headBranch: "feature/email-verification-flow",
    baseBranch: "develop",
    changedFiles: 15,
    additions: 156,
    deletions: 22,
    analysisStatus: "승인 요청",
  },
  {
    number: 123,
    title: "검색 성능 최적화",
    author: "이정민",
    githubStatus: "병합됨",
    headBranch: "feature/search-optimization",
    baseBranch: "main",
    changedFiles: 18,
    additions: 320,
    deletions: 97,
    analysisStatus: "승인 완료",
  },
  {
    number: 121,
    title: "로그 레벨 설정 기능 추가",
    author: "최진우",
    githubStatus: "닫힘",
    headBranch: "feature/log-level-settings",
    baseBranch: "develop",
    changedFiles: 7,
    additions: 64,
    deletions: 14,
    analysisStatus: "분석 전",
  },
  {
    number: 119,
    title: "웹훅 이벤트 중복 처리 방지",
    author: "박서연",
    githubStatus: "열림",
    headBranch: "fix/webhook-deduplication",
    baseBranch: "main",
    changedFiles: 11,
    additions: 98,
    deletions: 31,
    analysisStatus: "분석 실패",
  },
];

export const analysisStatusVariants: Record<AnalysisStatus, BadgeVariant> = {
  "분석 전": "neutral",
  "분석 중": "info",
  "검토 필요": "warning",
  "승인 요청": "info",
  "승인 완료": "success",
  "분석 실패": "danger",
};

export const githubStatusVariants: Record<GitHubPullRequestMock["githubStatus"], BadgeVariant> = {
  열림: "success",
  "검토 중": "warning",
  "승인 요청": "info",
  병합됨: "success",
  닫힘: "neutral",
};
