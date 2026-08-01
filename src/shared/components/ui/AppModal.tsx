import type { ReactNode } from "react";
import { useId } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import { ModalShell } from "./ModalShell";
import styles from "./AppModal.module.css";

export type AppModalSize = "sm" | "md" | "lg" | "xl";

export type AppModalProps = {
  ariaLabel?: string;
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  closeButtonClassName?: string;
  closeContent?: ReactNode;
  closeLabel?: string;
  description?: ReactNode;
  footer?: ReactNode;
  footerClassName?: string;
  isCloseDisabled?: boolean;
  isOpen: boolean;
  panelClassName?: string;
  showCloseButton?: boolean;
  size?: AppModalSize;
  title?: ReactNode;
  titleId?: string;
  onClose: () => void;
};

export function AppModal({
  bodyClassName,
  children,
  description,
  footer,
  footerClassName,
  panelClassName,
  size = "md",
  title,
  titleId,
  ...props
}: AppModalProps) {
  const generatedTitleId = useId();
  const resolvedTitleId = title ? titleId ?? generatedTitleId : undefined;

  return (
    <ModalShell
      ariaLabelledBy={resolvedTitleId}
      panelClassName={joinClassNames(styles.panel, styles[size], panelClassName)}
      {...props}
    >
      {title || description ? (
        <div className={styles.header}>
          {title ? (
            <h3 className={styles.title} id={resolvedTitleId}>
              {title}
            </h3>
          ) : null}
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
      ) : null}

      <div className={joinClassNames(styles.body, bodyClassName)}>{children}</div>

      {footer ? (
        <div className={joinClassNames(styles.footer, footerClassName)}>{footer}</div>
      ) : null}
    </ModalShell>
  );
}
