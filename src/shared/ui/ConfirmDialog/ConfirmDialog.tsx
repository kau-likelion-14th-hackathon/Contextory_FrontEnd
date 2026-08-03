import { Button } from "../Button";
import { Modal } from "../Modal";
import "./ConfirmDialog.css";

export type ConfirmDialogVariant = "default" | "danger";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmText,
  cancelLabel = "Cancel",
  cancelText,
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      onClose={loading ? undefined : onCancel}
      open={open}
      title={title}
      description={description}
    >
      <div className="confirm-dialog__actions">
        <Button disabled={loading} onClick={onCancel} variant="secondary">
          {cancelText ?? cancelLabel}
        </Button>
        <Button
          disabled={loading}
          loading={loading}
          onClick={onConfirm}
          variant={variant === "danger" ? "danger" : "primary"}
        >
          {confirmText ?? confirmLabel ?? "Confirm"}
        </Button>
      </div>
    </Modal>
  );
}
