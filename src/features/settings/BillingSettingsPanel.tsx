import { Badge, Button } from "../../shared/ui";
import {
  billingPlanExamples,
  creditPackExamples,
  type BillingPlanExample,
  type CreditPackExample,
} from "./billingSettingsExamples";
import "./BillingSettingsPanel.css";

export function BillingSettingsPanel() {
  return (
    <section aria-label="결제 및 플랜 설정" className="billing-settings" role="tabpanel">
      <section aria-labelledby="billing-coming-soon-title" className="billing-coming-soon">
        <div className="billing-coming-soon__copy">
          <div className="billing-coming-soon__title-row">
            <h2 id="billing-coming-soon-title">결제 기능 준비 중</h2>
            <Badge variant="neutral">준비 중</Badge>
          </div>
          <p>
            현재 결제 시스템과 연결되어 있지 않습니다.
            아래 플랜과 크레딧 정보는 서비스 정책 예시이며
            실제 구독 또는 결제 상태를 의미하지 않습니다.
          </p>
        </div>
      </section>

      <div className="billing-settings__summary">
        <section className="billing-summary-card billing-summary-card--subscription">
          <header>
            <h2>구독 정보</h2>
            <Badge variant="neutral">준비 중</Badge>
          </header>
          <p className="billing-summary-card__unavailable">
            결제 시스템 연동 준비 중입니다. 실제 구독 상태는 표시하지 않습니다.
          </p>
        </section>

        <section className="billing-summary-card billing-summary-card--credits">
          <header>
            <h2>크레딧 사용량</h2>
            <Badge variant="neutral">준비 중</Badge>
          </header>
          <p className="billing-summary-card__unavailable">
            크레딧 사용량 조회 기능은 준비 중입니다.
          </p>
        </section>
      </div>

      <section aria-labelledby="billing-plans-title" className="billing-settings__plans-section">
        <header className="billing-settings__section-header">
          <div className="billing-settings__section-title-row">
            <h2 id="billing-plans-title">플랜 예시</h2>
            <Badge variant="neutral">예시 데이터</Badge>
          </div>
          <p>결제 기능 오픈 전 참고용 정책입니다. 실제 구독 중인 플랜을 의미하지 않습니다.</p>
        </header>
        <div className="billing-settings__plans">
          {billingPlanExamples.map((plan) => (
            <BillingPlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <section aria-labelledby="credit-packs-title" className="billing-settings__credit-section">
        <header className="billing-settings__section-header">
          <div className="billing-settings__section-title-row">
            <h2 id="credit-packs-title">추가 크레딧 예시</h2>
            <Badge variant="neutral">예시 데이터</Badge>
          </div>
          <p>결제 기능 오픈 전 참고용 상품 예시입니다. 실제 구매는 지원하지 않습니다.</p>
        </header>
        <div className="billing-settings__credit-packs">
          {creditPackExamples.map((pack) => (
            <BillingCreditPack key={pack.id} pack={pack} />
          ))}
        </div>
      </section>
    </section>
  );
}

function BillingPlanCard({ plan }: { plan: BillingPlanExample }) {
  return (
    <article className="billing-plan-card">
      <header>
        <h3>{plan.name}</h3>
      </header>
      <strong className="billing-plan-card__price">{plan.price}</strong>
      <ul>
        <li>{plan.members}</li>
        <li>{plan.credits}</li>
        <li>{plan.description}</li>
      </ul>
      <Button
        aria-label={`${plan.name} 준비 중`}
        className="billing-plan-card__action"
        disabled
        size="sm"
        variant="secondary"
      >
        준비 중
      </Button>
    </article>
  );
}

function BillingCreditPack({ pack }: { pack: CreditPackExample }) {
  return (
    <article className="billing-credit-pack">
      <div>
        <h3>{pack.credits}</h3>
        <strong>{pack.price}</strong>
        <p>{pack.unitPrice}</p>
      </div>
      <Button
        aria-label={`${pack.credits} 준비 중`}
        disabled
        size="sm"
        variant="secondary"
      >
        준비 중
      </Button>
    </article>
  );
}
