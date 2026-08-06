// features/project/projectSelectMock.ts
export type ProjectSelectViewState = "success" | "empty";
export const DEFAULT_PROJECT_SELECT_STATE: ProjectSelectViewState = "success";

export type ProjectSummaryCard = {
  id: string;
  icon: string;
  name: string;
  description: string;
  role: string;
  plan: "Free" | "Starter" | "Team";
  repositoryConnected: boolean;
  approvedRecords: number;
  pendingTasks: number;
  creditsUsed?: number;
  creditsTotal?: number;
  members: string[];
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
    approvedRecords: 1248,
    pendingTasks: 18,
    creditsUsed: 2340,
    creditsTotal: 5000,
    members: ["홍", "김", "이"],
  },
  {
    id: "contextory-api",
    icon: "API",
    name: "Contextory API",
    description: "공개 API 및 백엔드 시스템",
    role: "백엔드 개발자",
    plan: "Team",
    repositoryConnected: true,
    approvedRecords: 3521,
    pendingTasks: 42,
    creditsUsed: 12450,
    creditsTotal: 20000,
    members: ["홍", "김", "이"],
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
  },
];