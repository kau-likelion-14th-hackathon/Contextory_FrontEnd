import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "../Button";
import "./Modal.css";

export type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose?: () => void;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const INITIAL_FOCUS_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeOnEscapeRef.current = closeOnEscape;
  }, [closeOnEscape]);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && closeOnEscapeRef.current) {
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(INITIAL_FOCUS_SELECTOR);
    firstFocusable?.focus();
    if (!firstFocusable) {
      dialogRef.current?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onCloseRef.current?.();
        }
      }}
    >
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="modal__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          {onClose ? (
            <Button
              aria-label="Close modal"
              onClick={() => onCloseRef.current?.()}
              size="sm"
              variant="ghost"
            >
              ×
            </Button>
          ) : null}
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
