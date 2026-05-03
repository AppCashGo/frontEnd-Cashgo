import { Link } from 'react-router-dom'
import type { LowStockAlert } from '@/modules/dashboard/types/dashboard-summary'
import { routePaths } from '@/routes/route-paths'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './InventoryAlertsPanel.module.css'

type InventoryAlertsPanelProps = {
  alerts: LowStockAlert[]
  isLoading: boolean
}

const loadingKeys = ['inventory-alert-1', 'inventory-alert-2', 'inventory-alert-3'] as const

function getStockToneClass(stock: number) {
  if (stock === 0) {
    return styles.stockBadgeCritical
  }

  if (stock <= 2) {
    return styles.stockBadgeUrgent
  }

  return styles.stockBadgeWarning
}

export function InventoryAlertsPanel({
  alerts,
  isLoading,
}: InventoryAlertsPanelProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Alertas de inventario</p>
          <h2 className={styles.title}>Productos con stock bajo para vigilar</h2>
          <p className={styles.description}>
            Estos productos se estan acercando al minimo o ya necesitan
            reposicion.
          </p>
        </div>

        <Link className={styles.linkButton} to={routePaths.products}>
          Ver productos
        </Link>
      </div>

      {isLoading ? (
        <div className={styles.loadingList} aria-live="polite">
          {loadingKeys.map((loadingKey) => (
            <div className={styles.loadingRow} key={loadingKey}>
              <span className={styles.loadingBarWide} />
              <span className={styles.loadingBarShort} />
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>El inventario se ve saludable</p>
          <p className={styles.emptyDescription}>
            No hay alertas de stock bajo en este momento.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {alerts.map((alert) => (
            <li className={styles.item} key={alert.productId}>
              <div className={styles.copy}>
                <h3 className={styles.name}>{alert.name}</h3>
                <p className={styles.meta}>Producto: {alert.productId}</p>
              </div>

              <span
                className={joinClassNames(
                  styles.stockBadge,
                  getStockToneClass(alert.stock),
                )}
              >
                {alert.stock} disponibles
              </span>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  )
}
