import type { BadgeVariant } from "../../shared/ui";

export type PullRequestReviewState = "review" | "analyzing" | "failed" | "approved";

export type PullRequestReviewFile = {
  path: string;
  additions: number;
  deletions: number;
};

export type PullRequestDiffLine = {
  lineNumber: number;
  marker: " " | "+" | "-";
  content: string;
};

export type ReviewImpact = {
  role: string;
  description: string;
  variant: BadgeVariant;
};

export type ReviewFollowUp = {
  id: string;
  label: string;
  completed: boolean;
};

export type PullRequestReviewMock = {
  pullRequest: {
    number: number;
    title: string;
    author: string;
    createdAt: string;
    githubStatus: string;
    headBranch: string;
    baseBranch: string;
    description: string;
    commitCount: number;
    relatedIssueCount: number;
    relatedIssue: string;
    githubUrl: string;
  };
  files: PullRequestReviewFile[];
  diff: {
    path: string;
    lines: PullRequestDiffLine[];
  };
  draft: {
    version: string;
    recordType: string;
    summary: string;
    purpose: string;
    before: string;
    after: string;
    featureTags: string[];
    impacts: ReviewImpact[];
    followUps: ReviewFollowUp[];
    checks: string[];
    evidence: Array<{ label: string; value: string }>;
  };
  analysisStages: Array<{ label: string; completed: boolean }>;
  failure: {
    code: string;
    description: string;
  };
  approval: {
    approver: string;
    approvedAt: string;
  };
};

// API 연결 전 화면 검증용 GitHub 원본 링크입니다.
export const MOCK_GITHUB_PULL_URL = "https://github.com/team/contextory-web/pull/128";

export const pullRequestReviewStates: PullRequestReviewState[] = [
  "review",
  "analyzing",
  "failed",
  "approved",
];

export const pullRequestReviewMock: PullRequestReviewMock = {
  pullRequest: {
    number: 128,
    title: "로그인 API 오류 응답 구조 변경",
    author: "김백엔드",
    createdAt: "7월 28일",
    githubStatus: "Merged",
    headBranch: "main",
    baseBranch: "develop",
    description: "로그인 API의 오류 응답 구조를 message에서 errorCode 기반으로 변경합니다.",
    commitCount: 3,
    relatedIssueCount: 1,
    relatedIssue: "#82",
    githubUrl: MOCK_GITHUB_PULL_URL,
  },
  files: [
    { path: "auth/controller.ts", additions: 28, deletions: 12 },
    { path: "error-response.dto.ts", additions: 34, deletions: 8 },
    { path: "error-code.enum.ts", additions: 16, deletions: 0 },
    { path: "auth/service.ts", additions: 8, deletions: 4 },
    { path: "auth/auth.module.ts", additions: 6, deletions: 0 },
    { path: "common/http-error.ts", additions: 18, deletions: 7 },
    { path: "auth/service.spec.ts", additions: 42, deletions: 5 },
    { path: "docs/auth-api.md", additions: 20, deletions: 2 },
  ],
  diff: {
    path: "auth/controller.ts",
    lines: [
      { lineNumber: 45, marker: " ", content: "try {" },
      { lineNumber: 46, marker: " ", content: "  const user = await this.authService.login(req.body);" },
      { lineNumber: 47, marker: " ", content: "  return res.status(HttpStatus.OK).json({ success: true });" },
      { lineNumber: 48, marker: "-", content: "  message: error.message" },
      { lineNumber: 49, marker: "+", content: "  errorCode: code.code," },
      { lineNumber: 50, marker: "+", content: "  message: code.message" },
    ],
  },
  draft: {
    version: "v1.0",
    recordType: "변경",
    summary: "로그인 API의 오류 응답 구조를 message에서 errorCode 기반으로 변경했습니다.",
    purpose: "클라이언트가 오류 유형별로 안정적으로 처리하도록 응답 구조를 표준화합니다.",
    before: "message 기반 응답",
    after: "errorCode 기반 응답",
    featureTags: ["로그인", "인증", "오류 처리"],
    impacts: [
      { role: "프론트엔드", description: "오류 응답 로직을 errorCode 기준으로 수정", variant: "info" },
      { role: "기획", description: "오류 코드별 메시지 정책 확인", variant: "warning" },
      { role: "QA", description: "errorCode 기반 테스트 케이스 추가", variant: "neutral" },
    ],
    followUps: [
      { id: "frontend-model", label: "오류 응답 타입 정의 및 프론트 모델 수정", completed: true },
      { id: "api-docs", label: "API 명세 및 변경사항 문서화", completed: false },
      { id: "qa-cases", label: "QA 테스트 케이스 추가", completed: false },
    ],
    checks: [
      "기존 message 필드 유지 여부와 기간 확인 필요",
      "타 서비스와의 일관성 검토 필요",
    ],
    evidence: [
      { label: "변경 파일", value: "8개" },
      { label: "커밋", value: "3개" },
      { label: "관련 이슈", value: "#82" },
      { label: "유사 변경", value: "2건" },
    ],
  },
  analysisStages: [
    { label: "PR 원본 수집", completed: true },
    { label: "변경 전후 분석", completed: true },
    { label: "역할별 영향 생성", completed: false },
    { label: "후속 작업 및 근거 정리", completed: false },
  ],
  failure: {
    code: "ANALYSIS_TIMEOUT",
    description: "대용량 diff 처리 시간이 초과되었습니다. 다시 분석하거나 GitHub 원본을 확인해주세요.",
  },
  approval: {
    approver: "홍길동",
    approvedAt: "방금 전",
  },
};
