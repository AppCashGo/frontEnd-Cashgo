import { Link } from 'react-router-dom'
import { ArrowRight, CircleAlert } from 'lucide-react'
import { DashboardProductPhoto } from '@/modules/dashboard/components/DashboardProductPhoto'
import type { LowStockAlert } from '@/modules/dashboard/types/dashboard-summary'
import { routePaths } from '@/routes/route-paths'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import styles from './DashboardProductLists.module.css'

type InventoryAlertsPanelProps = {
  alerts: LowStockAlert[]
  isLoading: boolean
}

export function InventoryAlertsPanel({
  alerts,
  isLoading,
}: InventoryAlertsPanelProps) {
  return (
    <SurfaceCard className={styles.card}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span data-tone="stock">
            <CircleAlert aria-hidden="true" />
          </span>
          <h2>Alertas de inventario</h2>
        </div>
        <Link className={styles.headerLink} to={`${routePaths.inventory}?stock=low`}>
          Ver stock bajo <ArrowRight aria-hidden="true" />
        </Link>
      </header>

      {isLoading || alerts.length === 0 ? (
        <p className={styles.emptyState} aria-live="polite">
          {isLoading
            ? 'Cargando alertas…'
            : 'No hay alertas de stock bajo en este momento.'}
        </p>
      ) : (
        <ul className={styles.list}>
          {alerts.map((alert) => (
            <li key={alert.productId}>
              <Link
                className={styles.item}
                to={`${routePaths.products}?productId=${encodeURIComponent(alert.productId)}`}
              >
                <DashboardProductPhoto imageUrl={alert.imageUrl} />
                <span className={styles.name}>{alert.name}</span>
                <span className={styles.stock} data-empty={alert.stock === 0}>
                  {alert.stock === 0 ? 'Sin stock' : `${alert.stock} en stock`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  )
}
