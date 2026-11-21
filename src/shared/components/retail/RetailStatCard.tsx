import type { ReactNode } from "react";
import styles from "./RetailUI.module.css";

type RetailStatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
};

export function RetailStatCard({
  label,
  value,
  hint,
  icon,
}: RetailStatCardProps) {
  return (
    <article className={styles.summaryCard}>
      <div className={styles.summaryCardHeader}>
        {icon ? <span className={styles.summaryIcon}>{icon}</span> : null}
        <p className={styles.summaryLabel}>{label}</p>
      </div>
      <p className={styles.summaryValue}>{value}</p>
      {hint ? <p className={styles.summaryHint}>{hint}</p> : null}
    </article>
  );
}
