import type { SupplierSupplyHistoryItem } from '@/modules/suppliers/types/supplier'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDateTime } from '@/shared/utils/format-date-time'
import styles from './SupplierSupplyHistoryPanel.module.css'

type SupplierSupplyHistoryPanelProps = {
  supplierName: string | null
  purchaseHistory: SupplierSupplyHistoryItem[]
  isLoading: boolean
}

export function SupplierSupplyHistoryPanel({
  supplierName,
  purchaseHistory,
  isLoading,
}: SupplierSupplyHistoryPanelProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Supply history</p>
          <h3 className={styles.title}>
            {supplierName
              ? `${supplierName}'s replenishment timeline`
              : 'Replenishment timeline'}
          </h3>
        </div>

        <span className={styles.countPill}>
          {purchaseHistory.length.toString()}{' '}
          {purchaseHistory.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>
          <p className={styles.loadingTitle}>Loading supply history...</p>
          <p className={styles.loadingDescription}>
            Fetching procurement records and replenishment totals.
          </p>
        </div>
      ) : null}

      {!isLoading && purchaseHistory.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No replenishment history yet</p>
          <p className={styles.emptyDescription}>
            Once this supplier is used for procurement, the supply timeline will appear
            here.
          </p>
        </div>
      ) : null}

      {!isLoading && purchaseHistory.length > 0 ? (
        <div className={styles.historyList}>
          {purchaseHistory.map((purchase) => (
            <article key={purchase.purchaseId} className={styles.historyItem}>
              <div className={styles.historyTopRow}>
                <div>
                  <p className={styles.purchaseId}>
                    Restock {purchase.purchaseId}
                  </p>
                  <p className={styles.purchaseDate}>
                    {formatDateTime(purchase.createdAt)}
                  </p>
                </div>

                <strong className={styles.purchaseTotal}>
                  {formatCurrency(purchase.total)}
                </strong>
              </div>

              <div className={styles.historyMeta}>
                <span>Procurement record</span>
                <span>Supply chain timeline</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </SurfaceCard>
  )
}
