import type { PropsWithChildren, ReactNode } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./AppCard.module.css";

export type AppCardElement = "article" | "div" | "section";
export type AppCardPadding = "none" | "sm" | "md" | "lg";
export type AppCardRadius = "sm" | "md" | "lg";
export type AppCardVariant = "default" | "flat" | "outline" | "elevated" | "interactive";

export type AppCardProps = PropsWithChildren<{
  action?: ReactNode;
  as?: AppCardElement;
  bodyClassName?: string;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  footer?: ReactNode;
  footerClassName?: string;
  headerClassName?: string;
  padding?: AppCardPadding;
  radius?: AppCardRadius;
  title?: ReactNode;
  variant?: AppCardVariant;
}>;

export function AppCard({
  action,
  as = "section",
  bodyClassName,
  children,
  className,
  description,
  eyebrow,
  footer,
  footerClassName,
  headerClassName,
  padding = "md",
  radius = "lg",
  title,
  variant = "default",
}: AppCardProps) {
  const Component = as;
  const hasHeader = eyebrow || title || description || action;

  return (
    <Component
      className={joinClassNames(
        styles.card,
        styles[variant],
        styles[`${radius}Radius`],
        styles[`${padding}Padding`],
        className,
      )}
    >
      {hasHeader ? (
        <div className={joinClassNames(styles.header, headerClassName)}>
          <div className={styles.copy}>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            {title ? <h3 className={styles.title}>{title}</h3> : null}
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>

          {action ? <div className={styles.actions}>{action}</div> : null}
        </div>
      ) : null}

      {children ? (
        <div className={joinClassNames(styles.body, bodyClassName)}>{children}</div>
      ) : null}

      {footer ? (
        <div className={joinClassNames(styles.footer, footerClassName)}>{footer}</div>
      ) : null}
    </Component>
  );
}
