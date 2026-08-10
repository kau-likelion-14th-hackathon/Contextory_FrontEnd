import { Badge, Button } from "../../shared/ui";
import {
  billingCreditMock,
  billingPlansMock,
  billingSubscriptionMock,
  creditPacksMock,
  type BillingPlanViewModel,
  type BillingViewState,
  type CreditPackViewModel,
} from "./billingSettingsMock";
import "./BillingSettingsPanel.css";

type BillingSettingsPanelProps = {
  feedback: string;
  state: BillingViewState;
  onFeedback: (message: string) => void;
};

const stateDescriptions: Record<BillingViewState, string> = {
  default: "현재 구독, 팀원 수, 크레딧 사용량과 플랜을 관리하세요.",
  "trial-ended": "무료 체험 종료 후 플랜 상태와 다음 선택을 확인하세요.",
  "payment-success": "결제 결과와 반영된 크레딧을 확인하세요.",
  "payment-failed": "결제 오류를 확인하고 안전하게 다시 시도하세요.",
};

export function BillingSettingsPanel({ feedback, state, onFeedback }: BillingSettingsPanelProps) {
  const currentPlanId = state === "trial-ended" ? "free" : "team";

  return (
    <section aria-label="결제 및 플랜 설정" className="billing-settings" role="tabpanel">
      <header className="billing-settings__header">
        <div>
          <h1>결제 및 플랜</h1>
          <p>{stateDescriptions[state]}</p>
          <p aria-live="polite" className="billing-settings__feedback">{feedback}</p>
        </div>
        <Button
          className="billing-settings__history-button"
          onClick={() => onFeedback("결제 내역 기능은 현재 결제 시스템과 연결되어 있지 않습니다.")}
          size="sm"
          variant="secondary"
        >
          결제 내역
        </Button>
      </header>

      {state === "default" ? <BillingSummary /> : (
        <BillingStateBanner onFeedback={onFeedback} state={state} />
      )}

      <section aria-labelledby="billing-plans-title" className="billing-settings__plans-section">
        <h2 className="sr-only" id="billing-plans-title">플랜 선택</h2>
        <div className="billing-settings__plans">
          {billingPlansMock.map((plan) => (
            <BillingPlanCard
              current={plan.id === currentPlanId}
              key={plan.id}
              onFeedback={onFeedback}
              plan={plan}
              trialEnded={state === "trial-ended"}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="credit-packs-title" className="billing-settings__credit-section">
        <header className="billing-settings__section-header">
          <h2 id="credit-packs-title">추가 크레딧 구매</h2>
          <p>플랜 크레딧이 부족할 때 추가 구매</p>
        </header>
        <div className="billing-settings__credit-packs">
          {creditPacksMock.map((pack) => (
            <BillingCreditPack key={pack.id} onFeedback={onFeedback} pack={pack} />
          ))}
        </div>
      </section>
    </section>
  );
}

function BillingSummary() {
  return (
    <div className="billing-settings__summary">
      <section className="billing-summary-card billing-summary-card--subscription">
        <header>
          <h2>현재 구독 정보</h2>
          <Badge variant="success">{billingSubscriptionMock.status}</Badge>
        </header>
        <dl>
          <div><dt>현재 플랜</dt><dd>{billingSubscriptionMock.plan}</dd></div>
          <div><dt>포함 멤버</dt><dd>{billingSubscriptionMock.includedMembers}</dd></div>
          <div><dt>추가 멤버 요금</dt><dd>{billingSubscriptionMock.extraMemberPrice}</dd></div>
          <div><dt>현재 팀원 수</dt><dd>{billingSubscriptionMock.currentMembers}</dd></div>
        </dl>
      </section>

      <section className="billing-summary-card billing-summary-card--credits">
        <div className="billing-credit-metric">
          <span>남은 크레딧</span>
          <strong>{billingCreditMock.remaining.toLocaleString()}</strong>
          <span>/ {billingCreditMock.total.toLocaleString()}</span>
        </div>
        <div className="billing-credit-detail">
          <h2>이번 달 사용량</h2>
          <strong>{billingCreditMock.used.toLocaleString()} Credit 사용</strong>
          <progress
            aria-label={`이번 달 크레딧 사용량 ${billingCreditMock.used} / ${billingCreditMock.total}`}
            max={billingCreditMock.total}
            value={billingCreditMock.used}
          />
          <span>다음 초기화: {billingCreditMock.resetAt}</span>
          <p>{billingCreditMock.policy}</p>
        </div>
      </section>
    </div>
  );
}

function BillingStateBanner({
  state,
  onFeedback,
}: {
  state: Exclude<BillingViewState, "default">;
  onFeedback: (message: string) => void;
}) {
  const content = {
    "trial-ended": {
      symbol: "↻",
      title: "Team 무료 체험이 종료되었습니다",
      description: "14일 무료 체험이 끝나 Free 플랜으로 자동 전환되었습니다.",
      detail: "현재 플랜 Free · 포함 3명 · 월 기본 크레딧 100",
      action: "Team 플랜 보기",
      feedback: "Team 플랜 선택 기능은 현재 결제 시스템과 연결되어 있지 않습니다.",
    },
    "payment-success": {
      symbol: "✓",
      title: "결제가 완료되었습니다",
      description: "추가 크레딧 구매가 정상적으로 처리되었습니다.",
      detail: "2,000 Credits 추가 · 결제 금액 $50",
      action: "결제 내역 보기",
      feedback: "결제 내역 기능은 현재 결제 시스템과 연결되어 있지 않습니다.",
    },
    "payment-failed": {
      symbol: "!",
      title: "결제를 완료하지 못했습니다",
      description: "카드 승인 실패로 결제가 처리되지 않았습니다. 결제 수단을 확인한 뒤 다시 시도해주세요.",
      detail: "현재 플랜과 보유 크레딧은 변경되지 않았습니다.",
      action: "다시 결제하기",
      feedback: "결제 재시도 기능은 현재 결제 시스템과 연결되어 있지 않습니다.",
    },
  }[state];

  return (
    <section
      aria-labelledby="billing-state-title"
      className={`billing-state-banner billing-state-banner--${state}`}
    >
      <span aria-hidden="true" className="billing-state-banner__icon">{content.symbol}</span>
      <div>
        <h2 id="billing-state-title">{content.title}</h2>
        <p>{content.description}</p>
        <strong>{content.detail}</strong>
      </div>
      <Button onClick={() => onFeedback(content.feedback)} size="sm" variant="secondary">
        {content.action}
      </Button>
    </section>
  );
}

function BillingPlanCard({
  plan,
  current,
  trialEnded,
  onFeedback,
}: {
  plan: BillingPlanViewModel;
  current: boolean;
  trialEnded: boolean;
  onFeedback: (message: string) => void;
}) {
  const actionLabel = current
    ? plan.id === "free" ? "현재 플랜" : plan.actionLabel
    : trialEnded && plan.id === "team"
      ? "Team으로 변경"
      : plan.actionLabel;
  const isCurrentStatusOnly = trialEnded && current && plan.id === "free";
  const description = trialEnded && plan.id === "free" ? "무료 체험 종료 · Free 전환" : plan.description;

  return (
    <article className={current ? "billing-plan-card billing-plan-card--current" : "billing-plan-card"}>
      <header>
        <h3>{plan.name}</h3>
        {current ? <Badge variant="success">현재 플랜</Badge> : null}
      </header>
      <strong className="billing-plan-card__price">{plan.price}</strong>
      <ul>
        <li>{plan.members}</li>
        <li>{plan.credits}</li>
        <li>{description}</li>
      </ul>
      {isCurrentStatusOnly ? (
        <span className="billing-plan-card__current-action">현재 플랜</span>
      ) : (
        <Button
          aria-label={`${plan.name} ${actionLabel}`}
          className="billing-plan-card__action"
          onClick={() => onFeedback(`${plan.name} ${actionLabel} 기능은 현재 결제 시스템과 연결되어 있지 않습니다.`)}
          size="sm"
          variant={current ? "primary" : "secondary"}
        >
          {actionLabel}
        </Button>
      )}
    </article>
  );
}

function BillingCreditPack({
  pack,
  onFeedback,
}: {
  pack: CreditPackViewModel;
  onFeedback: (message: string) => void;
}) {
  return (
    <article className="billing-credit-pack">
      <div>
        <h3>{pack.credits}</h3>
        <strong>{pack.price}</strong>
        <p>{pack.unitPrice}</p>
      </div>
      <Button
        aria-label={`${pack.credits} 구매하기`}
        onClick={() => onFeedback(`${pack.credits} 구매 기능은 현재 결제 시스템과 연결되어 있지 않습니다.`)}
        size="sm"
        variant="secondary"
      >
        구매하기
      </Button>
    </article>
  );
}
