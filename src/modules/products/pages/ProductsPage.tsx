import { useDeferredValue, useState } from 'react'
import { ProductFormPanel } from '@/modules/products/components/ProductFormPanel'
import { ProductImportPanel } from '@/modules/products/components/ProductImportPanel'
import { ProductMetricCard } from '@/modules/products/components/ProductMetricCard'
import { ProductsTable } from '@/modules/products/components/ProductsTable'
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useImportProductsMutation,
  useProductsQuery,
  useUpdateProductMutation,
} from '@/modules/products/hooks/use-products-query'
import type {
  Product,
  ProductMutationInput,
} from '@/modules/products/types/product'
import { matchesProductSearch } from '@/modules/products/utils/matches-product-search'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './ProductsPage.module.css'

export function ProductsPage() {
  const [searchValue, setSearchValue] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  )
  const [confirmingDeleteProductId, setConfirmingDeleteProductId] = useState<
    string | null
  >(null)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  )
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase())

  const productsQuery = useProductsQuery()
  const createProductMutation = useCreateProductMutation()
  const updateProductMutation = useUpdateProductMutation()
  const deleteProductMutation = useDeleteProductMutation()
  const importProductsMutation = useImportProductsMutation()

  const products = productsQuery.data ?? []
  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? null
  const visibleProducts = products.filter((product) =>
    matchesProductSearch(product, deferredSearchValue),
  )
  const catalogValue = products.reduce(
    (sum, product) => sum + product.price * product.stock,
    0,
  )
  const inventoryCost = products.reduce(
    (sum, product) => sum + product.cost * product.stock,
    0,
  )
  const totalUnits = products.reduce((sum, product) => sum + product.stock, 0)
  const lowStockItems = products.filter(
    (product) => product.stock <= Math.max(product.minStock, 5),
  ).length
  const isSubmittingProduct =
    createProductMutation.isPending || updateProductMutation.isPending

  async function handleSubmitProduct(input: ProductMutationInput) {
    if (selectedProduct) {
      await updateProductMutation.mutateAsync({
        productId: selectedProduct.id,
        input,
      })
      return
    }

    await createProductMutation.mutateAsync(input)
  }

  async function handleConfirmDelete(product: Product) {
    setDeletingProductId(product.id)

    try {
      await deleteProductMutation.mutateAsync(product.id)

      if (selectedProductId === product.id) {
        setSelectedProductId(null)
      }

      setConfirmingDeleteProductId(null)
    } finally {
      setDeletingProductId(null)
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Products command center</p>
          <h2 className={styles.title}>
            Load, adjust and organize your catalog from one inventory web
            workspace.
          </h2>
          <p className={styles.description}>
            Create products one by one or import them in bulk from a spreadsheet
            file. Cashgo keeps stock, cost and low-stock thresholds ready for
            selling and replenishment.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button
            className={styles.heroButton}
            type="button"
            onClick={() => {
              setSelectedProductId(null)
              setConfirmingDeleteProductId(null)
            }}
          >
            Create product
          </button>

          <button
            className={styles.heroGhostButton}
            type="button"
            onClick={() => setSearchValue('')}
          >
            Clear search
          </button>
        </div>
      </section>

      <div className={styles.metricsGrid}>
        <ProductMetricCard
          hint="Total active catalog items."
          label="Catalog size"
          value={products.length.toString()}
        />
        <ProductMetricCard
          hint="Combined units available across products."
          label="Units in stock"
          value={totalUnits.toString()}
        />
        <ProductMetricCard
          hint="Estimated revenue value based on current sale prices."
          label="Catalog value"
          value={formatCurrency(catalogValue)}
        />
        <ProductMetricCard
          hint="Current stock valuation using product cost."
          label="Inventory cost"
          value={formatCurrency(inventoryCost)}
        />
        <ProductMetricCard
          hint={
            lowStockItems > 0
              ? `${lowStockItems} product${lowStockItems === 1 ? '' : 's'} need replenishment soon.`
              : 'No low-stock alerts right now.'
          }
          label="Low-stock alerts"
          value={lowStockItems.toString()}
        />
      </div>

      <div className={styles.workspace}>
        <ProductsTable
          activeProductId={selectedProductId}
          confirmingDeleteProductId={confirmingDeleteProductId}
          deletingProductId={deletingProductId}
          errorMessage={
            productsQuery.isError
              ? getErrorMessage(
                  productsQuery.error,
                  'Unable to load the current catalog. Please try again.',
                )
              : null
          }
          isLoading={productsQuery.isLoading}
          isRefreshing={productsQuery.isFetching && !productsQuery.isLoading}
          products={visibleProducts}
          searchValue={searchValue}
          totalProductsCount={products.length}
          onCancelDeleteProduct={() => setConfirmingDeleteProductId(null)}
          onConfirmDeleteProduct={handleConfirmDelete}
          onCreateProduct={() => {
            setSelectedProductId(null)
            setConfirmingDeleteProductId(null)
          }}
          onEditProduct={(product) => {
            setSelectedProductId(product.id)
            setConfirmingDeleteProductId(null)
          }}
          onRequestDeleteProduct={(productId) => {
            setConfirmingDeleteProductId(productId)
          }}
          onRetry={() => {
            void productsQuery.refetch()
          }}
          onSearchChange={setSearchValue}
        />

        <div className={styles.sidebarStack}>
          <ProductImportPanel
            isImporting={importProductsMutation.isPending}
            onImport={(input) => importProductsMutation.mutateAsync(input)}
          />

          <ProductFormPanel
            isSubmitting={isSubmittingProduct}
            product={selectedProduct}
            onStartCreate={() => {
              setSelectedProductId(null)
              setConfirmingDeleteProductId(null)
            }}
            onSubmit={handleSubmitProduct}
          />
        </div>
      </div>
    </div>
  )
}
