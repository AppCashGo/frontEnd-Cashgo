import type { ReactNode } from 'react'
import styles from './RetailUI.module.css'

type RetailTableShellProps = {
  action?: ReactNode
  children: ReactNode
  footer?: ReactNode
  isRefreshing?: boolean
  refreshingLabel?: string
  title?: ReactNode
  toolbar?: ReactNode
}

export function RetailTableShell({
  action,
  children,
  footer,
  isRefreshing = false,
  refreshingLabel = 'Actualizando...',
  title,
  toolbar,
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

      {toolbar ? <div className={styles.tableToolbar}>{toolbar}</div> : null}
      <div className={styles.tableScroller}>{children}</div>
      {footer ? <div className={styles.tableFooter}>{footer}</div> : null}
    </section>
  )
}
