import type { CustomerPurchaseHistoryItem } from '@/modules/customers/types/customer'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDateTime } from '@/shared/utils/format-date-time'
import styles from './CustomerPurchaseHistoryPanel.module.css'

type CustomerPurchaseHistoryPanelProps = {
  customerName: string | null
  purchaseHistory: CustomerPurchaseHistoryItem[]
  isLoading: boolean
}

export function CustomerPurchaseHistoryPanel({
  customerName,
  purchaseHistory,
  isLoading,
}: CustomerPurchaseHistoryPanelProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Purchase history</p>
          <h3 className={styles.title}>
            {customerName ? `${customerName}'s recent sales` : 'Recent sales'}
          </h3>
        </div>

        <span className={styles.countPill}>
          {purchaseHistory.length.toString()} sale
          {purchaseHistory.length === 1 ? '' : 's'}
        </span>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>
          <p className={styles.loadingTitle}>Loading purchase history...</p>
          <p className={styles.loadingDescription}>
            Fetching this customer&apos;s sale timeline and totals.
          </p>
        </div>
      ) : null}

      {!isLoading && purchaseHistory.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No purchase history yet</p>
          <p className={styles.emptyDescription}>
            Once this customer completes sales, they will appear here with totals
            and item counts.
          </p>
        </div>
      ) : null}

      {!isLoading && purchaseHistory.length > 0 ? (
        <div className={styles.historyList}>
          {purchaseHistory.map((purchase) => (
            <article key={purchase.saleId} className={styles.historyItem}>
              <div className={styles.historyTopRow}>
                <div>
                  <p className={styles.saleId}>Sale {purchase.saleId}</p>
                  <p className={styles.saleDate}>
                    {formatDateTime(purchase.createdAt)}
                  </p>
                </div>

                <strong className={styles.saleTotal}>
                  {formatCurrency(purchase.total)}
                </strong>
              </div>

              <div className={styles.historyMeta}>
                <span>{purchase.itemCount.toString()} items</span>
                <span>Recorded in CRM timeline</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </SurfaceCard>
  )
}
