import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./ModalShell.module.css";

type ModalShellProps = {
  ariaLabel?: string;
  ariaLabelledBy?: string;
  children: ReactNode;
  className?: string;
  closeButtonClassName?: string;
  closeContent?: ReactNode;
  closeLabel?: string;
  isOpen: boolean;
  isCloseDisabled?: boolean;
  panelClassName?: string;
  showCloseButton?: boolean;
  onClose: () => void;
};

export function ModalShell({
  ariaLabel,
  ariaLabelledBy,
  children,
  className,
  closeButtonClassName,
  closeContent,
  closeLabel = "Cerrar",
  isOpen,
  isCloseDisabled = false,
  panelClassName,
  showCloseButton = true,
  onClose,
}: ModalShellProps) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isCloseDisabled) {
          return;
        }

        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCloseDisabled, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={joinClassNames(styles.backdrop, className)}
      role="presentation"
      onClick={onClose}
    >
      <section
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-modal="true"
        className={joinClassNames(styles.panel, panelClassName)}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        {showCloseButton ? (
          <button
            aria-label={closeLabel}
            className={joinClassNames(styles.closeButton, closeButtonClassName)}
            disabled={isCloseDisabled}
            type="button"
            onClick={onClose}
          >
            {closeContent ?? <X aria-hidden="true" size={18} />}
          </button>
        ) : null}

        {children}
      </section>
    </div>
  );
}
