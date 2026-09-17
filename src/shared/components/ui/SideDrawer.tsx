import { useEffect, useState, type ReactNode } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import { ConfirmDialog } from "./ConfirmDialog";
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
  confirmClose?: boolean;
  confirmCloseDescription?: string;
  confirmCloseTitle?: string;
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
  confirmClose = false,
  confirmCloseDescription =
    "Si sales ahora, la información que estás registrando no se guardará.",
  confirmCloseTitle = "¿Descartar los cambios?",
  className,
  panelClassName,
  bodyClassName,
  footerClassName,
  onClose,
}: SideDrawerProps) {
  const [isCloseConfirmationOpen, setCloseConfirmationOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCloseConfirmationOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function requestClose() {
    if (isCloseDisabled) {
      return;
    }

    if (confirmClose) {
      setCloseConfirmationOpen(true);
      return;
    }

    onClose();
  }

  function confirmCloseDrawer() {
    setCloseConfirmationOpen(false);
    onClose();
  }

  const closeButton = (
    <button
      aria-label={closeLabel}
      className={joinClassNames(styles.closeButton, closeButtonClassName)}
      disabled={isCloseDisabled}
      type="button"
      onClick={requestClose}
    >
      {closeContent ?? <>&times;</>}
    </button>
  );

  return (
    <>
      <div
        className={joinClassNames(styles.backdrop, className)}
        role="presentation"
        onClick={requestClose}
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
              {description ? (
                <p className={styles.description}>{description}</p>
              ) : null}
            </div>

            {closeButtonPlacement === "end" ? closeButton : null}
          </div>

          <div className={joinClassNames(styles.body, bodyClassName)}>
            {children}
          </div>

          {footer ? (
            <div className={joinClassNames(styles.footer, footerClassName)}>
              {footer}
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        cancelLabel="Continuar editando"
        confirmLabel="Sí, salir"
        description={confirmCloseDescription}
        isOpen={isCloseConfirmationOpen}
        title={confirmCloseTitle}
        tone="warning"
        onCancel={() => setCloseConfirmationOpen(false)}
        onConfirm={confirmCloseDrawer}
      />
    </>
  );
}
