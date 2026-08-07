import { MOCK_GITHUB_PULL_URL } from "../analysis/pullRequestReviewMock";

export type MemoryDetailRole =
  | "프론트엔드"
  | "기획"
  | "QA"
  | "백엔드"
  | "SRE";

export type MemoryFollowUpStatus = "완료" | "진행 중" | "대기";

export type ProjectMemoryDetail = {
  id: string;
  recordType: string;
  title: string;
  status: string;
  approver: string;
  approvedAt: string;
  version: string;
  githubUrl: string;
  relatedCounts: {
    pullRequests: number;
    issues: number;
    comments: number;
  };
  summary: string;
  purpose: string;
  before: string;
  after: string;
  featureTags: string[];
  roles: MemoryDetailRole[];
  impactSummary: string;
  expectedEffects: string[];
  followUps: Array<{
    id: string;
    task: string;
    assignee: string;
    status: MemoryFollowUpStatus;
  }>;
  evidence: {
    pullRequest: { number: number; title: string };
    commit: { hash: string; message: string };
    issue: { number: number; title: string };
  };
  additionalInfo: Array<{ label: string; value: string; code?: boolean }>;
};

const projectMemoryDetailRecords: Record<string, ProjectMemoryDetail> = {
  "record-128": {
    id: "record-128",
    recordType: "구현",
    title: "에러 응답 포맷 통일 및 공통 유틸 추가",
    status: "승인 완료",
    approver: "김백엔드",
    approvedAt: "2024.10.25",
    version: "v1.0",
    githubUrl: MOCK_GITHUB_PULL_URL,
    relatedCounts: {
      pullRequests: 1,
      issues: 1,
      comments: 2,
    },
    summary: "모든 API의 에러 응답을 표준 포맷으로 통일하고 생성 헬퍼 함수를 추가했습니다.",
    purpose: "API마다 message와 error 필드의 구조가 달라 클라이언트의 오류 처리 방식이 복잡했습니다. 공통 에러 응답 포맷과 생성 헬퍼를 적용해 서버 구현과 클라이언트 처리를 일관되게 만드는 것이 목적입니다.",
    before: `{
  "message": "요청 처리에 실패했습니다.",
  "error": "INVALID_REQUEST"
}`,
    after: `return createErrorResponse({
  "error": {
    "code": "INVALID_REQUEST",
    "message": "요청 처리에 실패했습니다."
  }
});`,
    featureTags: ["API", "오류 처리", "응답 표준화", "공통 유틸"],
    roles: ["백엔드", "프론트엔드", "QA"],
    impactSummary: "백엔드는 공통 헬퍼로 동일한 에러 응답을 생성하고, 프론트엔드는 표준 code와 message를 기준으로 처리하며, QA는 공통 응답 규칙으로 테스트 케이스를 구성할 수 있습니다.",
    expectedEffects: [
      "API별 에러 응답 구조 통일",
      "서버의 중복 응답 생성 코드 감소",
      "프론트엔드 오류 처리와 QA 검증 단순화",
    ],
    followUps: [
      {
        id: "follow-up-error-helper",
        task: "공통 에러 응답 생성 헬퍼 적용",
        assignee: "김백엔드",
        status: "완료",
      },
      {
        id: "follow-up-frontend",
        task: "프론트엔드 표준 에러 처리 로직 반영",
        assignee: "최프론트",
        status: "완료",
      },
      {
        id: "follow-up-qa",
        task: "API 에러 응답 회귀 테스트 추가",
        assignee: "박QA",
        status: "진행 중",
      },
    ],
    evidence: {
      pullRequest: { number: 128, title: "에러 응답 포맷 통일 및 공통 유틸 추가" },
      commit: { hash: "a1b2c3d", message: "feat(api): add standardized error response helper" },
      issue: { number: 112, title: "API 에러 응답 표준화 논의" },
    },
    additionalInfo: [
      { label: "기록 ID", value: "rec_20241025_000128", code: true },
      { label: "기록 버전", value: "v1.0" },
      { label: "최초 작성자", value: "김백엔드" },
      { label: "저장 위치", value: "GitHub · main" },
    ],
  },
};

export function getProjectMemoryDetail(recordId: string | undefined) {
  return recordId ? projectMemoryDetailRecords[recordId] : undefined;
}
