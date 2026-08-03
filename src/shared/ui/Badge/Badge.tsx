import "./Badge.css";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";
export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({
  variant = "neutral",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={["ui-badge", `ui-badge--${variant}`, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  variant,
}: {
  status: string;
  variant?: BadgeVariant;
}) {
  return <Badge variant={variant}>{status}</Badge>;
}

export function RoleBadge({
  role,
  variant = "neutral",
}: {
  role: string;
  variant?: BadgeVariant;
}) {
  return <Badge variant={variant}>{role}</Badge>;
}
