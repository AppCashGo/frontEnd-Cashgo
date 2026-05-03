import type { ReactNode } from "react";
import styles from "./CashRegisterRetailDrawer.module.css";

type CashRegisterRetailDrawerProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

export function CashRegisterRetailDrawer({
  isOpen,
  title,
  description,
  footer,
  onClose,
  children,
}: CashRegisterRetailDrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        aria-modal="true"
        className={styles.drawer}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.headerCopy}>
            <h3 className={styles.title}>{title}</h3>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>

          <button
            aria-label="Cerrar"
            className={styles.closeButton}
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className={styles.body}>{children}</div>

        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}
