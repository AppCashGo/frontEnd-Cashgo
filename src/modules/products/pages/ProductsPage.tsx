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
          <p className={styles.eyebrow}>Centro de productos</p>
          <h2 className={styles.title}>
            Carga, ajusta y organiza tu catálogo desde un espacio de inventario.
          </h2>
          <p className={styles.description}>
            Crea productos uno a uno o impórtalos en lote desde una hoja de
            cálculo. Cashgo mantiene stock, costos y mínimos listos para vender
            y reponer.
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
            Crear producto
          </button>

          <button
            className={styles.heroGhostButton}
            type="button"
            onClick={() => setSearchValue('')}
          >
            Limpiar búsqueda
          </button>
        </div>
      </section>

      <div className={styles.metricsGrid}>
        <ProductMetricCard
          hint="Total de productos activos en el catálogo."
          label="Tamaño del catálogo"
          value={products.length.toString()}
        />
        <ProductMetricCard
          hint="Unidades disponibles sumadas entre todos los productos."
          label="Unidades en stock"
          value={totalUnits.toString()}
        />
        <ProductMetricCard
          hint="Valor estimado según precios de venta actuales."
          label="Valor del catálogo"
          value={formatCurrency(catalogValue)}
        />
        <ProductMetricCard
          hint="Valor actual del inventario usando costo de producto."
          label="Costo de inventario"
          value={formatCurrency(inventoryCost)}
        />
        <ProductMetricCard
          hint={
            lowStockItems > 0
              ? `${lowStockItems} producto${lowStockItems === 1 ? '' : 's'} necesita${lowStockItems === 1 ? '' : 'n'} reposición pronto.`
              : 'No hay alertas de stock bajo en este momento.'
          }
          label="Alertas de stock bajo"
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
                  'No pudimos cargar el catálogo actual. Intenta otra vez.',
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
