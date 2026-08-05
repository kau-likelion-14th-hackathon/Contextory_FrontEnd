import { forwardRef } from "react";
import { Input, type InputProps } from "../Input";
import "./SearchInput.css";

export type SearchInputProps = Omit<InputProps, "type"> & {
  onClear?: () => void;
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onClear, className = "", ...props }, ref) => (
    <div
      className={[
        "search-input",
        onClear ? "search-input--custom-clear" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="search-input__icon" aria-hidden="true">
        ⌕
      </span>
      <Input
        {...props}
        className="search-input__field"
        ref={ref}
        type="search"
        value={value}
      />
      {value && onClear ? (
        <button
          aria-label="검색어 지우기"
          className="search-input__clear"
          onClick={onClear}
          type="button"
        >
          ×
        </button>
      ) : null}
    </div>
  ),
);

SearchInput.displayName = "SearchInput";
