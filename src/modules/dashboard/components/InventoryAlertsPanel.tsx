import { Link } from 'react-router-dom'
import { Archive, TriangleAlert } from 'lucide-react'
import type { LowStockAlert } from '@/modules/dashboard/types/dashboard-summary'
import { routePaths } from '@/routes/route-paths'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './InventoryAlertsPanel.module.css'

type InventoryAlertsPanelProps = {
  alerts: LowStockAlert[]
  isLoading: boolean
  inventoryHealth: number
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
  inventoryHealth,
  isLoading,
}: InventoryAlertsPanelProps) {
  const healthTone =
    inventoryHealth >= 80
      ? styles.healthStrong
      : inventoryHealth >= 50
        ? styles.healthMedium
        : styles.healthLow

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Alertas de Inventario</h2>
          <p className={styles.description}>
            Productos acercándose al mínimo o sin stock.
          </p>
        </div>

        <Link className={styles.linkButton} to={routePaths.products}>
          Ver todos
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
            <li
              className={joinClassNames(styles.item, getStockToneClass(alert.stock))}
              key={alert.productId}
            >
              <span className={styles.itemIcon}>
                {alert.stock === 0 ? (
                  <Archive aria-hidden="true" />
                ) : (
                  <TriangleAlert aria-hidden="true" />
                )}
              </span>

              <div className={styles.copy}>
                <h3 className={styles.name}>{alert.name}</h3>
                <p className={styles.meta}>
                  {alert.stock} unidad{alert.stock === 1 ? '' : 'es'} disponible
                  {alert.stock === 1 ? '' : 's'} ·{' '}
                  {alert.stock === 0 ? 'Sin stock' : 'Crítico'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.healthBlock}>
        <div className={styles.healthHeader}>
          <span>Salud de inventario (7 días)</span>
          <strong>{inventoryHealth}%</strong>
        </div>
        <div className={styles.healthBars} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span className={healthTone} />
          <span />
          <span />
        </div>
      </div>
    </SurfaceCard>
  )
}
