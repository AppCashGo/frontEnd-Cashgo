import { Link } from 'react-router-dom'
import type { BestSellingProduct } from '@/modules/dashboard/types/dashboard-summary'
import { routePaths } from '@/routes/route-paths'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import styles from './BestSellingProductsPanel.module.css'

type BestSellingProductsPanelProps = {
  products: BestSellingProduct[]
  isLoading: boolean
}

const loadingKeys = ['best-selling-1', 'best-selling-2', 'best-selling-3'] as const

export function BestSellingProductsPanel({
  products,
  isLoading,
}: BestSellingProductsPanelProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Productos con mejor salida</h2>
          <p className={styles.description}>
            Análisis de rendimiento por volumen de venta hoy.
          </p>
        </div>
        <Link className={styles.reportLink} to={routePaths.reports}>
          Reporte completo
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
      ) : products.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Todavia no hay destacados</p>
          <p className={styles.emptyDescription}>
            En cuanto entren ventas, aqui apareceran los productos mas fuertes.
          </p>
        </div>
      ) : (
        <ol className={styles.list}>
          {products.map((product, index) => (
            <li className={styles.item} key={product.productId}>
              <div className={styles.rankBadge}>{index + 1}</div>

              <div className={styles.copy}>
                <h3 className={styles.name}>{product.name}</h3>
                <p className={styles.meta}>Ventas del día</p>
              </div>

              <div className={styles.amountBlock}>
                <strong>
                  {product.quantitySold} unidad
                  {product.quantitySold === 1 ? '' : 'es'}
                </strong>
                <span>Total unidades</span>
              </div>
            </li>
          ))}
        </ol>
      )}

      {products.length > 0 && !isLoading ? (
        <Link className={styles.rankingLink} to={routePaths.reports}>
          Ver ranking completo
        </Link>
      ) : null}
    </SurfaceCard>
  )
}
