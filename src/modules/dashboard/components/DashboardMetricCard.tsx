import type { ReactNode } from 'react'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './DashboardMetricCard.module.css'

type DashboardMetricCardProps = {
  label: string
  value: string
  hint: string
  icon: ReactNode
  meta?: string
  trend?: string
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}

export function DashboardMetricCard({
  label,
  value,
  hint,
  icon,
  meta,
  trend,
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
      <div className={styles.header}>
        <span className={styles.iconBox}>{icon}</span>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </div>

      <div className={styles.copy}>
        <p className={styles.label}>{label}</p>
        <div className={styles.valueRow}>
          <p className={styles.value}>{value}</p>
          {trend ? <span className={styles.trend}>{trend}</span> : null}
        </div>
        <p className={styles.hint}>{hint}</p>
      </div>
    </article>
  )
}
