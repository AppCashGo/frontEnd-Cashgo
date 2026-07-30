import type { SaleReceipt } from '@/modules/sales/types/sale'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDate } from '@/shared/utils/format-date'
import { getPaymentMethodLabel } from '@/modules/cash-register/utils/format-cash-register'
import styles from './RecentSalesPanel.module.css'

type RecentSalesPanelProps = {
  sales: SaleReceipt[]
  isLoading: boolean
  errorMessage: string | null
  onRetry: () => void
}

function getStatusLabel(status: SaleReceipt['status']) {
  switch (status) {
    case 'COMPLETED':
      return 'Pagada'
    case 'PARTIALLY_PAID':
      return 'Parcial'
    case 'PENDING_PAYMENT':
      return 'Pendiente'
    case 'CANCELLED':
      return 'Cancelada'
    default:
      return status
  }
}

export function RecentSalesPanel({
  sales,
  isLoading,
  errorMessage,
  onRetry,
}: RecentSalesPanelProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Ventas recientes</p>
          <h2 className={styles.title}>Última actividad de caja</h2>
          <p className={styles.description}>
            Mantén visibles los últimos comprobantes mientras sigues vendiendo.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingState} aria-live="polite">
          <span className={styles.loadingBar} />
          <span className={styles.loadingBar} />
          <span className={styles.loadingBarShort} />
        </div>
      ) : errorMessage ? (
        <div className={styles.stateBox} role="alert">
          <p className={styles.stateTitle}>No pudimos cargar ventas recientes</p>
          <p className={styles.stateDescription}>{errorMessage}</p>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={onRetry}
          >
            Reintentar
          </button>
        </div>
      ) : sales.length === 0 ? (
        <div className={styles.stateBox}>
          <p className={styles.stateTitle}>Aún no hay ventas registradas</p>
          <p className={styles.stateDescription}>
            Tus últimos comprobantes aparecerán aquí cuando empieces a vender.
          </p>
        </div>
      ) : (
        <ul className={styles.salesList}>
          {sales.slice(0, 6).map((sale) => (
            <li className={styles.saleItem} key={sale.id}>
              <div className={styles.saleHeading}>
                <div>
                  <strong className={styles.saleNumber}>{sale.saleNumber}</strong>
                  <p className={styles.saleMeta}>
                    {sale.customer?.name ?? 'Venta de mostrador'} ·{' '}
                    {formatDate(sale.createdAt)}
                  </p>
                </div>

                <span className={styles.statusBadge}>
                  {getStatusLabel(sale.status)}
                </span>
              </div>

              <div className={styles.saleFooter}>
                <div className={styles.paymentMeta}>
                  <span>
                    {sale.payments[0]
                      ? getPaymentMethodLabel(sale.payments[0].method)
                      : 'Pago pendiente'}
                  </span>
                  {sale.accountReceivable ? (
                    <span>
                      Debe {formatCurrency(sale.accountReceivable.balance)}
                    </span>
                  ) : null}
                </div>

                <strong className={styles.saleTotal}>
                  {formatCurrency(sale.total)}
                </strong>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  )
}
