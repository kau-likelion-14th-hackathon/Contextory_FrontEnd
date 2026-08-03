type AppStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function LoadingState({ title, description }: AppStateProps) {
  return (
    <section className="state-panel" aria-live="polite">
      <span className="state-panel__label">Loading</span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: AppStateProps) {
  return (
    <section className="state-panel">
      <span className="state-panel__label">Empty</span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {actionLabel && onAction ? (
        <button className="button button--primary" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}

export function ErrorState({
  title,
  description,
  actionLabel,
  onAction,
}: AppStateProps) {
  return (
    <section className="state-panel" role="alert">
      <span className="state-panel__label state-panel__label--error">Error</span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {actionLabel && onAction ? (
        <button className="button button--primary" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
