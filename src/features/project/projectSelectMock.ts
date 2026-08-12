export type ProjectSelectViewState = "success" | "empty";
export const DEFAULT_PROJECT_SELECT_STATE: ProjectSelectViewState = "success";

export const projectSortOptions = ["최근 활동 순", "오래된 순"] as const;
export type ProjectSortOption = (typeof projectSortOptions)[number];
export const DEFAULT_PROJECT_SORT_OPTION: ProjectSortOption = projectSortOptions[0];

export const projectStatusOptions = ["전체 상태", "연결됨", "연결 안됨"] as const;
export type ProjectStatusOption = (typeof projectStatusOptions)[number];
export const DEFAULT_PROJECT_STATUS_OPTION: ProjectStatusOption = projectStatusOptions[0];

export type ProjectSummaryCard = {
  id: string;
  icon: string;
  name: string;
  description: string;
  role: string;
  plan: "Free" | "Starter" | "Team";
  repositoryConnected: boolean;
  repository?: string;
  approvedRecords: number;
  pendingTasks: number;
  creditsUsed?: number;
  creditsTotal?: number;
  members: string[];
  lastActivityAt: string;
};

export const projectSelectMock: ProjectSummaryCard[] = [
  {
    id: "contextory-web",
    icon: "C",
    name: "Contextory Web",
    description: "AI 기반 프로젝트 메모리 서비스",
    role: "프로젝트 관리자",
    plan: "Starter",
    repositoryConnected: true,
    repository: "team/contextory-web",
    approvedRecords: 1248,
    pendingTasks: 18,
    creditsUsed: 2340,
    creditsTotal: 5000,
    members: ["홍", "김", "이"],
    lastActivityAt: "2024-10-25",
  },
  {
    id: "contextory-api",
    icon: "API",
    name: "Contextory API",
    description: "공개 API 및 백엔드 시스템",
    role: "백엔드 개발자",
    plan: "Team",
    repositoryConnected: true,
    repository: "team/contextory-api",
    approvedRecords: 3521,
    pendingTasks: 42,
    creditsUsed: 12450,
    creditsTotal: 20000,
    members: ["홍", "김", "이"],
    lastActivityAt: "2024-10-24",
  },
  {
    id: "contextory-mobile",
    icon: "M",
    name: "Contextory Mobile",
    description: "모바일 앱 및 클라이언트",
    role: "프론트엔드 개발자",
    plan: "Free",
    repositoryConnected: false,
    approvedRecords: 642,
    pendingTasks: 7,
    members: ["홍", "김", "이"],
    lastActivityAt: "2024-10-18",
  },
  {
    id: "contextory-admin",
    icon: "AD",
    name: "Contextory Admin",
    description: "내부 운영자용 관리 콘솔",
    role: "백엔드 개발자",
    plan: "Team",
    repositoryConnected: true,
    repository: "team/contextory-admin",
    approvedRecords: 218,
    pendingTasks: 5,
    creditsUsed: 890,
    creditsTotal: 5000,
    members: ["김", "박"],
    lastActivityAt: "2024-10-22",
  },
  {
    id: "contextory-analytics",
    icon: "AN",
    name: "Contextory Analytics",
    description: "사용량 및 지표 분석 대시보드",
    role: "데이터 분석가",
    plan: "Starter",
    repositoryConnected: true,
    repository: "team/contextory-analytics",
    approvedRecords: 356,
    pendingTasks: 11,
    creditsUsed: 1500,
    creditsTotal: 5000,
    members: ["이", "최"],
    lastActivityAt: "2024-10-20",
  },
  {
    id: "contextory-docs",
    icon: "D",
    name: "Contextory Docs",
    description: "제품 문서 및 가이드 사이트",
    role: "프론트엔드 개발자",
    plan: "Free",
    repositoryConnected: false,
    approvedRecords: 92,
    pendingTasks: 2,
    members: ["박"],
    lastActivityAt: "2024-10-15",
  },
  {
    id: "contextory-billing",
    icon: "B",
    name: "Contextory Billing",
    description: "결제 및 구독 관리 시스템",
    role: "백엔드 개발자",
    plan: "Team",
    repositoryConnected: true,
    repository: "team/contextory-billing",
    approvedRecords: 480,
    pendingTasks: 9,
    creditsUsed: 3200,
    creditsTotal: 10000,
    members: ["정", "윤", "권"],
    lastActivityAt: "2024-10-12",
  },
  {
    id: "contextory-design",
    icon: "DS",
    name: "Contextory Design System",
    description: "공통 UI 컴포넌트 및 디자인 토큰",
    role: "프론트엔드 개발자",
    plan: "Starter",
    repositoryConnected: true,
    repository: "team/contextory-design",
    approvedRecords: 134,
    pendingTasks: 3,
    creditsUsed: 600,
    creditsTotal: 5000,
    members: ["홍", "이"],
    lastActivityAt: "2024-10-09",
  },
];