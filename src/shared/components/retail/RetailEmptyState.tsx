import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./RetailUI.module.css";

type RetailEmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function RetailEmptyState({
  title,
  description,
  action,
  icon,
}: RetailEmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        {icon ?? <Inbox aria-hidden="true" size={30} strokeWidth={1.8} />}
      </div>
      <p className={styles.emptyTitle}>{title}</p>
      {description ? (
        <p className={styles.emptyDescription}>{description}</p>
      ) : null}
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}
