import { Badge, Button } from "../../../../shared/ui";
import "./PlanCard.css";

export type PlanFeature = {
  label: string;
  included?: boolean;
};

export type PlanCardProps = {
  name: string;
  price: string;
  description?: string;
  features: PlanFeature[];
  highlighted?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export function PlanCard({
  name,
  price,
  description,
  features,
  highlighted,
  actionLabel,
  onAction,
}: PlanCardProps) {
  return (
    <article className={highlighted ? "plan-card plan-card--highlighted" : "plan-card"}>
      <header className="plan-card__header">
        <h3>{name}</h3>
        {highlighted ? <Badge variant="success">Recommended</Badge> : null}
      </header>
      <strong>{price}</strong>
      {description ? <p>{description}</p> : null}
      <ul>
        {features.map((feature) => (
          <li key={feature.label}>
            <span aria-hidden="true">{feature.included === false ? "–" : "✓"}</span>
            {feature.label}
          </li>
        ))}
      </ul>
      {actionLabel && onAction ? (
        <Button fullWidth onClick={onAction} variant={highlighted ? "primary" : "secondary"}>
          {actionLabel}
        </Button>
      ) : null}
    </article>
  );
}
