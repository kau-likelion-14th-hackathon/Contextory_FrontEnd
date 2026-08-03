import { Button } from "../../../../shared/ui";
import "./CreditPack.css";

export type CreditPackProps = {
  credits: number;
  price: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function CreditPack({
  credits,
  price,
  description,
  actionLabel,
  onAction,
}: CreditPackProps) {
  return (
    <article className="credit-pack">
      <div>
        <h3>{credits.toLocaleString()} credits</h3>
        <strong>{price}</strong>
      </div>
      {description ? <p>{description}</p> : null}
      {actionLabel && onAction ? (
        <Button onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      ) : null}
    </article>
  );
}
