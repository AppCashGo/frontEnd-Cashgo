import { CustomerPurchaseProduct } from '@/modules/customers/components/CustomerPurchaseProduct'
import type { CustomerPurchaseHistoryItem } from '@/modules/customers/types/customer'
import { ShoppingBag } from 'lucide-react'
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
        <div className={styles.headingGroup}>
          <span className={styles.headerIcon} aria-hidden="true">
            <ShoppingBag size={20} />
          </span>
          <div>
            <p className={styles.eyebrow}>Historial de compras</p>
            <h3 className={styles.title}>
              {customerName
                ? `Compras recientes de ${customerName}`
                : 'Compras recientes'}
            </h3>
          </div>
        </div>

        <span className={styles.countPill}>
          {purchaseHistory.length.toString()}{' '}
          {purchaseHistory.length === 1 ? 'venta' : 'ventas'}
        </span>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>
          <p className={styles.loadingTitle}>Cargando historial...</p>
          <p className={styles.loadingDescription}>
            Estamos consultando las ventas y los productos de este cliente.
          </p>
        </div>
      ) : null}

      {!isLoading && purchaseHistory.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Todavía no hay compras</p>
          <p className={styles.emptyDescription}>
            Cuando el cliente complete una venta, aquí aparecerán la factura,
            sus productos y el total pagado.
          </p>
        </div>
      ) : null}

      {!isLoading && purchaseHistory.length > 0 ? (
        <div className={styles.historyList}>
          {purchaseHistory.map((purchase) => (
            <article key={purchase.saleId} className={styles.historyItem}>
              <div className={styles.historyTopRow}>
                <div>
                  <p className={styles.saleId}>{purchase.saleNumber}</p>
                  <p className={styles.saleDate}>
                    {formatDateTime(purchase.createdAt, 'es-CO')}
                  </p>
                </div>

                <strong className={styles.saleTotal}>
                  {formatCurrency(purchase.total)}
                </strong>
              </div>

              <div className={styles.historyMeta}>
                <span>
                  {purchase.itemCount.toString()}{' '}
                  {purchase.itemCount === 1 ? 'producto' : 'productos'}
                </span>
                <span>Detalle de la compra</span>
              </div>

              <div className={styles.productList}>
                {purchase.products.map((product) => (
                  <div
                    className={styles.productRow}
                    key={`${purchase.saleId}:${product.productId}`}
                  >
                    <CustomerPurchaseProduct product={product} />
                    <strong>{formatCurrency(product.subtotal)}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </SurfaceCard>
  )
}
