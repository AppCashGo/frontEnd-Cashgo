import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { BadgeDollarSign, ChevronLeft, ChevronRight, ClipboardCheck, Package, Pencil, Plus, Search, Tags, Trash2, Upload } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { RetailProductCreateWorkspace, type RetailProductCreateWorkspaceTab } from '@/modules/inventory/components/RetailProductCreateWorkspace'
import { useInventoryCategoriesQuery } from '@/modules/inventory/hooks/use-inventory-query'
import { useDeleteProductMutation, useImportProductsMutation, useProductsQuery } from '@/modules/products/hooks/use-products-query'
import type { Product } from '@/modules/products/types/product'
import { matchesProductSearch } from '@/modules/products/utils/matches-product-search'
import { resolveProductImageUrl } from '@/modules/products/utils/resolve-product-image-url'
import { getProductStockStatus } from '@/modules/products/utils/product-stock-status'
import { getProductUnitStockLabel } from '@/modules/products/utils/product-unit-options'
import { SalesProductPhoto } from '@/modules/sales/components/SalesVisuals'
import { useBusinessSettingsQuery } from '@/modules/settings/hooks/use-settings-query'
import { RetailPageLayout } from '@/shared/components/retail/RetailPageLayout'
import { WorkspaceBusinessTitle } from '@/shared/components/retail/WorkspaceBusinessTitle'
import workspaceVisual from '@/shared/components/retail/WorkspaceVisual.module.css'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import { PageLoadingState } from '@/shared/components/states/PageLoadingState'
import { useConfirmDialog } from '@/shared/hooks/use-confirm-dialog'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { routePaths } from '@/routes/route-paths'
import styles from './ProductsPage.module.css'

type StockStatus = ReturnType<typeof getProductStockStatus>
type StockFilter = 'ALL' | 'healthy' | 'low' | 'out'

const PAGE_SIZE = 10
const workspaceTabs: RetailProductCreateWorkspaceTab[] = ['basic', 'variants', 'measures']
const ProductImportPanel = lazy(() =>
  import('@/modules/products/components/ProductImportPanel').then((module) => ({
    default: module.ProductImportPanel,
  })),
)

function isWorkspaceTab(value: string | null): value is RetailProductCreateWorkspaceTab {
  return workspaceTabs.includes(value as RetailProductCreateWorkspaceTab)
}

const stockLabels: Record<StockStatus, string> = {
  healthy: 'En stock',
  low: 'Stock bajo',
  out: 'Sin stock',
  inactive: 'Inactivo',
  madeToOrder: 'Preparado al pedir',
  variantParent: 'Ver variantes',
}

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchValue, setSearchValue] = useState('')
  const [categoryId, setCategoryId] = useState('ALL')
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase())
  const productsQuery = useProductsQuery()
  const categoriesQuery = useInventoryCategoriesQuery()
  const defaultStockThreshold = useBusinessSettingsQuery().data?.defaultLowStockThreshold
  const importMutation = useImportProductsMutation()
  const deleteMutation = useDeleteProductMutation()
  const { confirm, confirmationDialog } = useConfirmDialog()

  const mode = searchParams.get('mode')
  const productId = searchParams.get('productId')
  const tabParam = searchParams.get('tab')
  const workspaceTab = isWorkspaceTab(tabParam) ? tabParam : 'basic'
  const isProductWorkspaceOpen = mode === 'create' || Boolean(productId)
  const isImportOpen = mode === 'import'
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )
  const filteredProducts = useMemo(
    () => products.filter((product) =>
      matchesProductSearch(product, deferredSearch) &&
      (categoryId === 'ALL' || product.categoryId === categoryId) &&
      (stockFilter === 'ALL' || getProductStockStatus(product, defaultStockThreshold) === stockFilter)),
    [categoryId, defaultStockThreshold, deferredSearch, products, stockFilter],
  )
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const paginatedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const firstVisible = filteredProducts.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastVisible = Math.min(page * PAGE_SIZE, filteredProducts.length)
  const totalSaleValue = products.reduce(
    (total, product) =>
      total +
      (product.inventoryBehavior === 'MADE_TO_ORDER'
        ? 0
        : product.price * product.stock),
    0,
  )

  useEffect(() => setPage(1), [categoryId, deferredSearch, stockFilter])
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  function updateWorkspaceParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams)
    Object.entries(next).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key))
    setSearchParams(params)
  }

  function closeWorkspace() {
    updateWorkspaceParams({ mode: null, productId: null, tab: null })
  }

  async function handleDelete(product: Product) {
    deleteMutation.reset()
    const shouldDelete = await confirm({
      title: 'Eliminar producto',
      description: `Vas a eliminar “${product.name}” del catálogo. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar producto',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    })
    if (shouldDelete) deleteMutation.mutate(product.id)
  }

  if (isProductWorkspaceOpen) {
    return <RetailProductCreateWorkspace initialTab={workspaceTab} productId={productId} onBack={closeWorkspace} onTabChange={(tab) => updateWorkspaceParams({ tab })} />
  }

  return (
    <>
      {confirmationDialog}
      <RetailPageLayout
        bodyClassName={styles.body}
        headerClassName={`${workspaceVisual.hero} ${workspaceVisual.catalogHeader}`}
        title={<WorkspaceBusinessTitle>Productos</WorkspaceBusinessTitle>}
        meta={<span>Gestiona tu catálogo detallado de artículos y servicios.</span>}
        actions={<>
          <Link className={`${retailStyles.buttonOutline} ${workspaceVisual.catalogAction}`} to={routePaths.inventory}>
            <ClipboardCheck aria-hidden="true" size={18} /> Ver existencias
          </Link>
          <button className={`${retailStyles.buttonOutline} ${workspaceVisual.catalogAction}`} type="button" onClick={() => updateWorkspaceParams({ mode: 'import' })}>
            <Upload aria-hidden="true" size={18} /> Carga masiva
          </button>
          <button className={`${retailStyles.buttonDark} ${workspaceVisual.catalogAction} ${workspaceVisual.catalogPrimary}`} type="button" onClick={() => updateWorkspaceParams({ mode: 'create', productId: null, tab: 'basic' })}>
            <Plus aria-hidden="true" size={19} /> Crear producto
          </button>
        </>}
      >
        <section className={styles.metrics} aria-label="Resumen del catálogo">
          <article className={styles.metricCard}><span className={styles.metricIcon}><Package aria-hidden="true" /></span><div><span>Total de productos</span><strong>{products.length.toLocaleString('es-CO')}</strong></div></article>
          <article className={styles.metricCard}><span className={styles.metricIcon}><Tags aria-hidden="true" /></span><div><span>Categorías activas</span><strong>{categories.filter((category) => category.isVisibleInCatalog).length}</strong></div></article>
          <article className={styles.metricCard}><span className={styles.metricIcon}><BadgeDollarSign aria-hidden="true" /></span><div><span>Valor del stock a precio de venta</span><strong>{formatCurrency(totalSaleValue)}</strong></div></article>
        </section>

        <section className={styles.catalogCard}>
          <div className={styles.filters}>
            <label className={styles.searchField}>
              <Search aria-hidden="true" size={21} /><span className={styles.srOnly}>Buscar producto</span>
              <input placeholder="Buscar por nombre, SKU o código..." type="search" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} />
            </label>
            <label className={styles.selectField}>
              <span className={styles.srOnly}>Filtrar por categoría</span>
              <SearchableSelect aria-label="Filtrar por categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="ALL">Todas las categorías</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </SearchableSelect>
            </label>
            <label className={styles.selectField}>
              <span className={styles.srOnly}>Filtrar por stock</span>
              <SearchableSelect aria-label="Filtrar por stock" value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)}>
                <option value="ALL">Cualquier stock</option>
                <option value="healthy">{stockLabels.healthy}</option>
                <option value="low">{stockLabels.low}</option>
                <option value="out">{stockLabels.out}</option>
              </SearchableSelect>
            </label>
          </div>

          {deleteMutation.isError ? (
            <p className={styles.deleteError} role="alert">
              {getErrorMessage(deleteMutation.error, 'No se pudo eliminar el producto.')}
            </p>
          ) : null}

          {productsQuery.isLoading ? <PageLoadingState brand="business" layout="inline" title="Cargando productos…" /> : productsQuery.isError ? (
            <div className={styles.state} role="alert"><strong>No pudimos cargar los productos.</strong><span>{getErrorMessage(productsQuery.error, 'Intenta nuevamente.')}</span><button className={retailStyles.buttonOutline} type="button" onClick={() => void productsQuery.refetch()}>Reintentar</button></div>
          ) : paginatedProducts.length === 0 ? (
            <div className={styles.state}><strong>No encontramos productos</strong><span>Ajusta los filtros o crea un producto nuevo.</span><button className={retailStyles.buttonDark} type="button" onClick={() => updateWorkspaceParams({ mode: 'create', tab: 'basic' })}>Crear producto</button></div>
          ) : (
            <div className={styles.tableScroller}>
              <table className={styles.table}>
                <thead><tr><th>Producto</th><th>SKU</th><th>Costo</th><th>Precio de venta</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>{paginatedProducts.map((product) => {
                  const status = getProductStockStatus(product, defaultStockThreshold)
                  const canTrackStock = product.inventoryBehavior !== 'MADE_TO_ORDER' &&
                    product.productType !== 'VARIANT_PARENT'
                  const openEditor = () => updateWorkspaceParams({ productId: product.id, mode: null, tab: 'basic' })
                  return <tr key={product.id}>
                    <td data-label="Producto">
                      <button className={styles.productCell} type="button" onClick={openEditor}>
                        <SalesProductPhoto
                          compact
                          src={resolveProductImageUrl(product.imageUrls) ?? resolveProductImageUrl(product.variantGroup?.imageUrls)}
                        />
                        <span>
                          <strong>{product.name}</strong>
                          <small>{categoryById.get(product.categoryId ?? '') ?? 'Sin categoría'}</small>
                        </span>
                      </button>
                    </td>
                    <td data-label="SKU" className={styles.sku}>{product.sku ?? '—'}</td>
                    <td data-label="Costo">{formatCurrency(product.cost)}</td>
                    <td data-label="Precio de venta" className={styles.price}>{formatCurrency(product.price)}</td>
                    <td data-label="Stock">
                      {canTrackStock ? (
                        <span className={styles.stockQty}>
                          <strong>{product.stock}</strong> {getProductUnitStockLabel(product.unit, product.stock)}
                        </span>
                      ) : <span>—</span>}
                    </td>
                    <td data-label="Estado"><span className={styles.status} data-status={status}>{stockLabels[status]}</span></td>
                    <td data-label="Acciones" className={styles.actionCell}>
                      <div className={styles.rowActions}>
                        <button aria-label={`Editar ${product.name}`} type="button" onClick={openEditor}>
                          <Pencil aria-hidden="true" /> Editar
                        </button>
                        <button
                          aria-label={`Eliminar ${product.name}`}
                          className={styles.deleteAction}
                          disabled={deleteMutation.isPending}
                          title="Eliminar producto"
                          type="button"
                          onClick={() => void handleDelete(product)}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                })}</tbody>
              </table>
            </div>
          )}

          <footer className={styles.pagination}>
            <span>Mostrando {firstVisible}-{lastVisible} de {filteredProducts.length.toLocaleString('es-CO')}</span>
            <div><button aria-label="Página anterior" disabled={page <= 1} type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft aria-hidden="true" size={18} /></button><span>Página {page} de {pageCount}</span><button aria-label="Página siguiente" disabled={page >= pageCount} type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight aria-hidden="true" size={18} /></button></div>
          </footer>
        </section>
      </RetailPageLayout>

      <SideDrawer isOpen={isImportOpen} isCloseDisabled={importMutation.isPending} panelClassName={styles.importDrawer} title="Carga masiva de productos" description="Importa o actualiza tu catálogo desde un archivo CSV o Excel." closeLabel="Cerrar carga masiva" confirmClose onClose={closeWorkspace}>
        {isImportOpen ? (
          <Suspense
            fallback={(
              <PageLoadingState brand="business" layout="inline" title="Preparando el importador…" />
            )}
          >
            <ProductImportPanel
              isImporting={importMutation.isPending}
              onImport={(input) => importMutation.mutateAsync(input)}
            />
          </Suspense>
        ) : null}
      </SideDrawer>
    </>
  )
}
