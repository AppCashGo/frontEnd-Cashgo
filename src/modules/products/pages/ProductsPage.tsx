import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ImageIcon, MoreVertical, Plus, Search, Upload } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { RetailProductCreateWorkspace, type RetailProductCreateWorkspaceTab } from '@/modules/inventory/components/RetailProductCreateWorkspace'
import { useInventoryCategoriesQuery } from '@/modules/inventory/hooks/use-inventory-query'
import { ProductImportPanel } from '@/modules/products/components/ProductImportPanel'
import { useDeleteProductMutation, useImportProductsMutation, useProductsQuery } from '@/modules/products/hooks/use-products-query'
import type { Product } from '@/modules/products/types/product'
import { matchesProductSearch } from '@/modules/products/utils/matches-product-search'
import { resolveProductImageUrl } from '@/modules/products/utils/resolve-product-image-url'
import { RetailPageLayout } from '@/shared/components/retail/RetailPageLayout'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import { useConfirmDialog } from '@/shared/hooks/use-confirm-dialog'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './ProductsPage.module.css'

type StockFilter = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

const PAGE_SIZE = 10
const workspaceTabs: RetailProductCreateWorkspaceTab[] = ['basic', 'variants', 'measures']

function isWorkspaceTab(value: string | null): value is RetailProductCreateWorkspaceTab {
  return workspaceTabs.includes(value as RetailProductCreateWorkspaceTab)
}

function getStockStatus(product: Product) {
  if (!product.isActive) return { label: 'Inactivo', tone: styles.statusInactive }
  if (product.stock === 0) return { label: 'Agotado', tone: styles.statusOut }
  if (product.stock <= Math.max(product.minStock, 5)) {
    return { label: 'Stock bajo', tone: styles.statusLow }
  }
  return { label: 'En stock', tone: styles.statusHealthy }
}

function matchesStockFilter(product: Product, filter: StockFilter) {
  if (filter === 'OUT_OF_STOCK') return product.stock === 0
  if (filter === 'LOW_STOCK') {
    return product.stock > 0 && product.stock <= Math.max(product.minStock, 5)
  }
  if (filter === 'IN_STOCK') return product.stock > Math.max(product.minStock, 5)
  return true
}

function ProductThumbnail({ product }: { product: Product }) {
  const imageUrl = resolveProductImageUrl(product.imageUrls)
  return (
    <span className={styles.thumbnail}>
      {imageUrl ? <img alt="" src={imageUrl} /> : <ImageIcon aria-hidden="true" size={20} strokeWidth={1.8} />}
    </span>
  )
}

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchValue, setSearchValue] = useState('')
  const [categoryId, setCategoryId] = useState('ALL')
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL')
  const [page, setPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase())
  const productsQuery = useProductsQuery()
  const categoriesQuery = useInventoryCategoriesQuery()
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
      matchesStockFilter(product, stockFilter)),
    [categoryId, deferredSearch, products, stockFilter],
  )
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const paginatedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const firstVisible = filteredProducts.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastVisible = Math.min(page * PAGE_SIZE, filteredProducts.length)
  const totalSaleValue = products.reduce((total, product) => total + product.price * product.stock, 0)

  useEffect(() => setPage(1), [categoryId, deferredSearch, stockFilter])
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  function updateWorkspaceParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams)
    Object.entries(next).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key))
    setSearchParams(params)
    setOpenMenuId(null)
  }

  function closeWorkspace() {
    updateWorkspaceParams({ mode: null, productId: null, tab: null })
  }

  async function handleDelete(product: Product) {
    setOpenMenuId(null)
    const shouldDelete = await confirm({
      title: 'Eliminar producto',
      description: `Vas a eliminar “${product.name}” del catálogo. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar producto',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    })
    if (shouldDelete) await deleteMutation.mutateAsync(product.id)
  }

  if (isProductWorkspaceOpen) {
    return <RetailProductCreateWorkspace initialTab={workspaceTab} productId={productId} onBack={closeWorkspace} onTabChange={(tab) => updateWorkspaceParams({ tab })} />
  }

  return (
    <>
      {confirmationDialog}
      <RetailPageLayout
        bodyClassName={styles.body}
        title="Productos"
        meta={<span>Gestiona tu catálogo detallado de artículos y servicios.</span>}
        actions={<>
          <button className={`${retailStyles.buttonOutline} ${styles.headerButton}`} type="button" onClick={() => updateWorkspaceParams({ mode: 'import' })}>
            <Upload aria-hidden="true" size={18} /> Carga masiva
          </button>
          <button className={`${retailStyles.buttonDark} ${styles.headerButton}`} type="button" onClick={() => updateWorkspaceParams({ mode: 'create', productId: null, tab: 'basic' })}>
            <Plus aria-hidden="true" size={19} /> Crear producto
          </button>
        </>}
      >
        <section className={styles.metrics} aria-label="Resumen del catálogo">
          <article className={styles.metricCard}><span>Total de productos</span><strong>{products.length.toLocaleString('es-CO')}</strong></article>
          <article className={styles.metricCard}><span>Categorías activas</span><strong>{categories.filter((category) => category.isVisibleInCatalog).length}</strong></article>
          <article className={styles.metricCard}><span>Valor de venta total</span><strong>{formatCurrency(totalSaleValue)}</strong></article>
        </section>

        <section className={styles.catalogCard}>
          <div className={styles.filters}>
            <label className={styles.searchField}>
              <Search aria-hidden="true" size={21} /><span className={styles.srOnly}>Buscar producto</span>
              <input placeholder="Buscar por nombre, SKU o código..." type="search" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} />
            </label>
            <label className={styles.selectField}>
              <span className={styles.srOnly}>Filtrar por categoría</span>
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="ALL">Todas las categorías</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className={styles.selectField}>
              <span className={styles.srOnly}>Filtrar por stock</span>
              <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)}>
                <option value="ALL">Cualquier stock</option><option value="IN_STOCK">En stock</option><option value="LOW_STOCK">Stock bajo</option><option value="OUT_OF_STOCK">Agotado</option>
              </select>
            </label>
          </div>

          {productsQuery.isLoading ? <div className={styles.state} role="status">Cargando productos...</div> : productsQuery.isError ? (
            <div className={styles.state} role="alert"><strong>No pudimos cargar los productos.</strong><span>{getErrorMessage(productsQuery.error, 'Intenta nuevamente.')}</span><button className={retailStyles.buttonOutline} type="button" onClick={() => void productsQuery.refetch()}>Reintentar</button></div>
          ) : paginatedProducts.length === 0 ? (
            <div className={styles.state}><strong>No encontramos productos</strong><span>Ajusta los filtros o crea un producto nuevo.</span><button className={retailStyles.buttonDark} type="button" onClick={() => updateWorkspaceParams({ mode: 'create', tab: 'basic' })}>Crear producto</button></div>
          ) : (
            <div className={styles.tableScroller}>
              <table className={styles.table}>
                <thead><tr><th>Producto</th><th>SKU</th><th>Costo</th><th>Precio de venta</th><th>Stock</th><th>Estado</th><th className={styles.actionsHeading}>Acciones</th></tr></thead>
                <tbody>{paginatedProducts.map((product) => {
                  const status = getStockStatus(product)
                  return <tr key={product.id}>
                    <td data-label="Producto"><button className={styles.productCell} type="button" onClick={() => updateWorkspaceParams({ productId: product.id, mode: null, tab: 'basic' })}><ProductThumbnail product={product} /><span><strong>{product.name}</strong><small>{categoryById.get(product.categoryId ?? '') ?? 'Sin categoría'}</small></span></button></td>
                    <td data-label="SKU">{product.sku ?? '—'}</td>
                    <td data-label="Costo">{formatCurrency(product.cost)}</td>
                    <td data-label="Precio de venta" className={styles.price}>{formatCurrency(product.price)}</td>
                    <td data-label="Stock"><span className={product.stock <= Math.max(product.minStock, 5) ? styles.lowStock : undefined}><strong>{product.stock}</strong> {product.unit === 'SERVICE' ? 'servicios' : 'unidades'}</span></td>
                    <td data-label="Estado"><span className={`${styles.status} ${status.tone}`}>{status.label}</span></td>
                    <td data-label="Acciones" className={styles.actionCell}>
                      <button aria-expanded={openMenuId === product.id} aria-label={`Acciones de ${product.name}`} className={styles.menuButton} type="button" onClick={() => setOpenMenuId((current) => current === product.id ? null : product.id)}><MoreVertical aria-hidden="true" size={20} /></button>
                      {openMenuId === product.id ? <div className={styles.actionMenu}><button type="button" onClick={() => updateWorkspaceParams({ productId: product.id, mode: null, tab: 'basic' })}>Editar producto</button><button className={styles.deleteAction} disabled={deleteMutation.isPending} type="button" onClick={() => void handleDelete(product)}>Eliminar</button></div> : null}
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

      <SideDrawer isOpen={isImportOpen} isCloseDisabled={importMutation.isPending} panelClassName={styles.importDrawer} title="Carga masiva de productos" description="Importa o actualiza tu catálogo desde un archivo CSV o Excel." closeLabel="Cerrar carga masiva" onClose={closeWorkspace}>
        <ProductImportPanel isImporting={importMutation.isPending} onImport={(input) => importMutation.mutateAsync(input)} />
      </SideDrawer>
    </>
  )
}
