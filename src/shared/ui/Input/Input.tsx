import { forwardRef } from "react";
import "./Input.css";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", invalid = false, ...props }, ref) => (
    <input
      aria-invalid={invalid || undefined}
      className={["ui-input", invalid ? "ui-input--invalid" : "", className]
        .filter(Boolean)
        .join(" ")}
      ref={ref}
      {...props}
    />
  ),
);

Input.displayName = "Input";
