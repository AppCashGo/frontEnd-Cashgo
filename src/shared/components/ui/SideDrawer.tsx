import type { ReactNode } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./SideDrawer.module.css";

type SideDrawerProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  closeLabel?: string;
  className?: string;
  panelClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  onClose: () => void;
};

export function SideDrawer({
  isOpen,
  title,
  description,
  footer,
  children,
  closeLabel = "Close",
  className,
  panelClassName,
  bodyClassName,
  footerClassName,
  onClose,
}: SideDrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={joinClassNames(styles.backdrop, className)}
      role="presentation"
      onClick={onClose}
    >
      <div
        aria-modal="true"
        className={joinClassNames(styles.drawer, panelClassName)}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.headerCopy}>
            <h3 className={styles.title}>{title}</h3>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>

          <button
            aria-label={closeLabel}
            className={styles.closeButton}
            type="button"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className={joinClassNames(styles.body, bodyClassName)}>{children}</div>

        {footer ? (
          <div className={joinClassNames(styles.footer, footerClassName)}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
