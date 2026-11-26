import type { ReactNode } from 'react'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './DashboardMetricCard.module.css'

type DashboardMetricCardProps = {
  label: string
  value: string
  hint?: string
  icon: ReactNode
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}

export function DashboardMetricCard({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
}: DashboardMetricCardProps) {
  return (
    <article
      className={joinClassNames(
        styles.card,
        tone === 'secondary' && styles.cardSecondary,
        tone === 'success' && styles.cardSuccess,
        tone === 'warning' && styles.cardWarning,
        tone === 'danger' && styles.cardDanger,
      )}
    >
      <span className={styles.iconBox}>{icon}</span>

      <div className={styles.copy}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
        {hint ? <p className={styles.hint}>{hint}</p> : null}
      </div>
    </article>
  )
}
