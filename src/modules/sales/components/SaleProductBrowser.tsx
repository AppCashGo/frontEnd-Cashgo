import { Link } from 'react-router-dom'
import type { Product } from '@/modules/products/types/product'
import { resolveProductImageUrl } from '@/modules/products/utils/resolve-product-image-url'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { routePaths } from '@/routes/route-paths'
import { formatCurrency } from '@/shared/utils/format-currency'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './SaleProductBrowser.module.css'

type InventoryFilter = 'ALL' | 'READY' | 'LOW' | 'OUT'

type SaleProductBrowserProps = {
  products: Product[]
  totalProductsCount: number
  searchValue: string
  activeFilter: InventoryFilter
  cartQuantitiesByProductId: Map<string, number>
  isLoading: boolean
  errorMessage: string | null
  onSearchChange: (value: string) => void
  onFilterChange: (filter: InventoryFilter) => void
  onAddProduct: (product: Product) => void
  onRetry: () => void
}

const loadingCardKeys = ['search-card-1', 'search-card-2', 'search-card-3'] as const

const inventoryFilterOptions: Array<{
  value: InventoryFilter
  label: string
}> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'READY', label: 'Listos' },
  { value: 'LOW', label: 'Stock bajo' },
  { value: 'OUT', label: 'Agotados' },
]

function getStockToneClass(product: Product) {
  const threshold = Math.max(product.minStock, 5)

  if (product.stock === 0) {
    return styles.stockBadgeCritical
  }

  if (product.stock <= threshold) {
    return styles.stockBadgeWarning
  }

  return styles.stockBadgeHealthy
}

function getProductCardToneClass(product: Product) {
  const tones = [
    styles.productVisualAmber,
    styles.productVisualSky,
    styles.productVisualRose,
    styles.productVisualMint,
  ]
  const charCode = product.name.charCodeAt(0) || 0

  return tones[charCode % tones.length]
}

function getProductMonogram(product: Product) {
  const words = product.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)

  return words.map((word) => word[0]?.toUpperCase() ?? '').join('')
}

export function SaleProductBrowser({
  products,
  totalProductsCount,
  searchValue,
  activeFilter,
  cartQuantitiesByProductId,
  isLoading,
  errorMessage,
  onSearchChange,
  onFilterChange,
  onAddProduct,
  onRetry,
}: SaleProductBrowserProps) {
  const hasActiveSearch = searchValue.trim().length > 0

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Búsqueda de productos</p>
          <h2 className={styles.title}>Arma la venta desde tu catálogo activo</h2>
          <p className={styles.description}>
            Busca rápido, filtra por estado de stock y mantén la caja en
            movimiento sin salir del POS.
          </p>
        </div>

        <div className={styles.headerAside}>
          <label className={styles.searchField} htmlFor="sale-product-search">
            <span className={styles.searchLabel}>Buscar productos</span>
            <input
              className={styles.searchInput}
              id="sale-product-search"
              placeholder="Busca por nombre, SKU o código"
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>

          <div className={styles.filterRow} role="tablist" aria-label="Filtros de stock">
            {inventoryFilterOptions.map((filterOption) => (
              <button
                key={filterOption.value}
                className={joinClassNames(
                  styles.filterChip,
                  activeFilter === filterOption.value && styles.filterChipActive,
                )}
                type="button"
                onClick={() => onFilterChange(filterOption.value)}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.metaRow}>
        <p className={styles.metaText}>
          {products.length === totalProductsCount
            ? `${products.length} producto${products.length === 1 ? '' : 's'} listo${products.length === 1 ? '' : 's'} para vender`
            : `Mostrando ${products.length} de ${totalProductsCount} productos`}
        </p>

        <Link className={styles.secondaryButton} to={routePaths.products}>
          Crear producto
        </Link>
      </div>

      {isLoading ? (
        <div className={styles.loadingGrid} aria-live="polite">
          {loadingCardKeys.map((cardKey) => (
            <div className={styles.loadingCard} key={cardKey}>
              <span className={styles.loadingVisual} />
              <span className={styles.loadingBarWide} />
              <span className={styles.loadingBarShort} />
              <span className={styles.loadingBarShort} />
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <div className={styles.stateBox} role="alert">
          <p className={styles.stateTitle}>No pudimos cargar productos</p>
          <p className={styles.stateDescription}>{errorMessage}</p>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={onRetry}
          >
            Reintentar
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className={styles.stateBox}>
          <p className={styles.stateTitle}>
            {hasActiveSearch ? 'No hay productos con esa búsqueda' : 'Aún no hay productos disponibles'}
          </p>
          <p className={styles.stateDescription}>
            {hasActiveSearch
              ? 'Prueba una búsqueda más amplia o cambia el filtro de stock.'
              : 'Agrega productos al catálogo para venderlos desde esta pantalla POS.'}
          </p>
          <Link className={styles.secondaryButton} to={routePaths.products}>
            Ir a productos
          </Link>
        </div>
      ) : (
        <div className={styles.productsGrid}>
          <Link className={joinClassNames(styles.productCard, styles.createCard)} to={routePaths.products}>
            <span className={styles.createIcon}>+</span>
            <strong>Crear producto</strong>
            <span>Agrega un artículo y úsalo en la próxima venta.</span>
          </Link>

          {products.map((product) => {
            const quantityInCart = cartQuantitiesByProductId.get(product.id) ?? 0
            const remainingStock = Math.max(product.stock - quantityInCart, 0)
            const canAddProduct = remainingStock > 0 && product.isActive
            const productImageUrl = resolveProductImageUrl(product.imageUrls)

            return (
              <article className={styles.productCard} key={product.id}>
                <div
                  className={joinClassNames(
                    styles.productVisual,
                    productImageUrl
                      ? styles.productVisualPhoto
                      : getProductCardToneClass(product),
                  )}
                >
                  {productImageUrl ? (
                    <img alt="" src={productImageUrl} />
                  ) : (
                    <span>{getProductMonogram(product)}</span>
                  )}
                </div>

                <div className={styles.productHeader}>
                  <div>
                    <h3 className={styles.productName}>{product.name}</h3>
                    <p className={styles.productDescription}>
                      {product.description ?? 'Sin descripción disponible.'}
                    </p>
                  </div>

                  {quantityInCart > 0 ? (
                    <span className={styles.cartBadge}>
                      {quantityInCart} en carrito
                    </span>
                  ) : null}
                </div>

                <div className={styles.productFooter}>
                  <div className={styles.productMeta}>
                    <span className={styles.priceTag}>
                      {formatCurrency(product.price)}
                    </span>
                    <span
                      className={joinClassNames(
                        styles.stockBadge,
                        getStockToneClass(product),
                      )}
                    >
                      {product.stock} disponibles
                    </span>
                  </div>

                  <button
                    className={styles.primaryButton}
                    disabled={!canAddProduct}
                    type="button"
                    onClick={() => onAddProduct(product)}
                  >
                    {!product.isActive
                      ? 'Inactivo'
                      : product.stock === 0
                        ? 'Agotado'
                        : canAddProduct
                          ? quantityInCart > 0
                            ? 'Agregar otro'
                            : 'Agregar a venta'
                          : 'Máximo en carrito'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </SurfaceCard>
  )
}
