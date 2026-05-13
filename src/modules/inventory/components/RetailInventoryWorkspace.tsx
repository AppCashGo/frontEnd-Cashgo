import type { KeyboardEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  RetailProductCreateWorkspace,
  type RetailProductCreateWorkspaceTab,
} from '@/modules/inventory/components/RetailProductCreateWorkspace'
import {
  useProductsQuery,
  useUpdateProductMutation,
} from '@/modules/products/hooks/use-products-query'
import { matchesProductSearch } from '@/modules/products/utils/matches-product-search'
import {
  useCreateInventoryCategoryMutation,
  useDeleteInventoryCategoryMutation,
  useInventoryCategoriesQuery,
  useInventoryLowStockQuery,
  useRegisterInventoryPurchaseMutation,
  useUpdateInventoryCategoryMutation,
  useUpdateInventoryProductTaxesMutation,
} from '@/modules/inventory/hooks/use-inventory-query'
import { getInventoryCopy } from '@/modules/inventory/i18n/inventory-copy'
import { exportInventoryReport } from '@/modules/inventory/services/inventory-api'
import { inventoryTaxOptions } from '@/modules/inventory/constants/inventory-tax-options'
import type {
  InventoryProductCategory,
  InventoryProductCategoryInput,
} from '@/modules/inventory/types/inventory'
import type {
  Product,
  ProductMutationInput,
} from '@/modules/products/types/product'
import {
  useBusinessSettingsQuery,
  useUpdateBusinessSettingsMutation,
} from '@/modules/settings/hooks/use-settings-query'
import { routePaths, routeSegments } from '@/routes/route-paths'
import { useAppTranslation } from '@/shared/i18n/use-app-translation'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import { RetailEmptyState } from '@/shared/components/retail/RetailEmptyState'
import { RetailPageLayout } from '@/shared/components/retail/RetailPageLayout'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './RetailInventoryWorkspace.module.css'

type InventoryFilter = 'ALL' | 'LOW'

type FeedbackTone = 'success' | 'info' | 'error'

type FeedbackMessage = {
  tone: FeedbackTone
  text: string
}

type InlineProductField = 'price' | 'cost' | 'stock'

type InlineProductDraft = Record<InlineProductField, string>

type InlineProductDrafts = Record<string, InlineProductDraft>

type CategoryEditorState = {
  id: string | null
  name: string
  isVisibleInCatalog: boolean
  productIds: string[]
}

type PurchaseFormState = {
  productId: string
  quantity: string
  unitCost: string
  reason: string
}

type TaxFormState = {
  selectedOptionId: string
  productIds: string[]
}

type DrawerShellProps = {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

type IconButtonProps = {
  label: string
  tooltip: string
  onClick: () => void
  children: ReactNode
}

const inventoryFilterOptions: InventoryFilter[] = ['ALL', 'LOW']

function createDefaultCategoryEditorState(): CategoryEditorState {
  return {
    id: null,
    name: '',
    isVisibleInCatalog: true,
    productIds: [],
  }
}

function createDefaultPurchaseFormState(): PurchaseFormState {
  return {
    productId: '',
    quantity: '1',
    unitCost: '',
    reason: '',
  }
}

function createDefaultTaxFormState(): TaxFormState {
  return {
    selectedOptionId: '',
    productIds: [],
  }
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function parsePositiveNumber(value: string) {
  const normalizedValue = value.replace(',', '.')
  const parsedValue = Number(normalizedValue)

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
}

function formatEditableNumber(value: number) {
  const roundedValue = Math.round((value + Number.EPSILON) * 100) / 100

  return Number.isInteger(roundedValue)
    ? roundedValue.toString()
    : roundedValue.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function parseEditableDecimal(value: string) {
  const cleanedValue = value.trim().replace(/\$/g, '').replace(/\s/g, '')

  if (cleanedValue.length === 0) {
    return Number.NaN
  }

  const hasComma = cleanedValue.includes(',')
  const hasDot = cleanedValue.includes('.')
  const lastCommaIndex = cleanedValue.lastIndexOf(',')
  const lastDotIndex = cleanedValue.lastIndexOf('.')
  let normalizedValue = cleanedValue

  if (hasComma && hasDot) {
    normalizedValue =
      lastCommaIndex > lastDotIndex
        ? cleanedValue.replace(/\./g, '').replace(',', '.')
        : cleanedValue.replace(/,/g, '')
  } else if (hasComma) {
    normalizedValue = cleanedValue.replace(',', '.')
  } else if (hasDot) {
    const decimalSegment = cleanedValue.slice(lastDotIndex + 1)
    const dotSegments = cleanedValue.split('.')
    const looksLikeThousands =
      dotSegments.length > 1 &&
      decimalSegment.length === 3 &&
      dotSegments.slice(1).every((segment) => segment.length === 3)

    normalizedValue = looksLikeThousands
      ? cleanedValue.replace(/\./g, '')
      : cleanedValue
  }

  const parsedValue = Number(normalizedValue)

  return Number.isFinite(parsedValue) && parsedValue >= 0
    ? parsedValue
    : Number.NaN
}

function parseEditableStock(value: string) {
  const parsedValue = parseEditableDecimal(value)

  return Number.isFinite(parsedValue) ? Math.floor(parsedValue) : Number.NaN
}

function createInlineProductDraft(product: Product): InlineProductDraft {
  return {
    price: formatEditableNumber(product.price),
    cost: formatEditableNumber(product.cost),
    stock: product.stock.toString(),
  }
}

function createProductUpdateInput(
  product: Product,
  overrides: Partial<Pick<ProductMutationInput, InlineProductField>>,
): ProductMutationInput {
  return {
    barcode: product.barcode ?? undefined,
    categoryId: product.categoryId,
    cost: product.cost,
    description: product.description ?? undefined,
    isActive: product.isActive,
    isVisibleInCatalog: product.isVisibleInCatalog,
    minStock: product.minStock,
    name: product.name,
    price: product.price,
    sku: product.sku ?? undefined,
    stock: product.stock,
    taxLabel: product.taxLabel ?? undefined,
    taxRate: product.taxRate,
    unit: product.unit,
    ...overrides,
  }
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

function isProductLowStock(product: Product) {
  return product.stock <= Math.max(product.minStock, 5)
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(999, value))
}

function downloadBlobFile(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}

function DrawerShell({ title, onClose, children, footer }: DrawerShellProps) {
  return (
    <div className={styles.drawerBackdrop} role="presentation" onClick={onClose}>
      <aside
        aria-label={title}
        aria-modal="true"
        className={styles.drawer}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.drawerHeader}>
          <h3 className={styles.drawerTitle}>{title}</h3>
          <button
            aria-label="Cerrar"
            className={styles.drawerClose}
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className={styles.drawerBody}>{children}</div>
        {footer ? <div className={styles.drawerFooter}>{footer}</div> : null}
      </aside>
    </div>
  )
}

function IconButton({ label, tooltip, onClick, children }: IconButtonProps) {
  return (
    <div className={styles.iconButtonWrap}>
      <button
        aria-label={label}
        className={styles.iconButton}
        type="button"
        onClick={onClick}
      >
        {children}
      </button>
      <span className={styles.tooltipBubble}>{tooltip}</span>
    </div>
  )
}

function BoxIcon() {
  return (
    <svg aria-hidden="true" className={styles.iconSvg} viewBox="0 0 24 24">
      <path d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5Zm2 3.15v5.35L11 18.2v-5.37l-5-2.18Zm7 7.55 5-2.2v-5.35l-5 2.18v5.37Z" />
    </svg>
  )
}

function TagsIcon() {
  return (
    <svg aria-hidden="true" className={styles.iconSvg} viewBox="0 0 24 24">
      <path d="M4 12.3V6.8c0-.99.81-1.8 1.8-1.8h5.5l8.7 8.7a1.8 1.8 0 0 1 0 2.55l-3.75 3.75a1.8 1.8 0 0 1-2.55 0L4 12.3Zm4.3-4.8a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z" />
    </svg>
  )
}

function TaxIcon() {
  return (
    <svg aria-hidden="true" className={styles.iconSvg} viewBox="0 0 24 24">
      <path d="M6 4h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm8 1.5V10h4.5" />
      <path d="M8 15h8M8 18h5M8 11h2" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className={styles.iconSvg} viewBox="0 0 24 24">
      <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className={styles.chevronIcon} viewBox="0 0 24 24">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function RetailInventoryWorkspace() {
  const { languageCode } = useAppTranslation()
  const copy = getInventoryCopy(languageCode)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const productsQuery = useProductsQuery()
  const categoriesQuery = useInventoryCategoriesQuery()
  const lowStockQuery = useInventoryLowStockQuery()
  const createCategoryMutation = useCreateInventoryCategoryMutation()
  const deleteCategoryMutation = useDeleteInventoryCategoryMutation()
  const updateCategoryMutation = useUpdateInventoryCategoryMutation()
  const updateProductTaxesMutation = useUpdateInventoryProductTaxesMutation()
  const updateProductMutation = useUpdateProductMutation()
  const registerPurchaseMutation = useRegisterInventoryPurchaseMutation()
  const businessSettingsQuery = useBusinessSettingsQuery()
  const updateBusinessSettingsMutation = useUpdateBusinessSettingsMutation()
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )
  const businessSettings = businessSettingsQuery.data
  const lowStockAlerts = useMemo(
    () => lowStockQuery.data ?? [],
    [lowStockQuery.data],
  )
  const [isPremiumBannerVisible, setPremiumBannerVisible] = useState(true)
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(
    null,
  )
  const [productDrafts, setProductDrafts] = useState<InlineProductDrafts>({})
  const [savingProductField, setSavingProductField] = useState<string | null>(
    null,
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [categorySearchTerm, setCategorySearchTerm] = useState('')
  const [assignedProductSearchTerm, setAssignedProductSearchTerm] = useState('')
  const [taxProductSearchTerm, setTaxProductSearchTerm] = useState('')
  const [isCatalogMenuOpen, setCatalogMenuOpen] = useState(false)
  const [isCreateMenuOpen, setCreateMenuOpen] = useState(false)
  const [isCategoriesDrawerOpen, setCategoriesDrawerOpen] = useState(false)
  const [isCategoryEditorOpen, setCategoryEditorOpen] = useState(false)
  const [isSharePhoneModalOpen, setSharePhoneModalOpen] = useState(false)
  const [isTaxesDrawerOpen, setTaxesDrawerOpen] = useState(false)
  const [isTaxPickerOpen, setTaxPickerOpen] = useState(false)
  const [isTaxOptionsOpen, setTaxOptionsOpen] = useState(false)
  const [isPurchaseDrawerOpen, setPurchaseDrawerOpen] = useState(false)
  const [shareCatalogPhone, setShareCatalogPhone] = useState('')
  const [activeInventoryFilter, setActiveInventoryFilter] =
    useState<InventoryFilter>('ALL')
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [taxPickerCategoryId, setTaxPickerCategoryId] = useState<string | null>(
    null,
  )
  const [categoryEditorState, setCategoryEditorState] = useState<CategoryEditorState>(
    createDefaultCategoryEditorState(),
  )
  const [purchaseFormState, setPurchaseFormState] = useState<PurchaseFormState>(
    createDefaultPurchaseFormState(),
  )
  const [taxFormState, setTaxFormState] = useState<TaxFormState>(
    createDefaultTaxFormState(),
  )
  const productId = searchParams.get('productId')
  const rawTab = searchParams.get('tab')
  const productWorkspaceReturnPath =
    searchParams.get('returnTo') === routeSegments.sales ? routePaths.sales : null
  const productWorkspaceTab: RetailProductCreateWorkspaceTab =
    rawTab === 'variants' || rawTab === 'measures' ? rawTab : 'basic'
  const isManualCreateDrawerOpen = searchParams.get('create') === 'manual'
  const isProductWorkspaceOpen = isManualCreateDrawerOpen || Boolean(productId)
  const activeTaxOption = inventoryTaxOptions.find(
    (option) => option.id === taxFormState.selectedOptionId,
  )

  useEffect(() => {
    setShareCatalogPhone(businessSettings?.phone ?? '')
  }, [businessSettings?.phone])

  useEffect(() => {
    setProductDrafts(
      Object.fromEntries(
        products.map((product) => [product.id, createInlineProductDraft(product)]),
      ),
    )
  }, [products])

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const totalInventoryCost = useMemo(
    () =>
      products.reduce(
        (totalCost, product) => totalCost + product.cost * product.stock,
        0,
      ),
    [products],
  )

  const visibleProducts = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase()

    return products
      .filter((product) => matchesProductSearch(product, normalizedSearchTerm))
      .filter((product) =>
        activeCategoryId ? product.categoryId === activeCategoryId : true,
      )
      .filter((product) =>
        activeInventoryFilter === 'LOW' ? isProductLowStock(product) : true,
      )
      .sort((firstProduct, secondProduct) =>
        firstProduct.name.localeCompare(secondProduct.name),
      )
  }, [activeCategoryId, activeInventoryFilter, products, searchTerm])

  const filteredCategories = useMemo(() => {
    const normalizedSearchTerm = categorySearchTerm.trim().toLowerCase()

    return categories.filter((category) =>
      category.name.toLowerCase().includes(normalizedSearchTerm),
    )
  }, [categories, categorySearchTerm])

  const categoryEditorProducts = useMemo(() => {
    const normalizedSearchTerm = assignedProductSearchTerm.trim().toLowerCase()

    return products
      .filter((product) => matchesProductSearch(product, normalizedSearchTerm))
      .sort((firstProduct, secondProduct) =>
        firstProduct.name.localeCompare(secondProduct.name),
      )
  }, [assignedProductSearchTerm, products])

  const taxPickerProducts = useMemo(() => {
    const normalizedSearchTerm = taxProductSearchTerm.trim().toLowerCase()

    return products
      .filter((product) => matchesProductSearch(product, normalizedSearchTerm))
      .filter((product) =>
        taxPickerCategoryId ? product.categoryId === taxPickerCategoryId : true,
      )
      .sort((firstProduct, secondProduct) =>
        firstProduct.name.localeCompare(secondProduct.name),
      )
  }, [products, taxPickerCategoryId, taxProductSearchTerm])

  function resetFeedback() {
    setFeedbackMessage(null)
  }

  function handleOpenManualCreateDrawer() {
    setCreateMenuOpen(false)
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.set('create', 'manual')
      nextParams.delete('productId')
      nextParams.delete('tab')
      nextParams.delete('returnTo')
      return nextParams
    })
  }

  function handleOpenEditProduct(nextProductId: string) {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.delete('create')
      nextParams.delete('returnTo')
      nextParams.set('productId', nextProductId)
      nextParams.set('tab', 'basic')
      return nextParams
    })
  }

  function handleProductWorkspaceTabChange(
    nextTab: RetailProductCreateWorkspaceTab,
  ) {
    if (!productId) {
      return
    }

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.set('productId', productId)
      nextParams.set('tab', nextTab)
      return nextParams
    })
  }

  function handleCloseProductWorkspace() {
    if (productWorkspaceReturnPath) {
      navigate(productWorkspaceReturnPath, { replace: true })
      return
    }

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.delete('create')
      nextParams.delete('productId')
      nextParams.delete('tab')
      nextParams.delete('returnTo')
      return nextParams
    })
  }

  function handleCloseCategoryEditor() {
    setCategoryEditorOpen(false)
    setCategoryEditorState(createDefaultCategoryEditorState())
    setAssignedProductSearchTerm('')
  }

  function handleOpenCreateCategory() {
    resetFeedback()
    setCategoryEditorState(createDefaultCategoryEditorState())
    setCategoryEditorOpen(true)
  }

  function handleOpenEditCategory(category: InventoryProductCategory) {
    resetFeedback()
    setCategoryEditorState({
      id: category.id,
      name: category.name,
      isVisibleInCatalog: category.isVisibleInCatalog,
      productIds: products
        .filter((product) => product.categoryId === category.id)
        .map((product) => product.id),
    })
    setCategoryEditorOpen(true)
  }

  function handleToggleCategoryProduct(productId: string) {
    setCategoryEditorState((currentState) => ({
      ...currentState,
      productIds: currentState.productIds.includes(productId)
        ? currentState.productIds.filter((currentProductId) => currentProductId !== productId)
        : [...currentState.productIds, productId],
    }))
  }

  function handleProductDraftChange(
    productId: string,
    field: InlineProductField,
    value: string,
  ) {
    setProductDrafts((currentDrafts) => ({
      ...currentDrafts,
      [productId]: {
        ...(currentDrafts[productId] ?? {
          price: '',
          cost: '',
          stock: '',
        }),
        [field]: value,
      },
    }))
  }

  function resetProductDraftField(product: Product, field: InlineProductField) {
    const nextDraft = createInlineProductDraft(product)

    setProductDrafts((currentDrafts) => ({
      ...currentDrafts,
      [product.id]: {
        ...(currentDrafts[product.id] ?? nextDraft),
        [field]: nextDraft[field],
      },
    }))
  }

  async function handleCommitProductDraft(
    product: Product,
    field: InlineProductField,
  ) {
    const currentDraft = productDrafts[product.id] ?? createInlineProductDraft(product)
    const parsedValue =
      field === 'stock'
        ? parseEditableStock(currentDraft[field])
        : parseEditableDecimal(currentDraft[field])

    if (!Number.isFinite(parsedValue)) {
      resetProductDraftField(product, field)
      setFeedbackMessage({
        tone: 'error',
        text: 'Ingresa un valor válido para actualizar el producto.',
      })
      return
    }

    const normalizedValue =
      field === 'stock'
        ? Math.max(0, Math.floor(parsedValue))
        : Math.round((parsedValue + Number.EPSILON) * 100) / 100
    const currentValue = product[field]

    setProductDrafts((currentDrafts) => ({
      ...currentDrafts,
      [product.id]: {
        ...currentDraft,
        [field]: formatEditableNumber(normalizedValue),
      },
    }))

    if (Math.abs(currentValue - normalizedValue) < 0.005) {
      return
    }

    const mutationKey = `${product.id}:${field}`
    setSavingProductField(mutationKey)
    resetFeedback()

    try {
      await updateProductMutation.mutateAsync({
        productId: product.id,
        input: createProductUpdateInput(product, {
          [field]: normalizedValue,
        }),
      })
      setFeedbackMessage({
        tone: 'success',
        text: 'Producto actualizado.',
      })
    } catch (error) {
      resetProductDraftField(product, field)
      setFeedbackMessage({
        tone: 'error',
        text: getErrorMessage(error, 'No fue posible actualizar el producto.'),
      })
    } finally {
      setSavingProductField((currentKey) =>
        currentKey === mutationKey ? null : currentKey,
      )
    }
  }

  function handleInlineProductKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    product: Product,
    field: InlineProductField,
  ) {
    event.stopPropagation()

    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      resetProductDraftField(product, field)
      event.currentTarget.blur()
    }
  }

  async function handleSaveCategory() {
    resetFeedback()

    const input: InventoryProductCategoryInput = {
      name: categoryEditorState.name.trim(),
      isVisibleInCatalog: categoryEditorState.isVisibleInCatalog,
      productIds: categoryEditorState.productIds,
    }

    try {
      if (categoryEditorState.id) {
        await updateCategoryMutation.mutateAsync({
          categoryId: categoryEditorState.id,
          input,
        })
      } else {
        await createCategoryMutation.mutateAsync(input)
      }

      setFeedbackMessage({
        tone: 'success',
        text:
          categoryEditorState.id === null
            ? copy.createCategorySubmit
            : copy.updateCategorySubmit,
      })
      handleCloseCategoryEditor()
    } catch (error) {
      setFeedbackMessage({
        tone: 'error',
        text: getErrorMessage(error, 'No fue posible guardar la categoría.'),
      })
    }
  }

  async function handleDeleteCategory() {
    if (!categoryEditorState.id) {
      return
    }

    resetFeedback()

    try {
      await deleteCategoryMutation.mutateAsync(categoryEditorState.id)
      if (activeCategoryId === categoryEditorState.id) {
        setActiveCategoryId(null)
      }
      setFeedbackMessage({
        tone: 'success',
        text: copy.deleteCategorySuccess,
      })
      handleCloseCategoryEditor()
    } catch (error) {
      setFeedbackMessage({
        tone: 'error',
        text: getErrorMessage(error, 'No fue posible eliminar la categoría.'),
      })
    }
  }

  async function handleDownloadInventory() {
    resetFeedback()

    try {
      const { blob, filename } = await exportInventoryReport({
        search: searchTerm,
        categoryId: activeCategoryId ?? undefined,
        lowStockOnly: activeInventoryFilter === 'LOW',
      })

      downloadBlobFile(blob, filename ?? 'inventory-report.csv')
      setFeedbackMessage({
        tone: 'success',
        text: copy.exportSuccess,
      })
    } catch (error) {
      setFeedbackMessage({
        tone: 'error',
        text: getErrorMessage(error, 'No fue posible descargar el inventario.'),
      })
    }
  }

  async function handleShareCatalog() {
    resetFeedback()

    if (!businessSettings?.phone) {
      setShareCatalogPhoneModalOpen()
      setCatalogMenuOpen(false)
      return
    }

    await handleCopyCatalogLink()
  }

  function setShareCatalogPhoneModalOpen() {
    setShareCatalogPhone(normalizePhone(businessSettings?.phone ?? ''))
    setSharePhoneModalOpen(true)
  }

  async function handleCopyCatalogLink() {
    try {
      const catalogUrl = `${window.location.origin}${window.location.pathname}`
      await navigator.clipboard.writeText(catalogUrl)
      setFeedbackMessage({
        tone: 'info',
        text: copy.shareSuccess,
      })
      setCatalogMenuOpen(false)
    } catch (error) {
      setFeedbackMessage({
        tone: 'error',
        text: getErrorMessage(error, 'No fue posible copiar el catálogo.'),
      })
    }
  }

  async function handleUpdatePhoneAndShareCatalog() {
    resetFeedback()

    const normalizedPhone = normalizePhone(shareCatalogPhone)

    if (normalizedPhone.length < 7) {
      setFeedbackMessage({
        tone: 'error',
        text: 'Escribe un número de teléfono válido.',
      })
      return
    }

    try {
      await updateBusinessSettingsMutation.mutateAsync({
        phone: normalizedPhone,
      })
      setSharePhoneModalOpen(false)
      await handleCopyCatalogLink()
    } catch (error) {
      setFeedbackMessage({
        tone: 'error',
        text: getErrorMessage(
          error,
          'No fue posible actualizar el número del negocio.',
        ),
      })
    }
  }

  function handleConfigureCatalog() {
    setCatalogMenuOpen(false)
    navigate(routePaths.settings)
  }

  async function handleRegisterPurchase() {
    resetFeedback()

    const quantity = parsePositiveNumber(purchaseFormState.quantity)
    const unitCost = parsePositiveNumber(purchaseFormState.unitCost)

    if (!purchaseFormState.productId || quantity <= 0 || unitCost <= 0) {
      setFeedbackMessage({
        tone: 'error',
        text: 'Completa producto, cantidad y costo unitario.',
      })
      return
    }

    try {
      await registerPurchaseMutation.mutateAsync({
        productId: purchaseFormState.productId,
        quantity,
        unitCost,
        reason: normalizeOptionalText(purchaseFormState.reason),
      })

      setPurchaseDrawerOpen(false)
      setPurchaseFormState(createDefaultPurchaseFormState())
      setFeedbackMessage({
        tone: 'success',
        text: copy.purchaseSubmit,
      })
    } catch (error) {
      setFeedbackMessage({
        tone: 'error',
        text: getErrorMessage(error, 'No fue posible registrar la compra.'),
      })
    }
  }

  async function handleSaveTaxes() {
    resetFeedback()

    if (!activeTaxOption || taxFormState.productIds.length === 0) {
      setFeedbackMessage({
        tone: 'error',
        text: 'Selecciona productos y un impuesto base.',
      })
      return
    }

    try {
      await updateProductTaxesMutation.mutateAsync({
        productIds: taxFormState.productIds,
        taxLabel: activeTaxOption.label,
        taxRate: activeTaxOption.rate,
      })

      setTaxesDrawerOpen(false)
      setTaxOptionsOpen(false)
      setTaxPickerOpen(false)
      setTaxFormState(createDefaultTaxFormState())
      setFeedbackMessage({
        tone: 'success',
        text: copy.saveChanges,
      })
    } catch (error) {
      setFeedbackMessage({
        tone: 'error',
        text: getErrorMessage(error, 'No fue posible actualizar los impuestos.'),
      })
    }
  }

  const selectedTaxProductsLabel = `${taxFormState.productIds.length.toString()} ${
    taxFormState.productIds.length === 1
      ? copy.selectedProducts
      : copy.selectedProductsPlural
  }`

  const categoryEditorFooter = isCategoryEditorOpen ? (
    <>
      <button
        className={retailStyles.buttonDark}
        disabled={
          categoryEditorState.name.trim().length < 2 ||
          createCategoryMutation.isPending ||
          updateCategoryMutation.isPending
        }
        type="button"
        onClick={() => {
          void handleSaveCategory()
        }}
      >
        {categoryEditorState.id
          ? copy.updateCategorySubmit
          : copy.createCategorySubmit}
      </button>
      {categoryEditorState.id ? (
        <button
          className={styles.deleteCategoryButton}
          disabled={deleteCategoryMutation.isPending}
          type="button"
          onClick={() => {
            void handleDeleteCategory()
          }}
        >
          {copy.deleteCategory}
        </button>
      ) : null}
    </>
  ) : undefined

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    nextProductId: string,
  ) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpenEditProduct(nextProductId)
    }
  }

  if (isProductWorkspaceOpen) {
    return (
      <RetailProductCreateWorkspace
        initialTab={productWorkspaceTab}
        productId={productId}
        onBack={handleCloseProductWorkspace}
        onTabChange={handleProductWorkspaceTabChange}
      />
    )
  }

  return (
    <RetailPageLayout
      title={copy.title}
      meta={
        <>
          <span>
            {copy.totalReferences} {products.length.toString()}
          </span>
          <span>
            {copy.totalInventoryCost} {formatCurrency(totalInventoryCost)}
          </span>
        </>
      }
      actions={
        <>
          <button
            className={retailStyles.buttonOutline}
            type="button"
            onClick={() => {
              resetFeedback()
              setCategoriesDrawerOpen(true)
            }}
          >
            <TagsIcon />
            <span>{copy.categories}</span>
          </button>

          <div className={styles.dropdownGroup}>
            <button
              className={retailStyles.buttonDark}
              type="button"
              onClick={() => setCreateMenuOpen((currentValue) => !currentValue)}
            >
              <BoxIcon />
              <span>{copy.createProducts}</span>
            </button>

            {isCreateMenuOpen ? (
              <div className={styles.dropdownMenu}>
                <button
                  className={styles.dropdownButton}
                  type="button"
                  onClick={handleOpenManualCreateDrawer}
                >
                  {copy.createProductsManual}
                </button>
                <button
                  className={`${styles.dropdownButton} ${styles.dropdownButtonMuted}`}
                  disabled
                  type="button"
                >
                  {copy.uploadProductsExcel}
                </button>
              </div>
            ) : null}
          </div>
        </>
      }
    >

      {feedbackMessage ? (
        <div
          className={
            feedbackMessage.tone === 'error'
              ? styles.feedbackError
              : feedbackMessage.tone === 'info'
                ? styles.feedbackInfo
                : styles.feedbackSuccess
          }
        >
          <span>{feedbackMessage.text}</span>
          <button
            aria-label="Cerrar mensaje"
            className={styles.feedbackClose}
            type="button"
            onClick={() => setFeedbackMessage(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      {isPremiumBannerVisible && lowStockAlerts.length > 0 ? (
        <section className={styles.banner}>
          <div className={styles.bannerCopy}>
            <p className={styles.bannerTitle}>{copy.premiumTitle}</p>
            <p className={styles.bannerDescription}>{copy.premiumDescription}</p>
            <span className={styles.bannerLink}>{copy.premiumLink}</span>
          </div>

          <button
            aria-label="Cerrar banner"
            className={styles.bannerClose}
            type="button"
            onClick={() => setPremiumBannerVisible(false)}
          >
            ×
          </button>
        </section>
      ) : null}

      <section className={styles.filtersSection}>
        <div className={styles.filtersRow}>
          <label className={styles.searchField}>
            <input
              className={styles.searchInput}
              placeholder={copy.searchPlaceholder}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <div className={styles.catalogMenuGroup}>
            <button
              className={styles.catalogButton}
              type="button"
              onClick={() => setCatalogMenuOpen((currentValue) => !currentValue)}
            >
              <BoxIcon />
              <span>{copy.virtualCatalog}</span>
            </button>

            {isCatalogMenuOpen ? (
              <div className={styles.catalogMenu}>
                <button
                  className={styles.dropdownButton}
                  type="button"
                  onClick={() => {
                    void handleShareCatalog()
                  }}
                >
                  {copy.shareCatalog}
                </button>
                <button
                  className={styles.dropdownButton}
                  type="button"
                  onClick={handleConfigureCatalog}
                >
                  {copy.configureCatalog}
                </button>
              </div>
            ) : null}
          </div>

          <div className={styles.tableActions}>
            <IconButton
              label={copy.registerPurchase}
              tooltip={copy.registerPurchase}
              onClick={() => setPurchaseDrawerOpen(true)}
            >
              <BoxIcon />
            </IconButton>
            <IconButton
              label={copy.productTaxes}
              tooltip={copy.productTaxes}
              onClick={() => setTaxesDrawerOpen(true)}
            >
              <TaxIcon />
            </IconButton>
            <IconButton
              label={copy.downloadInventory}
              tooltip={copy.downloadInventory}
              onClick={() => {
                void handleDownloadInventory()
              }}
            >
              <DownloadIcon />
            </IconButton>
          </div>
        </div>

        <div className={styles.chipsRow}>
          {inventoryFilterOptions.map((filterValue) => (
            <button
              key={filterValue}
              className={
                activeInventoryFilter === filterValue && activeCategoryId === null
                  ? styles.chipActive
                  : styles.chip
              }
              type="button"
              onClick={() => {
                setActiveInventoryFilter(filterValue)
                setActiveCategoryId(null)
              }}
            >
              {filterValue === 'ALL' ? copy.allChip : copy.lowStockChip}
            </button>
          ))}

          {categories.map((category) => (
            <button
              key={category.id}
              className={
                activeCategoryId === category.id ? styles.chipActive : styles.chip
              }
              type="button"
              onClick={() => {
                setActiveCategoryId(category.id)
                setActiveInventoryFilter('ALL')
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      <section className={retailStyles.tableCard}>
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{copy.productColumn}</th>
                <th>{copy.priceColumn}</th>
                <th>{copy.costColumn}</th>
                <th>{copy.stockColumn}</th>
                <th>{copy.gainColumn}</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => {
                const productDraft =
                  productDrafts[product.id] ?? createInlineProductDraft(product)
                const gain = product.price - product.cost
                const margin =
                  product.price > 0
                    ? clampPercentage((gain / product.price) * 100)
                    : 0
                const isLowStock = isProductLowStock(product)

                return (
                  <tr
                    key={product.id}
                    className={styles.tableRowClickable}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenEditProduct(product.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, product.id)}
                  >
                    <td>
                      <div className={styles.productCell}>
                        {product.imageUrls[0] ? (
                          <img
                            alt=""
                            className={styles.productAvatarImage}
                            src={product.imageUrls[0]}
                          />
                        ) : (
                          <span className={styles.productAvatar}>t</span>
                        )}
                        <div className={styles.productCopy}>
                          <p className={styles.productName}>{product.name}</p>
                          <p className={styles.productMeta}>
                            {categoryNameById.get(product.categoryId ?? '') ??
                              copy.uncategorized}
                            {product.taxLabel ? ` · ${product.taxLabel}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <label
                        className={styles.inlineEditBox}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <span className={styles.inlineCurrencyPrefix}>$</span>
                        <input
                          aria-label={`Precio de ${product.name}`}
                          className={styles.inlineEditInput}
                          disabled={savingProductField === `${product.id}:price`}
                          inputMode="decimal"
                          type="text"
                          value={productDraft.price}
                          onBlur={() => {
                            void handleCommitProductDraft(product, 'price')
                          }}
                          onChange={(event) =>
                            handleProductDraftChange(
                              product.id,
                              'price',
                              event.target.value,
                            )
                          }
                          onFocus={(event) => event.stopPropagation()}
                          onKeyDown={(event) =>
                            handleInlineProductKeyDown(event, product, 'price')
                          }
                        />
                      </label>
                    </td>
                    <td>
                      <label
                        className={styles.inlineEditBox}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <span className={styles.inlineCurrencyPrefix}>$</span>
                        <input
                          aria-label={`Costo de ${product.name}`}
                          className={styles.inlineEditInput}
                          disabled={savingProductField === `${product.id}:cost`}
                          inputMode="decimal"
                          type="text"
                          value={productDraft.cost}
                          onBlur={() => {
                            void handleCommitProductDraft(product, 'cost')
                          }}
                          onChange={(event) =>
                            handleProductDraftChange(
                              product.id,
                              'cost',
                              event.target.value,
                            )
                          }
                          onFocus={(event) => event.stopPropagation()}
                          onKeyDown={(event) =>
                            handleInlineProductKeyDown(event, product, 'cost')
                          }
                        />
                      </label>
                    </td>
                    <td>
                      <label
                        className={
                          isLowStock
                            ? `${styles.inlineEditBox} ${styles.valueBoxWarning}`
                            : styles.inlineEditBox
                        }
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          aria-label={`Cantidad disponible de ${product.name}`}
                          className={styles.inlineEditInput}
                          disabled={savingProductField === `${product.id}:stock`}
                          inputMode="numeric"
                          min="0"
                          step="1"
                          type="text"
                          value={productDraft.stock}
                          onBlur={() => {
                            void handleCommitProductDraft(product, 'stock')
                          }}
                          onChange={(event) =>
                            handleProductDraftChange(
                              product.id,
                              'stock',
                              event.target.value,
                            )
                          }
                          onFocus={(event) => event.stopPropagation()}
                          onKeyDown={(event) =>
                            handleInlineProductKeyDown(event, product, 'stock')
                          }
                        />
                      </label>
                    </td>
                    <td>
                      <div className={styles.gainCell}>
                        <span>{formatCurrency(gain)}</span>
                        <span className={styles.marginPill}>
                          {`${Math.round(margin).toString()}%`}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {visibleProducts.length === 0 ? (
          <div className={styles.emptyState}>
            {products.length === 0 ? (
              <>
                <RetailEmptyState
                  description={copy.emptyDescription}
                  title={copy.emptyTitle}
                />
                <div className={styles.emptyActions}>
                  <button
                    className={retailStyles.buttonOutline}
                    type="button"
                    onClick={handleOpenManualCreateDrawer}
                  >
                    {copy.createManual}
                  </button>
                </div>
              </>
            ) : (
              <RetailEmptyState description={copy.noResults} title={copy.title} />
            )}
          </div>
        ) : null}
      </section>

      {isCategoriesDrawerOpen ? (
        <DrawerShell
          footer={categoryEditorFooter}
          title={copy.categories}
          onClose={() => {
            setCategoriesDrawerOpen(false)
            handleCloseCategoryEditor()
          }}
        >
          {isCategoryEditorOpen ? (
            <div className={styles.drawerStack}>
              <button
                className={styles.backButton}
                type="button"
                onClick={handleCloseCategoryEditor}
              >
                ← {copy.categories}
              </button>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>{copy.categoryName}</span>
                <input
                  className={styles.textInput}
                  placeholder={copy.categoryNamePlaceholder}
                  type="text"
                  value={categoryEditorState.name}
                  onChange={(event) =>
                    setCategoryEditorState((currentState) => ({
                      ...currentState,
                      name: event.target.value,
                    }))
                  }
                />
              </label>

              <button
                className={styles.toggleCard}
                type="button"
                onClick={() =>
                  setCategoryEditorState((currentState) => ({
                    ...currentState,
                    isVisibleInCatalog: !currentState.isVisibleInCatalog,
                  }))
                }
              >
                <div>
                  <p className={styles.toggleTitle}>{copy.showInStore}</p>
                  <p className={styles.toggleHint}>{copy.showInStoreHint}</p>
                </div>
                <span
                  className={
                    categoryEditorState.isVisibleInCatalog
                      ? styles.toggleActive
                      : styles.toggleInactive
                  }
                >
                  <span className={styles.toggleThumb} />
                </span>
              </button>

              <label className={styles.searchFieldDrawer}>
                <input
                  className={styles.searchInput}
                  placeholder={copy.searchProduct}
                  type="search"
                  value={assignedProductSearchTerm}
                  onChange={(event) => setAssignedProductSearchTerm(event.target.value)}
                />
              </label>

              <div className={styles.selectionList}>
                {categoryEditorProducts.map((product) => (
                  <label className={styles.selectionRow} key={product.id}>
                    <input
                      checked={categoryEditorState.productIds.includes(product.id)}
                      type="checkbox"
                      onChange={() => handleToggleCategoryProduct(product.id)}
                    />
                    <span className={styles.selectionName}>{product.name}</span>
                    <span className={styles.selectionPrice}>
                      {formatCurrency(product.price)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.drawerStack}>
              <button
                className={retailStyles.buttonOutline}
                type="button"
                onClick={handleOpenCreateCategory}
              >
                {copy.createCategory}
              </button>

              <label className={styles.searchFieldDrawer}>
                <input
                  className={styles.searchInput}
                  placeholder={copy.searchCategory}
                  type="search"
                  value={categorySearchTerm}
                  onChange={(event) => setCategorySearchTerm(event.target.value)}
                />
              </label>

              <div className={styles.categoryList}>
                {filteredCategories.map((category) => (
                  <button
                    className={styles.categoryCard}
                    key={category.id}
                    type="button"
                    onClick={() => handleOpenEditCategory(category)}
                  >
                    <div className={styles.categoryCardCopy}>
                      <span className={styles.categoryCardTitle}>{category.name}</span>
                      <span className={styles.categoryCardMeta}>
                        {category.isVisibleInCatalog
                          ? copy.visibilityYes
                          : copy.visibilityNo}
                      </span>
                    </div>
                    <ChevronRightIcon />
                  </button>
                ))}
              </div>
            </div>
          )}
        </DrawerShell>
      ) : null}

      {isSharePhoneModalOpen ? (
        <div
          className={styles.centeredModalBackdrop}
          role="presentation"
          onClick={() => setSharePhoneModalOpen(false)}
        >
          <div
            aria-label={copy.shareCatalogPhoneTitle}
            aria-modal="true"
            className={styles.centeredModal}
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <h3 className={styles.drawerTitle}>{copy.shareCatalogPhoneTitle}</h3>
              <button
                aria-label="Cerrar"
                className={styles.drawerClose}
                type="button"
                onClick={() => setSharePhoneModalOpen(false)}
              >
                ×
              </button>
            </div>

            <p className={styles.drawerDescription}>
              {copy.shareCatalogPhoneDescription}
            </p>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>{copy.shareCatalogPhoneLabel}</span>
              <div className={styles.phoneInputWrap}>
                <span className={styles.phonePrefix}>CO</span>
                <input
                  className={styles.textInput}
                  inputMode="tel"
                  placeholder={copy.shareCatalogPhonePlaceholder}
                  type="tel"
                  value={shareCatalogPhone}
                  onChange={(event) => setShareCatalogPhone(event.target.value)}
                />
              </div>
            </label>

            <div className={styles.phoneModalActions}>
              <button
                className={retailStyles.buttonDark}
                disabled={
                  normalizePhone(shareCatalogPhone).length < 7 ||
                  updateBusinessSettingsMutation.isPending
                }
                type="button"
                onClick={() => {
                  void handleUpdatePhoneAndShareCatalog()
                }}
              >
                {copy.shareCatalogPhoneSubmit}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isTaxesDrawerOpen ? (
        <DrawerShell
          footer={
            <>
              <button
                className={retailStyles.buttonMuted}
                disabled={!activeTaxOption || taxFormState.productIds.length === 0}
                type="button"
                onClick={() => {
                  void handleSaveTaxes()
                }}
              >
                {copy.saveChanges}
              </button>
              <button
                className={styles.footerCancelButton}
                type="button"
                onClick={() => setTaxesDrawerOpen(false)}
              >
                {copy.cancel}
              </button>
            </>
          }
        title={copy.productTaxes}
        onClose={() => {
          setTaxesDrawerOpen(false)
          setTaxPickerOpen(false)
          setTaxOptionsOpen(false)
          setTaxPickerCategoryId(null)
        }}
        >
          <div className={styles.drawerStack}>
            <div className={styles.drawerSectionHeader}>
              <span className={styles.fieldLabel}>{copy.selectProductsToModify}</span>
              {taxFormState.productIds.length > 0 ? (
                <button
                  className={styles.linkButton}
                  type="button"
                  onClick={() =>
                    setTaxFormState((currentState) => ({
                      ...currentState,
                      productIds: [],
                    }))
                  }
                >
                  {copy.clear}
                </button>
              ) : null}
            </div>

            <button
              className={styles.selectionTrigger}
              type="button"
              onClick={() => {
                setTaxPickerCategoryId(activeCategoryId)
                setTaxPickerOpen(true)
              }}
            >
              <span>{selectedTaxProductsLabel}</span>
              <ChevronRightIcon />
            </button>

            <div className={styles.separator} />

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>{copy.taxBase}</span>
              <button
                className={styles.selectionTrigger}
                type="button"
                onClick={() => setTaxOptionsOpen((currentValue) => !currentValue)}
              >
                <span>{activeTaxOption?.label ?? copy.selectOption}</span>
                <ChevronRightIcon />
              </button>
            </label>

            {isTaxOptionsOpen ? (
              <div className={styles.taxOptionsList}>
                {inventoryTaxOptions.map((option) => (
                  <button
                    className={styles.taxOptionButton}
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setTaxFormState((currentState) => ({
                        ...currentState,
                        selectedOptionId: option.id,
                      }))
                      setTaxOptionsOpen(false)
                    }}
                  >
                    <span
                      className={
                        taxFormState.selectedOptionId === option.id
                          ? styles.taxCheckboxActive
                          : styles.taxCheckbox
                      }
                    />
                    <div className={styles.taxOptionCopy}>
                      <span>{option.label}</span>
                      <small>{`${option.rate.toString()}%`}</small>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {isTaxPickerOpen ? (
            <div className={styles.selectorBackdrop} role="presentation">
              <div className={styles.selectorPanel}>
                <div className={styles.selectorHeader}>
                  <button
                    className={styles.backButton}
                    type="button"
                    onClick={() => setTaxPickerOpen(false)}
                  >
                    ← {copy.selectProductsToModify}
                  </button>
                </div>

                <div className={styles.selectorFilters}>
                  <label className={styles.searchFieldDrawer}>
                    <input
                      className={styles.searchInput}
                      placeholder={copy.searchProduct}
                      type="search"
                      value={taxProductSearchTerm}
                      onChange={(event) => setTaxProductSearchTerm(event.target.value)}
                    />
                  </label>

                  <div className={styles.chipsRow}>
                    <button
                      className={
                        taxPickerCategoryId === null
                          ? styles.chipActive
                          : styles.chip
                      }
                      type="button"
                      onClick={() => setTaxPickerCategoryId(null)}
                    >
                      {copy.allChip}
                    </button>
                    {categories.map((category) => (
                      <button
                        className={
                          taxPickerCategoryId === category.id
                            ? styles.chipActive
                            : styles.chip
                        }
                        key={category.id}
                        type="button"
                        onClick={() => setTaxPickerCategoryId(category.id)}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.selectorTable}>
                  <table className={styles.selectionTable}>
                    <thead>
                      <tr>
                        <th />
                        <th>{copy.productColumn}</th>
                        <th>{copy.priceColumn}</th>
                        <th>{copy.costColumn}</th>
                        <th>{copy.taxBase}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxPickerProducts.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <input
                              checked={taxFormState.productIds.includes(product.id)}
                              type="checkbox"
                              onChange={() =>
                                setTaxFormState((currentState) => ({
                                  ...currentState,
                                  productIds: currentState.productIds.includes(
                                    product.id,
                                  )
                                    ? currentState.productIds.filter(
                                        (currentProductId) =>
                                          currentProductId !== product.id,
                                      )
                                    : [...currentState.productIds, product.id],
                                }))
                              }
                            />
                          </td>
                          <td>{product.name}</td>
                          <td>{formatCurrency(product.price)}</td>
                          <td>{formatCurrency(product.cost)}</td>
                          <td>{product.taxLabel ?? copy.selectOption}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.selectorFooter}>
                  <button
                    className={retailStyles.buttonDark}
                    type="button"
                    onClick={() => setTaxPickerOpen(false)}
                  >
                    {copy.continue}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </DrawerShell>
      ) : null}

      {isPurchaseDrawerOpen ? (
        <DrawerShell
          footer={
            <button
              className={retailStyles.buttonDark}
              disabled={
                !purchaseFormState.productId ||
                parsePositiveNumber(purchaseFormState.quantity) <= 0 ||
                parsePositiveNumber(purchaseFormState.unitCost) <= 0 ||
                registerPurchaseMutation.isPending
              }
              type="button"
              onClick={() => {
                void handleRegisterPurchase()
              }}
            >
              {copy.purchaseSubmit}
            </button>
          }
          title={copy.purchaseTitle}
          onClose={() => setPurchaseDrawerOpen(false)}
        >
          <div className={styles.drawerStack}>
            <p className={styles.drawerDescription}>{copy.purchaseDescription}</p>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>{copy.purchaseProduct}</span>
              <select
                className={styles.selectInput}
                value={purchaseFormState.productId}
                onChange={(event) =>
                  setPurchaseFormState((currentState) => ({
                    ...currentState,
                    productId: event.target.value,
                  }))
                }
              >
                <option value="">{copy.selectOption}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>{copy.purchaseQuantity}</span>
              <input
                className={styles.textInput}
                inputMode="decimal"
                type="number"
                value={purchaseFormState.quantity}
                onChange={(event) =>
                  setPurchaseFormState((currentState) => ({
                    ...currentState,
                    quantity: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>{copy.purchaseUnitCost}</span>
              <input
                className={styles.textInput}
                inputMode="decimal"
                type="number"
                value={purchaseFormState.unitCost}
                onChange={(event) =>
                  setPurchaseFormState((currentState) => ({
                    ...currentState,
                    unitCost: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>{copy.purchaseReason}</span>
              <textarea
                className={styles.textareaInput}
                placeholder={copy.purchaseReasonPlaceholder}
                rows={4}
                value={purchaseFormState.reason}
                onChange={(event) =>
                  setPurchaseFormState((currentState) => ({
                    ...currentState,
                    reason: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        </DrawerShell>
      ) : null}

    </RetailPageLayout>
  )
}
