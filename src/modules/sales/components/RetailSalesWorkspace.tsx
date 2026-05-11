import { useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { downloadBillingReceipt } from '@/modules/billing/services/billing-api'
import { CashRegisterSessionDrawer } from '@/modules/cash-register/components/CashRegisterSessionDrawer'
import {
  useCashRegisterAssigneesQuery,
  useCloseCashRegisterMutation,
  useCreateCashRegisterManualEntryMutation,
  useCurrentCashRegisterQuery,
  useOpenCashRegisterMutation,
} from '@/modules/cash-register/hooks/use-cash-register-query'
import { useCustomersQuery } from '@/modules/customers/hooks/use-customers-query'
import {
  useCreateExpenseMutation,
  useExpenseCategoriesQuery,
} from '@/modules/expenses/hooks/use-expenses-query'
import type {
  ExpensePaymentMethod,
  ExpenseStatus,
} from '@/modules/expenses/types/expense'
import { useInventoryCategoriesQuery } from '@/modules/inventory/hooks/use-inventory-query'
import { useProductsQuery } from '@/modules/products/hooks/use-products-query'
import type { Product } from '@/modules/products/types/product'
import { matchesProductSearch } from '@/modules/products/utils/matches-product-search'
import { useSuppliersQuery } from '@/modules/suppliers/hooks/use-suppliers-query'
import {
  useCreateSaleMutation,
  useSalesQuery,
} from '@/modules/sales/hooks/use-create-sale-mutation'
import { useSaleCart } from '@/modules/sales/hooks/use-sale-cart'
import type { SalePaymentMethod, SaleReceipt } from '@/modules/sales/types/sale'
import { useBusinessSettingsQuery } from '@/modules/settings/hooks/use-settings-query'
import { routePaths } from '@/routes/route-paths'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import { RetailEmptyState } from '@/shared/components/retail/RetailEmptyState'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styles from './RetailSalesWorkspace.module.css'

type RetailStep = 'CATALOG' | 'PAYMENT'
type RetailSettlement = 'PAID' | 'CREDIT'
type RetailPaymentOption =
  | 'CASH'
  | 'CARD'
  | 'TRANSFER'
  | 'OTHER'
  | 'NEQUI'
  | 'DAVIPLATA'
type ProductSortOption =
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'STOCK_ASC'
  | 'STOCK_DESC'
  | 'SALES_ASC'
  | 'SALES_DESC'
  | 'CREATED_ASC'
  | 'CREATED_DESC'
  | 'PRICE_ASC'
  | 'PRICE_DESC'

type QuickSaleFormState = {
  settlement: RetailSettlement
  saleDate: string
  amountInput: string
  customerId: string
  paymentOption: RetailPaymentOption
  note: string
}

type QuickExpenseFormState = {
  status: ExpenseStatus
  expenseDate: string
  categoryId: string
  amountInput: string
  concept: string
  supplierId: string
  paymentOption: RetailPaymentOption
  note: string
}

type SaleTaxBreakdown = {
  key: string
  label: string
  rate: number
  baseAmount: number
  taxAmount: number
}

type SaleCartFinancials = {
  grossSubtotal: number
  subtotalBeforeTax: number
  discountTotal: number
  totalTaxes: number
  total: number
  breakdown: SaleTaxBreakdown[]
}

type DrawerShellProps = {
  title: string
  subtitle?: string
  icon?: ReactNode
  onClose: () => void
  children: ReactNode
}

const paymentOptions: Array<{
  value: RetailPaymentOption
  label: string
  icon: string
}> = [
  { value: 'CASH', label: 'Efectivo', icon: '$' },
  { value: 'CARD', label: 'Tarjeta', icon: '[]' },
  { value: 'TRANSFER', label: 'Transferencia bancaria', icon: '<>' },
  { value: 'OTHER', label: 'Otro', icon: '••' },
  { value: 'NEQUI', label: 'Nequi', icon: 'N' },
  { value: 'DAVIPLATA', label: 'Daviplata', icon: 'D' },
]

const paymentSplitOptions = ['1', '2', '3', '4', '5', '6', 'Otro'] as const
const defaultSortOption: ProductSortOption = 'NAME_ASC'

const productSortSections: Array<{
  title: string
  options: Array<{
    value: ProductSortOption
    label: string
  }>
}> = [
  {
    title: 'Por stock',
    options: [
      { value: 'STOCK_ASC', label: 'Menos stock' },
      { value: 'STOCK_DESC', label: 'Más stock' },
    ],
  },
  {
    title: 'Por ventas (últimos 30 días)',
    options: [
      { value: 'SALES_ASC', label: 'Menos vendidos' },
      { value: 'SALES_DESC', label: 'Más vendidos' },
    ],
  },
  {
    title: 'Por nombre',
    options: [
      { value: 'NAME_ASC', label: 'Nombre A-Z' },
      { value: 'NAME_DESC', label: 'Nombre Z-A' },
    ],
  },
  {
    title: 'Por fecha de creación',
    options: [
      { value: 'CREATED_ASC', label: 'Más antiguo' },
      { value: 'CREATED_DESC', label: 'Más reciente' },
    ],
  },
  {
    title: 'Por precio',
    options: [
      { value: 'PRICE_ASC', label: 'Más bajo' },
      { value: 'PRICE_DESC', label: 'Más alto' },
    ],
  },
]

function getTodayDateInput() {
  return new Date().toISOString().slice(0, 10)
}

function createDefaultQuickSaleState(): QuickSaleFormState {
  return {
    settlement: 'PAID',
    saleDate: getTodayDateInput(),
    amountInput: '',
    customerId: '',
    paymentOption: 'CASH',
    note: '',
  }
}

function createDefaultQuickExpenseState(): QuickExpenseFormState {
  return {
    status: 'PAID',
    expenseDate: getTodayDateInput(),
    categoryId: '',
    amountInput: '',
    concept: '',
    supplierId: '',
    paymentOption: 'CASH',
    note: '',
  }
}

function getProductSoldUnitsLast30Days(
  saleHistory: SaleReceipt[],
  productId: string,
) {
  const cutoffDate = Date.now() - 1000 * 60 * 60 * 24 * 30

  return saleHistory.reduce((totalSoldUnits, sale) => {
    if (
      sale.status === 'CANCELLED' ||
      new Date(sale.createdAt).getTime() < cutoffDate
    ) {
      return totalSoldUnits
    }

    return (
      totalSoldUnits +
      sale.items
        .filter((item) => item.productId === productId)
        .reduce((subtotal, item) => subtotal + item.quantity, 0)
    )
  }, 0)
}

function sortProductsForRetail(
  firstProduct: Product,
  secondProduct: Product,
  option: ProductSortOption,
  saleHistory: SaleReceipt[],
) {
  switch (option) {
    case 'NAME_DESC':
      return secondProduct.name.localeCompare(firstProduct.name)
    case 'STOCK_ASC':
      return firstProduct.stock - secondProduct.stock
    case 'STOCK_DESC':
      return secondProduct.stock - firstProduct.stock
    case 'SALES_ASC':
      return (
        getProductSoldUnitsLast30Days(saleHistory, firstProduct.id) -
        getProductSoldUnitsLast30Days(saleHistory, secondProduct.id)
      )
    case 'SALES_DESC':
      return (
        getProductSoldUnitsLast30Days(saleHistory, secondProduct.id) -
        getProductSoldUnitsLast30Days(saleHistory, firstProduct.id)
      )
    case 'CREATED_ASC':
      return (
        new Date(firstProduct.createdAt).getTime() -
        new Date(secondProduct.createdAt).getTime()
      )
    case 'CREATED_DESC':
      return (
        new Date(secondProduct.createdAt).getTime() -
        new Date(firstProduct.createdAt).getTime()
      )
    case 'PRICE_ASC':
      return firstProduct.price - secondProduct.price
    case 'PRICE_DESC':
      return secondProduct.price - firstProduct.price
    default:
      return firstProduct.name.localeCompare(secondProduct.name)
  }
}

function parseAmountInput(value: string) {
  const normalizedValue = value.replace(',', '.')
  const parsedValue = Number(normalizedValue)

  return Number.isFinite(parsedValue) ? Math.max(parsedValue, 0) : 0
}

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.min(Math.max(value, minValue), maxValue)
}

function formatEditableNumber(value: number) {
  if (Number.isInteger(value)) {
    return value.toString()
  }

  return value.toFixed(2).replace(/\.?0+$/, '')
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function mapRetailPaymentOptionToSaleMethod(
  option: RetailPaymentOption,
): SalePaymentMethod {
  if (option === 'NEQUI' || option === 'DAVIPLATA') {
    return 'DIGITAL_WALLET'
  }

  return option
}

function mapRetailPaymentOptionToExpenseMethod(
  option: RetailPaymentOption,
): ExpensePaymentMethod {
  if (option === 'NEQUI' || option === 'DAVIPLATA') {
    return 'DIGITAL_WALLET'
  }

  return option
}

function getStockToneClass(product: Product) {
  const threshold = Math.max(product.minStock, 5)

  if (product.stock === 0) {
    return styles.stockPillOut
  }

  if (product.stock <= threshold) {
    return styles.stockPillLow
  }

  return ''
}

function calculateCartFinancials(
  cartItems: Array<{
    product: Product
    quantity: number
  }>,
  discountTotal: number,
): SaleCartFinancials {
  const groupedTaxes = new Map<string, SaleTaxBreakdown>()
  let grossSubtotal = 0
  let subtotalBeforeTax = 0
  let totalTaxes = 0

  for (const item of cartItems) {
    const grossLineTotal = item.product.price * item.quantity
    const taxRate = Math.max(item.product.taxRate ?? 0, 0)
    const divisor = 1 + taxRate / 100
    const baseAmount =
      taxRate > 0 ? Number((grossLineTotal / divisor).toFixed(2)) : grossLineTotal
    const taxAmount = Number((grossLineTotal - baseAmount).toFixed(2))
    const breakdownKey = `${item.product.taxLabel ?? 'Sin impuesto'}-${taxRate}`

    grossSubtotal += grossLineTotal
    subtotalBeforeTax += baseAmount
    totalTaxes += taxAmount

    const currentBreakdown = groupedTaxes.get(breakdownKey)

    if (currentBreakdown) {
      groupedTaxes.set(breakdownKey, {
        ...currentBreakdown,
        baseAmount: Number((currentBreakdown.baseAmount + baseAmount).toFixed(2)),
        taxAmount: Number((currentBreakdown.taxAmount + taxAmount).toFixed(2)),
      })
      continue
    }

    groupedTaxes.set(breakdownKey, {
      key: breakdownKey,
      label: item.product.taxLabel ?? 'Sin impuesto',
      rate: taxRate,
      baseAmount,
      taxAmount,
    })
  }

  return {
    grossSubtotal: Number(grossSubtotal.toFixed(2)),
    subtotalBeforeTax: Number(subtotalBeforeTax.toFixed(2)),
    discountTotal: Number(discountTotal.toFixed(2)),
    totalTaxes: Number(totalTaxes.toFixed(2)),
    total: Number(Math.max(grossSubtotal - discountTotal, 0).toFixed(2)),
    breakdown: [...groupedTaxes.values()],
  }
}

function DrawerShell({
  title,
  subtitle,
  icon,
  onClose,
  children,
}: DrawerShellProps) {
  return (
    <div className={styles.drawerBackdrop} role="presentation" onClick={onClose}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderLead}>
            {icon ? <span className={styles.drawerIconBadge}>{icon}</span> : null}
            <div className={styles.drawerCopy}>
              <h3 className={styles.drawerTitle}>{title}</h3>
              {subtitle ? <p className={styles.drawerSubtitle}>{subtitle}</p> : null}
            </div>
          </div>
          <button
            className={styles.drawerClose}
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className={styles.drawerBody}>{children}</div>
      </aside>
    </div>
  )
}

function SaleDrawerIcon() {
  return (
    <svg aria-hidden="true" className={styles.drawerIconSvg} viewBox="0 0 24 24">
      <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5H19v14H7.5A2.5 2.5 0 0 0 5 21V7.5Zm3 1.5h8M8 12h8M8 15h5" />
      <path d="M2 9h3v9H2z" />
    </svg>
  )
}

function ExpenseDrawerIcon() {
  return (
    <svg aria-hidden="true" className={styles.drawerIconSvg} viewBox="0 0 24 24">
      <path d="M6 5h12l-1.2 14.2A2 2 0 0 1 14.8 21H9.2a2 2 0 0 1-1.99-1.8L6 5Z" />
      <path d="M9 5V3.8A1.8 1.8 0 0 1 10.8 2h2.4A1.8 1.8 0 0 1 15 3.8V5M9 10h6M9 14h4" />
    </svg>
  )
}

type ChangeCalculatorModalProps = {
  saleTotal: number
  amountTenderedInput: string
  onAmountTenderedChange: (value: string) => void
  onClose: () => void
}

function ChangeCalculatorModal({
  saleTotal,
  amountTenderedInput,
  onAmountTenderedChange,
  onClose,
}: ChangeCalculatorModalProps) {
  const amountTendered = parseAmountInput(amountTenderedInput)
  const changeTotal = Math.max(amountTendered - saleTotal, 0)

  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <div
        aria-label="Calcula el cambio de tu venta"
        aria-modal="true"
        className={styles.modalCard}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Cerrar"
          className={styles.modalClose}
          type="button"
          onClick={onClose}
        >
          ×
        </button>
        <h3 className={styles.modalTitle}>Calcula el cambio de tu venta</h3>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Valor de la venta</span>
          <input
            className={styles.input}
            readOnly
            type="text"
            value={formatCurrency(saleTotal)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>¿Con cuánto paga tu cliente?</span>
          <input
            className={styles.input}
            inputMode="decimal"
            placeholder="$ 0"
            type="text"
            value={amountTenderedInput}
            onChange={(event) => onAmountTenderedChange(event.target.value)}
          />
        </label>

        <div className={styles.modalSummary}>
          <span>Valor a devolver</span>
          <strong>{formatCurrency(changeTotal)}</strong>
        </div>

        <button className={styles.modalConfirmButton} type="button" onClick={onClose}>
          Confirmar
        </button>
      </div>
    </div>
  )
}

type PaymentMethodSelectorProps = {
  value: RetailPaymentOption
  onChange: (value: RetailPaymentOption) => void
}

function PaymentMethodSelector({
  value,
  onChange,
}: PaymentMethodSelectorProps) {
  return (
    <div className={styles.paymentMethodsGrid}>
      {paymentOptions.map((option) => {
        const isActive = value === option.value

        return (
          <button
            key={option.value}
            className={isActive ? styles.paymentMethodCardActive : styles.paymentMethodCard}
            type="button"
            onClick={() => onChange(option.value)}
          >
            <span className={styles.paymentMethodIcon}>{option.icon}</span>
            <span className={styles.paymentMethodLabel}>{option.label}</span>
            {isActive ? <span className={styles.paymentMethodCheck}>✓</span> : null}
          </button>
        )
      })}
    </div>
  )
}

type ProductSortDrawerProps = {
  value: ProductSortOption
  onClose: () => void
  onApply: (value: ProductSortOption) => void
}

function ProductSortDrawer({
  value,
  onClose,
  onApply,
}: ProductSortDrawerProps) {
  const [draftValue, setDraftValue] = useState<ProductSortOption>(value)

  return (
    <DrawerShell title="Ordenar inventario" onClose={onClose}>
      <div className={styles.sortDrawerContent}>
        <p className={styles.sortDrawerHint}>
          Solo puedes aplicar un orden a la vez
        </p>

        {productSortSections.map((section) => (
          <div className={styles.sortSection} key={section.title}>
            <p className={styles.sortSectionTitle}>{section.title}</p>
            <div className={styles.sortOptionsGrid}>
              {section.options.map((option) => (
                <button
                  key={option.value}
                  className={
                    draftValue === option.value
                      ? styles.sortOptionButtonActive
                      : styles.sortOptionButton
                  }
                  type="button"
                  onClick={() => setDraftValue(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className={styles.sortDrawerFooter}>
          <button
            className={styles.secondaryActionButton}
            type="button"
            onClick={() => setDraftValue(defaultSortOption)}
          >
            Limpiar
          </button>
          <button
            className={styles.primaryActionButton}
            type="button"
            onClick={() => onApply(draftValue)}
          >
            Aplicar
          </button>
        </div>
      </div>
    </DrawerShell>
  )
}

type SaleSuccessDrawerProps = {
  sale: SaleReceipt
  onClose: () => void
}

function SaleSuccessDrawer({ sale, onClose }: SaleSuccessDrawerProps) {
  const receiptMutation = useMutation({
    mutationFn: async (mode: 'download' | 'print') => {
      const { blob, filename } = await downloadBillingReceipt(sale.id)
      const receiptUrl = URL.createObjectURL(blob)

      if (mode === 'download') {
        const linkElement = document.createElement('a')
        linkElement.href = receiptUrl
        linkElement.download = filename ?? `${sale.saleNumber}-receipt.html`
        linkElement.click()
        window.setTimeout(() => URL.revokeObjectURL(receiptUrl), 0)
        return
      }

      const printWindow = window.open(receiptUrl, '_blank', 'noopener,noreferrer')

      if (!printWindow) {
        URL.revokeObjectURL(receiptUrl)
        throw new Error('No pudimos abrir la ventana de impresión.')
      }

      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
        window.setTimeout(() => URL.revokeObjectURL(receiptUrl), 1000)
      }
    },
  })
  const receiptErrorMessage = receiptMutation.error
    ? getErrorMessage(receiptMutation.error, 'No pudimos generar el comprobante.')
    : null

  return (
    <DrawerShell title="¡Creaste una venta!" onClose={onClose}>
      <div className={styles.successIcon}>✓</div>
      <div className={styles.successBlock}>
        <p className={styles.successDescription}>
          Se registró en tu balance por un valor de{' '}
          <strong>{formatCurrency(sale.total)}</strong>
        </p>
        <div className={styles.successSummary}>
          <p className={styles.successSummaryLabel}>Venta registrada</p>
          <p className={styles.successSummaryValue}>{sale.saleNumber}</p>
        </div>
        <div className={styles.successReceiptCard}>
          <h4 className={styles.successReceiptTitle}>Comprobante</h4>
          <p className={styles.successReceiptDescription}>
            Puedes descargar o imprimir el comprobante de esta venta.
          </p>
          {receiptErrorMessage ? (
            <p className={styles.successReceiptError}>{receiptErrorMessage}</p>
          ) : null}
          <button
            className={styles.successReceiptAction}
            disabled={receiptMutation.isPending}
            type="button"
            onClick={() => {
              void receiptMutation.mutateAsync('print')
            }}
          >
            <span>Imprimir comprobante</span>
          </button>
          <button
            className={styles.successReceiptAction}
            disabled={receiptMutation.isPending}
            type="button"
            onClick={() => {
              void receiptMutation.mutateAsync('download')
            }}
          >
            <span>Descargar comprobante</span>
          </button>
        </div>
      </div>
      <button className={styles.primaryActionButton} type="button" onClick={onClose}>
        Seguir vendiendo
      </button>
    </DrawerShell>
  )
}

export function RetailSalesWorkspace() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchValue, setSearchValue] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [saleStep, setSaleStep] = useState<RetailStep>('CATALOG')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [settlement, setSettlement] = useState<RetailSettlement>('PAID')
  const [discountOpen, setDiscountOpen] = useState(false)
  const [discountPercentInput, setDiscountPercentInput] = useState('0')
  const [discountAmountInput, setDiscountAmountInput] = useState('0')
  const [saleDate, setSaleDate] = useState(getTodayDateInput)
  const [paymentSplitCount, setPaymentSplitCount] =
    useState<(typeof paymentSplitOptions)[number]>('1')
  const [paymentOption, setPaymentOption] =
    useState<RetailPaymentOption>('CASH')
  const [receiptNote, setReceiptNote] = useState('')
  const [isQuickSaleDrawerOpen, setQuickSaleDrawerOpen] = useState(false)
  const [isQuickExpenseDrawerOpen, setQuickExpenseDrawerOpen] = useState(false)
  const [isCashRegisterDrawerOpen, setCashRegisterDrawerOpen] = useState(false)
  const [isSortDrawerOpen, setSortDrawerOpen] = useState(false)
  const [isChangeModalOpen, setChangeModalOpen] = useState(false)
  const [sortOption, setSortOption] = useState<ProductSortOption>(defaultSortOption)
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(true)
  const [amountTenderedInput, setAmountTenderedInput] = useState('')
  const [quickSaleForm, setQuickSaleForm] = useState<QuickSaleFormState>(
    createDefaultQuickSaleState,
  )
  const [quickExpenseForm, setQuickExpenseForm] = useState<QuickExpenseFormState>(
    createDefaultQuickExpenseState,
  )
  const deferredSearchValue = useMemo(
    () => searchValue.trim().toLowerCase(),
    [searchValue],
  )

  const productsQuery = useProductsQuery()
  const customersQuery = useCustomersQuery()
  const cashRegisterAssigneesQuery = useCashRegisterAssigneesQuery()
  const currentCashRegisterQuery = useCurrentCashRegisterQuery()
  const openCashRegisterMutation = useOpenCashRegisterMutation()
  const closeCashRegisterMutation = useCloseCashRegisterMutation()
  const createCashRegisterManualEntryMutation =
    useCreateCashRegisterManualEntryMutation()
  const createSaleMutation = useCreateSaleMutation()
  const salesQuery = useSalesQuery()
  const expenseCategoriesQuery = useExpenseCategoriesQuery()
  const createExpenseMutation = useCreateExpenseMutation()
  const inventoryCategoriesQuery = useInventoryCategoriesQuery()
  const businessSettingsQuery = useBusinessSettingsQuery()

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const customers = useMemo(
    () => customersQuery.data ?? [],
    [customersQuery.data],
  )
  const salesHistory = useMemo(() => salesQuery.data ?? [], [salesQuery.data])
  const currentCashRegister = currentCashRegisterQuery.data ?? null
  const expenseCategories = useMemo(
    () => expenseCategoriesQuery.data ?? [],
    [expenseCategoriesQuery.data],
  )
  const suppliersQuery = useSuppliersQuery()
  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data])
  const inventoryCategories = useMemo(
    () => inventoryCategoriesQuery.data ?? [],
    [inventoryCategoriesQuery.data],
  )
  const allowSaleWithoutStock =
    businessSettingsQuery.data?.allowSaleWithoutStock ?? false
  const isCashRegisterSubmitting =
    openCashRegisterMutation.isPending ||
    closeCashRegisterMutation.isPending ||
    createCashRegisterManualEntryMutation.isPending

  const {
    cartItems,
    cartQuantitiesByProductId,
    checkoutErrorMessage,
    completedSale,
    totalItems,
    addProduct,
    clearCart,
    clearCheckoutFeedback,
    completeSale,
    decreaseProductQuantity,
    increaseProductQuantity,
    markCheckoutError,
    removeProduct,
  } = useSaleCart(products, {
    allowSaleWithoutStock,
  })

  const visibleCategories = useMemo(() => {
    const usedCategoryIds = new Set(
      products.map((product) => product.categoryId).filter(Boolean),
    )

    return inventoryCategories.filter((category) => usedCategoryIds.has(category.id))
  }, [inventoryCategories, products])

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => product.isActive)
      .filter((product) =>
        deferredSearchValue.length === 0
          ? true
          : matchesProductSearch(product, deferredSearchValue),
      )
      .filter((product) =>
        activeCategoryId ? product.categoryId === activeCategoryId : true,
      )
      .sort((firstProduct, secondProduct) =>
        sortProductsForRetail(firstProduct, secondProduct, sortOption, salesHistory),
      )
  }, [
    activeCategoryId,
    deferredSearchValue,
    products,
    salesHistory,
    sortOption,
  ])

  const discountTotal = discountOpen ? parseAmountInput(discountAmountInput) : 0
  const cartFinancials = useMemo(
    () => calculateCartFinancials(cartItems, discountTotal),
    [cartItems, discountTotal],
  )
  const totalAmount = cartFinancials.total
  const paymentMethod = mapRetailPaymentOptionToSaleMethod(paymentOption)
  const quickSaleAmount = parseAmountInput(quickSaleForm.amountInput)
  const quickExpenseAmount = parseAmountInput(quickExpenseForm.amountInput)

  useEffect(() => {
    if (saleStep === 'PAYMENT' && cartItems.length === 0) {
      setSaleStep('CATALOG')
    }
  }, [cartItems.length, saleStep])

  useEffect(() => {
    const saleMode = searchParams.get('sale')

    if (saleMode !== 'products' && saleMode !== 'free') {
      return
    }

    if (saleMode === 'products') {
      setSaleStep('CATALOG')
      setQuickSaleDrawerOpen(false)
    } else {
      clearCheckoutFeedback()
      setChangeModalOpen(false)
      setQuickSaleDrawerOpen(true)
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('sale')
    setSearchParams(nextSearchParams, { replace: true })
  }, [clearCheckoutFeedback, searchParams, setSearchParams])

  useEffect(() => {
    if (
      activeCategoryId &&
      !visibleCategories.some((category) => category.id === activeCategoryId)
    ) {
      setActiveCategoryId(null)
    }
  }, [activeCategoryId, visibleCategories])

  useEffect(() => {
    if (expenseCategories.length > 0 && quickExpenseForm.categoryId.length === 0) {
      setQuickExpenseForm((currentState) => ({
        ...currentState,
        categoryId: expenseCategories[0].id,
      }))
    }
  }, [expenseCategories, quickExpenseForm.categoryId.length])

  useEffect(() => {
    if (!discountOpen) {
      setDiscountAmountInput('0')
      setDiscountPercentInput('0')
      return
    }

    const currentDiscount = parseAmountInput(discountAmountInput)

    if (currentDiscount > cartFinancials.grossSubtotal) {
      const nextDiscount = clamp(currentDiscount, 0, cartFinancials.grossSubtotal)
      const nextPercent =
        cartFinancials.grossSubtotal > 0
          ? (nextDiscount / cartFinancials.grossSubtotal) * 100
          : 0

      setDiscountAmountInput(formatEditableNumber(nextDiscount))
      setDiscountPercentInput(formatEditableNumber(nextPercent))
    }
  }, [cartFinancials.grossSubtotal, discountAmountInput, discountOpen])

  function resetPaymentStep() {
    setSelectedCustomerId('')
    setSettlement('PAID')
    setDiscountOpen(false)
    setDiscountPercentInput('0')
    setDiscountAmountInput('0')
    setSaleDate(getTodayDateInput())
    setPaymentSplitCount('1')
    setPaymentOption('CASH')
    setReceiptNote('')
    setPaymentDetailsOpen(true)
    setChangeModalOpen(false)
    setAmountTenderedInput('')
  }

  function handleDiscountPercentChange(value: string) {
    const nextPercent = clamp(parseAmountInput(value), 0, 100)
    const nextDiscount = cartFinancials.grossSubtotal * (nextPercent / 100)

    setDiscountPercentInput(formatEditableNumber(nextPercent))
    setDiscountAmountInput(formatEditableNumber(nextDiscount))
  }

  function handleDiscountAmountChange(value: string) {
    const nextDiscount = clamp(
      parseAmountInput(value),
      0,
      cartFinancials.grossSubtotal,
    )
    const nextPercent =
      cartFinancials.grossSubtotal > 0
        ? (nextDiscount / cartFinancials.grossSubtotal) * 100
        : 0

    setDiscountAmountInput(formatEditableNumber(nextDiscount))
    setDiscountPercentInput(formatEditableNumber(nextPercent))
  }

  function handleOpenQuickSaleDrawer() {
    clearCheckoutFeedback()
    setChangeModalOpen(false)
    setQuickSaleDrawerOpen(true)
  }

  function handleOpenQuickExpenseDrawer() {
    clearCheckoutFeedback()
    setChangeModalOpen(false)
    setQuickExpenseDrawerOpen(true)
  }

  function handleGoToCreateProduct() {
    navigate(`${routePaths.inventory}?create=manual&returnTo=sales`)
  }

  async function handleCreateCatalogSale() {
    if (cartItems.length === 0) {
      return
    }

    clearCheckoutFeedback()

    if (settlement === 'CREDIT' && selectedCustomerId.trim().length === 0) {
      markCheckoutError(
        'Selecciona un cliente antes de registrar una venta a crédito.',
      )
      return
    }

    if (!allowSaleWithoutStock) {
      const stockMismatchItem = cartItems.find(
        (item) => item.quantity > item.product.stock,
      )

      if (stockMismatchItem) {
        markCheckoutError(
          `${stockMismatchItem.product.name} ya no tiene stock suficiente para esta venta.`,
        )
        return
      }
    }

    try {
      const sale = await createSaleMutation.mutateAsync({
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        customerId: normalizeOptionalText(selectedCustomerId),
        cashRegisterId: currentCashRegister?.id,
        discountTotal,
        notes: normalizeOptionalText(receiptNote),
        dueDate: settlement === 'CREDIT' ? saleDate : undefined,
        payments:
          settlement === 'PAID'
            ? [
                {
                  method: paymentMethod,
                  amount: totalAmount,
                },
              ]
            : [],
      })

      completeSale(sale)
      resetPaymentStep()
      setSaleStep('CATALOG')
    } catch (error) {
      markCheckoutError(
        getErrorMessage(
          error,
          'No pudimos crear la venta en este momento. Intenta otra vez.',
        ),
      )
    }
  }

  async function handleCreateQuickSale() {
    clearCheckoutFeedback()

    if (quickSaleAmount <= 0) {
      markCheckoutError('Ingresa un valor válido para la venta libre.')
      return
    }

    if (
      quickSaleForm.settlement === 'CREDIT' &&
      quickSaleForm.customerId.trim().length === 0
    ) {
      markCheckoutError(
        'Selecciona un cliente antes de registrar una venta libre a crédito.',
      )
      return
    }

    try {
      const sale = await createSaleMutation.mutateAsync({
        items: [],
        manualSubtotal: quickSaleAmount,
        customerId: normalizeOptionalText(quickSaleForm.customerId),
        cashRegisterId: currentCashRegister?.id,
        notes: normalizeOptionalText(quickSaleForm.note),
        dueDate:
          quickSaleForm.settlement === 'CREDIT'
            ? quickSaleForm.saleDate
            : undefined,
        payments:
          quickSaleForm.settlement === 'PAID'
            ? [
                {
                  method: mapRetailPaymentOptionToSaleMethod(
                    quickSaleForm.paymentOption,
                  ),
                  amount: quickSaleAmount,
                },
              ]
            : [],
      })

      completeSale(sale)
      setQuickSaleDrawerOpen(false)
      setQuickSaleForm(createDefaultQuickSaleState())
    } catch (error) {
      markCheckoutError(
        getErrorMessage(
          error,
          'No pudimos crear la venta libre en este momento.',
        ),
      )
    }
  }

  async function handleCreateQuickExpense() {
    clearCheckoutFeedback()

    if (quickExpenseAmount <= 0) {
      markCheckoutError('Ingresa un valor válido para el gasto.')
      return
    }

    if (quickExpenseForm.categoryId.trim().length === 0) {
      markCheckoutError('Selecciona una categoría antes de crear el gasto.')
      return
    }

    if (
      quickExpenseForm.status === 'PENDING' &&
      quickExpenseForm.supplierId.trim().length === 0
    ) {
      markCheckoutError('Selecciona un proveedor antes de registrar un gasto en deuda.')
      return
    }

    try {
      await createExpenseMutation.mutateAsync({
        concept:
          normalizeOptionalText(quickExpenseForm.concept) ??
          expenseCategories.find(
            (category) => category.id === quickExpenseForm.categoryId,
          )?.name ??
          'Gasto rápido',
        categoryId: normalizeOptionalText(quickExpenseForm.categoryId),
        supplierId: normalizeOptionalText(quickExpenseForm.supplierId),
        amount: quickExpenseAmount,
        paymentMethod:
          quickExpenseForm.status === 'PAID'
            ? mapRetailPaymentOptionToExpenseMethod(quickExpenseForm.paymentOption)
            : 'CREDIT',
        status: quickExpenseForm.status,
        expenseDate: quickExpenseForm.expenseDate,
        notes: normalizeOptionalText(quickExpenseForm.note),
      })

      setQuickExpenseDrawerOpen(false)
      setQuickExpenseForm(createDefaultQuickExpenseState())
    } catch (error) {
      markCheckoutError(
        getErrorMessage(
          error,
          'No pudimos registrar el gasto en este momento.',
        ),
      )
    }
  }

  return (
    <>
      <div className={styles.page}>
        <div className={styles.headerRow}>
          <h1 className={styles.pageTitle}>Nueva venta</h1>

          <div className={styles.actionsRow}>
            <button
              className={retailStyles.buttonDark}
              type="button"
              onClick={() => setCashRegisterDrawerOpen(true)}
            >
              Abrir caja
            </button>
            <button
              className={retailStyles.buttonSuccess}
              type="button"
              onClick={handleOpenQuickSaleDrawer}
            >
              Nueva venta libre
            </button>
            <button
              className={retailStyles.buttonDanger}
              type="button"
              onClick={handleOpenQuickExpenseDrawer}
            >
              Nuevo gasto
            </button>
          </div>
        </div>

        {checkoutErrorMessage ? (
          <div className={styles.feedbackBanner} role="alert">
            {checkoutErrorMessage}
          </div>
        ) : null}

        <div className={styles.workspace}>
          <section className={styles.catalogColumn}>
            <div className={styles.toolbar}>
              <button
                className={styles.iconButton}
                type="button"
                aria-label="Ordenar inventario"
                onClick={() => setSortDrawerOpen(true)}
              >
                ⇅
              </button>
              <label className={retailStyles.searchField} htmlFor="retail-sale-search">
                <input
                  className={retailStyles.input}
                  id="retail-sale-search"
                  placeholder="Buscar productos"
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </label>
            </div>

            <div className={styles.filtersRow}>
              <button
                className={
                  activeCategoryId === null
                    ? styles.filterChipActive
                    : styles.filterChip
                }
                type="button"
                onClick={() => setActiveCategoryId(null)}
              >
                Todos
              </button>
              {visibleCategories.map((category) => (
                <button
                  key={category.id}
                  className={
                    activeCategoryId === category.id
                      ? styles.filterChipActive
                      : styles.filterChip
                  }
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className={styles.productsGrid}>
              <button
                className={styles.createCard}
                type="button"
                onClick={handleGoToCreateProduct}
              >
                <span className={styles.createPlus}>+</span>
                <span className={styles.createTitle}>Crear producto</span>
              </button>

              {filteredProducts.map((product) => {
                const productQuantity = cartQuantitiesByProductId.get(product.id) ?? 0
                const canSellProduct =
                  product.isActive && (allowSaleWithoutStock || product.stock > 0)

                return (
                  <button
                    key={product.id}
                    className={styles.productCard}
                    type="button"
                    disabled={!canSellProduct}
                    onClick={() => addProduct(product)}
                  >
                    {productQuantity > 0 ? (
                      <span className={styles.productCounter}>
                        {productQuantity.toString()}
                      </span>
                    ) : null}

                    <div className={styles.productPreview}>
                      <span className={styles.productPreviewMark}>
                        {product.name.slice(0, 1).toUpperCase()}
                      </span>
                    </div>

                    <p className={styles.productPrice}>
                      {formatCurrency(product.price)}
                    </p>
                    <p className={styles.productName}>{product.name}</p>
                    <span className={`${styles.stockPill} ${getStockToneClass(product)}`}>
                      {product.stock.toString()} disponibles
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <aside className={styles.checkoutColumn}>
            {saleStep === 'CATALOG' ? (
              <section className={styles.checkoutPanel}>
                <div className={styles.panelHeader}>
                  <p className={styles.panelTitle}>Productos</p>
                  <button
                    className={styles.inlineAction}
                    disabled={cartItems.length === 0}
                    type="button"
                    onClick={clearCart}
                  >
                    Vaciar canasta
                  </button>
                </div>

                <div className={styles.panelBody}>
                  {cartItems.length === 0 ? (
                    <RetailEmptyState
                      title="Agrega productos rápidamente usando tu lector de código de barras"
                      description="Si no está en tu inventario, aquí verás tu canasta en cuanto empieces a agregar productos."
                    />
                  ) : (
                    <div className={styles.cartList}>
                      {cartItems.map((item) => (
                        <article className={styles.cartItem} key={item.product.id}>
                          <div className={styles.cartItemHead}>
                            <div className={styles.cartItemCopy}>
                              <div className={styles.cartAvatar}>
                                {item.product.name.slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <p className={styles.cartItemName}>{item.product.name}</p>
                              </div>
                            </div>
                            <button
                              className={styles.deleteButton}
                              type="button"
                              onClick={() => removeProduct(item.product.id)}
                            >
                              🗑
                            </button>
                          </div>

                          <div className={styles.cartItemControls}>
                            <div className={styles.quantityControls}>
                              <button
                                className={styles.quantityButton}
                                type="button"
                                onClick={() => decreaseProductQuantity(item.product.id)}
                              >
                                −
                              </button>
                              <span className={styles.quantityValue}>
                                {item.quantity.toString()}
                              </span>
                              <button
                                className={styles.quantityButton}
                                type="button"
                                onClick={() => increaseProductQuantity(item.product.id)}
                              >
                                +
                              </button>
                            </div>

                            <div className={styles.lineTotalBox}>
                              {formatCurrency(item.lineTotal)}
                            </div>
                          </div>

                          <p className={styles.cartMetaLine}>
                            Precio por {item.quantity.toString()} unidades:{' '}
                            <strong>{formatCurrency(item.lineTotal)}</strong>
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.panelFooter}>
                  <button
                    className={styles.continueButton}
                    disabled={cartItems.length === 0}
                    type="button"
                    onClick={() => setSaleStep('PAYMENT')}
                  >
                    <span className={styles.continueBadge}>{totalItems.toString()}</span>
                    <span className={styles.continueText}>Continuar</span>
                    <strong>{formatCurrency(totalAmount)}</strong>
                  </button>
                </div>
              </section>
            ) : (
              <section className={styles.checkoutPanel}>
                <div className={styles.panelBody}>
                  <div className={styles.paymentHeader}>
                    <button
                      className={styles.backButton}
                      type="button"
                      onClick={() => setSaleStep('CATALOG')}
                    >
                      ←
                    </button>
                    <h2 className={styles.paymentTitle}>Pago</h2>
                  </div>

                  <div className={styles.segmentedControl}>
                    <button
                      className={
                        settlement === 'PAID'
                          ? styles.segmentButtonActiveSuccess
                          : styles.segmentButton
                      }
                      type="button"
                      onClick={() => setSettlement('PAID')}
                    >
                      Pagada
                    </button>
                    <button
                      className={
                        settlement === 'CREDIT'
                          ? styles.segmentButtonActiveDanger
                          : styles.segmentButton
                      }
                      type="button"
                      onClick={() => setSettlement('CREDIT')}
                    >
                      A crédito
                    </button>
                  </div>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Fecha de la venta *</span>
                    <input
                      className={styles.input}
                      type="date"
                      value={saleDate}
                      onChange={(event) => setSaleDate(event.target.value)}
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                      Cliente{settlement === 'CREDIT' ? ' *' : ''}
                    </span>
                    <select
                      className={styles.select}
                      value={selectedCustomerId}
                      onChange={(event) => setSelectedCustomerId(event.target.value)}
                    >
                      <option value="">Selecciona un cliente</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className={styles.divider} />

                  {!discountOpen ? (
                    <button
                      className={styles.linkButton}
                      type="button"
                      onClick={() => setDiscountOpen(true)}
                    >
                      Agregar un descuento
                    </button>
                  ) : (
                    <div className={styles.discountCard}>
                      <div className={styles.discountHeader}>
                        <strong>Descuento</strong>
                        <button
                          className={styles.discountClose}
                          type="button"
                          onClick={() => setDiscountOpen(false)}
                        >
                          ×
                        </button>
                      </div>
                      <div className={styles.discountFields}>
                        <input
                          className={styles.input}
                          inputMode="decimal"
                          placeholder="0 %"
                          type="text"
                          value={discountPercentInput}
                          onChange={(event) =>
                            handleDiscountPercentChange(event.target.value)
                          }
                        />
                        <span className={styles.discountEqual}>=</span>
                        <input
                          className={styles.input}
                          inputMode="decimal"
                          placeholder="0"
                          type="text"
                          value={discountAmountInput}
                          onChange={(event) =>
                            handleDiscountAmountChange(event.target.value)
                          }
                        />
                      </div>
                    </div>
                  )}

                  {settlement === 'PAID' ? (
                    <>
                      <div className={styles.divider} />

                      <div className={styles.fieldGroup}>
                        <p className={styles.helperTitle}>
                          Selecciona el número de pagos que realizarás y el método de
                          pago*
                        </p>
                        <div className={styles.paymentSplitRow}>
                          {paymentSplitOptions.map((option) => (
                            <button
                              key={option}
                              className={
                                paymentSplitCount === option
                                  ? styles.splitButtonActive
                                  : styles.splitButton
                              }
                              type="button"
                              onClick={() => setPaymentSplitCount(option)}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={styles.fieldGroup}>
                        <p className={styles.helperTitle}>Selecciona el método de pago*</p>
                        <PaymentMethodSelector
                          value={paymentOption}
                          onChange={setPaymentOption}
                        />
                      </div>
                    </>
                  ) : null}

                  <div className={styles.divider} />

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Nota del comprobante</span>
                    <textarea
                      className={styles.textarea}
                      placeholder="Agregar nota..."
                      rows={4}
                      value={receiptNote}
                      onChange={(event) => setReceiptNote(event.target.value)}
                    />
                  </label>
                </div>

                <div className={styles.panelFooter}>
                  <div className={styles.paymentDetailCard}>
                    <button
                      className={styles.paymentDetailHeader}
                      type="button"
                      onClick={() => setPaymentDetailsOpen((current) => !current)}
                    >
                      <span>Detalle del pago</span>
                      <span>{paymentDetailsOpen ? '⌃' : '⌄'}</span>
                    </button>

                    {paymentDetailsOpen ? (
                      <div className={styles.paymentDetailBody}>
                        <div className={styles.paymentDetailRow}>
                          <span>Subtotal sin impuestos</span>
                          <strong>
                            {formatCurrency(cartFinancials.subtotalBeforeTax)}
                          </strong>
                        </div>

                        <div className={styles.paymentDetailTaxes}>
                          <p className={styles.paymentDetailSectionTitle}>Impuestos</p>
                          {cartFinancials.breakdown.length > 0 ? (
                            cartFinancials.breakdown.map((line) => (
                              <div className={styles.taxLine} key={line.key}>
                                <div>
                                  <p className={styles.taxLineLabel}>{line.label}</p>
                                  <p className={styles.taxLineMeta}>
                                    Base {formatCurrency(line.baseAmount)}
                                    <br />
                                    {totalItems.toString()} productos
                                  </p>
                                </div>
                                <div className={styles.taxLineAmount}>
                                  <strong>{formatCurrency(line.taxAmount)}</strong>
                                  <span className={styles.taxLineBadge}>
                                    {line.rate.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className={styles.taxLineMeta}>Sin impuestos aplicados</p>
                          )}
                        </div>

                        {discountOpen && discountTotal > 0 ? (
                          <div className={styles.paymentDetailRow}>
                            <span>Descuento</span>
                            <strong>- {formatCurrency(discountTotal)}</strong>
                          </div>
                        ) : null}

                        <div className={styles.paymentDetailDivider} />

                        <div className={styles.paymentDetailRow}>
                          <span>Total impuestos</span>
                          <strong>{formatCurrency(cartFinancials.totalTaxes)}</strong>
                        </div>
                        <div className={styles.paymentDetailRowStrong}>
                          <span>Subtotal con impuestos</span>
                          <strong>{formatCurrency(totalAmount)}</strong>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.paymentFooterActions}>
                    {settlement === 'PAID' && paymentOption === 'CASH' ? (
                      <button
                        aria-label="Calcular cambio"
                        className={styles.footerUtilityButton}
                        type="button"
                        onClick={() => setChangeModalOpen(true)}
                      >
                        $
                      </button>
                    ) : null}

                    <button
                      className={styles.continueButton}
                      disabled={
                        createSaleMutation.isPending ||
                        cartItems.length === 0 ||
                        totalAmount <= 0 ||
                        (settlement === 'CREDIT' &&
                          selectedCustomerId.trim().length === 0)
                      }
                      type="button"
                      onClick={() => {
                        void handleCreateCatalogSale()
                      }}
                    >
                      <span className={styles.continueBadge}>{totalItems.toString()}</span>
                      <span className={styles.continueText}>Crear venta</span>
                      <strong>{formatCurrency(totalAmount)}</strong>
                    </button>
                  </div>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      {isSortDrawerOpen ? (
        <ProductSortDrawer
          value={sortOption}
          onClose={() => setSortDrawerOpen(false)}
          onApply={(nextValue) => {
            setSortOption(nextValue)
            setSortDrawerOpen(false)
          }}
        />
      ) : null}

      <CashRegisterSessionDrawer
        assignees={cashRegisterAssigneesQuery.data ?? []}
        currentSession={currentCashRegister}
        isOpen={isCashRegisterDrawerOpen}
        isSubmitting={isCashRegisterSubmitting}
        onClose={() => setCashRegisterDrawerOpen(false)}
        onCloseSession={async (input) => {
          await closeCashRegisterMutation.mutateAsync(input)
        }}
        onManualEntry={async (input) => {
          await createCashRegisterManualEntryMutation.mutateAsync(input)
        }}
        onOpenSession={async (input) => {
          await openCashRegisterMutation.mutateAsync(input)
        }}
      />

      {isQuickSaleDrawerOpen ? (
        <DrawerShell
          title="Crear Venta"
          subtitle="Los campos marcados con asterisco (*) son obligatorios"
          icon={<SaleDrawerIcon />}
          onClose={() => setQuickSaleDrawerOpen(false)}
        >
          <div className={styles.drawerForm}>
            <div className={styles.segmentedControl}>
              <button
                className={
                  quickSaleForm.settlement === 'PAID'
                    ? styles.segmentButtonActiveSuccess
                    : styles.segmentButton
                }
                type="button"
                onClick={() =>
                  setQuickSaleForm((currentState) => ({
                    ...currentState,
                    settlement: 'PAID',
                  }))
                }
              >
                Pagada
              </button>
              <button
                className={
                  quickSaleForm.settlement === 'CREDIT'
                    ? styles.segmentButtonActiveDanger
                    : styles.segmentButton
                }
                type="button"
                onClick={() =>
                  setQuickSaleForm((currentState) => ({
                    ...currentState,
                    settlement: 'CREDIT',
                  }))
                }
              >
                A crédito
              </button>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Fecha de la venta *</span>
              <input
                className={styles.input}
                type="date"
                value={quickSaleForm.saleDate}
                onChange={(event) =>
                  setQuickSaleForm((currentState) => ({
                    ...currentState,
                    saleDate: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Valor *</span>
              <div className={styles.amountCard}>
                <input
                  className={styles.amountInput}
                  inputMode="decimal"
                  placeholder="0"
                  type="text"
                  value={quickSaleForm.amountInput}
                  onChange={(event) =>
                    setQuickSaleForm((currentState) => ({
                      ...currentState,
                      amountInput: event.target.value,
                    }))
                  }
                />
                <div className={styles.amountSummary}>
                  <span>Valor total</span>
                  <strong>= {formatCurrency(quickSaleAmount)}</strong>
                </div>
              </div>
            </label>

            {quickSaleForm.settlement === 'PAID' ? (
              <div className={styles.fieldGroup}>
                <p className={styles.helperTitle}>Selecciona el método de pago*</p>
                <PaymentMethodSelector
                  value={quickSaleForm.paymentOption}
                  onChange={(nextValue) =>
                    setQuickSaleForm((currentState) => ({
                      ...currentState,
                      paymentOption: nextValue,
                    }))
                  }
                />
              </div>
            ) : null}

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                Agrega un cliente a la venta
                {quickSaleForm.settlement === 'CREDIT' ? ' *' : ''}
              </span>
              <select
                className={styles.select}
                value={quickSaleForm.customerId}
                onChange={(event) =>
                  setQuickSaleForm((currentState) => ({
                    ...currentState,
                    customerId: event.target.value,
                  }))
                }
              >
                <option value="">Selecciona un cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Nota del comprobante</span>
              <textarea
                className={styles.textarea}
                placeholder="Agregar nota..."
                rows={4}
                value={quickSaleForm.note}
                onChange={(event) =>
                  setQuickSaleForm((currentState) => ({
                    ...currentState,
                    note: event.target.value,
                  }))
                }
              />
            </label>

            <button
              className={styles.primaryActionButton}
              disabled={
                createSaleMutation.isPending ||
                quickSaleAmount <= 0 ||
                (quickSaleForm.settlement === 'CREDIT' &&
                  quickSaleForm.customerId.trim().length === 0)
              }
              type="button"
              onClick={() => {
                void handleCreateQuickSale()
              }}
            >
              Crear venta
            </button>
          </div>
        </DrawerShell>
      ) : null}

      {isQuickExpenseDrawerOpen ? (
        <DrawerShell
          title="Nuevo gasto"
          subtitle="Los campos marcados con asterisco (*) son obligatorios"
          icon={<ExpenseDrawerIcon />}
          onClose={() => setQuickExpenseDrawerOpen(false)}
        >
          <div className={styles.drawerForm}>
            <div className={styles.segmentedControl}>
              <button
                className={
                  quickExpenseForm.status === 'PAID'
                    ? styles.segmentButtonActiveSuccess
                    : styles.segmentButton
                }
                type="button"
                onClick={() =>
                  setQuickExpenseForm((currentState) => ({
                    ...currentState,
                    status: 'PAID',
                  }))
                }
              >
                Pagada
              </button>
              <button
                className={
                  quickExpenseForm.status === 'PENDING'
                    ? styles.segmentButtonActiveDanger
                    : styles.segmentButton
                }
                type="button"
                onClick={() =>
                  setQuickExpenseForm((currentState) => ({
                    ...currentState,
                    status: 'PENDING',
                  }))
                }
              >
                En deuda
              </button>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Fecha del gasto *</span>
              <input
                className={styles.input}
                type="date"
                value={quickExpenseForm.expenseDate}
                onChange={(event) =>
                  setQuickExpenseForm((currentState) => ({
                    ...currentState,
                    expenseDate: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Categoría del gasto *</span>
              <select
                className={styles.select}
                value={quickExpenseForm.categoryId}
                onChange={(event) =>
                  setQuickExpenseForm((currentState) => ({
                    ...currentState,
                    categoryId: event.target.value,
                  }))
                }
              >
                <option value="">Selecciona una categoría</option>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Valor *</span>
              <div className={styles.amountCard}>
                <input
                  className={styles.amountInput}
                  inputMode="decimal"
                  placeholder="0"
                  type="text"
                  value={quickExpenseForm.amountInput}
                  onChange={(event) =>
                    setQuickExpenseForm((currentState) => ({
                      ...currentState,
                      amountInput: event.target.value,
                    }))
                  }
                />
                <div className={styles.amountSummary}>
                  <span>Valor total</span>
                  <strong>= {formatCurrency(quickExpenseAmount)}</strong>
                </div>
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                ¿Quieres darle un nombre a este gasto?
              </span>
              <input
                className={styles.input}
                placeholder="Escríbelo aquí"
                type="text"
                value={quickExpenseForm.concept}
                onChange={(event) =>
                  setQuickExpenseForm((currentState) => ({
                    ...currentState,
                    concept: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                Agrega un proveedor al gasto
                {quickExpenseForm.status === 'PENDING' ? ' *' : ''}
              </span>
              <select
                className={styles.select}
                value={quickExpenseForm.supplierId}
                onChange={(event) =>
                  setQuickExpenseForm((currentState) => ({
                    ...currentState,
                    supplierId: event.target.value,
                  }))
                }
              >
                <option value="">Selecciona un proveedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            {quickExpenseForm.status === 'PAID' ? (
              <div className={styles.fieldGroup}>
                <p className={styles.helperTitle}>Selecciona el método de pago *</p>
                <PaymentMethodSelector
                  value={quickExpenseForm.paymentOption}
                  onChange={(nextValue) =>
                    setQuickExpenseForm((currentState) => ({
                      ...currentState,
                      paymentOption: nextValue,
                    }))
                  }
                />
              </div>
            ) : null}

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Nota del comprobante</span>
              <textarea
                className={styles.textarea}
                placeholder="Agregar nota..."
                rows={4}
                value={quickExpenseForm.note}
                onChange={(event) =>
                  setQuickExpenseForm((currentState) => ({
                    ...currentState,
                    note: event.target.value,
                  }))
                }
              />
            </label>

            <button
              className={styles.primaryActionButton}
              disabled={
                createExpenseMutation.isPending ||
                quickExpenseAmount <= 0 ||
                (quickExpenseForm.status === 'PENDING' &&
                  quickExpenseForm.supplierId.trim().length === 0)
              }
              type="button"
              onClick={() => {
                void handleCreateQuickExpense()
              }}
            >
              Crear gasto
            </button>
          </div>
        </DrawerShell>
      ) : null}

      {completedSale ? (
        <SaleSuccessDrawer
          sale={completedSale}
          onClose={() => clearCheckoutFeedback()}
        />
      ) : null}

      {isChangeModalOpen ? (
        <ChangeCalculatorModal
          saleTotal={totalAmount}
          amountTenderedInput={amountTenderedInput}
          onAmountTenderedChange={setAmountTenderedInput}
          onClose={() => setChangeModalOpen(false)}
        />
      ) : null}
    </>
  )
}
