import type { ReactNode } from "react";
import { useId } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import { ContextualSurfaceIcon } from "./ContextualSurfaceIcon";
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
  titleAccessory?: ReactNode;
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
  titleAccessory,
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
            titleAccessory ? (
              <span className={styles.customTitleAccessory}>{titleAccessory}</span>
            ) : (
              <span className={styles.titleAccessory}>
                <ContextualSurfaceIcon label={typeof title === "string" ? title : ""} />
              </span>
            )
          ) : null}
          <div className={styles.headerCopy}>
            {title ? (
              <h3 className={styles.title} id={resolvedTitleId}>
                {title}
              </h3>
            ) : null}
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
        </div>
      ) : null}

      <div className={joinClassNames(styles.body, bodyClassName)}>{children}</div>

      {footer ? (
        <div className={joinClassNames(styles.footer, footerClassName)}>{footer}</div>
      ) : null}
    </ModalShell>
  );
}
