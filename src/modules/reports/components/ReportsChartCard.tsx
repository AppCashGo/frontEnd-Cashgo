import type { PropsWithChildren } from 'react'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import styles from './ReportsChartCard.module.css'

type ReportsChartCardProps = PropsWithChildren<{
  title: string
  description: string
  footer?: string
}>

export function ReportsChartCard({
  title,
  description,
  footer,
  children,
}: ReportsChartCardProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>{title}</p>
          <p className={styles.description}>{description}</p>
        </div>
        {footer ? <p className={styles.footer}>{footer}</p> : null}
      </div>

      <div className={styles.body}>{children}</div>
    </SurfaceCard>
  )
}
