import { forwardRef } from "react";
import "./Button.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      disabled,
      children,
      className = "",
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      className={[
        "ui-button",
        `ui-button--${variant}`,
        `ui-button--${size}`,
        fullWidth ? "ui-button--full" : "",
        loading ? "ui-button--loading" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      ref={ref}
      type={type}
      {...props}
    >
      {loading ? <span className="ui-button__spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  ),
);

Button.displayName = "Button";
