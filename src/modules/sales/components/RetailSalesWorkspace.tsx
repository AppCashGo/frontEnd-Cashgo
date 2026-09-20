import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { FormValidationAlert } from "@/shared/components/ui/FormValidationAlert";
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Banknote,
  CheckCircle,
  CheckCircle2,
  Crown,
} from 'lucide-react'
import type { CashRegisterDrawerMode } from '@/modules/cash-register/components/CashRegisterSessionDrawer'
import { CashRegisterFlowDrawer } from '@/modules/cash-register/components/CashRegisterFlowDrawer'
import { useCurrentCashRegisterQuery } from '@/modules/cash-register/hooks/use-cash-register-query'
import { QuickCreateCustomerDrawer } from '@/modules/customers/components/QuickCreateCustomerDrawer'
import { useCustomersQuery } from '@/modules/customers/hooks/use-customers-query'
import type { CustomerSummary } from '@/modules/customers/types/customer'
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
import { resolveProductImageUrl } from '@/modules/products/utils/resolve-product-image-url'
import { useSuppliersQuery } from '@/modules/suppliers/hooks/use-suppliers-query'
import {
  useCreateSaleMutation,
  useSalesQuery,
} from '@/modules/sales/hooks/use-create-sale-mutation'
import { useSaleCart } from '@/modules/sales/hooks/use-sale-cart'
import { SalesHistoryDrawer } from '@/modules/sales/components/SalesHistoryDrawer'
import { SaleCompletionActions } from '@/modules/sales/components/SaleCompletionActions'
import { SaleQuantityInput } from '@/modules/sales/components/SaleQuantityInput'
import type { SalePaymentMethod, SaleReceipt } from '@/modules/sales/types/sale'
import { useBusinessSettingsQuery } from '@/modules/settings/hooks/use-settings-query'
import { routePaths } from '@/routes/route-paths'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import { RetailEmptyState } from '@/shared/components/retail/RetailEmptyState'
import { RetailPageLayout } from '@/shared/components/retail/RetailPageLayout'
import { ModalShell } from '@/shared/components/ui/ModalShell'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import {
  getTodayDateInput,
  toDateOnlyRequestDate,
  toOperationDateTime,
} from '@/shared/utils/date-input'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { resolveApiAssetUrl } from '@/shared/services/api-client'
import { isCashSessionRequiredError } from '@/modules/cash-register/utils/is-cash-session-required-error'
import {
  COLLECTED_PAYMENT_METHOD_OPTIONS,
  getSharedPaymentMethodLabel,
} from '@/shared/payments/payment-methods'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styles from './RetailSalesWorkspace.module.css'

type RetailStep = 'CATALOG' | 'PAYMENT'
type PendingCashIntent =
  | 'POS_ENTRY'
  | 'CATALOG_CHECKOUT'
  | 'QUICK_SALE'
  | 'QUICK_EXPENSE'
  | 'SALES_HISTORY'
  | null
type RetailSettlement = 'PAID' | 'CREDIT'
type QuickCustomerTarget = 'CATALOG' | 'QUICK_SALE'
type RetailPaymentOption =
  | 'CASH'
  | 'CARD'
  | 'TRANSFER'
  | 'DIGITAL_WALLET'
  | 'BANK_DEPOSIT'
  | 'OTHER'
type CatalogPaymentSplit = {
  id: string
  amountInput: string
  paymentOption: RetailPaymentOption
}
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

const createCustomerSelectValue = '__CREATE_CUSTOMER__'

const paymentOptions = COLLECTED_PAYMENT_METHOD_OPTIONS as Array<{
  value: RetailPaymentOption
  label: string
}>

const paymentSplitOptions = ['1', '2', '3', '4', '5', '6', 'Otro'] as const
type PaymentSplitOption = (typeof paymentSplitOptions)[number]
const changeCalculatorQuickAmounts = [1000, 2000, 5000, 10000] as const
const defaultSortOption: ProductSortOption = 'NAME_ASC'
let cashRegisterAudioContext: AudioContext | null = null

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
  const normalizedValue = value.replace(/\$/g, '').replace(/\s/g, '').replace(',', '.')
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

function escapeReceiptHtml(value: string | number) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }

    return replacements[character] ?? character
  })
}

function getPaymentSplitNumber(option: PaymentSplitOption) {
  if (option === 'Otro') {
    return 1
  }

  return Number(option)
}

function splitPaymentAmount(totalAmount: number, paymentCount: number) {
  const safePaymentCount = Math.max(paymentCount, 1)
  const totalCents = Math.round(Math.max(totalAmount, 0) * 100)
  const baseCents = Math.floor(totalCents / safePaymentCount)
  const remainderCents = totalCents - baseCents * safePaymentCount

  return Array.from({ length: safePaymentCount }, (_, index) => {
    const amountCents =
      index === safePaymentCount - 1
        ? baseCents + remainderCents
        : baseCents

    return amountCents / 100
  })
}

function createCatalogPaymentSplits(
  paymentCount: number,
  totalAmount: number,
  currentSplits: CatalogPaymentSplit[] = [],
  fallbackPaymentOption: RetailPaymentOption = 'CASH',
): CatalogPaymentSplit[] {
  return splitPaymentAmount(totalAmount, paymentCount).map((amount, index) => ({
    id: currentSplits[index]?.id ?? `catalog-payment-${index + 1}`,
    amountInput: formatEditableNumber(amount),
    paymentOption: currentSplits[index]?.paymentOption ?? fallbackPaymentOption,
  }))
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function getPaymentOptionLabel(option: RetailPaymentOption) {
  return getSharedPaymentMethodLabel(option)
}

function getCashRegisterAudioContext() {
  if (typeof window === 'undefined') {
    return null
  }

  const audioWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext
  }
  const AudioContextConstructor =
    (typeof AudioContext !== 'undefined' ? AudioContext : undefined) ??
    audioWindow.webkitAudioContext

  if (!AudioContextConstructor) {
    return null
  }

  if (!cashRegisterAudioContext || cashRegisterAudioContext.state === 'closed') {
    cashRegisterAudioContext = new AudioContextConstructor()
  }

  return cashRegisterAudioContext
}

function scheduleCashRegisterTone(
  audioContext: AudioContext,
  startTime: number,
  frequency: number,
  duration: number,
  type: OscillatorType,
  volume: number,
) {
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startTime)
  gain.gain.setValueAtTime(0.0001, startTime)
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration + 0.03)
}

function prepareCashRegisterSound() {
  const audioContext = getCashRegisterAudioContext()

  if (!audioContext || audioContext.state !== 'suspended') {
    return
  }

  void audioContext.resume().catch(() => undefined)
}

function playCashRegisterSound() {
  const audioContext = getCashRegisterAudioContext()

  if (!audioContext) {
    return
  }

  const playSequence = () => {
    const startTime = audioContext.currentTime + 0.02

    scheduleCashRegisterTone(audioContext, startTime, 1568, 0.09, 'triangle', 0.08)
    scheduleCashRegisterTone(
      audioContext,
      startTime + 0.08,
      2093,
      0.11,
      'triangle',
      0.07,
    )
    scheduleCashRegisterTone(
      audioContext,
      startTime + 0.18,
      2637,
      0.13,
      'sine',
      0.05,
    )
    scheduleCashRegisterTone(
      audioContext,
      startTime + 0.28,
      130,
      0.08,
      'square',
      0.045,
    )
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume().then(playSequence).catch(() => undefined)
    return
  }

  playSequence()
}

function mapRetailPaymentOptionToSaleMethod(
  option: RetailPaymentOption,
): SalePaymentMethod {
  return option
}

function mapRetailPaymentOptionToExpenseMethod(
  option: RetailPaymentOption,
): ExpensePaymentMethod {
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
    <SideDrawer
      bodyClassName={styles.drawerBody}
      className={styles.drawerBackdrop}
      closeLabel="Cerrar"
      confirmClose
      description={subtitle}
      isOpen
      panelClassName={styles.drawer}
      title={title}
      titleAccessory={
        icon ? <span className={styles.drawerIconBadge}>{icon}</span> : undefined
      }
      onClose={onClose}
    >
      {children}
    </SideDrawer>
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

function PrinterIcon() {
  return (
    <svg aria-hidden="true" className={styles.footerUtilityIcon} viewBox="0 0 24 24">
      <path d="M7 8V3h10v5" />
      <path d="M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v7H7z" />
      <path d="M17 12h.01" />
    </svg>
  )
}

function PaymentMethodIcon({ option }: { option: RetailPaymentOption }) {
  switch (option) {
    case 'CASH':
      return (
        <svg aria-hidden="true" className={styles.paymentMethodIconSvg} viewBox="0 0 24 24">
          <path d="M4 7h16v10H4z" />
          <path d="M8 12h.01M16 12h.01" />
          <circle cx="12" cy="12" r="2.4" />
        </svg>
      )
    case 'CARD':
      return (
        <svg aria-hidden="true" className={styles.paymentMethodIconSvg} viewBox="0 0 24 24">
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
          <path d="M7 10h.01M16 14h1.5" />
        </svg>
      )
    case 'TRANSFER':
    case 'BANK_DEPOSIT':
      return (
        <svg aria-hidden="true" className={styles.paymentMethodIconSvg} viewBox="0 0 24 24">
          <path d="M4 10h16L12 5 4 10Z" />
          <path d="M6 10v7M10 10v7M14 10v7M18 10v7M4 19h16" />
        </svg>
      )
    case 'OTHER':
      return (
        <svg aria-hidden="true" className={styles.paymentMethodIconSvg} viewBox="0 0 24 24">
          <circle cx="8" cy="8" r="2" />
          <circle cx="16" cy="8" r="2" />
          <circle cx="8" cy="16" r="2" />
          <circle cx="16" cy="16" r="2" />
        </svg>
      )
    case 'DIGITAL_WALLET':
      return <span className={styles.nequiMark} aria-hidden="true" />
    default:
      return null
  }
}

type ChangeCalculatorModalProps = {
  saleTotal: number
  amountTenderedInput: string
  isSubmitting?: boolean
  onAmountTenderedChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

function ChangeCalculatorModal({
  saleTotal,
  amountTenderedInput,
  isSubmitting = false,
  onAmountTenderedChange,
  onClose,
  onConfirm,
}: ChangeCalculatorModalProps) {
  const amountTendered = parseAmountInput(amountTenderedInput)
  const changeTotal = Math.max(amountTendered - saleTotal, 0)
  const canConfirm = amountTendered >= saleTotal && !isSubmitting

  function handleExactPayment() {
    onAmountTenderedChange(formatEditableNumber(saleTotal))
  }

  function handleQuickAmount(amount: number) {
    onAmountTenderedChange(formatEditableNumber(amountTendered + amount))
  }

  return (
    <ModalShell
      ariaLabel="Calcula el cambio de tu venta"
      className={styles.modalBackdrop}
      closeButtonClassName={styles.changeModalClose}
      closeLabel="Cerrar"
      isOpen
      panelClassName={styles.changeModalCard}
      onClose={onClose}
    >
      <div className={styles.changeModalHeader}>
        <h3 className={styles.changeModalTitle}>Calcula el cambio de tu venta</h3>
        <p className={styles.changeModalSubtitle}>
          Finaliza la transacción en efectivo
        </p>
      </div>

      <div className={styles.changeModalBody}>
        <div className={styles.changeSaleCard}>
          <div>
            <span className={styles.changeSaleCardLabel}>VALOR DE LA VENTA</span>
            <strong className={styles.changeSaleCardAmount}>
              {formatCurrency(saleTotal)}
            </strong>
          </div>
          <span className={styles.changeSaleIcon}>
            <Banknote size={28} aria-hidden="true" />
          </span>
        </div>

        <label className={styles.changeInputGroup}>
          <span className={styles.changeInputLabel}>
            ¿Con cuánto paga tu cliente?
          </span>
          <span className={styles.changeInputBox}>
            <span className={styles.changeCurrencyPrefix}>$</span>
            <input
              className={styles.changeInput}
              inputMode="decimal"
              placeholder="0"
              type="text"
              value={amountTenderedInput}
              onChange={(event) => onAmountTenderedChange(event.target.value)}
            />
            <button
              className={styles.changeExactButton}
              type="button"
              onClick={handleExactPayment}
            >
              Exacto
            </button>
          </span>
        </label>

        <div className={styles.changeReturnCard}>
          <span>VALOR A DEVOLVER</span>
          <strong>{formatCurrency(changeTotal)}</strong>
        </div>

        <div className={styles.changeQuickAmounts}>
          {changeCalculatorQuickAmounts.map((amount) => (
            <button
              key={amount}
              className={styles.changeQuickAmountButton}
              type="button"
              onClick={() => handleQuickAmount(amount)}
            >
              {formatCurrency(amount).replace(/,00$/, '')}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.changeModalActions}>
        <button
          className={styles.changeCancelButton}
          type="button"
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          className={styles.changeConfirmButton}
          disabled={!canConfirm}
          type="button"
          onClick={onConfirm}
        >
          {isSubmitting ? 'Confirmando...' : 'Confirmar Pago'}
          <CheckCircle size={18} aria-hidden="true" />
        </button>
      </div>
    </ModalShell>
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
            <span className={styles.paymentMethodIcon}>
              <PaymentMethodIcon option={option.value} />
            </span>
            <span className={styles.paymentMethodLabel}>{option.label}</span>
            {isActive ? (
              <span className={styles.paymentMethodCheck} aria-hidden="true" />
            ) : null}
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

type SaleSuccessModalProps = {
  sale: SaleReceipt
  onClose: () => void
}

function SaleSuccessModal({ sale, onClose }: SaleSuccessModalProps) {
  return (
    <ModalShell
      ariaLabel="Venta creada con éxito"
      className={styles.modalBackdrop}
      closeButtonClassName={styles.saleSuccessCloseButton}
      closeLabel="Cerrar"
      isOpen
      panelClassName={styles.saleSuccessModal}
      onClose={onClose}
    >
      <div className={styles.saleSuccessModalBody}>
        <div className={styles.saleSuccessIcon}>
          <CheckCircle2 size={52} aria-hidden="true" />
        </div>
        <h3 className={styles.saleSuccessTitle}>¡Creaste una venta!</h3>
        <p className={styles.saleSuccessDescription}>
          La transacción se ha procesado correctamente y ha sido registrada en
          el inventario.
        </p>

        <div className={styles.saleSuccessValueCard}>
          <div className={styles.saleSuccessIdRow}>
            <span>ID DE VENTA</span>
            <strong>{sale.saleNumber}</strong>
          </div>
          <div className={styles.saleSuccessDivider} />
          <div className={styles.saleSuccessAmountRow}>
            <span>Valor Total</span>
            <strong>{formatCurrency(sale.total)}</strong>
          </div>
        </div>

        <SaleCompletionActions sale={sale} onRegisterAnother={onClose} />
      </div>

    </ModalShell>
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
    useState<PaymentSplitOption>('1')
  const [paymentOption, setPaymentOption] =
    useState<RetailPaymentOption>('CASH')
  const [paymentSplits, setPaymentSplits] = useState<CatalogPaymentSplit[]>(() =>
    createCatalogPaymentSplits(1, 0),
  )
  const [receiptNote, setReceiptNote] = useState('')
  const [isQuickSaleDrawerOpen, setQuickSaleDrawerOpen] = useState(false)
  const [quickCustomerTarget, setQuickCustomerTarget] =
    useState<QuickCustomerTarget | null>(null)
  const [isSalesHistoryOpen, setSalesHistoryOpen] = useState(false)
  const [isQuickExpenseDrawerOpen, setQuickExpenseDrawerOpen] = useState(false)
  const [isCashRegisterDrawerOpen, setCashRegisterDrawerOpen] = useState(false)
  const [cashRegisterDrawerMode, setCashRegisterDrawerMode] =
    useState<CashRegisterDrawerMode>('manage')
  const [isCashRegisterMenuOpen, setCashRegisterMenuOpen] = useState(false)
  const [isSortDrawerOpen, setSortDrawerOpen] = useState(false)
  const [isChangeModalOpen, setChangeModalOpen] = useState(false)
  const [pendingCashIntent, setPendingCashIntent] =
    useState<PendingCashIntent>(null)
  const cashEntryPromptedRef = useRef(false)
  const [sortOption, setSortOption] = useState<ProductSortOption>(defaultSortOption)
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false)
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
  const currentCashRegisterQuery = useCurrentCashRegisterQuery()
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
  const saleCompletionSoundEnabled =
    businessSettingsQuery.data?.saleCompletionSoundEnabled ?? true

  useEffect(() => {
    if (!currentCashRegister) {
      setCashRegisterMenuOpen(false)
    }
  }, [currentCashRegister])

  useEffect(() => {
    if (
      currentCashRegisterQuery.isSuccess &&
      !currentCashRegister &&
      !cashEntryPromptedRef.current
    ) {
      cashEntryPromptedRef.current = true
      setPendingCashIntent('POS_ENTRY')
      setCashRegisterDrawerMode('manage')
      setCashRegisterDrawerOpen(true)
    }
  }, [currentCashRegister, currentCashRegisterQuery.isSuccess])

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
    setProductQuantity,
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
  const selectedPaymentSplitCount = getPaymentSplitNumber(paymentSplitCount)
  const usesSplitPayments =
    settlement === 'PAID' && selectedPaymentSplitCount > 1
  const splitPaymentRows = useMemo(
    () => paymentSplits.slice(0, selectedPaymentSplitCount),
    [paymentSplits, selectedPaymentSplitCount],
  )
  const splitPaymentTotal = useMemo(
    () =>
      splitPaymentRows.reduce(
        (totalPaid, paymentSplit) =>
          totalPaid + parseAmountInput(paymentSplit.amountInput),
        0,
      ),
    [splitPaymentRows],
  )
  const splitPaymentDifference = totalAmount - splitPaymentTotal
  const areSplitPaymentsBalanced = Math.abs(splitPaymentDifference) < 0.01
  const hasCashCatalogPayment =
    settlement === 'PAID' &&
    (usesSplitPayments
      ? splitPaymentRows.some(
          (paymentSplit) =>
            paymentSplit.paymentOption === 'CASH' &&
            parseAmountInput(paymentSplit.amountInput) > 0,
        )
      : paymentOption === 'CASH')
  const cashCatalogPaymentTotal =
    settlement === 'PAID'
      ? usesSplitPayments
        ? splitPaymentRows
            .filter((paymentSplit) => paymentSplit.paymentOption === 'CASH')
            .reduce(
              (cashTotal, paymentSplit) =>
                cashTotal + parseAmountInput(paymentSplit.amountInput),
              0,
            )
        : paymentOption === 'CASH'
          ? totalAmount
          : 0
      : 0
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

  useEffect(() => {
    if (settlement !== 'PAID') {
      return
    }

    setPaymentSplits((currentSplits) =>
      createCatalogPaymentSplits(
        selectedPaymentSplitCount,
        totalAmount,
        currentSplits,
        paymentOption,
      ),
    )
  }, [paymentOption, selectedPaymentSplitCount, settlement, totalAmount])

  function resetPaymentStep() {
    setSelectedCustomerId('')
    setSettlement('PAID')
    setDiscountOpen(false)
    setDiscountPercentInput('0')
    setDiscountAmountInput('0')
    setSaleDate(getTodayDateInput())
    setPaymentSplitCount('1')
    setPaymentOption('CASH')
    setPaymentSplits(createCatalogPaymentSplits(1, 0))
    setReceiptNote('')
    setPaymentDetailsOpen(false)
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

  function handlePaymentSplitCountChange(option: PaymentSplitOption) {
    setPaymentSplitCount(option)
    setPaymentSplits((currentSplits) =>
      createCatalogPaymentSplits(
        getPaymentSplitNumber(option),
        totalAmount,
        currentSplits,
        paymentOption,
      ),
    )
  }

  function handlePaymentSplitAmountChange(splitId: string, value: string) {
    setPaymentSplits((currentSplits) =>
      currentSplits.map((paymentSplit) =>
        paymentSplit.id === splitId
          ? { ...paymentSplit, amountInput: value }
          : paymentSplit,
      ),
    )
  }

  function handlePaymentSplitAmountBlur(splitId: string) {
    setPaymentSplits((currentSplits) =>
      currentSplits.map((paymentSplit) =>
        paymentSplit.id === splitId
          ? {
              ...paymentSplit,
              amountInput: formatEditableNumber(
                parseAmountInput(paymentSplit.amountInput),
              ),
            }
          : paymentSplit,
      ),
    )
  }

  function handlePaymentSplitMethodChange(
    splitId: string,
    nextPaymentOption: RetailPaymentOption,
  ) {
    setPaymentSplits((currentSplits) =>
      currentSplits.map((paymentSplit) =>
        paymentSplit.id === splitId
          ? { ...paymentSplit, paymentOption: nextPaymentOption }
          : paymentSplit,
      ),
    )
  }

  function handleOpenQuickSaleDrawer() {
    clearCheckoutFeedback()
    setChangeModalOpen(false)
    setQuickSaleDrawerOpen(true)
  }

  function handleOpenQuickCustomerDrawer(target: QuickCustomerTarget) {
    setQuickCustomerTarget(target)
  }

  function handleQuickCustomerCreated(customer: CustomerSummary) {
    if (quickCustomerTarget === 'QUICK_SALE') {
      setQuickSaleForm((currentState) => ({
        ...currentState,
        customerId: customer.id,
      }))
    } else {
      setSelectedCustomerId(customer.id)
    }

    setQuickCustomerTarget(null)
  }

  function handleOpenQuickExpenseDrawer() {
    clearCheckoutFeedback()
    setChangeModalOpen(false)
    setQuickExpenseDrawerOpen(true)
  }

  function handleGoToCreateProduct() {
    navigate(`${routePaths.inventory}?create=manual&returnTo=sales`)
  }

  function handlePrintCurrentOrder() {
    if (cartItems.length === 0 || totalAmount <= 0) {
      markCheckoutError('Agrega productos antes de imprimir la prefactura.')
      return
    }

    const printWindow = window.open('', '_blank', 'width=420,height=720')

    if (!printWindow) {
      markCheckoutError('No pudimos abrir la ventana de impresión.')
      return
    }

    const selectedCustomer = customers.find(
      (customer) => customer.id === selectedCustomerId,
    )
    const customerName = selectedCustomer?.name ?? 'Consumidor final'
    const businessName =
      businessSettingsQuery.data?.legalName ??
      businessSettingsQuery.data?.businessName ??
      'Cashgo'
    const businessLogoUrl = resolveApiAssetUrl(businessSettingsQuery.data?.logoUrl)
    const printTicketWidth =
      businessSettingsQuery.data?.printTicketWidth === '58mm' ? '58mm' : '80mm'
    const printShowLogo = businessSettingsQuery.data?.printShowLogo ?? true
    const printShowTaxDetail =
      businessSettingsQuery.data?.printShowTaxDetail ?? true
    const printFooterMessage =
      businessSettingsQuery.data?.printFooterMessage?.trim() ||
      'Gracias por tu compra.'
    const brandMarkup = printShowLogo
      ? businessLogoUrl
        ? `<img class="brand-logo" src="${escapeReceiptHtml(businessLogoUrl)}" alt="${escapeReceiptHtml(businessName)}" />`
        : `<span class="brand-fallback">${escapeReceiptHtml(businessName.slice(0, 1).toUpperCase())}</span>`
      : ''
    const paymentRows =
      settlement === 'CREDIT'
        ? '<p><strong>Estado:</strong> A crédito</p>'
        : usesSplitPayments
          ? splitPaymentRows
              .map(
                (paymentSplit) =>
                  `<p>${escapeReceiptHtml(getPaymentOptionLabel(paymentSplit.paymentOption))}: ${escapeReceiptHtml(formatCurrency(parseAmountInput(paymentSplit.amountInput)))}</p>`,
              )
              .join('')
          : `<p>${escapeReceiptHtml(getPaymentOptionLabel(paymentOption))}: ${escapeReceiptHtml(formatCurrency(totalAmount))}</p>`
    const itemRows = cartItems
      .map((item) => {
        const lineTotal = item.product.price * item.quantity

        return `
          <tr>
            <td>
              <strong>${escapeReceiptHtml(item.product.name)}</strong>
              <span>${escapeReceiptHtml(item.quantity)} x ${escapeReceiptHtml(formatCurrency(item.product.price))}</span>
            </td>
            <td>${escapeReceiptHtml(formatCurrency(lineTotal))}</td>
          </tr>
        `
      })
      .join('')

    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Prefactura</title>
          <style>
            @page {
              size: ${printTicketWidth} auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 24px;
              color: #172331;
              font-family: Arial, sans-serif;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 24px;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 18px;
            }
            .brand-logo,
            .brand-fallback {
              width: 48px;
              height: 48px;
              border: 1px solid #d8e0ea;
              border-radius: 12px;
              background: #fff;
            }
            .brand-logo {
              object-fit: contain;
            }
            .brand-fallback {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              background: #172331;
              font-weight: 800;
            }
            .brand-name {
              margin: 0;
              color: #607089;
              font-weight: 700;
            }
            p {
              margin: 4px 0;
            }
            table {
              width: 100%;
              margin: 20px 0;
              border-collapse: collapse;
            }
            td {
              padding: 10px 0;
              border-bottom: 1px solid #d8e0ea;
              vertical-align: top;
            }
            td:last-child {
              text-align: right;
              font-weight: 700;
            }
            span {
              display: block;
              margin-top: 4px;
              color: #607089;
              font-size: 13px;
            }
            .summary {
              margin-top: 18px;
              padding-top: 14px;
              border-top: 2px solid #172331;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              margin: 8px 0;
            }
            .total {
              font-size: 20px;
              font-weight: 800;
            }
          </style>
        </head>
        <body>
          ${
            printShowLogo
              ? `<header class="brand">
                  ${brandMarkup}
                  <div>
                    <h1>Prefactura</h1>
                    <p class="brand-name">${escapeReceiptHtml(businessName)}</p>
                  </div>
                </header>`
              : '<h1>Prefactura</h1>'
          }
          <p><strong>Fecha:</strong> ${escapeReceiptHtml(saleDate)}</p>
          <p><strong>Cliente:</strong> ${escapeReceiptHtml(customerName)}</p>
          <table>
            <tbody>${itemRows}</tbody>
          </table>
          <div class="summary">
            <div class="summary-row">
              <span>Subtotal</span>
              <strong>${escapeReceiptHtml(formatCurrency(cartFinancials.grossSubtotal))}</strong>
            </div>
            <div class="summary-row">
              <span>Descuento</span>
              <strong>${escapeReceiptHtml(formatCurrency(discountTotal))}</strong>
            </div>
            ${
              printShowTaxDetail
                ? `<div class="summary-row">
                    <span>Impuestos</span>
                    <strong>${escapeReceiptHtml(formatCurrency(cartFinancials.totalTaxes))}</strong>
                  </div>`
                : ''
            }
            <div class="summary-row total">
              <span>Total</span>
              <strong>${escapeReceiptHtml(formatCurrency(totalAmount))}</strong>
            </div>
          </div>
          <section>
            <h2>Pago</h2>
            ${paymentRows}
          </section>
          ${
            receiptNote.trim().length > 0
              ? `<p><strong>Nota:</strong> ${escapeReceiptHtml(receiptNote)}</p>`
              : ''
          }
          <p>${escapeReceiptHtml(printFooterMessage)}</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => {
      printWindow.print()
    }, 200)
  }

  async function handleCatalogSaleSubmit() {
    prepareCashRegisterSound()

    const refreshedSession = await currentCashRegisterQuery.refetch()
    if (!refreshedSession.data) {
      beginCashSessionFlow('CATALOG_CHECKOUT')
      return
    }

    if (settlement === 'PAID' && hasCashCatalogPayment) {
      setAmountTenderedInput(formatEditableNumber(cashCatalogPaymentTotal))
      setChangeModalOpen(true)
      return
    }

    void handleCreateCatalogSale()
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

    const paidPayments = usesSplitPayments
      ? splitPaymentRows.map((paymentSplit) => ({
          method: mapRetailPaymentOptionToSaleMethod(paymentSplit.paymentOption),
          amount: parseAmountInput(paymentSplit.amountInput),
        }))
      : [
          {
            method: paymentMethod,
            amount: totalAmount,
          },
        ]

    if (
      settlement === 'PAID' &&
      usesSplitPayments &&
      paidPayments.some((payment) => payment.amount <= 0)
    ) {
      markCheckoutError('Todos los pagos deben tener un monto mayor a cero.')
      return
    }

    if (
      settlement === 'PAID' &&
      usesSplitPayments &&
      !areSplitPaymentsBalanced
    ) {
      markCheckoutError(
        `Los pagos deben sumar exactamente ${formatCurrency(totalAmount)}.`,
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
        saleDate: toOperationDateTime(saleDate),
        dueDate:
          settlement === 'CREDIT'
            ? toDateOnlyRequestDate(saleDate)
            : undefined,
        payments: settlement === 'PAID' ? paidPayments : [],
      })

      completeSale(sale)
      if (saleCompletionSoundEnabled) {
        playCashRegisterSound()
      }
      resetPaymentStep()
      setSaleStep('CATALOG')
    } catch (error) {
      if (isCashSessionRequiredError(error)) {
        markCheckoutError(
          'La caja se cerró antes de confirmar. Ábrela para continuar con esta venta.',
        )
        beginCashSessionFlow('CATALOG_CHECKOUT')
        return
      }
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

    if (quickSaleForm.customerId.trim().length === 0) {
      markCheckoutError('Selecciona un cliente antes de registrar la venta libre.')
      return
    }

    const refreshedSession = await currentCashRegisterQuery.refetch()
    if (!refreshedSession.data) {
      beginCashSessionFlow('QUICK_SALE')
      return
    }

    try {
      const sale = await createSaleMutation.mutateAsync({
        items: [],
        manualSubtotal: quickSaleAmount,
        customerId: normalizeOptionalText(quickSaleForm.customerId),
        cashRegisterId: currentCashRegister?.id,
        notes: normalizeOptionalText(quickSaleForm.note),
        saleDate: toOperationDateTime(quickSaleForm.saleDate),
        dueDate:
          quickSaleForm.settlement === 'CREDIT'
            ? toDateOnlyRequestDate(quickSaleForm.saleDate)
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
      if (saleCompletionSoundEnabled) {
        playCashRegisterSound()
      }
      setQuickSaleDrawerOpen(false)
      setQuickSaleForm(createDefaultQuickSaleState())
    } catch (error) {
      if (isCashSessionRequiredError(error)) {
        markCheckoutError(
          'La caja se cerró antes de confirmar. Ábrela para continuar.',
        )
        beginCashSessionFlow('QUICK_SALE')
        return
      }
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

    if (quickExpenseForm.status === 'PAID') {
      const refreshedSession = await currentCashRegisterQuery.refetch()
      if (!refreshedSession.data) {
        beginCashSessionFlow('QUICK_EXPENSE')
        return
      }
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
        expenseDate: toOperationDateTime(quickExpenseForm.expenseDate),
        notes: normalizeOptionalText(quickExpenseForm.note),
      })

      setQuickExpenseDrawerOpen(false)
      setQuickExpenseForm(createDefaultQuickExpenseState())
    } catch (error) {
      if (isCashSessionRequiredError(error)) {
        markCheckoutError(
          'La caja se cerró antes de confirmar. Ábrela para continuar.',
        )
        beginCashSessionFlow('QUICK_EXPENSE')
        return
      }
      markCheckoutError(
        getErrorMessage(
          error,
          'No pudimos registrar el gasto en este momento.',
        ),
      )
    }
  }

  function openCashRegisterDrawer(mode: CashRegisterDrawerMode) {
    setChangeModalOpen(false)
    setCashRegisterDrawerMode(mode)
    setCashRegisterDrawerOpen(true)
    setCashRegisterMenuOpen(false)
  }

  function beginCashSessionFlow(intent: Exclude<PendingCashIntent, null>) {
    setPendingCashIntent(intent)
    setChangeModalOpen(false)
    setQuickSaleDrawerOpen(false)
    setQuickExpenseDrawerOpen(false)
    if (intent === 'SALES_HISTORY') {
      setSalesHistoryOpen(false)
    }
    markCheckoutError(
      intent === 'SALES_HISTORY'
        ? 'Debes abrir caja para registrar la reversión.'
        : 'Debes abrir caja para continuar con esta operación.',
    )
    openCashRegisterDrawer('manage')
  }

  function resumePendingCashIntent() {
    const intent = pendingCashIntent
    setPendingCashIntent(null)

    if (intent === 'CATALOG_CHECKOUT') {
      setSaleStep('PAYMENT')
      if (settlement === 'PAID' && hasCashCatalogPayment) {
        setChangeModalOpen(true)
      }
      return
    }

    if (intent === 'QUICK_SALE') {
      setQuickSaleDrawerOpen(true)
      return
    }

    if (intent === 'QUICK_EXPENSE') {
      setQuickExpenseDrawerOpen(true)
      return
    }

    if (intent === 'SALES_HISTORY') {
      setSalesHistoryOpen(true)
    }
  }

  return (
    <>
      <RetailPageLayout
        bodyVariant="flush"
        title="Nueva venta"
        actions={
          <>
            {currentCashRegister ? (
              <div className={styles.cashRegisterMenu}>
                <button
                  aria-expanded={isCashRegisterMenuOpen}
                  className={styles.cashRegisterStatusButton}
                  type="button"
                  onClick={() =>
                    setCashRegisterMenuOpen((isOpen) => !isOpen)
                  }
                >
                  <Crown />
                  Caja abierta
                  <span aria-hidden="true">
                    {isCashRegisterMenuOpen ? '⌃' : '⌄'}
                  </span>
                </button>

                {isCashRegisterMenuOpen ? (
                  <div className={styles.cashRegisterMenuList} role="menu">
                    <button
                      className={styles.cashRegisterMenuItem}
                      role="menuitem"
                      type="button"
                      onClick={() => openCashRegisterDrawer('close')}
                    >
                      Cerrar caja
                    </button>
                    <button
                      className={styles.cashRegisterMenuItem}
                      role="menuitem"
                      type="button"
                      onClick={() => openCashRegisterDrawer('summary')}
                    >
                      Ver Resumen de Caja
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                className={`${retailStyles.buttonDark} ${styles.headerCashButton}`}
                type="button"
                onClick={() => openCashRegisterDrawer('manage')}
              >
                <Crown />
                Abrir caja
              </button>
            )}
            <span className={styles.headerActionDivider} aria-hidden="true" />
            <button
              className={styles.quickSaleButton}
              type="button"
              onClick={() => setSalesHistoryOpen(true)}
            >
              Historial de ventas
            </button>
            <button
              className={styles.quickSaleButton}
              type="button"
              onClick={handleOpenQuickSaleDrawer}
            >
              Nueva venta libre
            </button>
            <button
              className={styles.quickExpenseButton}
              type="button"
              onClick={handleOpenQuickExpenseDrawer}
            >
              Nuevo gasto
            </button>
          </>
        }
      >
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
                const productImageUrl = resolveProductImageUrl(product.imageUrls)
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

                    <div
                      className={
                        productImageUrl
                          ? `${styles.productPreview} ${styles.productPreviewWithImage}`
                          : styles.productPreview
                      }
                    >
                      {productImageUrl ? (
                        <img
                          alt=""
                          decoding="async"
                          loading="lazy"
                          src={productImageUrl}
                        />
                      ) : (
                        <span className={styles.productPreviewMark}>
                          {product.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
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
                      {cartItems.map((item) => {
                        const productImageUrl = resolveProductImageUrl(
                          item.product.imageUrls,
                        )

                        return (
                          <article className={styles.cartItem} key={item.product.id}>
                            <div className={styles.cartItemHead}>
                              <div className={styles.cartItemCopy}>
                                {productImageUrl ? (
                                  <img
                                    alt=""
                                    className={styles.cartAvatarImage}
                                    decoding="async"
                                    loading="lazy"
                                    src={productImageUrl}
                                  />
                                ) : (
                                  <div className={styles.cartAvatar}>
                                    {item.product.name.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className={styles.cartItemName}>
                                    {item.product.name}
                                  </p>
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
                                  onClick={() =>
                                    decreaseProductQuantity(item.product.id)
                                  }
                                >
                                  −
                                </button>
                                <SaleQuantityInput
                                  className={styles.quantityInput}
                                  max={
                                    allowSaleWithoutStock
                                      ? undefined
                                      : item.product.stock
                                  }
                                  productName={item.product.name}
                                  quantity={item.quantity}
                                  onQuantityChange={(quantity) =>
                                    setProductQuantity(item.product.id, quantity)
                                  }
                                />
                                <button
                                  className={styles.quantityButton}
                                  disabled={
                                    !allowSaleWithoutStock &&
                                    item.quantity >= item.product.stock
                                  }
                                  type="button"
                                  onClick={() =>
                                    increaseProductQuantity(item.product.id)
                                  }
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
                        )
                      })}
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
              <section className={`${styles.checkoutPanel} ${styles.paymentPanel}`}>
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
                    <div className={styles.customerSelectRow}>
                      <SearchableSelect
                        className={styles.select}
                        value={selectedCustomerId}
                        onChange={(event) => {
                          if (event.target.value === createCustomerSelectValue) {
                            handleOpenQuickCustomerDrawer('CATALOG')
                            return
                          }

                          setSelectedCustomerId(event.target.value)
                        }}
                      >
                        <option value="">Selecciona un cliente</option>
                        <option value={createCustomerSelectValue}>
                          ＋ Crear cliente nuevo
                        </option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))}
                      </SearchableSelect>
                      <button
                        aria-label="Crear cliente sin salir de la venta"
                        className={styles.addCustomerButton}
                        title="Crear cliente"
                        type="button"
                        onClick={() => handleOpenQuickCustomerDrawer('CATALOG')}
                      >
                        +
                      </button>
                    </div>
                  </label>

                  <div className={styles.divider} />

                  {!discountOpen ? (
                    <button
                      className={styles.linkButton}
                      type="button"
                      onClick={() => setDiscountOpen(true)}
                    >
                      <span aria-hidden="true">%</span>
                      <span>Agregar un descuento</span>
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
                              onClick={() => handlePaymentSplitCountChange(option)}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      {usesSplitPayments ? (
                        <div className={styles.paymentSplitFields}>
                          {splitPaymentRows.map((paymentSplit) => (
                            <div className={styles.paymentSplitItem} key={paymentSplit.id}>
                              <label className={styles.splitField}>
                                <span>Monto a pagar</span>
                                <span className={styles.splitAmountInputWrapper}>
                                  <span aria-hidden="true">$</span>
                                  <input
                                    className={styles.splitAmountInput}
                                    inputMode="decimal"
                                    type="text"
                                    value={paymentSplit.amountInput}
                                    onBlur={() =>
                                      handlePaymentSplitAmountBlur(paymentSplit.id)
                                    }
                                    onChange={(event) =>
                                      handlePaymentSplitAmountChange(
                                        paymentSplit.id,
                                        event.target.value,
                                      )
                                    }
                                  />
                                </span>
                              </label>

                              <label className={styles.splitField}>
                                <span>Método de pago</span>
                                <SearchableSelect
                                  className={styles.splitSelect}
                                  value={paymentSplit.paymentOption}
                                  onChange={(event) =>
                                    handlePaymentSplitMethodChange(
                                      paymentSplit.id,
                                      event.target.value as RetailPaymentOption,
                                    )
                                  }
                                >
                                  {paymentOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </SearchableSelect>
                              </label>
                            </div>
                          ))}

                          <div
                            className={
                              areSplitPaymentsBalanced
                                ? styles.paymentSplitStatus
                                : styles.paymentSplitStatusError
                            }
                          >
                            <span className={styles.paymentSplitStatusIcon}>
                              {areSplitPaymentsBalanced ? '✓' : '!'}
                            </span>
                            <div>
                              <strong>
                                {areSplitPaymentsBalanced
                                  ? 'Los pagos suman el total de la orden:'
                                  : 'Los pagos aún no suman el total de la orden:'}
                              </strong>
                              <p>
                                {areSplitPaymentsBalanced
                                  ? formatCurrency(splitPaymentTotal)
                                  : `Diferencia ${formatCurrency(
                                      Math.abs(splitPaymentDifference),
                                    )}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.fieldGroup}>
                          <p className={styles.helperTitle}>
                            Selecciona el método de pago
                            <span className={styles.requiredAsterisk}>*</span>
                          </p>
                          <PaymentMethodSelector
                            value={paymentOption}
                            onChange={setPaymentOption}
                          />
                        </div>
                      )}
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
                    <button
                      aria-label="Imprimir prefactura"
                      className={styles.footerUtilityButton}
                      disabled={cartItems.length === 0 || totalAmount <= 0}
                      type="button"
                      onClick={handlePrintCurrentOrder}
                    >
                      <PrinterIcon />
                    </button>

                    <button
                      className={styles.continueButton}
                      disabled={
                        createSaleMutation.isPending ||
                        cartItems.length === 0 ||
                        totalAmount <= 0
                      }
                      type="button"
                      onClick={handleCatalogSaleSubmit}
                    >
                      <span className={styles.continueBadge}>{totalItems.toString()}</span>
                      <span className={styles.continueText}>
                        {createSaleMutation.isPending
                          ? 'Registrando…'
                          : 'Crear venta'}
                      </span>
                      <strong>{formatCurrency(totalAmount)}</strong>
                    </button>
                  </div>
                </div>
              </section>
            )}
          </aside>
        </div>
      </RetailPageLayout>

      <SalesHistoryDrawer
        isOpen={isSalesHistoryOpen}
        sales={salesHistory}
        onClose={() => setSalesHistoryOpen(false)}
        onCashSessionRequired={() => beginCashSessionFlow('SALES_HISTORY')}
      />

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

      <CashRegisterFlowDrawer
        mode={cashRegisterDrawerMode}
        isOpen={isCashRegisterDrawerOpen}
        onClose={() => setCashRegisterDrawerOpen(false)}
        onOpened={resumePendingCashIntent}
      />

      <QuickCreateCustomerDrawer
        customers={customers}
        isOpen={quickCustomerTarget !== null}
        onClose={() => setQuickCustomerTarget(null)}
        onCreated={handleQuickCustomerCreated}
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
                <p className={styles.helperTitle}>
                  Selecciona el método de pago
                  <span className={styles.requiredAsterisk}>*</span>
                </p>
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
              <span className={styles.fieldLabel}>Agrega un cliente a la venta *</span>
              <div className={styles.customerSelectRow}>
                <SearchableSelect
                  className={styles.select}
                  value={quickSaleForm.customerId}
                  onChange={(event) => {
                    if (event.target.value === createCustomerSelectValue) {
                      handleOpenQuickCustomerDrawer('QUICK_SALE')
                      return
                    }

                    setQuickSaleForm((currentState) => ({
                      ...currentState,
                      customerId: event.target.value,
                    }))
                  }}
                >
                  <option value="">Selecciona un cliente</option>
                  <option value={createCustomerSelectValue}>
                    ＋ Crear cliente nuevo
                  </option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </SearchableSelect>
                <button
                  aria-label="Crear cliente sin salir de la venta"
                  className={styles.addCustomerButton}
                  title="Crear cliente"
                  type="button"
                  onClick={() => handleOpenQuickCustomerDrawer('QUICK_SALE')}
                >
                  +
                </button>
              </div>
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

            {checkoutErrorMessage ? (
              <FormValidationAlert message={checkoutErrorMessage} />
            ) : null}

            <button
              className={styles.primaryActionButton}
              disabled={createSaleMutation.isPending}
              type="button"
              onClick={() => {
                prepareCashRegisterSound()
                void handleCreateQuickSale()
              }}
            >
              {createSaleMutation.isPending
                ? 'Registrando venta…'
                : 'Crear venta'}
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
              <SearchableSelect
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
              </SearchableSelect>
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
              <SearchableSelect
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
              </SearchableSelect>
            </label>

            {quickExpenseForm.status === 'PAID' ? (
              <div className={styles.fieldGroup}>
                <p className={styles.helperTitle}>
                  Selecciona el método de pago
                  <span className={styles.requiredAsterisk}>*</span>
                </p>
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

            {checkoutErrorMessage ? (
              <FormValidationAlert message={checkoutErrorMessage} />
            ) : null}

            <button
              className={styles.primaryActionButton}
              disabled={createExpenseMutation.isPending}
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
        <SaleSuccessModal
          sale={completedSale}
          onClose={() => clearCheckoutFeedback()}
        />
      ) : null}

      {isChangeModalOpen ? (
        <ChangeCalculatorModal
          saleTotal={cashCatalogPaymentTotal > 0 ? cashCatalogPaymentTotal : totalAmount}
          amountTenderedInput={amountTenderedInput}
          isSubmitting={createSaleMutation.isPending}
          onAmountTenderedChange={setAmountTenderedInput}
          onClose={() => setChangeModalOpen(false)}
          onConfirm={() => {
            prepareCashRegisterSound()
            void handleCreateCatalogSale()
          }}
        />
      ) : null}
    </>
  )
}
