export type BillingViewState =
  | "default"
  | "trial-ended"
  | "payment-success"
  | "payment-failed";

export type BillingPlanViewModel = {
  id: "free" | "starter" | "team" | "business" | "enterprise";
  name: string;
  price: string;
  members: string;
  credits: string;
  description: string;
  actionLabel: string;
};

export type CreditPackViewModel = {
  id: string;
  credits: string;
  price: string;
  unitPrice: string;
};

export const billingSubscriptionMock = {
  status: "활성",
  plan: "Team",
  includedMembers: "10명",
  extraMemberPrice: "$12 / 인 / 월",
  currentMembers: "12명 · 2명 초과",
};

export const billingCreditMock = {
  remaining: 2340,
  total: 3000,
  used: 660,
  resetAt: "매월 1일",
  policy: "활동별 크레딧 소비 기준은 정책 확정 후 적용",
};

export const billingPlansMock: BillingPlanViewModel[] = [
  {
    id: "free",
    name: "Free",
    price: "$0 / 월",
    members: "기본 3명 · 초과 -",
    credits: "월 기본 크레딧 100",
    description: "14일 Team 무료 체험",
    actionLabel: "플랜 변경",
  },
  {
    id: "starter",
    name: "Starter",
    price: "$29 / 월",
    members: "기본 5명 · 초과 $8/인",
    credits: "월 기본 크레딧 600",
    description: "팀 규모에 맞는 기본 제공량",
    actionLabel: "플랜 변경",
  },
  {
    id: "team",
    name: "Team",
    price: "$99 / 월",
    members: "기본 10명 · 초과 $12/인",
    credits: "월 기본 크레딧 3,000",
    description: "팀 규모에 맞는 기본 제공량",
    actionLabel: "플랜 관리",
  },
  {
    id: "business",
    name: "Business",
    price: "$249 / 월",
    members: "기본 25명 · 초과 $15/인",
    credits: "월 기본 크레딧 9,000",
    description: "팀 규모에 맞는 기본 제공량",
    actionLabel: "플랜 변경",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$1,199~ / 월",
    members: "기본 50명 · 초과 $18/인",
    credits: "월 기본 크레딧 30,000",
    description: "최소 12개월 계약",
    actionLabel: "상담 / 문의",
  },
];

export const creditPacksMock: CreditPackViewModel[] = [
  { id: "credit-500", credits: "500 Credit", price: "$15", unitPrice: "$0.030 / Credit" },
  { id: "credit-2000", credits: "2,000 Credit", price: "$50", unitPrice: "$0.025 / Credit" },
  { id: "credit-10000", credits: "10,000 Credit", price: "$200", unitPrice: "$0.020 / Credit" },
];

export function isBillingViewState(value: string | null): value is BillingViewState {
  return (
    value === "default" ||
    value === "trial-ended" ||
    value === "payment-success" ||
    value === "payment-failed"
  );
}
