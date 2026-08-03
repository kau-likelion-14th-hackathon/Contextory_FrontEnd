import "./KpiCard.css";

export type KpiCardProps = {
  label: string;
  value: string | number;
  description?: string;
  trend?: string;
};

export function KpiCard({ label, value, description, trend }: KpiCardProps) {
  return (
    <article className="kpi-card">
      <p className="kpi-card__label">{label}</p>
      <strong>{value}</strong>
      {description ? <p>{description}</p> : null}
      {trend ? <span>{trend}</span> : null}
    </article>
  );
}
