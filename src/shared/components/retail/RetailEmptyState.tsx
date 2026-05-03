import styles from "./RetailUI.module.css";

type RetailEmptyStateProps = {
  title: string;
  description: string;
};

export function RetailEmptyState({
  title,
  description,
}: RetailEmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon} />
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyDescription}>{description}</p>
    </div>
  );
}
