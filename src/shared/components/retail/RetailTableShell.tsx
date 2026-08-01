import type { ReactNode } from 'react'
import styles from './RetailUI.module.css'

type RetailTableShellProps = {
  action?: ReactNode
  children: ReactNode
  isRefreshing?: boolean
  refreshingLabel?: string
  title?: ReactNode
}

export function RetailTableShell({
  action,
  children,
  isRefreshing = false,
  refreshingLabel = 'Actualizando...',
  title,
}: RetailTableShellProps) {
  const hasHeader = title || action || isRefreshing

  return (
    <section className={styles.tableCard}>
      {hasHeader ? (
        <div className={styles.tableHeader}>
          {title ? <h3 className={styles.tableTitle}>{title}</h3> : <span />}
          <div className={styles.tableHeaderActions}>
            {isRefreshing ? (
              <span className={styles.tableRefreshingLabel}>
                {refreshingLabel}
              </span>
            ) : null}
            {action}
          </div>
        </div>
      ) : null}

      <div className={styles.tableScroller}>{children}</div>
    </section>
  )
}
