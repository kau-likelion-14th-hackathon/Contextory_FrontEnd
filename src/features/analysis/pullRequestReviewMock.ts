import type { BadgeVariant } from "../../shared/ui";

export type PullRequestReviewState = "review" | "analyzing" | "failed" | "approved";

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

// 프로젝트 메모리 상세의 GitHub 근거 mock에서 재사용합니다.
export const MOCK_GITHUB_PULL_URL = "https://github.com/team/contextory-web/pull/128";

export const pullRequestReviewStates: PullRequestReviewState[] = [
  "review",
  "analyzing",
  "failed",
  "approved",
];

export const pullRequestReviewMock: PullRequestReviewMock = {
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
