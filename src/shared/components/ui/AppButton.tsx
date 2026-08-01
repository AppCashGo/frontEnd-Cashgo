import type { ButtonHTMLAttributes, ReactNode } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./AppButton.module.css";

export type AppButtonSize = "sm" | "md" | "lg";
export type AppButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "muted"
  | "ghost"
  | "link"
  | "outline";

export type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  endIcon?: ReactNode;
  fullWidth?: boolean;
  iconOnly?: boolean;
  isLoading?: boolean;
  loadingLabel?: ReactNode;
  size?: AppButtonSize;
  startIcon?: ReactNode;
  variant?: AppButtonVariant;
};

export function AppButton({
  children,
  className,
  disabled,
  endIcon,
  fullWidth = false,
  iconOnly = false,
  isLoading = false,
  loadingLabel = "Cargando...",
  size = "md",
  startIcon,
  type = "button",
  variant = "primary",
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || isLoading;
  const visibleContent = isLoading ? loadingLabel : children;

  return (
    <button
      className={joinClassNames(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        iconOnly && styles.iconOnly,
        className,
      )}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {isLoading ? (
        <span className={styles.spinner} />
      ) : startIcon ? (
        <span className={styles.icon}>{startIcon}</span>
      ) : null}

      {visibleContent ? <span className={styles.label}>{visibleContent}</span> : null}

      {!isLoading && endIcon ? <span className={styles.icon}>{endIcon}</span> : null}
    </button>
  );
}
