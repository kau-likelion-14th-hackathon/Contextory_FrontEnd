import { Button } from "../Button";
import "./FeedbackState.css";

export type FeedbackAction = {
  label: string;
  onClick: () => void;
};

export type FeedbackStateProps = {
  icon?: React.ReactNode;
  visual?: React.ReactNode;
  title: string;
  description?: string;
  details?: React.ReactNode;
  action?: FeedbackAction;
  secondaryAction?: FeedbackAction;
};

function FeedbackState({
  icon,
  visual,
  title,
  description,
  details,
  action,
  secondaryAction,
  tone,
  label,
}: FeedbackStateProps & { tone: "loading" | "empty" | "error" | "success"; label: string }) {
  const fallbackIcon = {
    empty: (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm4 4h8M8 14h5" />
      </svg>
    ),
    error: (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 8v5m0 3h.01M10.3 4.9 3.5 17.1A2 2 0 0 0 5.2 20h13.6a2 2 0 0 0 1.7-2.9L13.7 4.9a2 2 0 0 0-3.4 0Z" />
      </svg>
    ),
    loading: <span className="feedback-state__spinner" aria-hidden="true" />,
    success: (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m5 12 4 4L19 6" />
      </svg>
    ),
  }[tone];
  const stateRole = tone === "loading" ? "status" : tone === "error" ? "alert" : undefined;

  return (
    <section
      aria-live={tone === "loading" ? "polite" : undefined}
      className={`feedback-state feedback-state--${tone}`}
      role={stateRole}
    >
      {visual ?? <span className="feedback-state__icon">{icon ?? fallbackIcon}</span>}
      <div className="feedback-state__copy">
        <span className="feedback-state__label">{label}</span>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {details ? <div className="feedback-state__details">{details}</div> : null}
      {action || secondaryAction ? (
        <div className="feedback-state__actions">
          {secondaryAction ? (
            <Button onClick={secondaryAction.onClick} variant="secondary">
              {secondaryAction.label}
            </Button>
          ) : null}
          {action ? <Button onClick={action.onClick}>{action.label}</Button> : null}
        </div>
      ) : null}
    </section>
  );
}

export function LoadingState(props: FeedbackStateProps) {
  return <FeedbackState {...props} label="로딩 중" tone="loading" />;
}

export function EmptyState(props: FeedbackStateProps) {
  return <FeedbackState {...props} label="빈 상태" tone="empty" />;
}

export function ErrorState(props: FeedbackStateProps) {
  return <FeedbackState {...props} label="오류" tone="error" />;
}

export function SuccessState(props: FeedbackStateProps) {
  return <FeedbackState {...props} label="완료" tone="success" />;
}
