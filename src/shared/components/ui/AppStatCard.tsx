import type { ReactNode } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import { AppCard } from "./AppCard";
import styles from "./AppStatCard.module.css";

export type AppStatCardTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

export type AppStatCardProps = {
  action?: ReactNode;
  className?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  label: ReactNode;
  tone?: AppStatCardTone;
  trend?: ReactNode;
  value: ReactNode;
};

export function AppStatCard({
  action,
  className,
  hint,
  icon,
  label,
  tone = "default",
  trend,
  value,
}: AppStatCardProps) {
  return (
    <AppCard
      as="article"
      bodyClassName={styles.body}
      className={joinClassNames(styles.card, styles[tone], className)}
      padding="md"
      radius="lg"
    >
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <div className={styles.content}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
        {hint ? <p className={styles.hint}>{hint}</p> : null}
        {trend ? <p className={styles.trend}>{trend}</p> : null}
      </div>
      {action ? <span className={styles.action}>{action}</span> : null}
    </AppCard>
  );
}
