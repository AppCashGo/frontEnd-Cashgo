import type { InventoryLowStockAlert } from '@/modules/inventory/types/inventory'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import styles from './InventoryLowStockPanel.module.css'

type InventoryLowStockPanelProps = {
  alerts: InventoryLowStockAlert[]
  isLoading: boolean
  errorMessage: string | null
}

export function InventoryLowStockPanel({
  alerts,
  isLoading,
  errorMessage,
}: InventoryLowStockPanelProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Low-stock watchlist</p>
          <h3 className={styles.title}>Products that need replenishment soon.</h3>
        </div>
        <span className={styles.countPill}>{alerts.length.toString()} alerts</span>
      </div>

      {isLoading ? (
        <div className={styles.feedbackState}>
          <p className={styles.feedbackTitle}>Loading alert data...</p>
          <p className={styles.feedbackDescription}>
            Checking the products that are closest to stock depletion.
          </p>
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className={styles.feedbackState}>
          <p className={styles.feedbackTitle}>Unable to load low-stock alerts</p>
          <p className={styles.feedbackDescription}>{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && alerts.length === 0 ? (
        <div className={styles.feedbackState}>
          <p className={styles.feedbackTitle}>No low-stock alerts</p>
          <p className={styles.feedbackDescription}>
            Inventory looks healthy right now. This panel will highlight the
            products that fall under the alert threshold.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && alerts.length > 0 ? (
        <div className={styles.alertList}>
          {alerts.map((alert) => (
            <article key={alert.productId} className={styles.alertItem}>
              <div>
                <p className={styles.productName}>{alert.name}</p>
                <p className={styles.productHint}>
                  Alert threshold: {alert.threshold.toString()} units
                </p>
              </div>
              <strong className={styles.stockValue}>
                {alert.stock.toString()}
              </strong>
            </article>
          ))}
        </div>
      ) : null}
    </SurfaceCard>
  )
}
