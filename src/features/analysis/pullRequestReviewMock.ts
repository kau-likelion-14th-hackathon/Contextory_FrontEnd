export type PullRequestReviewState = "review" | "approved";

// 프로젝트 메모리 상세의 GitHub 근거 mock에서 재사용합니다.
export const MOCK_GITHUB_PULL_URL = "https://github.com/team/contextory-web/pull/128";

export const pullRequestReviewStates: PullRequestReviewState[] = [
  "review",
  "approved",
];
