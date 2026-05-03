import styles from "./RetailUI.module.css";

type RetailStatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function RetailStatCard({
  label,
  value,
  hint,
}: RetailStatCardProps) {
  return (
    <article className={styles.summaryCard}>
      <p className={styles.summaryLabel}>{label}</p>
      <p className={styles.summaryValue}>{value}</p>
      {hint ? <p className={styles.summaryHint}>{hint}</p> : null}
    </article>
  );
}
