import type { BadgeVariant } from "../../shared/ui";

export type PullRequestReviewState = "review" | "approved";

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
    followUps: ReviewFollowUp[];
    checks: string[];
    evidence: Array<{ label: string; value: string }>;
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
  "approved",
];

export const pullRequestReviewMock: PullRequestReviewMock = {
  draft: {
    version: "v1.0",
    recordType: "변경",
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
  approval: {
    approver: "홍길동",
    approvedAt: "방금 전",
  },
};
