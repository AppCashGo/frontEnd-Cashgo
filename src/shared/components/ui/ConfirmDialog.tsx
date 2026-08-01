import { AlertTriangle, HelpCircle, X } from "lucide-react";
import type { ReactNode } from "react";
import { ModalShell } from "@/shared/components/ui/ModalShell";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./ConfirmDialog.module.css";

export type ConfirmDialogTone = "default" | "danger" | "warning";

type ConfirmDialogProps = {
  cancelLabel?: string;
  children?: ReactNode;
  confirmLabel?: string;
  description: string;
  icon?: ReactNode;
  isOpen: boolean;
  isSubmitting?: boolean;
  submittingLabel?: string;
  title: string;
  tone?: ConfirmDialogTone;
  onCancel: () => void;
  onConfirm: () => void;
};

function getIcon(tone: ConfirmDialogTone) {
  if (tone === "default") {
    return <HelpCircle aria-hidden="true" size={22} />;
  }

  return <AlertTriangle aria-hidden="true" size={22} />;
}

export function ConfirmDialog({
  cancelLabel = "Cancelar",
  children,
  confirmLabel = "Confirmar",
  description,
  icon,
  isOpen,
  isSubmitting = false,
  submittingLabel = "Procesando...",
  title,
  tone = "default",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <ModalShell
      ariaLabelledBy="confirm-dialog-title"
      className={styles.backdrop}
      closeButtonClassName={styles.closeButton}
      closeContent={<X aria-hidden="true" size={18} />}
      isCloseDisabled={isSubmitting}
      isOpen={isOpen}
      panelClassName={styles.dialog}
      onClose={onCancel}
    >
      <div
        aria-describedby="confirm-dialog-description"
        className={styles.dialogContent}
      >
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <span
              className={joinClassNames(
                styles.icon,
                tone === "danger" && styles.iconDanger,
                tone === "warning" && styles.iconWarning,
              )}
            >
              {icon ?? getIcon(tone)}
            </span>
            <h2 className={styles.title} id="confirm-dialog-title">
              {title}
            </h2>
            <p className={styles.description} id="confirm-dialog-description">
              {description}
            </p>
          </div>
        </header>

        {children ? <div className={styles.content}>{children}</div> : null}

        <div className={styles.actions}>
          <button
            className={joinClassNames(styles.button, styles.cancelButton)}
            disabled={isSubmitting}
            type="button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={joinClassNames(
              styles.button,
              styles.confirmButton,
              tone === "danger" && styles.confirmButtonDanger,
            )}
            disabled={isSubmitting}
            type="button"
            onClick={onConfirm}
          >
            {isSubmitting ? submittingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
