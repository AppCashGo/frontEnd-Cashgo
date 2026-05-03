import type { InventoryMovement } from '@/modules/inventory/types/inventory'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatDateTime } from '@/shared/utils/format-date-time'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './InventoryMovementsTable.module.css'

type InventoryMovementsTableProps = {
  movements: InventoryMovement[]
  totalCount: number
  isLoading: boolean
  isRefreshing: boolean
  errorMessage: string | null
  onRetry: () => void
}

function getMovementToneClass(type: InventoryMovement['type']) {
  if (type === 'IN') {
    return styles.badgeIn
  }

  if (type === 'OUT') {
    return styles.badgeOut
  }

  return styles.badgeAdjustment
}

export function InventoryMovementsTable({
  movements,
  totalCount,
  isLoading,
  isRefreshing,
  errorMessage,
  onRetry,
}: InventoryMovementsTableProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Movement history</p>
          <h3 className={styles.title}>Track every manual and operational stock change.</h3>
        </div>

        <div className={styles.headerMeta}>
          {isRefreshing && !isLoading ? (
            <span className={styles.refreshingLabel}>Refreshing...</span>
          ) : null}
          <span className={styles.countPill}>
            {movements.length.toString()} visible / {totalCount.toString()} total
          </span>
        </div>
      </div>

      {errorMessage ? (
        <div className={styles.feedbackCard} role="alert">
          <p className={styles.feedbackTitle}>Unable to load inventory movements</p>
          <p className={styles.feedbackDescription}>{errorMessage}</p>
          <button className={styles.feedbackButton} type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className={styles.loadingState}>
          <p className={styles.loadingTitle}>Loading movement activity...</p>
          <p className={styles.loadingDescription}>
            Pulling the latest inventory trail from the server.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && movements.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No movements match the current filters</p>
          <p className={styles.emptyDescription}>
            Try another date range, switch the movement type or create a new
            manual adjustment to populate this feed.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && movements.length > 0 ? (
        <>
          <div className={styles.mobileList}>
            {movements.map((movement) => (
              <article key={movement.id} className={styles.mobileItem}>
                <div className={styles.mobileItemTop}>
                  <div>
                    <p className={styles.productName}>{movement.product.name}</p>
                    <p className={styles.dateLabel}>
                      {formatDateTime(movement.createdAt)}
                    </p>
                  </div>

                  <span
                    className={joinClassNames(
                      styles.badge,
                      getMovementToneClass(movement.type),
                    )}
                  >
                    {movement.type}
                  </span>
                </div>

                <div className={styles.mobileMeta}>
                  <span>Quantity: {movement.quantity.toString()}</span>
                  <span>Reason: {movement.reason ?? 'No reason provided'}</span>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{formatDateTime(movement.createdAt)}</td>
                    <td>{movement.product.name}</td>
                    <td>
                      <span
                        className={joinClassNames(
                          styles.badge,
                          getMovementToneClass(movement.type),
                        )}
                      >
                        {movement.type}
                      </span>
                    </td>
                    <td>{movement.quantity.toString()}</td>
                    <td>{movement.reason ?? 'No reason provided'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </SurfaceCard>
  )
}
