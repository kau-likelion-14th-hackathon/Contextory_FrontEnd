import type { BadgeVariant } from "../../shared/ui";

export type ProjectHomeRole = "admin" | "member";
export type ProjectHomeViewState = "loading" | "empty" | "error" | "success";

type ProjectHomeKpi = {
  label: string;
  value: string | number;
  description: string;
};

type ProjectHomeUpdate = {
  id: string;
  badge: string;
  badgeVariant: BadgeVariant;
  title: string;
  summary: string;
  createdAt: string;
};

export type ProjectHomeFollowUp = {
  id: string;
  content: string;
  targetRole: string;
  assignee: string;
  priority: string;
  priorityVariant: BadgeVariant;
  due: string;
  completed: boolean;
};

export type ProjectHomeData = {
  title: string;
  description: string;
  updateSectionTitle: string;
  taskSectionTitle: string;
  kpis: ProjectHomeKpi[];
  updates: ProjectHomeUpdate[];
  followUps: ProjectHomeFollowUp[];
};

export const DEFAULT_PROJECT_HOME_ROLE: ProjectHomeRole = "admin";
export const DEFAULT_PROJECT_HOME_STATE: ProjectHomeViewState = "success";

export const projectHomeTrialMock = {
  title: "Team 무료 체험 중",
  description: "13일 남음 · 종료 후 Free 전환",
};

export const projectHomePlanMock = {
  name: "Team 체험",
  used: "1,520",
  total: "3,000",
  usagePercent: 38,
};

export const projectHomeActivityMock = [
  "김백엔드님이 변경을 생성했어요",
  "내가 변경을 승인했어요",
  "QA팀이 후속 작업을 완료했어요",
];

export const projectHomeMockByRole: Record<ProjectHomeRole, ProjectHomeData> = {
  admin: {
    title: "프로젝트 홈 · 관리자",
    description: "분석 실패, 승인 요청, 저장소 동기화와 팀 운영 상태를 우선 확인하세요.",
    updateSectionTitle: "관리자 확인 필요",
    taskSectionTitle: "승인 대기 및 운영 작업",
    kpis: [
      { label: "검토 필요", value: 4, description: "오늘 검토해야 할 기록" },
      { label: "분석 실패", value: 1, description: "재분석이 필요한 PR" },
      { label: "승인 대기", value: 3, description: "Team 포함 분석 사용" },
      { label: "팀원 / 좌석", value: "8 / 10", description: "현재 사용 중인 좌석" },
    ],
    updates: [
      {
        id: "admin-update-1",
        badge: "실패",
        badgeVariant: "danger",
        title: "PR #128 AI 분석 실패",
        summary: "대용량 diff 분석이 중단되었습니다. 재분석이 필요합니다.",
        createdAt: "방금 전",
      },
      {
        id: "admin-update-2",
        badge: "승인 요청",
        badgeVariant: "info",
        title: "PR #127 기록 승인 요청",
        summary: "AI 프로젝트 기록 초안이 관리자 검토를 기다리고 있습니다.",
        createdAt: "12분 전",
      },
      {
        id: "admin-update-3",
        badge: "확인 필요",
        badgeVariant: "warning",
        title: "GitHub 동기화 지연",
        summary: "마지막 성공 동기화 이후 23분이 지났습니다.",
        createdAt: "23분 전",
      },
      {
        id: "admin-update-4",
        badge: "3일 남음",
        badgeVariant: "warning",
        title: "Team 무료 체험 종료 예정",
        summary: "3일 후 Free로 전환됩니다. 플랜 유지 여부를 확인하세요.",
        createdAt: "3일 남음",
      },
    ],
    followUps: [
      {
        id: "admin-task-1",
        content: "PR #127 기록 검토 및 승인",
        targetRole: "관리자",
        assignee: "홍길동",
        priority: "높음",
        priorityVariant: "danger",
        due: "오늘 18:00",
        completed: false,
      },
      {
        id: "admin-task-2",
        content: "GitHub 저장소 권한 재확인",
        targetRole: "인프라",
        assignee: "박인프라",
        priority: "높음",
        priorityVariant: "danger",
        due: "내일 12:00",
        completed: false,
      },
      {
        id: "admin-task-3",
        content: "팀원 역할과 좌석 사용량 확인",
        targetRole: "관리자",
        assignee: "홍길동",
        priority: "중간",
        priorityVariant: "warning",
        due: "10/30",
        completed: true,
      },
    ],
  },
  member: {
    title: "프로젝트 홈",
    description: "프로젝트 전반의 상태와 내 역할에 영향을 주는 변경을 확인하세요.",
    updateSectionTitle: "내 역할에 영향을 주는 최근 변경",
    taskSectionTitle: "내 후속 작업",
    kpis: [
      { label: "미확인 변경", value: 3, description: "영향을 검토하고 승인하세요" },
      { label: "내 후속 작업", value: 5, description: "기한 내 완료해주세요" },
      { label: "최근 승인 기록", value: 2, description: "최근 7일 승인 완료" },
      { label: "이번 달 크레딧", value: "38%", description: "1,520 / 3,000 사용" },
    ],
    updates: [
      {
        id: "member-update-1",
        badge: "백엔드",
        badgeVariant: "success",
        title: "로그인 API 오류 응답 포맷 변경",
        summary: "에러 코드와 message 필드 추가가 프론트 오류 처리에 영향을 줄 수 있습니다.",
        createdAt: "10분 전",
      },
      {
        id: "member-update-2",
        badge: "프론트엔드",
        badgeVariant: "info",
        title: "사용자 프로필 조회 응답 필드 추가",
        summary: "nickname, avatarUrl 필드가 추가되었습니다.",
        createdAt: "1시간 전",
      },
      {
        id: "member-update-3",
        badge: "인프라",
        badgeVariant: "neutral",
        title: "공통 API 클라이언트 타임아웃 조정",
        summary: "요청 타임아웃을 5초에서 8초로 조정했습니다.",
        createdAt: "어제",
      },
      {
        id: "member-update-4",
        badge: "기획",
        badgeVariant: "warning",
        title: "비밀번호 재설정 이메일 텍스트 업데이트",
        summary: "브랜드 가이드에 맞춰 문구가 변경되었습니다.",
        createdAt: "어제",
      },
    ],
    followUps: [
      {
        id: "member-task-1",
        content: "프론트 로그인 에러 처리 로직 검토",
        targetRole: "프론트엔드",
        assignee: "나",
        priority: "높음",
        priorityVariant: "danger",
        due: "오늘 18:00",
        completed: false,
      },
      {
        id: "member-task-2",
        content: "에러 코드 매핑 문서 업데이트",
        targetRole: "프론트엔드",
        assignee: "나",
        priority: "높음",
        priorityVariant: "danger",
        due: "내일 12:00",
        completed: false,
      },
      {
        id: "member-task-3",
        content: "변경 영향 QA 체크리스트 작성",
        targetRole: "QA",
        assignee: "최QA",
        priority: "중간",
        priorityVariant: "warning",
        due: "10/30",
        completed: true,
      },
    ],
  },
};
