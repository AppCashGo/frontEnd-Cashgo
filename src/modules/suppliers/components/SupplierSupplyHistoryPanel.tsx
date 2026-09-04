import type { SupplierSupplyHistoryItem } from '@/modules/suppliers/types/supplier'
import {
  getExpensePaymentMethodLabel,
  getExpenseStatusLabel,
} from '@/modules/expenses/utils/format-expense'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { useAppTranslation } from '@/shared/i18n/use-app-translation'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDateTime } from '@/shared/utils/format-date-time'
import styles from './SupplierSupplyHistoryPanel.module.css'

type SupplierSupplyHistoryPanelProps = {
  supplierName: string | null
  purchaseHistory: SupplierSupplyHistoryItem[]
  isLoading: boolean
  payingPurchaseId?: string | null
  paymentError?: string | null
  onMarkPaid?: (purchaseId: string) => void
}

const englishPaymentMethodLabels = {
  CASH: 'Cash',
  CARD: 'Card',
  TRANSFER: 'Transfer',
  DIGITAL_WALLET: 'Digital wallet',
  BANK_DEPOSIT: 'Bank deposit',
  CREDIT: 'Credit',
  OTHER: 'Other',
} as const

const englishStatusLabels = {
  PAID: 'Paid',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
} as const

export function SupplierSupplyHistoryPanel({
  supplierName,
  purchaseHistory,
  isLoading,
  payingPurchaseId = null,
  paymentError = null,
  onMarkPaid,
}: SupplierSupplyHistoryPanelProps) {
  const { languageCode } = useAppTranslation()
  const isEnglish = languageCode === 'en'

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {isEnglish ? 'Supply history' : 'Historial de abastecimiento'}
          </p>
          <h3 className={styles.title}>
            {supplierName
              ? isEnglish
                ? `${supplierName}'s replenishment timeline`
                : `Compras registradas a ${supplierName}`
              : isEnglish
                ? 'Replenishment timeline'
                : 'Compras registradas'}
          </h3>
        </div>

        <span className={styles.countPill}>
          {purchaseHistory.length.toString()}{' '}
          {purchaseHistory.length === 1
            ? isEnglish ? 'entry' : 'registro'
            : isEnglish ? 'entries' : 'registros'}
        </span>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>
          <p className={styles.loadingTitle}>
            {isEnglish ? 'Loading supply history...' : 'Cargando historial...'}
          </p>
          <p className={styles.loadingDescription}>
            {isEnglish
              ? 'Fetching procurement records and replenishment totals.'
              : 'Consultando compras y totales de abastecimiento.'}
          </p>
        </div>
      ) : null}

      {!isLoading && purchaseHistory.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>
            {isEnglish ? 'No replenishment history yet' : 'Aún no hay compras registradas'}
          </p>
          <p className={styles.emptyDescription}>
            {isEnglish
              ? 'Once this supplier is used for procurement, the supply timeline will appear here.'
              : 'Cuando registres una compra de inventario con este proveedor, aparecerá aquí.'}
          </p>
        </div>
      ) : null}

      {!isLoading && purchaseHistory.length > 0 ? (
        <div className={styles.historyList}>
          {paymentError ? (
            <p className={styles.paymentError}>{paymentError}</p>
          ) : null}
          {purchaseHistory.map((purchase) => (
            <article key={purchase.purchaseId} className={styles.historyItem}>
              <div className={styles.historyTopRow}>
                <div>
                  <p className={styles.purchaseId}>
                    {purchase.reference ||
                      `${isEnglish ? 'Purchase' : 'Compra'} ${purchase.purchaseId}`}
                  </p>
                  <p className={styles.purchaseDate}>
                    {formatDateTime(purchase.purchaseDate)}
                  </p>
                </div>

                <strong className={styles.purchaseTotal}>
                  {formatCurrency(purchase.total)}
                </strong>
              </div>

              <div className={styles.historyMeta}>
                <span>
                  {isEnglish
                    ? englishPaymentMethodLabels[purchase.paymentMethod]
                    : getExpensePaymentMethodLabel(purchase.paymentMethod)}
                </span>
                <div className={styles.statusActions}>
                  <span
                    className={`${styles.statusPill} ${
                      purchase.status === 'PAID'
                        ? styles.statusPaid
                        : purchase.status === 'PENDING'
                          ? styles.statusPending
                          : styles.statusCancelled
                    }`}
                  >
                    {isEnglish
                      ? englishStatusLabels[purchase.status]
                      : getExpenseStatusLabel(purchase.status)}
                  </span>
                  {purchase.status === 'PENDING' && onMarkPaid ? (
                    <button
                      className={styles.payButton}
                      disabled={payingPurchaseId !== null}
                      type="button"
                      onClick={() => onMarkPaid(purchase.purchaseId)}
                    >
                      {payingPurchaseId === purchase.purchaseId
                        ? isEnglish ? 'Saving...' : 'Guardando...'
                        : isEnglish ? 'Mark as paid' : 'Marcar como pagado'}
                    </button>
                  ) : null}
                </div>
              </div>

              {purchase.notes ? (
                <p className={styles.purchaseNotes}>{purchase.notes}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </SurfaceCard>
  )
}
