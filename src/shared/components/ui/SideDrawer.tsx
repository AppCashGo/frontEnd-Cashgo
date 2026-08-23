import type { ReactNode } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./SideDrawer.module.css";

type SideDrawerProps = {
  ariaLabel?: string;
  isOpen: boolean;
  isCloseDisabled?: boolean;
  title: string;
  description?: string;
  titleAccessory?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  closeButtonClassName?: string;
  closeButtonPlacement?: "start" | "end";
  closeContent?: ReactNode;
  closeLabel?: string;
  className?: string;
  panelClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  onClose: () => void;
};

export function SideDrawer({
  ariaLabel,
  isOpen,
  isCloseDisabled = false,
  title,
  description,
  titleAccessory,
  footer,
  children,
  closeButtonClassName,
  closeButtonPlacement = "end",
  closeContent,
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

  const closeButton = (
    <button
      aria-label={closeLabel}
      className={joinClassNames(styles.closeButton, closeButtonClassName)}
      disabled={isCloseDisabled}
      type="button"
      onClick={onClose}
    >
      {closeContent ?? <>&times;</>}
    </button>
  );

  return (
    <div
      className={joinClassNames(styles.backdrop, className)}
      role="presentation"
      onClick={() => {
        if (!isCloseDisabled) {
          onClose();
        }
      }}
    >
      <div
        aria-label={ariaLabel ?? title}
        aria-modal="true"
        className={joinClassNames(styles.drawer, panelClassName)}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          {closeButtonPlacement === "start" ? closeButton : null}

          {titleAccessory ? (
            <span className={styles.titleAccessory}>{titleAccessory}</span>
          ) : null}

          <div className={styles.headerCopy}>
            <h3 className={styles.title}>{title}</h3>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>

          {closeButtonPlacement === "end" ? closeButton : null}
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
