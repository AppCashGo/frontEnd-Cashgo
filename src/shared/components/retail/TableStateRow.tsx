import type { ReactNode } from 'react'
import { RetailEmptyState } from './RetailEmptyState'
import styles from './RetailUI.module.css'

type TableStateRowProps = {
  action?: ReactNode
  colSpan: number
  description?: string
  tone?: 'empty' | 'feedback' | 'error'
  title: string
}

export function TableStateRow({
  action,
  colSpan,
  description,
  tone = 'empty',
  title,
}: TableStateRowProps) {
  return (
    <tr>
      <td colSpan={colSpan}>
        {tone === 'empty' ? (
          <>
            <RetailEmptyState description={description} title={title} />
            {action ? (
              <div className={styles.tableStateAction}>{action}</div>
            ) : null}
          </>
        ) : (
          <div
            className={styles.tableFeedback}
            role={tone === 'error' ? 'alert' : undefined}
          >
            <p className={styles.tableFeedbackTitle}>{title}</p>
            {description ? (
              <p className={styles.tableFeedbackDescription}>{description}</p>
            ) : null}
            {action ? <div className={styles.tableFeedbackAction}>{action}</div> : null}
          </div>
        )}
      </td>
    </tr>
  )
}
