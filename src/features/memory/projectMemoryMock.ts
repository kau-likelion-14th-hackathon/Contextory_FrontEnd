export const memoryRecordTypes = ["전체", "변경", "구현", "결정", "문제 및 해결"] as const;
export const memoryRoles = ["모든 역할", "FE", "BE", "PM", "QA", "SRE", "CS"] as const;
export const memorySortOptions = ["최신순", "오래된순"] as const;

export type MemoryRecordType = Exclude<(typeof memoryRecordTypes)[number], "전체">;
export type MemoryRecordTypeFilter = (typeof memoryRecordTypes)[number];
export type MemoryRole = Exclude<(typeof memoryRoles)[number], "모든 역할">;
export type MemoryRoleFilter = (typeof memoryRoles)[number];
export type MemorySortOption = (typeof memorySortOptions)[number];

export type ProjectMemoryRecord = {
  id: string;
  type: MemoryRecordType;
  title: string;
  summary: string;
  roles: MemoryRole[];
  approvedAt: string;
  approvedAtValue: string;
  pullRequestNumber: number;
  followUp: {
    completed: number;
    total: number;
  };
  keywords: string[];
};

export const projectMemoryRecordsMock: ProjectMemoryRecord[] = [
  {
    id: "record-128",
    type: "구현",
    title: "에러 응답 포맷 통일 및 공통 유틸 추가",
    summary: "모든 API의 에러 응답을 표준 포맷으로 통일하고 생성 헬퍼 함수를 추가했습니다.",
    roles: ["BE", "FE", "QA"],
    approvedAt: "2024.10.25",
    approvedAtValue: "2024-10-25",
    pullRequestNumber: 128,
    followUp: { completed: 2, total: 3 },
    keywords: ["API", "에러", "응답", "유틸"],
  },
  {
    id: "record-125",
    type: "결정",
    title: "로그 레벨 기준을 INFO 중심으로 조정",
    summary: "운영 가시성을 높이기 위해 INFO 레벨 중심으로 로그 기준을 재정의했습니다.",
    roles: ["BE", "SRE", "QA"],
    approvedAt: "2024.10.24",
    approvedAtValue: "2024-10-24",
    pullRequestNumber: 125,
    followUp: { completed: 1, total: 2 },
    keywords: ["로그", "INFO", "운영", "모니터링"],
  },
  {
    id: "record-121",
    type: "변경",
    title: "API 응답 캐싱 TTL 기본값 60초로 변경",
    summary: "응답 성능 개선을 위해 기본 TTL을 60초로 조정했습니다.",
    roles: ["BE", "FE", "SRE"],
    approvedAt: "2024.10.22",
    approvedAtValue: "2024-10-22",
    pullRequestNumber: 121,
    followUp: { completed: 3, total: 4 },
    keywords: ["API", "캐시", "TTL", "성능"],
  },
  {
    id: "record-119",
    type: "문제 및 해결",
    title: "OAuth 토큰 갱신 실패 이슈 원인 및 해결",
    summary: "동시 요청 시 토큰 갱신 충돌로 실패하던 이슈를 락 처리로 해결했습니다.",
    roles: ["BE", "FE", "QA"],
    approvedAt: "2024.10.21",
    approvedAtValue: "2024-10-21",
    pullRequestNumber: 119,
    followUp: { completed: 2, total: 2 },
    keywords: ["OAuth", "토큰", "동시성", "락"],
  },
  {
    id: "record-115",
    type: "결정",
    title: "신규 알림 채널은 이메일 우선으로 결정",
    summary: "초기 비용과 도입 속도를 고려해 이메일을 1순위 채널로 채택했습니다.",
    roles: ["PM", "BE", "CS"],
    approvedAt: "2024.10.18",
    approvedAtValue: "2024-10-18",
    pullRequestNumber: 115,
    followUp: { completed: 0, total: 2 },
    keywords: ["알림", "이메일", "채널", "우선순위"],
  },
  {
    id: "record-112",
    type: "구현",
    title: "사용자 세션 만료 알림과 자동 로그아웃 처리",
    summary: "세션 만료 전에 안내하고 만료 시 로그인 화면으로 이동하는 흐름을 추가했습니다.",
    roles: ["FE", "BE", "QA"],
    approvedAt: "2024.10.16",
    approvedAtValue: "2024-10-16",
    pullRequestNumber: 112,
    followUp: { completed: 1, total: 1 },
    keywords: ["세션", "로그아웃", "인증", "만료"],
  },
  {
    id: "record-109",
    type: "변경",
    title: "배포 승인 체크리스트에 회귀 테스트 항목 추가",
    summary: "배포 전 핵심 사용자 흐름을 확인하도록 승인 체크리스트를 보완했습니다.",
    roles: ["QA", "SRE", "PM"],
    approvedAt: "2024.10.14",
    approvedAtValue: "2024-10-14",
    pullRequestNumber: 109,
    followUp: { completed: 2, total: 3 },
    keywords: ["배포", "회귀 테스트", "체크리스트", "승인"],
  },
  {
    id: "record-104",
    type: "문제 및 해결",
    title: "대용량 파일 업로드 중 메모리 증가 문제 해결",
    summary: "스트리밍 업로드를 적용해 서버 메모리 사용량이 증가하던 문제를 해결했습니다.",
    roles: ["BE", "SRE", "QA"],
    approvedAt: "2024.10.11",
    approvedAtValue: "2024-10-11",
    pullRequestNumber: 104,
    followUp: { completed: 3, total: 3 },
    keywords: ["파일", "업로드", "메모리", "스트리밍"],
  },
  {
    id: "record-101",
    type: "결정",
    title: "고객 문의 분류 체계를 제품 영역 기준으로 통합",
    summary: "문의 전달과 통계 집계를 단순화하기 위해 분류 기준을 제품 영역 중심으로 정리했습니다.",
    roles: ["CS", "PM", "FE"],
    approvedAt: "2024.10.09",
    approvedAtValue: "2024-10-09",
    pullRequestNumber: 101,
    followUp: { completed: 1, total: 2 },
    keywords: ["고객 문의", "분류", "통계", "제품"],
  },
  {
    id: "record-98",
    type: "구현",
    title: "관리자 감사 로그 조회 화면 구현",
    summary: "주요 설정 변경과 승인 이력을 기간 및 사용자 기준으로 조회할 수 있게 했습니다.",
    roles: ["FE", "BE", "SRE"],
    approvedAt: "2024.10.07",
    approvedAtValue: "2024-10-07",
    pullRequestNumber: 98,
    followUp: { completed: 2, total: 2 },
    keywords: ["관리자", "감사 로그", "승인", "조회"],
  },
  {
    id: "record-94",
    type: "변경",
    title: "프로젝트 초대 링크 유효 시간을 48시간으로 조정",
    summary: "팀 합류 과정의 재발급 요청을 줄이기 위해 초대 링크 만료 기준을 변경했습니다.",
    roles: ["PM", "BE", "CS"],
    approvedAt: "2024.10.04",
    approvedAtValue: "2024-10-04",
    pullRequestNumber: 94,
    followUp: { completed: 1, total: 1 },
    keywords: ["프로젝트", "초대", "링크", "유효 시간"],
  },
  {
    id: "record-90",
    type: "문제 및 해결",
    title: "모바일 목록에서 긴 브랜치명이 넘치는 문제 해결",
    summary: "브랜치명 줄바꿈 규칙을 적용해 작은 화면에서 발생하던 수평 스크롤을 제거했습니다.",
    roles: ["FE", "QA"],
    approvedAt: "2024.10.02",
    approvedAtValue: "2024-10-02",
    pullRequestNumber: 90,
    followUp: { completed: 2, total: 2 },
    keywords: ["모바일", "브랜치", "반응형", "스크롤"],
  },
];
