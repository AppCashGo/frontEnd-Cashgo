import { SurfaceCard } from "@/shared/components/ui/SurfaceCard";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./MetricCard.module.css";

export type MetricCardTone = "default" | "accent" | "success" | "alert";

type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: MetricCardTone;
  className?: string;
};

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  className,
}: MetricCardProps) {
  return (
    <SurfaceCard
      className={joinClassNames(
        styles.card,
        tone === "accent" && styles.cardAccent,
        tone === "success" && styles.cardSuccess,
        tone === "alert" && styles.cardAlert,
        className,
      )}
    >
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      <p className={styles.hint}>{hint}</p>
    </SurfaceCard>
  );
}
