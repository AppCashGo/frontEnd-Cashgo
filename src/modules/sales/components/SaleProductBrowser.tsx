import { Link } from 'react-router-dom'
import type { Product } from '@/modules/products/types/product'
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
  { value: 'ALL', label: 'All' },
  { value: 'READY', label: 'Ready' },
  { value: 'LOW', label: 'Low stock' },
  { value: 'OUT', label: 'Out of stock' },
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
          <p className={styles.eyebrow}>Product search</p>
          <h2 className={styles.title}>Build the sale from your live catalog</h2>
          <p className={styles.description}>
            Search fast, filter by stock health and keep checkout moving without
            leaving the POS workspace.
          </p>
        </div>

        <div className={styles.headerAside}>
          <label className={styles.searchField} htmlFor="sale-product-search">
            <span className={styles.searchLabel}>Search products</span>
            <input
              className={styles.searchInput}
              id="sale-product-search"
              placeholder="Search by name, SKU or barcode"
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>

          <div className={styles.filterRow} role="tablist" aria-label="Stock filters">
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
            ? `${products.length} product${products.length === 1 ? '' : 's'} ready for checkout`
            : `Showing ${products.length} of ${totalProductsCount} products`}
        </p>

        <Link className={styles.secondaryButton} to={routePaths.products}>
          Create product
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
          <p className={styles.stateTitle}>Unable to load products</p>
          <p className={styles.stateDescription}>{errorMessage}</p>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className={styles.stateBox}>
          <p className={styles.stateTitle}>
            {hasActiveSearch ? 'No matching products' : 'No products available yet'}
          </p>
          <p className={styles.stateDescription}>
            {hasActiveSearch
              ? 'Try a broader search term or switch the stock filter to find more items.'
              : 'Add products to the catalog first so they can be sold from this POS screen.'}
          </p>
          <Link className={styles.secondaryButton} to={routePaths.products}>
            Go to products
          </Link>
        </div>
      ) : (
        <div className={styles.productsGrid}>
          <Link className={joinClassNames(styles.productCard, styles.createCard)} to={routePaths.products}>
            <span className={styles.createIcon}>+</span>
            <strong>Create product</strong>
            <span>Add a new item and bring it straight into the next sale.</span>
          </Link>

          {products.map((product) => {
            const quantityInCart = cartQuantitiesByProductId.get(product.id) ?? 0
            const remainingStock = Math.max(product.stock - quantityInCart, 0)
            const canAddProduct = remainingStock > 0 && product.isActive

            return (
              <article className={styles.productCard} key={product.id}>
                <div
                  className={joinClassNames(
                    styles.productVisual,
                    getProductCardToneClass(product),
                  )}
                >
                  <span>{getProductMonogram(product)}</span>
                </div>

                <div className={styles.productHeader}>
                  <div>
                    <h3 className={styles.productName}>{product.name}</h3>
                    <p className={styles.productDescription}>
                      {product.description ?? 'No description available.'}
                    </p>
                  </div>

                  {quantityInCart > 0 ? (
                    <span className={styles.cartBadge}>
                      {quantityInCart} in cart
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
                      {product.stock} available
                    </span>
                  </div>

                  <button
                    className={styles.primaryButton}
                    disabled={!canAddProduct}
                    type="button"
                    onClick={() => onAddProduct(product)}
                  >
                    {!product.isActive
                      ? 'Inactive'
                      : product.stock === 0
                        ? 'Out of stock'
                        : canAddProduct
                          ? quantityInCart > 0
                            ? 'Add one more'
                            : 'Add to sale'
                          : 'Max in cart'}
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
