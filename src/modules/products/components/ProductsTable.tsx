import type { Product } from '@/modules/products/types/product'
import { getProductUnitLabel } from '@/modules/products/utils/product-unit-options'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDate } from '@/shared/utils/format-date'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './ProductsTable.module.css'

type ProductsTableProps = {
  products: Product[]
  totalProductsCount: number
  searchValue: string
  activeProductId: string | null
  confirmingDeleteProductId: string | null
  deletingProductId: string | null
  isLoading: boolean
  isRefreshing: boolean
  errorMessage: string | null
  onSearchChange: (value: string) => void
  onCreateProduct: () => void
  onEditProduct: (product: Product) => void
  onRequestDeleteProduct: (productId: string) => void
  onCancelDeleteProduct: () => void
  onConfirmDeleteProduct: (product: Product) => void
  onRetry: () => void
}

const loadingRowKeys = ['row-1', 'row-2', 'row-3'] as const

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

function getInventoryHealthLabel(product: Product) {
  if (!product.isActive) {
    return 'Inactive'
  }

  if (product.stock === 0) {
    return 'Out of stock'
  }

  if (product.stock <= Math.max(product.minStock, 5)) {
    return 'Low stock'
  }

  return 'Healthy'
}

export function ProductsTable({
  products,
  totalProductsCount,
  searchValue,
  activeProductId,
  confirmingDeleteProductId,
  deletingProductId,
  isLoading,
  isRefreshing,
  errorMessage,
  onSearchChange,
  onCreateProduct,
  onEditProduct,
  onRequestDeleteProduct,
  onCancelDeleteProduct,
  onConfirmDeleteProduct,
  onRetry,
}: ProductsTableProps) {
  const hasActiveSearch = searchValue.trim().length > 0

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.toolbar}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Catalog workspace</p>
          <h2 className={styles.title}>Products table</h2>
          <p className={styles.description}>
            Search, edit and monitor stock, cost and replenishment thresholds
            from one clean workspace.
          </p>
        </div>

        <div className={styles.toolbarActions}>
          <label className={styles.searchField}>
            <span className={styles.searchLabel}>Search products</span>
            <input
              className={styles.searchInput}
              placeholder="Search by name, SKU or barcode"
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>

          <button
            className={styles.primaryButton}
            type="button"
            onClick={onCreateProduct}
          >
            Create product
          </button>
        </div>
      </div>

      <div className={styles.metaRow}>
        <p className={styles.metaText}>
          {products.length === totalProductsCount
            ? `${products.length} product${products.length === 1 ? '' : 's'} available`
            : `Showing ${products.length} of ${totalProductsCount} products`}
        </p>

        {isRefreshing ? (
          <p className={styles.refreshingBadge} role="status">
            Refreshing catalog...
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <div className={styles.stateBox} aria-live="polite">
          <p className={styles.stateTitle}>Loading your catalog</p>
          <div className={styles.loadingRows}>
            {loadingRowKeys.map((rowKey) => (
              <div className={styles.loadingRow} key={rowKey}>
                <span className={styles.loadingBarWide} />
                <span className={styles.loadingBarShort} />
              </div>
            ))}
          </div>
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
            Retry request
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className={styles.stateBox}>
          <p className={styles.stateTitle}>
            {hasActiveSearch ? 'No matching products' : 'Your catalog is still empty'}
          </p>
          <p className={styles.stateDescription}>
            {hasActiveSearch
              ? 'Try a different search term or create a new product from the action button.'
              : 'Start by creating your first product or import a CSV and it will appear here immediately.'}
          </p>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={onCreateProduct}
          >
            Create product
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Cost</th>
                <th scope="col">Price</th>
                <th scope="col">Stock</th>
                <th scope="col">Updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => {
                const isConfirmingDelete =
                  confirmingDeleteProductId === product.id
                const isDeleting = deletingProductId === product.id

                return (
                  <tr
                    className={joinClassNames(
                      styles.row,
                      activeProductId === product.id && styles.rowActive,
                    )}
                    key={product.id}
                  >
                    <td className={styles.primaryColumn}>
                      <div className={styles.productNameBlock}>
                        <span className={styles.productName}>
                          {product.name}
                        </span>
                        <span className={styles.productCreatedAt}>
                          {product.sku
                            ? `SKU ${product.sku} · ${getProductUnitLabel(product.unit)}`
                            : `Created ${formatDate(product.createdAt)}`}
                        </span>
                      </div>

                      <p className={styles.productDescription}>
                        {product.description ?? 'No description added yet.'}
                      </p>
                    </td>

                    <td className={styles.numericColumn}>
                      {formatCurrency(product.cost)}
                    </td>

                    <td className={styles.numericColumn}>
                      {formatCurrency(product.price)}
                    </td>

                    <td className={styles.numericColumn}>
                      <span
                        className={joinClassNames(
                          styles.stockBadge,
                          getStockToneClass(product),
                        )}
                      >
                        {product.stock} in stock
                      </span>
                      <p className={styles.stockMeta}>
                        {getInventoryHealthLabel(product)}
                        {product.minStock > 0 ? ` · min ${product.minStock}` : ''}
                      </p>
                    </td>

                    <td className={styles.mutedColumn}>
                      {formatDate(product.updatedAt)}
                    </td>

                    <td>
                      <div className={styles.actions}>
                        {isConfirmingDelete ? (
                          <>
                            <button
                              className={styles.secondaryButton}
                              type="button"
                              onClick={onCancelDeleteProduct}
                            >
                              Cancel
                            </button>
                            <button
                              className={styles.dangerButton}
                              disabled={isDeleting}
                              type="button"
                              onClick={() => onConfirmDeleteProduct(product)}
                            >
                              {isDeleting ? 'Deleting...' : 'Confirm delete'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={styles.secondaryButton}
                              type="button"
                              onClick={() => onEditProduct(product)}
                            >
                              Edit
                            </button>
                            <button
                              className={styles.ghostDangerButton}
                              disabled={isDeleting}
                              type="button"
                              onClick={() => onRequestDeleteProduct(product.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SurfaceCard>
  )
}
