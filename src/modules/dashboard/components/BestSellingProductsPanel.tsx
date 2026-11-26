import { ArrowRight, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DashboardProductPhoto } from '@/modules/dashboard/components/DashboardProductPhoto'
import type { BestSellingProduct } from '@/modules/dashboard/types/dashboard-summary'
import { routePaths } from '@/routes/route-paths'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import styles from './DashboardProductLists.module.css'

type BestSellingProductsPanelProps = {
  products: BestSellingProduct[]
  isLoading: boolean
}

export function BestSellingProductsPanel({
  products,
  isLoading,
}: BestSellingProductsPanelProps) {
  return (
    <SurfaceCard className={styles.card}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span data-tone="best">
            <Trophy aria-hidden="true" />
          </span>
          <h2>Productos con mejor salida</h2>
        </div>
        <Link className={styles.headerLink} to={routePaths.reports}>
          Ver reporte <ArrowRight aria-hidden="true" />
        </Link>
      </header>

      {isLoading || products.length === 0 ? (
        <p className={styles.emptyState} aria-live="polite">
          {isLoading
            ? 'Cargando productos…'
            : 'Todavía no hay ventas de productos hoy.'}
        </p>
      ) : (
        <ol className={styles.list}>
          {products.map((product, index) => (
            <li key={product.productId}>
              <Link
                className={styles.item}
                to={`${routePaths.products}?productId=${encodeURIComponent(product.productId)}`}
              >
                <span className={styles.rankBadge}>{index + 1}</span>
                <DashboardProductPhoto imageUrl={product.imageUrl} />
                <span className={styles.name}>{product.name}</span>
                <span className={styles.amount}>
                  {product.quantitySold}{' '}
                  {product.quantitySold === 1 ? 'unidad' : 'unidades'}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </SurfaceCard>
  )
}
