import type { BestSellingProduct } from '@/modules/dashboard/types/dashboard-summary'
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
      <div>
        <p className={styles.eyebrow}>Mas vendidos</p>
        <h2 className={styles.title}>Productos con mejor salida hoy</h2>
        <p className={styles.description}>
          Usa esta lista para detectar que se esta vendiendo mejor y decidir
          que reponer o impulsar despues.
        </p>
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
                <p className={styles.meta}>
                  {product.quantitySold} unidad
                  {product.quantitySold === 1 ? '' : 'es'} vendida
                  {product.quantitySold === 1 ? '' : 's'}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SurfaceCard>
  )
}
