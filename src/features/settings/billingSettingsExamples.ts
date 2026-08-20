export type BillingPlanExample = {
  id: "free" | "starter" | "team" | "business" | "enterprise";
  name: string;
  price: string;
  members: string;
  credits: string;
  description: string;
};

export type CreditPackExample = {
  id: string;
  credits: string;
  price: string;
  unitPrice: string;
};

/** 결제 연동 전 참고용 플랜 정책 예시. 실제 구독 상태가 아니다. */
export const billingPlanExamples: BillingPlanExample[] = [
  {
    id: "free",
    name: "Free",
    price: "$0 / 월",
    members: "기본 3명 · 초과 -",
    credits: "월 기본 크레딧 100",
    description: "14일 Team 무료 체험",
  },
  {
    id: "starter",
    name: "Starter",
    price: "$29 / 월",
    members: "기본 5명 · 초과 $8/인",
    credits: "월 기본 크레딧 600",
    description: "팀 규모에 맞는 기본 제공량",
  },
  {
    id: "team",
    name: "Team",
    price: "$99 / 월",
    members: "기본 10명 · 초과 $12/인",
    credits: "월 기본 크레딧 3,000",
    description: "팀 규모에 맞는 기본 제공량",
  },
  {
    id: "business",
    name: "Business",
    price: "$249 / 월",
    members: "기본 25명 · 초과 $15/인",
    credits: "월 기본 크레딧 9,000",
    description: "팀 규모에 맞는 기본 제공량",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$1,199~ / 월",
    members: "기본 50명 · 초과 $18/인",
    credits: "월 기본 크레딧 30,000",
    description: "최소 12개월 계약",
  },
];

/** 결제 연동 전 참고용 추가 크레딧 상품 예시. 실제 판매 상태가 아니다. */
export const creditPackExamples: CreditPackExample[] = [
  { id: "credit-500", credits: "500 Credit", price: "$15", unitPrice: "$0.030 / Credit" },
  { id: "credit-2000", credits: "2,000 Credit", price: "$50", unitPrice: "$0.025 / Credit" },
  { id: "credit-10000", credits: "10,000 Credit", price: "$200", unitPrice: "$0.020 / Credit" },
];
