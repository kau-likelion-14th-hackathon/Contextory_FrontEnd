import { forwardRef, useId } from "react";
import { Input, type InputProps } from "../Input";
import "./FormField.css";

export type FormFieldProps = InputProps & {
  label: string;
  helperText?: string;
  errorMessage?: string;
};

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  {
    id,
    label,
    helperText,
    errorMessage,
    ...inputProps
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = helperText ? `${inputId}-helper` : undefined;
  const errorId = errorMessage ? `${inputId}-error` : undefined;

  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={inputId}>
        {label}
      </label>
      <Input
        {...inputProps}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(" ") || undefined}
        id={inputId}
        invalid={Boolean(errorMessage) || inputProps.invalid}
        ref={ref}
      />
      {helperText ? (
        <p className="form-field__helper" id={descriptionId}>
          {helperText}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="form-field__error" id={errorId}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
});
