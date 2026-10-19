import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Banknote,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  Handshake,
  Hash,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Printer,
  Phone,
  ReceiptText,
  Send,
  Share2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import type {
  CustomerDetail,
  CustomerCollectionActivityInput,
  CustomerMutationInput,
  CustomerOldestPaymentResult,
  CustomerPaymentInput,
  CustomerPaymentMethodCorrectionInput,
  CustomerPaymentMethod,
  CustomerPurchaseHistoryItem,
  CustomerPurchaseHistoryProduct,
  CustomerReceivable,
  CustomerReceivableTermsInput,
} from '@/modules/customers/types/customer'
import { useBusinessSettingsQuery } from '@/modules/settings/hooks/use-settings-query'
import {
  downloadCustomerPaymentReceipt,
  downloadCustomerPurchaseHistory,
  downloadCustomerReceivableStatement,
  reviewCustomerPaymentReport,
} from '@/modules/customers/services/customers-api'
import { downloadSaleReceipt } from '@/modules/sales/services/sales-api'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDate } from '@/shared/utils/format-date'
import { formatDateTime } from '@/shared/utils/format-date-time'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { isCashSessionRequiredError } from '@/modules/cash-register/utils/is-cash-session-required-error'
import { AvatarUploadField } from '@/shared/components/ui/AvatarUploadField'
import { DrawerActionFooter } from '@/shared/components/ui/DrawerActionFooter'
import { useImageUploadPreview } from '@/shared/hooks/use-image-upload-preview'
import { joinClassNames } from '@/shared/utils/join-class-names'
import { resolveApiAssetUrl } from '@/shared/services/api-client'
import {
  downloadPdfBlob,
  openWhatsApp,
  printPdfBlob,
  sharePdfFile,
} from '@/shared/utils/pdf-document-actions'
import { normalizeWhatsAppPhone } from '@/shared/utils/normalize-whatsapp-phone'
import {
  COLLECTED_PAYMENT_METHOD_OPTIONS,
} from '@/shared/payments/payment-methods'
import styles from './RetailCustomerDrawer.module.css'

export type RetailCustomerDrawerMode = 'create' | 'edit' | 'detail'

type CustomerFormState = {
  name: string
  phone: string
  email: string
  documentType: string
  documentNumber: string
  address: string
  balance: string
  notes: string
}

type PaymentFormState = {
  receivableId: string
  amount: string
  method: CustomerPaymentMethod
  reference: string
  notes: string
}

type PaymentReceiptState = {
  paymentIds: string[]
  saleNumbers: string[]
  amount: number
}

type CustomerDetailTab = 'summary' | 'receivables' | 'payments' | 'history'

type PaymentReceiptBrand = {
  businessName: string
}

type ReceivableTermsFormState = {
  dueDate: string
  notes: string
}

type PaymentPromiseFormState = {
  promisedDate: string
  promisedAmount: string
  notes: string
}

type PaymentProductAllocation = {
  product: CustomerPurchaseHistoryProduct
  appliedAmount: number
  remainingAfterPayment: number
}

type CustomerPaymentHistoryEntry = {
  payment: CustomerReceivable['payments'][number]
  receivable: CustomerReceivable
  purchase: CustomerPurchaseHistoryItem | null
  productAllocations: PaymentProductAllocation[]
  unassignedAmount: number
  balanceAfterPayment: number
}

type CustomerPaymentMovement = {
  id: string
  entries: CustomerPaymentHistoryEntry[]
  amount: number
  createdAt: string
  method: CustomerPaymentMethod
  reference: string | null
  notes: string | null
}

function legacyPaymentMovementKey(entry: CustomerPaymentHistoryEntry) {
  const payment = entry.payment
  const tenSecondWindow = Math.floor(
    new Date(payment.createdAt).getTime() / 10_000,
  )

  return [
    'legacy',
    tenSecondWindow,
    payment.method,
    payment.reference ?? '',
    payment.notes ?? '',
  ].join(':')
}

function allocatePaymentAcrossProducts(
  purchase: CustomerPurchaseHistoryItem | null,
  invoiceAmount: number,
  amountPaidBefore: number,
  paymentAmount: number,
) {
  if (!purchase || purchase.products.length === 0) {
    return {
      allocations: [] as PaymentProductAllocation[],
      unassignedAmount: paymentAmount,
    }
  }

  const grossProductTotal = purchase.products.reduce(
    (total, product) => total + product.subtotal,
    0,
  )

  if (grossProductTotal <= 0) {
    return {
      allocations: [] as PaymentProductAllocation[],
      unassignedAmount: paymentAmount,
    }
  }

  // Cuando existe un descuento general, distribuimos el valor neto de la
  // factura proporcionalmente entre los productos antes de aplicar abonos.
  const allocatableProductTotal = Math.min(invoiceAmount, grossProductTotal)
  const allocationFactor = allocatableProductTotal / grossProductTotal
  let distributedProductTotal = 0
  const effectiveProductTotals = purchase.products.map((product, index) => {
    const isLastProduct = index === purchase.products.length - 1
    const effectiveTotal = isLastProduct
      ? allocatableProductTotal - distributedProductTotal
      : Math.floor(product.subtotal * allocationFactor)

    distributedProductTotal += effectiveTotal
    return Math.max(effectiveTotal, 0)
  })

  let previousPaymentsRemaining = Math.min(
    amountPaidBefore,
    allocatableProductTotal,
  )
  let currentPaymentRemaining = paymentAmount
  const allocations: PaymentProductAllocation[] = []

  purchase.products.forEach((product, index) => {
    const productTotal = effectiveProductTotals[index]
    const previouslyApplied = Math.min(
      previousPaymentsRemaining,
      productTotal,
    )
    previousPaymentsRemaining -= previouslyApplied

    const pendingBeforePayment = Math.max(
      productTotal - previouslyApplied,
      0,
    )
    const appliedAmount = Math.min(
      currentPaymentRemaining,
      pendingBeforePayment,
    )
    currentPaymentRemaining -= appliedAmount

    if (appliedAmount > 0) {
      allocations.push({
        product,
        appliedAmount,
        remainingAfterPayment: Math.max(
          pendingBeforePayment - appliedAmount,
          0,
        ),
      })
    }
  })

  return {
    allocations,
    unassignedAmount: Math.max(currentPaymentRemaining, 0),
  }
}

type RetailCustomerDrawerProps = {
  canSendConfirmedEmail: boolean
  customer: CustomerDetail | null
  currentCashRegisterId: string | null
  errorMessage: string | null
  isLoading: boolean
  isOpen: boolean
  isSuspended?: boolean
  isActivitySubmitting: boolean
  isEmailSubmitting: boolean
  isPaymentSubmitting: boolean
  isPaymentCorrectionSubmitting: boolean
  isTermsSubmitting: boolean
  isSubmitting: boolean
  mode: RetailCustomerDrawerMode
  submitError: unknown
  onClose: () => void
  onModeChange: (mode: RetailCustomerDrawerMode) => void
  onRefresh: () => void
  onRegisterPayment: (
    receivableId: string,
    input: CustomerPaymentInput,
  ) => Promise<CustomerReceivable>
  onRegisterOldestPayment: (
    customerId: string,
    input: CustomerPaymentInput,
  ) => Promise<CustomerOldestPaymentResult>
  onUpdatePaymentMethod: (
    paymentId: string,
    input: CustomerPaymentMethodCorrectionInput,
  ) => Promise<CustomerReceivable>
  onCreateCollectionActivity: (
    receivableId: string,
    input: CustomerCollectionActivityInput,
  ) => Promise<void>
  onCreateGeneralReminder: (
    customerId: string,
    input: CustomerCollectionActivityInput,
  ) => Promise<void>
  onSendReminderEmail: (customerId: string, message: string) => Promise<void>
  onUpdateReceivableTerms: (
    receivableId: string,
    input: CustomerReceivableTermsInput,
  ) => Promise<void>
  onSubmitCustomer: (
    input: CustomerMutationInput,
    avatarFile?: File | null,
  ) => Promise<void>
  onCashSessionRequired?: () => void
}

const EMPTY_FORM: CustomerFormState = {
  name: '',
  phone: '',
  email: '',
  documentType: 'CC',
  documentNumber: '',
  address: '',
  balance: '0',
  notes: '',
}

const OLDEST_RECEIVABLE_OPTION = '__oldest_receivables__'

const PAYMENT_METHOD_OPTIONS = COLLECTED_PAYMENT_METHOD_OPTIONS as Array<{
  value: CustomerPaymentMethod
  label: string
}>

function getStatusLabel(status: string) {
  if (status === 'PAID') {
    return 'Pagada'
  }

  if (status === 'OVERDUE') {
    return 'Vencida'
  }

  if (status === 'PARTIAL') {
    return 'Abono parcial'
  }

  if (status === 'CANCELLED') {
    return 'Cancelada'
  }

  return 'Pendiente'
}

function getCollectionChannelLabel(channel: string | null) {
  const labels: Record<string, string> = {
    WHATSAPP: 'WhatsApp',
    EMAIL: 'Correo',
    COPY: 'Mensaje copiado',
    MANUAL: 'Gestión manual',
  }

  return channel ? (labels[channel] ?? channel) : 'Sin canal'
}

function toFormState(customer: CustomerDetail | null): CustomerFormState {
  if (!customer) {
    return EMPTY_FORM
  }

  return {
    name: customer.name,
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    documentType: customer.documentType ?? 'CC',
    documentNumber: customer.documentNumber ?? '',
    address: customer.address ?? '',
    balance: String(customer.balance),
    notes: customer.notes ?? '',
  }
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : null
}

function parseMoney(value: string) {
  const compactValue = value.replace(/[^\d.,-]/g, '')
  const hasComma = compactValue.includes(',')
  const hasDot = compactValue.includes('.')
  const looksLikeThousandsWithDots = /^-?\d{1,3}(\.\d{3})+$/.test(compactValue)
  const normalizedValue =
    hasComma && hasDot
      ? compactValue.replace(/\./g, '').replace(',', '.')
      : hasComma
        ? compactValue.replace(',', '.')
        : looksLikeThousandsWithDots
          ? compactValue.replace(/\./g, '')
          : compactValue
  const parsedValue = Number.parseFloat(normalizedValue)

  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function formatReminderDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function formatReceivableDueDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function toDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

function buildGeneralCollectionReminder(
  customerName: string,
  receivables: CustomerReceivable[],
  totalOutstanding: number,
  businessName: string,
) {
  const accountLabel =
    receivables.length === 1
      ? '1 cuenta pendiente'
      : `${receivables.length} cuentas pendientes`
  const accountDetail = receivables
    .map((receivable) => {
      const dueDateText = receivable.dueDate
        ? ` · vence ${formatReminderDate(receivable.dueDate)}`
        : ''

      return `• ${receivable.saleNumber}: ${formatCurrency(receivable.balance)}${dueDateText}`
    })
    .join('\n')

  return `Hola ${customerName}, te recordamos que tienes un saldo total pendiente de ${formatCurrency(totalOutstanding)} en ${accountLabel}:\n\n${accountDetail}\n\nSi ya realizaste el pago, por favor ignora este mensaje. Gracias, ${businessName}.`
}

export function RetailCustomerDrawer({
  canSendConfirmedEmail,
  customer,
  currentCashRegisterId,
  errorMessage,
  isLoading,
  isOpen,
  isSuspended = false,
  isActivitySubmitting,
  isEmailSubmitting,
  isPaymentSubmitting,
  isPaymentCorrectionSubmitting,
  isTermsSubmitting,
  isSubmitting,
  mode,
  submitError,
  onClose,
  onModeChange,
  onRefresh,
  onRegisterPayment,
  onRegisterOldestPayment,
  onUpdatePaymentMethod,
  onCreateCollectionActivity,
  onCreateGeneralReminder,
  onSendReminderEmail,
  onUpdateReceivableTerms,
  onSubmitCustomer,
  onCashSessionRequired,
}: RetailCustomerDrawerProps) {
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    receivableId: '',
    amount: '',
    method: 'CASH',
    reference: '',
    notes: '',
  })
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [lastReceipt, setLastReceipt] = useState<PaymentReceiptState | null>(
    null,
  )
  const [detailTab, setDetailTab] = useState<CustomerDetailTab>('summary')
  const [isGeneralReminderOpen, setGeneralReminderOpen] = useState(false)
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderFeedback, setReminderFeedback] = useState<string | null>(null)
  const [documentFeedback, setDocumentFeedback] = useState<string | null>(null)
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null)
  const [reviewingReportId, setReviewingReportId] = useState<string | null>(null)
  const [termsReceivableId, setTermsReceivableId] = useState<string | null>(
    null,
  )
  const [termsForm, setTermsForm] = useState<ReceivableTermsFormState>({
    dueDate: '',
    notes: '',
  })
  const [termsError, setTermsError] = useState<string | null>(null)
  const [promiseReceivableId, setPromiseReceivableId] = useState<string | null>(
    null,
  )
  const [promiseForm, setPromiseForm] = useState<PaymentPromiseFormState>({
    promisedDate: '',
    promisedAmount: '',
    notes: '',
  })
  const [promiseError, setPromiseError] = useState<string | null>(null)
  const businessSettingsQuery = useBusinessSettingsQuery()

  const pendingReceivables = useMemo(
    () =>
      (customer?.receivables ?? []).filter(
        (receivable) => receivable.balance > 0,
      ),
    [customer?.receivables],
  )
  const settledReceivables = useMemo(
    () =>
      (customer?.receivables ?? []).filter(
        (receivable) => receivable.balance <= 0,
      ),
    [customer?.receivables],
  )
  const purchasesBySaleId = useMemo(
    () =>
      new Map(
        (customer?.purchaseHistory ?? []).map((purchase) => [
          purchase.saleId,
          purchase,
        ]),
      ),
    [customer?.purchaseHistory],
  )
  const paymentHistory = useMemo<CustomerPaymentHistoryEntry[]>(() => {
    const entries: CustomerPaymentHistoryEntry[] = []

    for (const receivable of customer?.receivables ?? []) {
      let accumulatedPayments = 0
      const purchase = purchasesBySaleId.get(receivable.saleId) ?? null

      const orderedPayments = [...receivable.payments]
        .sort(
          (first, second) =>
            new Date(first.createdAt).getTime() -
            new Date(second.createdAt).getTime(),
        )

      for (const payment of orderedPayments) {
        const productApplication = allocatePaymentAcrossProducts(
          purchase,
          receivable.amount,
          accumulatedPayments,
          payment.amount,
        )
        accumulatedPayments += payment.amount

        entries.push({
          payment,
          receivable,
          purchase,
          productAllocations: productApplication.allocations,
          unassignedAmount: productApplication.unassignedAmount,
          balanceAfterPayment: Math.max(
            receivable.amount - accumulatedPayments,
            0,
          ),
        })
      }
    }

    return entries.sort(
      (first, second) =>
        new Date(second.payment.createdAt).getTime() -
        new Date(first.payment.createdAt).getTime(),
    )
  }, [customer?.receivables, purchasesBySaleId])
  const paymentMovements = useMemo<CustomerPaymentMovement[]>(() => {
    const movements = new Map<string, CustomerPaymentMovement>()

    for (const entry of paymentHistory) {
      const movementId =
        entry.payment.paymentBatchId ?? legacyPaymentMovementKey(entry)
      const movement = movements.get(movementId)

      if (movement) {
        movement.entries.push(entry)
        movement.amount += entry.payment.amount
        continue
      }

      movements.set(movementId, {
        id: movementId,
        entries: [entry],
        amount: entry.payment.amount,
        createdAt: entry.payment.createdAt,
        method: entry.payment.method,
        reference: entry.payment.reference,
        notes: entry.payment.notes,
      })
    }

    return [...movements.values()].sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )
  }, [paymentHistory])
  const pendingPaymentReports = useMemo(
    () =>
      (customer?.receivables ?? []).flatMap((receivable) =>
        receivable.paymentReports
          .filter(
            (report) =>
              report.status === 'PENDING' || report.status === 'REVIEWING',
          )
          .map((report) => ({ report, receivable })),
      ),
    [customer?.receivables],
  )

  async function handleReviewPaymentReport(
    reportId: string,
    approved: boolean,
  ) {
    if (approved && !currentCashRegisterId) {
      setDocumentFeedback(
        'Abre una caja antes de aprobar el abono. Así el movimiento queda dentro del turno correcto.',
      )
      return
    }
    setReviewingReportId(reportId)
    setDocumentFeedback(null)
    try {
      await reviewCustomerPaymentReport(reportId, {
        approved,
        ...(approved && currentCashRegisterId
          ? { cashRegisterId: currentCashRegisterId }
          : {}),
      })
      setDocumentFeedback(
        approved
          ? 'Abono confirmado. La deuda y el historial del cliente fueron actualizados.'
          : 'Comprobante rechazado. La deuda no fue modificada.',
      )
      onRefresh()
    } catch (error) {
      setDocumentFeedback(
        getErrorMessage(error, 'No pudimos revisar este comprobante.'),
      )
    } finally {
      setReviewingReportId(null)
    }
  }
  const isOldestPayment = paymentForm.receivableId === OLDEST_RECEIVABLE_OPTION
  const selectedReceivable =
    pendingReceivables.find(
      (receivable) => receivable.id === paymentForm.receivableId,
    ) ?? null
  const totalOutstanding = pendingReceivables.reduce(
    (total, receivable) => total + receivable.balance,
    0,
  )
  const termsReceivable =
    pendingReceivables.find(
      (receivable) => receivable.id === termsReceivableId,
    ) ?? null
  const promiseReceivable =
    pendingReceivables.find(
      (receivable) => receivable.id === promiseReceivableId,
    ) ?? null
  const totalPurchased =
    customer?.purchaseHistory.reduce(
      (sum, purchase) => sum + purchase.total,
      0,
    ) ?? 0
  const averageTicket =
    customer && customer.purchaseCount > 0
      ? totalPurchased / customer.purchaseCount
      : 0
  const totalPaymentsRecorded =
    customer?.receivables.reduce(
      (sum, receivable) => sum + receivable.paidAmount,
      0,
    ) ?? 0
  const drawerTitle =
    mode === 'create'
      ? 'Crear cliente'
      : mode === 'edit'
        ? 'Editar cliente'
        : 'Detalle del cliente'
  const avatarUpload = useImageUploadPreview({
    hideStoredImage: mode === 'create',
    resetKey: `${isOpen ? 'open' : 'closed'}:${mode}:${customer?.id ?? 'new'}`,
    storedImageUrl: customer?.avatarUrl,
  })
  const visibleAvatarUrl = avatarUpload.visibleImageUrl
  const receiptBrand = useMemo<PaymentReceiptBrand>(
    () => ({
      businessName:
        businessSettingsQuery.data?.legalName ??
        businessSettingsQuery.data?.businessName ??
        'Cashgo',
    }),
    [
      businessSettingsQuery.data?.businessName,
      businessSettingsQuery.data?.legalName,
    ],
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setForm(toFormState(mode === 'create' ? null : customer))
    setFormError(null)
    setPaymentError(null)
    setGeneralReminderOpen(false)
    setReminderMessage('')
    setReminderFeedback(null)
    setDocumentFeedback(null)
    setActiveDocumentId(null)
    setTermsReceivableId(null)
    setTermsError(null)
    setPromiseReceivableId(null)
    setPromiseError(null)
  }, [customer, isOpen, mode])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setLastReceipt(null)
    setDetailTab('summary')
  }, [customer?.id, isOpen, mode])

  function handlePayAll() {
    if (totalOutstanding <= 0) {
      return
    }

    setDetailTab('receivables')
    setPaymentError(null)
    setLastReceipt(null)
    setPaymentForm((currentForm) => ({
      ...currentForm,
      receivableId: OLDEST_RECEIVABLE_OPTION,
      amount: String(totalOutstanding),
    }))

    window.setTimeout(() => {
      document.getElementById('customer-payment-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 0)
  }

  function handleStartGeneralReminder() {
    if (!customer) {
      return
    }

    setGeneralReminderOpen(true)
    setReminderMessage(
      buildGeneralCollectionReminder(
        customer.name,
        pendingReceivables,
        totalOutstanding,
        receiptBrand.businessName,
      ),
    )
    setReminderFeedback(null)
  }

  function handleStartTermsEdit(receivable: CustomerReceivable) {
    setTermsReceivableId(receivable.id)
    setTermsForm({
      dueDate: toDateInputValue(receivable.dueDate),
      notes: receivable.notes ?? '',
    })
    setTermsError(null)
  }

  function handleStartPromise(receivable: CustomerReceivable) {
    setPromiseReceivableId(receivable.id)
    setPromiseForm({
      promisedDate: '',
      promisedAmount: String(receivable.balance),
      notes: '',
    })
    setPromiseError(null)
  }

  async function handleSubmitPromise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!promiseReceivable) {
      return
    }

    setPromiseError(null)

    try {
      await onCreateCollectionActivity(promiseReceivable.id, {
        type: 'PAYMENT_PROMISE',
        channel: 'MANUAL',
        promisedDate: promiseForm.promisedDate,
        promisedAmount: Number(promiseForm.promisedAmount),
        notes: normalizeOptionalText(promiseForm.notes) ?? undefined,
      })
      setPromiseReceivableId(null)
    } catch (error) {
      setPromiseError(
        getErrorMessage(error, 'No pudimos registrar el compromiso de pago.'),
      )
    }
  }

  async function handleRecordReminder(channel: 'WHATSAPP' | 'EMAIL' | 'COPY') {
    if (!customer || pendingReceivables.length === 0) {
      return
    }

    try {
      await onCreateGeneralReminder(customer.id, {
        type: 'REMINDER',
        channel,
        notes: reminderMessage,
      })
      setReminderFeedback('Gestión registrada en el historial de cobro.')
    } catch (error) {
      setReminderFeedback(
        getErrorMessage(error, 'No pudimos registrar esta gestión.'),
      )
    }
  }

  async function handleSubmitTerms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!termsReceivable) {
      return
    }

    setTermsError(null)

    try {
      await onUpdateReceivableTerms(termsReceivable.id, {
        dueDate: termsForm.dueDate || null,
        notes: normalizeOptionalText(termsForm.notes),
      })
      setTermsReceivableId(null)
    } catch (error) {
      setTermsError(
        getErrorMessage(
          error,
          'No pudimos actualizar las condiciones de cobro.',
        ),
      )
    }
  }

  async function handleCopyReminder() {
    try {
      await navigator.clipboard.writeText(reminderMessage)
      await handleRecordReminder('COPY')
    } catch {
      setReminderFeedback(
        'No pudimos copiar el mensaje. Puedes seleccionarlo manualmente.',
      )
    }
  }

  async function handleSendReminderEmail() {
    if (!customer || pendingReceivables.length === 0) {
      return
    }

    setReminderFeedback(null)

    try {
      await onSendReminderEmail(customer.id, reminderMessage)
      setReminderFeedback(
        'Correo y estado de cuenta PDF enviados y confirmados por el proveedor.',
      )
    } catch (error) {
      setReminderFeedback(
        getErrorMessage(
          error,
          'No fue posible confirmar el envío. Puedes preparar el correo manualmente.',
        ),
      )
    }
  }

  function buildSaleReminder(receivable: CustomerReceivable) {
    const dueDate = receivable.dueDate
      ? ` con vencimiento el ${formatReminderDate(receivable.dueDate)}`
      : ''

    return `Hola ${customer?.name ?? ''}, te recordamos que la venta ${receivable.saleNumber} tiene un saldo pendiente de ${formatCurrency(receivable.balance)}${dueDate}. Hemos preparado la factura en PDF con el detalle de la compra. Si ya realizaste el pago, por favor ignora este mensaje. Gracias, ${receiptBrand.businessName}.`
  }

  async function getSalePdf(saleId: string) {
    const result = await downloadSaleReceipt(saleId)
    return {
      blob: result.blob,
      filename: result.filename ?? `factura-${saleId}.pdf`,
    }
  }

  async function getCustomerStatementPdf(customerId: string) {
    const result = await downloadCustomerReceivableStatement(customerId)
    return {
      blob: result.blob,
      filename: result.filename ?? `estado-de-cuenta-${customerId}.pdf`,
    }
  }

  async function getCustomerPurchaseHistoryPdf(customerId: string) {
    const result = await downloadCustomerPurchaseHistory(customerId)
    return {
      blob: result.blob,
      filename: result.filename ?? `historial-de-compras-${customerId}.pdf`,
    }
  }

  async function handleCustomerPurchaseHistory(action: 'download' | 'print') {
    if (!customer || customer.purchaseHistory.length === 0) {
      return
    }

    setActiveDocumentId(`purchase-history:${action}`)
    setDocumentFeedback(null)

    try {
      const { blob, filename } = await getCustomerPurchaseHistoryPdf(
        customer.id,
      )
      if (action === 'print') {
        printPdfBlob(blob)
      } else {
        downloadPdfBlob(blob, filename)
      }
      setDocumentFeedback(
        action === 'print'
          ? 'El historial completo de compras está listo para imprimir.'
          : 'El historial completo de compras se descargó en PDF.',
      )
    } catch (error) {
      setDocumentFeedback(
        getErrorMessage(
          error,
          'No pudimos generar el historial completo de compras.',
        ),
      )
    } finally {
      setActiveDocumentId(null)
    }
  }

  async function handleCustomerStatement(action: 'download' | 'print') {
    if (!customer || pendingReceivables.length === 0) {
      return
    }

    setActiveDocumentId(`statement:${action}`)
    setDocumentFeedback(null)

    try {
      const { blob, filename } = await getCustomerStatementPdf(customer.id)
      if (action === 'print') {
        printPdfBlob(blob)
      } else {
        downloadPdfBlob(blob, filename)
      }
      setDocumentFeedback(
        action === 'print'
          ? 'El estado de cuenta consolidado está listo para imprimir.'
          : 'El estado de cuenta consolidado se descargó en PDF.',
      )
    } catch (error) {
      setDocumentFeedback(
        getErrorMessage(
          error,
          'No pudimos generar el estado de cuenta consolidado.',
        ),
      )
    } finally {
      setActiveDocumentId(null)
    }
  }

  async function handleShareCustomerStatement() {
    if (!customer || pendingReceivables.length === 0) {
      return
    }

    if (!customer.phone) {
      setDocumentFeedback(
        'Este cliente no tiene un celular registrado para abrir WhatsApp.',
      )
      return
    }

    const phone = normalizeWhatsAppPhone(customer.phone)
    if (!/^\d{10,15}$/.test(phone)) {
      setDocumentFeedback(
        'El celular no tiene un formato internacional válido. Corrígelo antes de abrir WhatsApp.',
      )
      return
    }

    setActiveDocumentId('statement:share')
    setDocumentFeedback(null)

    try {
      const { blob, filename } = await getCustomerStatementPdf(customer.id)
      const result = await sharePdfFile({
        blob,
        filename,
        title: `Estado de cuenta de ${customer.name}`,
        text: reminderMessage,
      })

      if (result === 'shared') {
        await handleRecordReminder('WHATSAPP')
        setDocumentFeedback(
          'Se abrió el selector para compartir el mensaje y el estado de cuenta. Elige WhatsApp y confirma el envío.',
        )
        return
      }

      openWhatsApp(phone, reminderMessage)
      await handleRecordReminder('WHATSAPP')
      setDocumentFeedback(
        'El estado de cuenta se descargó y WhatsApp se abrió con el mensaje. Adjunta manualmente el PDF descargado antes de enviarlo.',
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setDocumentFeedback(
          'No se compartió el estado de cuenta porque cancelaste la acción.',
        )
      } else {
        setDocumentFeedback(
          getErrorMessage(
            error,
            'No pudimos preparar el estado de cuenta para compartir.',
          ),
        )
      }
    } finally {
      setActiveDocumentId(null)
    }
  }

  async function handleSaleDocument(
    saleId: string,
    saleNumber: string,
    action: 'download' | 'print',
  ) {
    setActiveDocumentId(`${saleId}:${action}`)
    setDocumentFeedback(null)

    try {
      const { blob, filename } = await getSalePdf(saleId)
      if (action === 'print') {
        printPdfBlob(blob)
      } else {
        downloadPdfBlob(blob, filename)
      }
      setDocumentFeedback(
        action === 'print'
          ? `La factura ${saleNumber} está lista para imprimir.`
          : `La factura ${saleNumber} se descargó en PDF.`,
      )
    } catch (error) {
      setDocumentFeedback(
        getErrorMessage(error, `No pudimos generar la factura ${saleNumber}.`),
      )
    } finally {
      setActiveDocumentId(null)
    }
  }

  async function handleShareReceivable(receivable: CustomerReceivable) {
    if (!customer?.phone) {
      setDocumentFeedback(
        'Este cliente no tiene un celular registrado para abrir WhatsApp.',
      )
      return
    }

    const phone = normalizeWhatsAppPhone(customer.phone)
    if (!/^\d{10,15}$/.test(phone)) {
      setDocumentFeedback(
        'El celular no tiene un formato internacional válido. Corrígelo antes de abrir WhatsApp.',
      )
      return
    }

    const message = buildSaleReminder(receivable)
    setActiveDocumentId(`${receivable.saleId}:share`)
    setDocumentFeedback(null)

    try {
      const { blob, filename } = await getSalePdf(receivable.saleId)
      const result = await sharePdfFile({
        blob,
        filename,
        title: `Factura ${receivable.saleNumber}`,
        text: message,
      })

      if (result === 'shared') {
        await onCreateCollectionActivity(receivable.id, {
          type: 'REMINDER',
          channel: 'WHATSAPP',
          notes: message,
        })
        setDocumentFeedback(
          'Se abrió el selector para compartir el mensaje y el PDF. Elige WhatsApp y confirma el envío.',
        )
        return
      }

      openWhatsApp(phone, message)
      await onCreateCollectionActivity(receivable.id, {
        type: 'REMINDER',
        channel: 'WHATSAPP',
        notes: message,
      })
      setDocumentFeedback(
        'La factura se descargó y WhatsApp se abrió con el mensaje. Adjunta manualmente el PDF descargado antes de enviarlo.',
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setDocumentFeedback('No se compartió la factura porque cancelaste la acción.')
      } else {
        setDocumentFeedback(
          getErrorMessage(error, 'No pudimos preparar la factura para compartir.'),
        )
      }
    } finally {
      setActiveDocumentId(null)
    }
  }

  async function handlePaymentReceipts(action: 'download' | 'print') {
    if (!lastReceipt) return

    setActiveDocumentId(`payment:${action}`)
    setDocumentFeedback(null)

    try {
      for (const [index, paymentId] of lastReceipt.paymentIds.entries()) {
        const result = await downloadCustomerPaymentReceipt(paymentId)
        const filename =
          result.filename ?? `comprobante-${lastReceipt.saleNumbers[index]}.pdf`

        if (action === 'print' && index === 0) {
          printPdfBlob(result.blob)
        } else {
          downloadPdfBlob(result.blob, filename)
        }
      }
      setDocumentFeedback(
        lastReceipt.paymentIds.length > 1
          ? `Se prepararon ${lastReceipt.paymentIds.length} comprobantes, uno por cada factura abonada.`
          : action === 'print'
            ? 'El comprobante está listo para imprimir.'
            : 'El comprobante se descargó en PDF.',
      )
    } catch (error) {
      setDocumentFeedback(
        getErrorMessage(error, 'No pudimos generar el comprobante de pago.'),
      )
    } finally {
      setActiveDocumentId(null)
    }
  }

  async function sharePaymentReceipt(
    paymentId: string,
    saleNumber: string,
  ) {
    if (!customer) return

    const phone = normalizeWhatsAppPhone(customer.phone ?? '')
    const message = `Hola ${customer.name}, te enviamos el comprobante del abono realizado a la factura ${saleNumber}. El PDF muestra el valor pagado, los productos de la compra y el saldo que quedó pendiente.`
    const result = await downloadCustomerPaymentReceipt(paymentId)
    const filename = result.filename ?? `comprobante-${saleNumber}.pdf`
    const shareResult = await sharePdfFile({
      blob: result.blob,
      filename,
      title: `Comprobante de abono ${saleNumber}`,
      text: message,
    })

    if (shareResult === 'shared') {
      setDocumentFeedback(
        'Se abrió el selector para compartir el comprobante. Elige WhatsApp y confirma el envío.',
      )
      return
    }

    if (/^\d{10,15}$/.test(phone)) {
      openWhatsApp(phone, message)
      setDocumentFeedback(
        'El comprobante se descargó y WhatsApp se abrió con el mensaje. Adjunta el PDF descargado antes de enviarlo.',
      )
      return
    }

    setDocumentFeedback(
      'El comprobante se descargó. El cliente no tiene un celular válido; envía el PDF por el medio que prefieras.',
    )
  }

  async function handleShareLatestPaymentReceipt() {
    if (!lastReceipt) return

    setActiveDocumentId('payment:share')
    setDocumentFeedback(null)

    try {
      if (lastReceipt.paymentIds.length === 1) {
        await sharePaymentReceipt(
          lastReceipt.paymentIds[0],
          lastReceipt.saleNumbers[0],
        )
        return
      }

      for (const [index, paymentId] of lastReceipt.paymentIds.entries()) {
        const result = await downloadCustomerPaymentReceipt(paymentId)
        downloadPdfBlob(
          result.blob,
          result.filename ??
            `comprobante-${lastReceipt.saleNumbers[index]}.pdf`,
        )
      }
      const phone = normalizeWhatsAppPhone(customer?.phone ?? '')
      const message = `Hola ${customer?.name ?? ''}, te enviamos los comprobantes del abono de ${formatCurrency(lastReceipt.amount)}, aplicado a ${lastReceipt.saleNumbers.length} facturas. Cada PDF muestra lo pagado y el saldo restante de su factura.`
      if (/^\d{10,15}$/.test(phone)) {
        openWhatsApp(phone, message)
      }
      setDocumentFeedback(
        `Se descargaron ${lastReceipt.paymentIds.length} comprobantes. Adjunta los PDF al mensaje antes de enviarlo.`,
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setDocumentFeedback('No se compartió el comprobante porque cancelaste la acción.')
      } else {
        setDocumentFeedback(
          getErrorMessage(error, 'No pudimos preparar el comprobante para compartir.'),
        )
      }
    } finally {
      setActiveDocumentId(null)
    }
  }

  async function handleSavedPaymentReceipt(
    paymentId: string,
    saleNumber: string,
    action: 'download' | 'print' | 'share',
  ) {
    setActiveDocumentId(`saved-payment:${paymentId}:${action}`)
    setDocumentFeedback(null)

    try {
      if (action === 'share') {
        await sharePaymentReceipt(paymentId, saleNumber)
        return
      }
      const result = await downloadCustomerPaymentReceipt(paymentId)
      const filename = result.filename ?? `comprobante-${saleNumber}.pdf`
      if (action === 'print') {
        printPdfBlob(result.blob)
      } else {
        downloadPdfBlob(result.blob, filename)
      }
      setDocumentFeedback(
        action === 'print'
          ? 'El comprobante está listo para imprimir.'
          : 'El comprobante se descargó en PDF.',
      )
    } catch (error) {
      setDocumentFeedback(
        getErrorMessage(error, 'No pudimos generar el comprobante de pago.'),
      )
    } finally {
      setActiveDocumentId(null)
    }
  }

  useEffect(() => {
    if (!isOpen || mode !== 'detail') {
      return
    }

    const firstPendingReceivable = pendingReceivables[0] ?? null

    setPaymentForm((currentForm) => ({
      ...currentForm,
      receivableId: firstPendingReceivable?.id ?? '',
      amount: firstPendingReceivable
        ? String(firstPendingReceivable.balance)
        : '',
    }))
  }, [isOpen, mode, pendingReceivables])

  function updateFormValue(name: keyof CustomerFormState, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function updatePaymentValue(name: keyof PaymentFormState, value: string) {
    setPaymentForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function handleAvatarChange(file: File | null) {
    const validationError = avatarUpload.selectFile(file)

    if (validationError) {
      setFormError(validationError)
      return
    }

    setFormError(null)
  }

  async function handleSubmitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = form.name.trim()
    const balance = parseMoney(form.balance)

    if (name.length < 2) {
      setFormError('Escribe el nombre del cliente.')
      return
    }

    if (balance < 0) {
      setFormError('El saldo pendiente no puede ser negativo.')
      return
    }

    setFormError(null)

    await onSubmitCustomer(
      {
        name,
        phone: normalizeOptionalText(form.phone),
        email: normalizeOptionalText(form.email),
        documentType: normalizeOptionalText(form.documentType),
        documentNumber: normalizeOptionalText(form.documentNumber),
        address: normalizeOptionalText(form.address),
        notes: normalizeOptionalText(form.notes),
        balance,
      },
      avatarUpload.file,
    )
  }

  async function handleRegisterPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if ((!selectedReceivable && !isOldestPayment) || !customer) {
      setPaymentError('Selecciona una cuenta por cobrar.')
      return
    }

    const amount = parseMoney(paymentForm.amount)

    if (amount <= 0) {
      setPaymentError('El valor recibido debe ser mayor a cero.')
      return
    }

    const maximumPayment = isOldestPayment
      ? totalOutstanding
      : (selectedReceivable?.balance ?? 0)

    if (amount > maximumPayment) {
      setPaymentError('El abono no puede superar el saldo pendiente.')
      return
    }

    setPaymentError(null)

    const input: CustomerPaymentInput = {
      amount,
      method: paymentForm.method,
      reference: normalizeOptionalText(paymentForm.reference) ?? undefined,
      notes: normalizeOptionalText(paymentForm.notes) ?? undefined,
      ...(currentCashRegisterId
        ? { cashRegisterId: currentCashRegisterId }
        : {}),
    }

    let paymentIds: string[]
    let saleNumbers: string[]

    try {
      if (isOldestPayment) {
        const result = await onRegisterOldestPayment(customer.id, input)
        paymentIds = result.allocations.map((allocation) => allocation.paymentId)
        saleNumbers = result.allocations.map((allocation) => allocation.saleNumber)
      } else {
        const updatedReceivable = await onRegisterPayment(
          selectedReceivable!.id,
          input,
        )
        const createdPayment =
          updatedReceivable.payments[updatedReceivable.payments.length - 1]
        if (!createdPayment) {
          throw new Error('El abono se guardó, pero no fue posible identificar su comprobante.')
        }
        paymentIds = [createdPayment.id]
        saleNumbers = [selectedReceivable!.saleNumber]
      }
    } catch (error) {
      if (isCashSessionRequiredError(error)) {
        setPaymentError('Debes abrir caja para registrar el abono.')
        onCashSessionRequired?.()
        return
      }
      setPaymentError(
        getErrorMessage(
          error,
          'No pudimos registrar el abono. Intenta otra vez.',
        ),
      )
      return
    }

    setLastReceipt({
      paymentIds,
      saleNumbers,
      amount,
    })
    setPaymentForm((currentForm) => ({
      ...currentForm,
      amount: '',
      reference: '',
      notes: '',
    }))
  }


  function renderForm() {
    return (
      <form className={styles.form} onSubmit={handleSubmitCustomer}>
        <AvatarUploadField
          alt="Avatar del cliente"
          disabled={isSubmitting}
          imageUrl={visibleAvatarUrl}
          onSelectFile={handleAvatarChange}
        />

        <label className={styles.field}>
          <span>Nombre *</span>
          <input
            className={styles.input}
            placeholder="Nombre del cliente"
            value={form.name}
            onChange={(event) => updateFormValue('name', event.target.value)}
          />
        </label>

        <div className={styles.twoColumns}>
          <label className={styles.field}>
            <span>Celular</span>
            <input
              className={styles.input}
              placeholder="+57 300 000 0000"
              value={form.phone}
              onChange={(event) => updateFormValue('phone', event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Correo</span>
            <input
              className={styles.input}
              placeholder="cliente@correo.com"
              type="email"
              value={form.email}
              onChange={(event) => updateFormValue('email', event.target.value)}
            />
          </label>
        </div>

        <div className={styles.twoColumns}>
          <label className={styles.field}>
            <span>Tipo de documento</span>
            <SearchableSelect
              className={styles.input}
              value={form.documentType}
              onChange={(event) =>
                updateFormValue('documentType', event.target.value)
              }
            >
              <option value="CC">CC</option>
              <option value="NIT">NIT</option>
              <option value="CE">CE</option>
              <option value="PASAPORTE">Pasaporte</option>
            </SearchableSelect>
          </label>

          <label className={styles.field}>
            <span>Numero de documento</span>
            <input
              className={styles.input}
              placeholder="Documento"
              value={form.documentNumber}
              onChange={(event) =>
                updateFormValue('documentNumber', event.target.value)
              }
            />
          </label>
        </div>

        <label className={styles.field}>
          <span>Direccion</span>
          <input
            className={styles.input}
            placeholder="Direccion del cliente"
            value={form.address}
            onChange={(event) => updateFormValue('address', event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Saldo por cobrar</span>
          <input
            className={styles.input}
            inputMode="decimal"
            placeholder="$ 0"
            value={form.balance}
            onChange={(event) => updateFormValue('balance', event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Notas</span>
          <textarea
            className={styles.textarea}
            placeholder="Notas internas del cliente"
            value={form.notes}
            onChange={(event) => updateFormValue('notes', event.target.value)}
          />
        </label>

        {formError ? <p className={styles.errorMessage}>{formError}</p> : null}
        {submitError ? (
          <p className={styles.errorMessage}>
            {getErrorMessage(
              submitError,
              'No pudimos guardar el cliente. Intenta otra vez.',
            )}
          </p>
        ) : null}

        <button
          className={styles.primaryButton}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? 'Guardando...'
            : mode === 'create'
              ? 'Crear cliente'
              : 'Guardar cambios'}
        </button>
      </form>
    )
  }

  function renderDetail() {
    if (isLoading) {
      return <div className={styles.feedback}>Cargando cliente...</div>
    }

    if (errorMessage) {
      return (
        <div className={styles.feedback} role="alert">
          <p>{errorMessage}</p>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={onRefresh}
          >
            Reintentar
          </button>
        </div>
      )
    }

    if (!customer) {
      return <div className={styles.feedback}>Selecciona un cliente.</div>
    }

    return (
      <div className={styles.detail}>
        <section className={styles.profileCard}>
          <div className={styles.avatar} aria-hidden="true">
            {visibleAvatarUrl ? (
              <img
                alt=""
                className={styles.avatarImage}
                src={visibleAvatarUrl}
              />
            ) : (
              customer.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h4>{customer.name}</h4>
            <p>
              {customer.balance > 0
                ? `${formatCurrency(customer.balance)} pendiente por cobrar`
                : 'Cliente al dia'}
            </p>
          </div>
        </section>

        <nav
          className={styles.detailTabs}
          aria-label="Secciones del cliente"
          role="tablist"
        >
          <button
            aria-selected={detailTab === 'summary'}
            className={
              detailTab === 'summary' ? styles.detailTabActive : undefined
            }
            role="tab"
            type="button"
            onClick={() => setDetailTab('summary')}
          >
            Resumen
          </button>
          <button
            aria-selected={detailTab === 'receivables'}
            className={
              detailTab === 'receivables' ? styles.detailTabActive : undefined
            }
            role="tab"
            type="button"
            onClick={() => setDetailTab('receivables')}
          >
            Por cobrar
            <span>{pendingReceivables.length}</span>
          </button>
          <button
            aria-selected={detailTab === 'payments'}
            className={
              detailTab === 'payments' ? styles.detailTabActive : undefined
            }
            role="tab"
            type="button"
            onClick={() => setDetailTab('payments')}
          >
            Abonos
            <span>{paymentMovements.length + pendingPaymentReports.length}</span>
          </button>
          <button
            aria-selected={detailTab === 'history'}
            className={
              detailTab === 'history' ? styles.detailTabActive : undefined
            }
            role="tab"
            type="button"
            onClick={() => setDetailTab('history')}
          >
            Historial
            <span>{customer.purchaseHistory.length}</span>
          </button>
        </nav>

        {detailTab === 'summary' ? (
          <>
            <section
              className={styles.infoGrid}
              aria-label="Informacion de contacto"
            >
              <InfoItem icon={<Phone />} label="Celular" value={customer.phone} />
              <InfoItem icon={<Mail />} label="Correo" value={customer.email} />
              <InfoItem
                icon={<Hash />}
                label="Documento"
                value={
                  customer.documentNumber
                    ? `${customer.documentType ?? 'Documento'} ${customer.documentNumber}`
                    : null
                }
              />
              <InfoItem
                icon={<MapPin />}
                label="Direccion"
                value={customer.address}
              />
            </section>

            <section className={styles.behaviorGrid} aria-label="Comportamiento">
              <MetricTile
                icon={<TrendingUp />}
                label="Compras"
                value={customer.purchaseCount.toString()}
              />
              <MetricTile
                icon={<ReceiptText />}
                label="Ticket promedio"
                value={formatCurrency(averageTicket)}
              />
              <MetricTile
                icon={<Banknote />}
                label="Abonos registrados"
                value={formatCurrency(totalPaymentsRecorded)}
              />
              <MetricTile
                icon={<CalendarClock />}
                label="Ultima compra"
                value={
                  customer.lastPurchaseAt
                    ? formatDate(customer.lastPurchaseAt)
                    : 'Sin compras'
                }
              />
            </section>

            <section className={styles.accountSummary}>
              <div>
                <span>Saldo pendiente</span>
                <strong>{formatCurrency(totalOutstanding)}</strong>
                <small>
                  {pendingReceivables.length}{' '}
                  {pendingReceivables.length === 1
                    ? 'factura pendiente'
                    : 'facturas pendientes'}
                </small>
              </div>
              <div className={styles.accountSummaryActions}>
                {pendingReceivables.length > 0 ? (
                  <button
                    className={styles.payAllButton}
                    type="button"
                    onClick={handlePayAll}
                  >
                    <Banknote aria-hidden="true" />
                    Pagar todo
                  </button>
                ) : null}
                <button type="button" onClick={() => setDetailTab('receivables')}>
                  Ver cuentas
                </button>
                <button type="button" onClick={() => setDetailTab('history')}>
                  Ver historial
                </button>
                <button type="button" onClick={() => setDetailTab('payments')}>
                  Ver abonos
                </button>
              </div>
            </section>
          </>
        ) : null}

        {detailTab === 'receivables' ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h4>Cuentas por cobrar</h4>
            <div className={styles.sectionHeaderActions}>
              <span>{pendingReceivables.length.toString()} pendientes</span>
              {pendingReceivables.length > 0 ? (
                <>
                  <button
                    className={styles.payAllButton}
                    type="button"
                    onClick={handlePayAll}
                  >
                    <Banknote aria-hidden="true" />
                    Pagar todo · {formatCurrency(totalOutstanding)}
                  </button>
                  <button
                    className={styles.generalReminderButton}
                    type="button"
                    onClick={handleStartGeneralReminder}
                  >
                    <MessageCircle aria-hidden="true" />
                    Recordatorio general
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {isGeneralReminderOpen ? (
            <div className={styles.reminderComposer}>
              <div className={styles.reminderHeader}>
                <div>
                  <h4>Recordatorio general de cobro</h4>
                  <p>
                    {pendingReceivables.length}{' '}
                    {pendingReceivables.length === 1 ? 'cuenta' : 'cuentas'} ·{' '}
                    saldo total {formatCurrency(totalOutstanding)}
                  </p>
                </div>
                <button
                  aria-label="Cerrar recordatorio"
                  className={styles.reminderClose}
                  type="button"
                  onClick={() => setGeneralReminderOpen(false)}
                >
                  ×
                </button>
              </div>

              <label className={styles.field}>
                <span>Mensaje para el cliente</span>
                <textarea
                  className={styles.textarea}
                  rows={8}
                  value={reminderMessage}
                  onChange={(event) => {
                    setReminderMessage(event.target.value)
                    setReminderFeedback(null)
                  }}
                />
              </label>

              <div className={styles.statementPanel}>
                <div>
                  <strong>Estado de cuenta consolidado</strong>
                  <p>
                    Incluye cada venta pendiente, sus productos, abonos y saldo,
                    sin mezclar sus números de factura.
                  </p>
                </div>
                <div className={styles.statementActions}>
                  <button
                    className={styles.shareStatementButton}
                    disabled={Boolean(activeDocumentId)}
                    type="button"
                    onClick={() => void handleShareCustomerStatement()}
                  >
                    <Share2 aria-hidden="true" />
                    {activeDocumentId === 'statement:share'
                      ? 'Preparando…'
                      : 'Compartir PDF'}
                  </button>
                  <button
                    disabled={Boolean(activeDocumentId)}
                    type="button"
                    onClick={() => void handleCustomerStatement('download')}
                  >
                    <Download aria-hidden="true" />
                    {activeDocumentId === 'statement:download'
                      ? 'Generando…'
                      : 'Descargar PDF'}
                  </button>
                  <button
                    disabled={Boolean(activeDocumentId)}
                    type="button"
                    onClick={() => void handleCustomerStatement('print')}
                  >
                    <Printer aria-hidden="true" />
                    {activeDocumentId === 'statement:print'
                      ? 'Generando…'
                      : 'Imprimir'}
                  </button>
                </div>
              </div>

              <div className={styles.reminderActions}>
                {customer.phone ? (
                  <a
                    className={styles.whatsAppButton}
                    href={`https://wa.me/${normalizeWhatsAppPhone(customer.phone)}?text=${encodeURIComponent(reminderMessage)}`}
                    rel="noreferrer"
                    target="_blank"
                    onClick={() => void handleRecordReminder('WHATSAPP')}
                  >
                    <MessageCircle aria-hidden="true" />
                    Abrir WhatsApp
                  </a>
                ) : (
                  <button
                    className={styles.disabledContactButton}
                    disabled
                    type="button"
                  >
                    Sin celular registrado
                  </button>
                )}

                {customer.email ? (
                  <a
                    className={styles.emailButton}
                    href={`mailto:${customer.email}?subject=${encodeURIComponent(`Recordatorio de pago · ${receiptBrand.businessName}`)}&body=${encodeURIComponent(reminderMessage)}`}
                    onClick={() => void handleRecordReminder('EMAIL')}
                  >
                    <Send aria-hidden="true" />
                    Preparar correo
                  </a>
                ) : (
                  <button
                    className={styles.disabledContactButton}
                    disabled
                    type="button"
                  >
                    Sin correo registrado
                  </button>
                )}
              </div>

              {customer.email && canSendConfirmedEmail ? (
                <button
                  className={styles.sendEmailButton}
                  disabled={
                    isEmailSubmitting || reminderMessage.trim().length === 0
                  }
                  type="button"
                  onClick={() => void handleSendReminderEmail()}
                >
                  <Send aria-hidden="true" />
                  {isEmailSubmitting
                    ? 'Enviando correo y PDF…'
                    : 'Enviar correo + PDF con CashGo'}
                </button>
              ) : customer.email ? (
                <p className={styles.deliveryNotice}>
                  El envío directo aún no está configurado. Usa “Preparar
                  correo” para enviarlo desde tu aplicación de correo.
                </p>
              ) : null}

              <button
                className={styles.copyReminderButton}
                type="button"
                onClick={() => void handleCopyReminder()}
              >
                Copiar mensaje
              </button>
              {reminderFeedback ? (
                <p className={styles.reminderFeedback} aria-live="polite">
                  {reminderFeedback}
                </p>
              ) : null}
            </div>
          ) : null}

          {pendingReceivables.length > 0 ? (
            <div className={styles.receivableList}>
              {pendingReceivables.map((receivable) => (
                <ReceivableCard
                  key={receivable.id}
                  receivable={receivable}
                  purchase={purchasesBySaleId.get(receivable.saleId) ?? null}
                  isDocumentBusy={activeDocumentId?.startsWith(`${receivable.saleId}:`) ?? false}
                  isPaymentCorrectionSubmitting={
                    isPaymentCorrectionSubmitting
                  }
                  onDownload={() =>
                    void handleSaleDocument(
                      receivable.saleId,
                      receivable.saleNumber,
                      'download',
                    )
                  }
                  onEditTerms={handleStartTermsEdit}
                  onPrint={() =>
                    void handleSaleDocument(
                      receivable.saleId,
                      receivable.saleNumber,
                      'print',
                    )
                  }
                  onPromise={handleStartPromise}
                  onPaymentReceipt={(paymentId, action) =>
                    void handleSavedPaymentReceipt(
                      paymentId,
                      receivable.saleNumber,
                      action,
                    )
                  }
                  onUpdatePaymentMethod={onUpdatePaymentMethod}
                  onShare={() => void handleShareReceivable(receivable)}
                />
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>
              Este cliente no tiene cuentas pendientes por pagar.
            </p>
          )}

          {settledReceivables.length > 0 ? (
            <details className={styles.settledAccounts}>
              <summary>
                Ver cuentas pagadas ({settledReceivables.length})
              </summary>
              <div className={styles.receivableList}>
                {settledReceivables.map((receivable) => (
                  <ReceivableCard
                    key={receivable.id}
                    receivable={receivable}
                    purchase={purchasesBySaleId.get(receivable.saleId) ?? null}
                    isDocumentBusy={activeDocumentId?.startsWith(`${receivable.saleId}:`) ?? false}
                    isPaymentCorrectionSubmitting={isPaymentCorrectionSubmitting}
                    onDownload={() =>
                      void handleSaleDocument(
                        receivable.saleId,
                        receivable.saleNumber,
                        'download',
                      )
                    }
                    onEditTerms={handleStartTermsEdit}
                    onPrint={() =>
                      void handleSaleDocument(
                        receivable.saleId,
                        receivable.saleNumber,
                        'print',
                      )
                    }
                    onPromise={handleStartPromise}
                    onPaymentReceipt={(paymentId, action) =>
                      void handleSavedPaymentReceipt(
                        paymentId,
                        receivable.saleNumber,
                        action,
                      )
                    }
                    onUpdatePaymentMethod={onUpdatePaymentMethod}
                    onShare={() => void handleShareReceivable(receivable)}
                  />
                ))}
              </div>
            </details>
          ) : null}

          {documentFeedback ? (
            <p className={styles.documentFeedback} aria-live="polite">
              {documentFeedback}
            </p>
          ) : null}

          {promiseReceivable ? (
            <form
              className={styles.promiseComposer}
              onSubmit={handleSubmitPromise}
            >
              <div className={styles.reminderHeader}>
                <div>
                  <h4>Compromiso de pago</h4>
                  <p>
                    {promiseReceivable.saleNumber} · documenta la fecha y el
                    valor acordados con el cliente.
                  </p>
                </div>
                <button
                  aria-label="Cerrar compromiso de pago"
                  className={styles.reminderClose}
                  type="button"
                  onClick={() => setPromiseReceivableId(null)}
                >
                  ×
                </button>
              </div>

              <div className={styles.promiseFields}>
                <label className={styles.field}>
                  <span>Fecha prometida</span>
                  <input
                    className={styles.input}
                    min={new Date().toISOString().slice(0, 10)}
                    required
                    type="date"
                    value={promiseForm.promisedDate}
                    onChange={(event) =>
                      setPromiseForm((current) => ({
                        ...current,
                        promisedDate: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Valor prometido</span>
                  <input
                    className={styles.input}
                    max={promiseReceivable.balance}
                    min="0.01"
                    required
                    step="0.01"
                    type="number"
                    value={promiseForm.promisedAmount}
                    onChange={(event) =>
                      setPromiseForm((current) => ({
                        ...current,
                        promisedAmount: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label className={styles.field}>
                <span>Nota del acuerdo</span>
                <textarea
                  className={styles.textarea}
                  maxLength={1000}
                  placeholder="Ej. El cliente confirma pago por transferencia"
                  rows={3}
                  value={promiseForm.notes}
                  onChange={(event) =>
                    setPromiseForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>

              {promiseError ? (
                <p className={styles.errorMessage} role="alert">
                  {promiseError}
                </p>
              ) : null}

              <div className={styles.termsActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => setPromiseReceivableId(null)}
                >
                  Cancelar
                </button>
                <button
                  className={styles.primaryButton}
                  disabled={isActivitySubmitting}
                  type="submit"
                >
                  {isActivitySubmitting ? 'Guardando...' : 'Guardar compromiso'}
                </button>
              </div>
            </form>
          ) : null}

          {termsReceivable ? (
            <form className={styles.termsComposer} onSubmit={handleSubmitTerms}>
              <div className={styles.reminderHeader}>
                <div>
                  <h4>Condiciones de cobro</h4>
                  <p>
                    {termsReceivable.saleNumber} · ajusta el vencimiento y la
                    nota interna.
                  </p>
                </div>
                <button
                  aria-label="Cerrar condiciones de cobro"
                  className={styles.reminderClose}
                  type="button"
                  onClick={() => setTermsReceivableId(null)}
                >
                  ×
                </button>
              </div>

              <label className={styles.field}>
                <span>Fecha de vencimiento</span>
                <input
                  className={styles.input}
                  type="date"
                  value={termsForm.dueDate}
                  onChange={(event) =>
                    setTermsForm((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Nota interna</span>
                <textarea
                  className={styles.textarea}
                  maxLength={255}
                  placeholder="Acuerdo, plazo o detalle para el equipo"
                  rows={3}
                  value={termsForm.notes}
                  onChange={(event) =>
                    setTermsForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>

              {termsError ? (
                <p className={styles.errorMessage} role="alert">
                  {termsError}
                </p>
              ) : null}

              <div className={styles.termsActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => setTermsReceivableId(null)}
                >
                  Cancelar
                </button>
                <button
                  className={styles.primaryButton}
                  disabled={isTermsSubmitting}
                  type="submit"
                >
                  {isTermsSubmitting ? 'Guardando...' : 'Guardar condiciones'}
                </button>
              </div>
            </form>
          ) : null}
        </section>
        ) : null}

        {detailTab === 'payments' ? (
          <section className={styles.section}>
            {pendingPaymentReports.length > 0 ? (
              <div className={styles.paymentReportQueue}>
                <div>
                  <h4>Comprobantes por revisar</h4>
                  <p>
                    Confirma que el dinero sí llegó antes de aprobar. La deuda
                    todavía no se ha modificado.
                  </p>
                </div>
                {pendingPaymentReports.map(({ report, receivable }) => (
                  <article key={report.id}>
                    <div>
                      <span>{receivable.saleNumber}</span>
                      <strong>{formatCurrency(report.amount)}</strong>
                      <small>{formatDateTime(report.createdAt)} · Nequi / Daviplata</small>
                    </div>
                    <a
                      href={resolveApiAssetUrl(report.proofUrl) ?? undefined}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ReceiptText /> Ver comprobante
                    </a>
                    <button
                      disabled={reviewingReportId === report.id}
                      onClick={() => void handleReviewPaymentReport(report.id, false)}
                      type="button"
                    >
                      Rechazar
                    </button>
                    <button
                      disabled={reviewingReportId === report.id}
                      onClick={() => void handleReviewPaymentReport(report.id, true)}
                      type="button"
                    >
                      <ShieldCheck /> Confirmar abono
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
            <div className={styles.sectionHeader}>
              <div>
                <h4>Historial de abonos</h4>
                <p className={styles.sectionDescription}>
                  Todos los pagos registrados para este cliente, del más
                  reciente al más antiguo.
                </p>
              </div>
              <div className={styles.sectionHeaderActions}>
                <span>
                  {paymentMovements.length}{' '}
                  {paymentMovements.length === 1 ? 'movimiento' : 'movimientos'} ·{' '}
                  {formatCurrency(totalPaymentsRecorded)}
                </span>
              </div>
            </div>

            {paymentMovements.length > 0 ? (
              <div className={styles.customerPaymentList}>
                {paymentMovements.map((movement, movementIndex) => {
                  const movementMethodLabel =
                    COLLECTED_PAYMENT_METHOD_OPTIONS.find(
                      (option) => option.value === movement.method,
                    )?.label ?? movement.method

                  return (
                    <article className={styles.paymentMovementCard} key={movement.id}>
                      <div className={styles.paymentMovementHeader}>
                        <div>
                          <span>Movimiento de abono #{paymentMovements.length - movementIndex}</span>
                          <strong>{formatCurrency(movement.amount)}</strong>
                        </div>
                        <div>
                          <span>{formatDateTime(movement.createdAt)}</span>
                          <strong>{movementMethodLabel}</strong>
                          <small>
                            Cubrió {movement.entries.length}{' '}
                            {movement.entries.length === 1 ? 'factura' : 'facturas'}
                          </small>
                        </div>
                      </div>
                      {movement.reference || movement.notes ? (
                        <div className={styles.paymentMovementNotes}>
                          {movement.reference ? <span>Referencia: {movement.reference}</span> : null}
                          {movement.notes ? <span>Nota: {movement.notes}</span> : null}
                        </div>
                      ) : null}
                      <div className={styles.paymentMovementInvoices}>
                        {movement.entries.map(({
                          payment,
                          receivable,
                          purchase,
                          productAllocations,
                          unassignedAmount,
                          balanceAfterPayment,
                        }) => {
                    const isReceiptBusy =
                      activeDocumentId?.startsWith(
                        `saved-payment:${payment.id}:`,
                      ) ?? false
                    const methodLabel =
                      COLLECTED_PAYMENT_METHOD_OPTIONS.find(
                        (option) => option.value === payment.method,
                      )?.label ?? payment.method

                    return (
                      <section
                        className={styles.customerPaymentCard}
                        key={payment.id}
                      >
                        <div className={styles.customerPaymentHeader}>
                          <div>
                            <span>Aplicado a {receivable.saleNumber}</span>
                            <strong>{formatCurrency(payment.amount)}</strong>
                          </div>
                          <span className={styles.paymentStatusPill}>
                            Registrado
                          </span>
                        </div>

                        <div className={styles.customerPaymentDetails}>
                          <div>
                            <span>Fecha y hora</span>
                            <strong>{formatDateTime(payment.createdAt)}</strong>
                          </div>
                          <div>
                            <span>Medio de pago</span>
                            <strong>{methodLabel}</strong>
                          </div>
                          <div>
                            <span>Total de la factura</span>
                            <strong>{formatCurrency(receivable.amount)}</strong>
                          </div>
                          <div>
                            <span>Saldo después del abono</span>
                            <strong>
                              {formatCurrency(balanceAfterPayment)}
                            </strong>
                          </div>
                        </div>

                        {payment.reference || payment.notes ? (
                          <div className={styles.customerPaymentNotes}>
                            {payment.reference ? (
                              <p>
                                <strong>Referencia:</strong>{' '}
                                {payment.reference}
                              </p>
                            ) : null}
                            {payment.notes ? (
                              <p>
                                <strong>Nota:</strong> {payment.notes}
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        {productAllocations.length > 0 ? (
                          <div className={styles.paymentApplication}>
                            <div className={styles.paymentApplicationHeader}>
                              <div>
                                <strong>Qué cubrió este abono</strong>
                                <span>
                                  Distribución automática siguiendo el orden de
                                  los productos de la factura.
                                </span>
                              </div>
                              <strong>{formatCurrency(payment.amount)}</strong>
                            </div>
                            <div className={styles.paymentApplicationList}>
                              {productAllocations.map((allocation) => (
                                <div
                                  className={styles.paymentApplicationItem}
                                  key={`${payment.id}:allocation:${allocation.product.productId}`}
                                >
                                  <div>
                                    <strong>{allocation.product.name}</strong>
                                    <span>
                                      {allocation.product.quantity} ×{' '}
                                      {formatCurrency(
                                        allocation.product.unitPrice,
                                      )}
                                    </span>
                                  </div>
                                  <div>
                                    <strong>
                                      {formatCurrency(allocation.appliedAmount)}
                                    </strong>
                                    <span
                                      className={
                                        allocation.remainingAfterPayment > 0
                                          ? styles.paymentCoveragePartial
                                          : styles.paymentCoverageComplete
                                      }
                                    >
                                      {allocation.remainingAfterPayment > 0
                                        ? `Parcial · faltan ${formatCurrency(allocation.remainingAfterPayment)}`
                                        : 'Cubierto completamente'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {unassignedAmount > 0 ? (
                                <div className={styles.paymentApplicationItem}>
                                  <div>
                                    <strong>Otros cargos de la factura</strong>
                                    <span>
                                      Impuestos, domicilio u otros conceptos.
                                    </span>
                                  </div>
                                  <div>
                                    <strong>
                                      {formatCurrency(unassignedAmount)}
                                    </strong>
                                    <span>Cubierto con este abono</span>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {purchase && purchase.products.length > 0 ? (
                          <details className={styles.receivableProducts}>
                            <summary>
                              <span className={styles.receivableProductsTitle}>
                                <ReceiptText aria-hidden="true" />
                                Productos de la factura
                              </span>
                              <span>
                                {purchase.itemCount}{' '}
                                {purchase.itemCount === 1
                                  ? 'producto'
                                  : 'productos'}
                              </span>
                              <ChevronDown aria-hidden="true" />
                            </summary>
                            <div className={styles.receivableProductList}>
                              {purchase.products.map((product) => (
                                <div
                                  className={styles.receivableProduct}
                                  key={`${payment.id}:${product.productId}`}
                                >
                                  <div>
                                    <strong>
                                      {product.quantity} × {product.name}
                                    </strong>
                                    <span>
                                      {formatCurrency(product.unitPrice)} c/u
                                      {product.sku
                                        ? ` · SKU ${product.sku}`
                                        : ''}
                                    </span>
                                  </div>
                                  <strong>
                                    {formatCurrency(product.subtotal)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : null}

                        <div className={styles.customerPaymentActions}>
                          <button
                            disabled={isReceiptBusy}
                            type="button"
                            onClick={() =>
                              void handleSavedPaymentReceipt(
                                payment.id,
                                receivable.saleNumber,
                                'share',
                              )
                            }
                          >
                            <Share2 aria-hidden="true" /> Compartir
                          </button>
                          <button
                            disabled={isReceiptBusy}
                            type="button"
                            onClick={() =>
                              void handleSavedPaymentReceipt(
                                payment.id,
                                receivable.saleNumber,
                                'print',
                              )
                            }
                          >
                            <Printer aria-hidden="true" /> Imprimir
                          </button>
                          <button
                            disabled={isReceiptBusy}
                            type="button"
                            onClick={() =>
                              void handleSavedPaymentReceipt(
                                payment.id,
                                receivable.saleNumber,
                                'download',
                              )
                            }
                          >
                            <Download aria-hidden="true" />
                            {isReceiptBusy ? 'Preparando…' : 'Descargar PDF'}
                          </button>
                        </div>
                      </section>
                    )
                        })}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className={styles.emptyText}>
                Este cliente todavía no tiene abonos registrados.
              </p>
            )}
          </section>
        ) : null}

        {detailTab === 'history' ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h4>Historial de compras</h4>
            <div className={styles.sectionHeaderActions}>
              <span>{customer.purchaseHistory.length.toString()} ventas</span>
              {customer.purchaseHistory.length > 0 ? (
                <>
                  <button
                    className={styles.generalReminderButton}
                    disabled={Boolean(activeDocumentId)}
                    type="button"
                    onClick={() =>
                      void handleCustomerPurchaseHistory('download')
                    }
                  >
                    <Download aria-hidden="true" />
                    {activeDocumentId === 'purchase-history:download'
                      ? 'Generando…'
                      : 'Descargar historial'}
                  </button>
                  <button
                    className={styles.generalReminderButton}
                    disabled={Boolean(activeDocumentId)}
                    type="button"
                    onClick={() => void handleCustomerPurchaseHistory('print')}
                  >
                    <Printer aria-hidden="true" />
                    {activeDocumentId === 'purchase-history:print'
                      ? 'Generando…'
                      : 'Imprimir historial'}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {customer.purchaseHistory.length > 0 ? (
            <div className={styles.historyList}>
              {customer.purchaseHistory.map((purchase) => (
                <article key={purchase.saleId} className={styles.historyItem}>
                  <div className={styles.historyHeader}>
                    <div>
                      <strong>{purchase.saleNumber}</strong>
                      <span>
                        {formatDateTime(purchase.createdAt)} ·{' '}
                        {purchase.itemCount}{' '}
                        {purchase.itemCount === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>
                    <strong>{formatCurrency(purchase.total)}</strong>
                  </div>
                  <div className={styles.historyProducts}>
                    {purchase.products.map((product) => (
                      <div
                        className={styles.historyProduct}
                        key={`${purchase.saleId}:${product.productId}`}
                      >
                        <div>
                          <strong>{product.name}</strong>
                          <span>
                            {product.quantity} ×{' '}
                            {formatCurrency(product.unitPrice)}
                            {product.sku ? ` · SKU ${product.sku}` : ''}
                          </span>
                        </div>
                        <strong>{formatCurrency(product.subtotal)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className={styles.invoiceActions}>
                    <button
                      disabled={activeDocumentId?.startsWith(`${purchase.saleId}:`) ?? false}
                      type="button"
                      onClick={() =>
                        void handleSaleDocument(
                          purchase.saleId,
                          purchase.saleNumber,
                          'download',
                        )
                      }
                    >
                      <Download aria-hidden="true" />
                      Descargar factura
                    </button>
                    <button
                      disabled={activeDocumentId?.startsWith(`${purchase.saleId}:`) ?? false}
                      type="button"
                      onClick={() =>
                        void handleSaleDocument(
                          purchase.saleId,
                          purchase.saleNumber,
                          'print',
                        )
                      }
                    >
                      <Printer aria-hidden="true" />
                      Imprimir factura
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>
              Cuando el cliente compre, aqui veras su historial.
            </p>
          )}
        </section>
        ) : null}

        {detailTab === 'receivables' && pendingReceivables.length > 0 ? (
          <form
            className={styles.paymentForm}
            id="customer-payment-form"
            onSubmit={handleRegisterPayment}
          >
            <div className={styles.sectionHeader}>
              <div>
                <h4>{isOldestPayment ? 'Pagar saldo pendiente' : 'Registrar abono'}</h4>
                <p className={styles.sectionDescription}>
                  {isOldestPayment
                    ? 'El pago se distribuirá entre las facturas más antiguas.'
                    : 'Registra un pago parcial o total de una factura.'}
                </p>
              </div>
              <span>Genera comprobante al guardar</span>
            </div>

            <label className={styles.field}>
              <span>Cuenta por cobrar</span>
              <SearchableSelect
                className={styles.input}
                value={paymentForm.receivableId}
                onChange={(event) => {
                  const receivable = pendingReceivables.find(
                    (item) => item.id === event.target.value,
                  )

                  setPaymentForm((currentForm) => ({
                    ...currentForm,
                    receivableId: event.target.value,
                    amount: receivable ? String(receivable.balance) : '',
                  }))
                }}
              >
                {pendingReceivables.map((receivable) => (
                  <option key={receivable.id} value={receivable.id}>
                    {receivable.saleNumber} -{' '}
                    {formatCurrency(receivable.balance)}
                  </option>
                ))}
                <option value={OLDEST_RECEIVABLE_OPTION}>
                  Distribuir pago entre las facturas más antiguas
                </option>
              </SearchableSelect>
            </label>

            {isOldestPayment ? (
              <p className={styles.paymentAllocationNotice}>
                El valor se aplicará primero a la venta pendiente más antigua y,
                si sobra, continuará en la siguiente. Saldo total:{' '}
                <strong>{formatCurrency(totalOutstanding)}</strong>.
              </p>
            ) : null}

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Valor recibido</span>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    updatePaymentValue('amount', event.target.value)
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Medio de pago</span>
                <SearchableSelect
                  className={styles.input}
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm((currentForm) => ({
                      ...currentForm,
                      method: event.target.value as CustomerPaymentMethod,
                    }))
                  }
                >
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SearchableSelect>
              </label>
            </div>

            <label className={styles.field}>
              <span>Referencia</span>
              <input
                className={styles.input}
                placeholder="Numero, codigo o soporte"
                value={paymentForm.reference}
                onChange={(event) =>
                  updatePaymentValue('reference', event.target.value)
                }
              />
            </label>

            <label className={styles.field}>
              <span>Nota del comprobante</span>
              <textarea
                className={styles.textarea}
                placeholder="Agrega una nota para el comprobante"
                value={paymentForm.notes}
                onChange={(event) =>
                  updatePaymentValue('notes', event.target.value)
                }
              />
            </label>

            {paymentError ? (
              <p className={styles.errorMessage}>{paymentError}</p>
            ) : null}
            {submitError ? (
              <p className={styles.errorMessage}>
                {getErrorMessage(
                  submitError,
                  'No pudimos registrar el abono. Intenta otra vez.',
                )}
              </p>
            ) : null}

            <button
              className={styles.primaryButton}
              disabled={isPaymentSubmitting}
              type="submit"
            >
              {isPaymentSubmitting ? 'Registrando...' : 'Registrar abono'}
            </button>
          </form>
        ) : null}

        {detailTab === 'receivables' ? (
        <section className={styles.receiptPanel}>
          {lastReceipt ? (
            <div className={styles.paymentSuccess} role="status">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>Abono guardado correctamente</strong>
                <span>
                  {formatCurrency(lastReceipt.amount)} aplicado a{' '}
                  {lastReceipt.saleNumbers.length}{' '}
                  {lastReceipt.saleNumbers.length === 1
                    ? 'factura'
                    : 'facturas'}
                  .
                </span>
              </div>
            </div>
          ) : null}
          <div>
            <h4>Comprobantes de pago</h4>
            <p>
              {lastReceipt
                ? 'El comprobante del ultimo abono esta listo.'
                : 'Registra un abono para imprimir o descargar el comprobante.'}
            </p>
          </div>

          <div className={styles.receiptActions}>
            <button
              className={styles.secondaryButton}
              disabled={!lastReceipt || activeDocumentId === 'payment:share'}
              type="button"
              onClick={() => void handleShareLatestPaymentReceipt()}
            >
              <Share2 aria-hidden="true" />
              {activeDocumentId === 'payment:share'
                ? 'Preparando...'
                : 'Compartir con el cliente'}
            </button>
            <button
              className={styles.secondaryButton}
              disabled={!lastReceipt}
              type="button"
              onClick={() => {
                if (lastReceipt) {
                  void handlePaymentReceipts('print')
                }
              }}
            >
              Imprimir comprobante
            </button>
            <button
              className={styles.secondaryButton}
              disabled={!lastReceipt}
              type="button"
              onClick={() => {
                if (lastReceipt) {
                  void handlePaymentReceipts('download')
                }
              }}
            >
              Descargar comprobante
            </button>
          </div>
        </section>
        ) : null}
      </div>
    )
  }

  return (
    <SideDrawer
      bodyClassName={styles.drawerBody}
      confirmClose={mode !== 'detail'}
      footer={
        mode === 'detail' && customer ? (
          <DrawerActionFooter>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => onModeChange('edit')}
            >
              Editar cliente
            </button>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={onClose}
            >
              Listo
            </button>
          </DrawerActionFooter>
        ) : null
      }
      isOpen={isOpen && !isSuspended}
      panelClassName={styles.drawerPanel}
      title={drawerTitle}
      onClose={onClose}
    >
      {mode === 'detail' ? renderDetail() : renderForm()}
    </SideDrawer>
  )
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string | null
}) {
  return (
    <article className={styles.infoItem}>
      <span className={styles.infoIcon}>{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value ?? 'Sin registrar'}</strong>
      </div>
    </article>
  )
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <article className={styles.metricTile}>
      <span className={styles.metricIcon}>{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function ReceivableCard({
  receivable,
  purchase,
  isDocumentBusy,
  isPaymentCorrectionSubmitting,
  onDownload,
  onEditTerms,
  onPrint,
  onPaymentReceipt,
  onPromise,
  onShare,
  onUpdatePaymentMethod,
}: {
  receivable: CustomerReceivable
  purchase: CustomerPurchaseHistoryItem | null
  isDocumentBusy: boolean
  isPaymentCorrectionSubmitting: boolean
  onDownload: () => void
  onEditTerms: (receivable: CustomerReceivable) => void
  onPrint: () => void
  onPaymentReceipt: (
    paymentId: string,
    action: 'download' | 'print' | 'share',
  ) => void
  onPromise: (receivable: CustomerReceivable) => void
  onShare: () => void
  onUpdatePaymentMethod: (
    paymentId: string,
    input: CustomerPaymentMethodCorrectionInput,
  ) => Promise<CustomerReceivable>
}) {
  const isPaid = receivable.balance <= 0
  const [correctionPaymentId, setCorrectionPaymentId] = useState<string | null>(
    null,
  )
  const [correctionMethod, setCorrectionMethod] =
    useState<CustomerPaymentMethod>('CASH')
  const [correctionReason, setCorrectionReason] = useState('')
  const [correctionError, setCorrectionError] = useState<string | null>(null)

  function startPaymentMethodCorrection(
    paymentId: string,
    currentMethod: CustomerPaymentMethod,
  ) {
    setCorrectionPaymentId(paymentId)
    setCorrectionMethod(currentMethod)
    setCorrectionReason('')
    setCorrectionError(null)
  }

  function closePaymentMethodCorrection() {
    setCorrectionPaymentId(null)
    setCorrectionReason('')
    setCorrectionError(null)
  }

  async function handlePaymentMethodCorrection(
    event: FormEvent<HTMLFormElement>,
    currentMethod: CustomerPaymentMethod,
  ) {
    event.preventDefault()

    if (!correctionPaymentId) return

    if (correctionMethod === currentMethod) {
      setCorrectionError('Selecciona un medio de pago diferente.')
      return
    }

    if (correctionReason.trim().length < 3) {
      setCorrectionError('Escribe el motivo de la corrección.')
      return
    }

    setCorrectionError(null)

    try {
      await onUpdatePaymentMethod(correctionPaymentId, {
        method: correctionMethod,
        reason: correctionReason.trim(),
      })
      closePaymentMethodCorrection()
    } catch (error) {
      setCorrectionError(
        getErrorMessage(
          error,
          'No pudimos corregir el medio de pago. Intenta otra vez.',
        ),
      )
    }
  }

  return (
    <article
      className={joinClassNames(
        styles.receivableCard,
        isPaid && styles.receivableCardPaid,
      )}
    >
      <div className={styles.receivableTop}>
        <div>
          <strong>{receivable.saleNumber}</strong>
          <span>{formatDateTime(receivable.createdAt)}</span>
        </div>
        <span
          className={joinClassNames(
            styles.statusPill,
            isPaid && styles.statusPillPaid,
          )}
        >
          {getStatusLabel(receivable.status)}
        </span>
      </div>

      <div className={styles.receivableAmounts}>
        <span>Total {formatCurrency(receivable.amount)}</span>
        <span>Abonado {formatCurrency(receivable.paidAmount)}</span>
        <strong>Saldo {formatCurrency(receivable.balance)}</strong>
      </div>

      {purchase && purchase.products.length > 0 ? (
        <details
          className={styles.receivableProducts}
        >
          <summary>
            <span className={styles.receivableProductsTitle}>
              <ReceiptText aria-hidden="true" />
              Productos y valores
            </span>
            <span>
              {purchase.itemCount}{' '}
              {purchase.itemCount === 1 ? 'producto' : 'productos'}
            </span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <div className={styles.receivableProductList}>
            {purchase.products.map((product) => (
              <div
                className={styles.receivableProduct}
                key={`${purchase.saleId}:${product.productId}`}
              >
                <div>
                  <strong>
                    {product.quantity} × {product.name}
                  </strong>
                  <span>
                    {formatCurrency(product.unitPrice)} c/u
                    {product.sku ? ` · SKU ${product.sku}` : ''}
                  </span>
                </div>
                <strong>{formatCurrency(product.subtotal)}</strong>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {receivable.dueDate ? (
        <p className={styles.receivableDue}>
          Vence el {formatReceivableDueDate(receivable.dueDate)}
        </p>
      ) : null}

      <div className={styles.invoiceActions}>
        {!isPaid ? (
          <button disabled={isDocumentBusy} type="button" onClick={onShare}>
            <Share2 aria-hidden="true" />
            Compartir por WhatsApp
          </button>
        ) : null}
        <button disabled={isDocumentBusy} type="button" onClick={onDownload}>
          <Download aria-hidden="true" />
          Descargar factura
        </button>
        <button disabled={isDocumentBusy} type="button" onClick={onPrint}>
          <Printer aria-hidden="true" />
          Imprimir factura
        </button>
      </div>

      {!isPaid ? (
        <div className={styles.receivableActions}>
          <button
            className={styles.termsButton}
            type="button"
            onClick={() => onEditTerms(receivable)}
          >
            <CalendarDays aria-hidden="true" />
            Editar vencimiento
          </button>
          <button
            className={styles.promiseButton}
            type="button"
            onClick={() => onPromise(receivable)}
          >
            <Handshake aria-hidden="true" />
            Registrar compromiso
          </button>
        </div>
      ) : null}

      {receivable.payments.length > 0 ? (
        <div className={styles.paymentHistory}>
          <strong>Abonos registrados</strong>
          {receivable.payments.map((payment) => (
            <div className={styles.paymentHistoryItem} key={payment.id}>
              <div>
                <strong>{formatCurrency(payment.amount)}</strong>
                <span>
                  {formatDateTime(payment.createdAt)} ·{' '}
                  {COLLECTED_PAYMENT_METHOD_OPTIONS.find(
                    (option) => option.value === payment.method,
                  )?.label ?? payment.method}
                </span>
              </div>
              <div className={styles.paymentReceiptActions}>
                <button
                  type="button"
                  onClick={() => onPaymentReceipt(payment.id, 'share')}
                >
                  <Share2 aria-hidden="true" />
                  Compartir
                </button>
                <button
                  type="button"
                  onClick={() =>
                    startPaymentMethodCorrection(payment.id, payment.method)
                  }
                >
                  <Pencil aria-hidden="true" />
                  Corregir
                </button>
                <button
                  type="button"
                  onClick={() => onPaymentReceipt(payment.id, 'print')}
                >
                  <Printer aria-hidden="true" />
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => onPaymentReceipt(payment.id, 'download')}
                >
                  <Download aria-hidden="true" />
                  PDF
                </button>
              </div>
              {correctionPaymentId === payment.id ? (
                <form
                  className={styles.paymentCorrectionForm}
                  onSubmit={(event) =>
                    void handlePaymentMethodCorrection(event, payment.method)
                  }
                >
                  <strong>Corregir medio de pago</strong>
                  <label className={styles.field}>
                    <span>Medio correcto</span>
                    <SearchableSelect
                      disabled={isPaymentCorrectionSubmitting}
                      value={correctionMethod}
                      onChange={(event) =>
                        setCorrectionMethod(
                          event.target.value as CustomerPaymentMethod,
                        )
                      }
                    >
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SearchableSelect>
                  </label>
                  <label className={styles.field}>
                    <span>Motivo de la corrección *</span>
                    <input
                      className={styles.input}
                      disabled={isPaymentCorrectionSubmitting}
                      maxLength={255}
                      placeholder="Ej. El cliente pagó por Nequi"
                      value={correctionReason}
                      onChange={(event) =>
                        setCorrectionReason(event.target.value)
                      }
                    />
                  </label>
                  {correctionError ? (
                    <p className={styles.paymentCorrectionError}>
                      {correctionError}
                    </p>
                  ) : null}
                  <p className={styles.paymentCorrectionNotice}>
                    Solo se puede corregir mientras la caja donde se registró
                    el abono continúe abierta.
                  </p>
                  <div className={styles.paymentCorrectionActions}>
                    <button
                      disabled={isPaymentCorrectionSubmitting}
                      type="button"
                      onClick={closePaymentMethodCorrection}
                    >
                      Cancelar
                    </button>
                    <button
                      disabled={isPaymentCorrectionSubmitting}
                      type="submit"
                    >
                      {isPaymentCorrectionSubmitting
                        ? 'Guardando…'
                        : 'Guardar corrección'}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {receivable.collectionActivities.length > 0 ? (
        <div className={styles.collectionHistory}>
          <strong>Seguimiento de cobro</strong>
          {receivable.collectionActivities.slice(0, 3).map((activity) => (
            <div className={styles.collectionHistoryItem} key={activity.id}>
              <span>
                {activity.type === 'PAYMENT_PROMISE'
                  ? `Compromiso por ${formatCurrency(activity.promisedAmount ?? 0)}`
                  : `Recordatorio · ${getCollectionChannelLabel(activity.channel)}`}
              </span>
              <small>
                {activity.type === 'REMINDER' && activity.deliveryStatus
                  ? `${
                      activity.deliveryStatus === 'SENT'
                        ? 'Enviado'
                        : activity.deliveryStatus === 'FAILED'
                          ? 'Falló el envío'
                          : 'Preparado'
                    } · `
                  : ''}
                {activity.type === 'PAYMENT_PROMISE' && activity.promiseStatus
                  ? `${
                      activity.promiseStatus === 'FULFILLED'
                        ? 'Cumplido'
                        : activity.promiseStatus === 'BROKEN'
                          ? 'Incumplido'
                          : activity.promiseStatus === 'CANCELLED'
                            ? 'Reemplazado'
                            : 'Pendiente'
                    } · `
                  : ''}
                {activity.promisedDate
                  ? `Para ${formatDate(activity.promisedDate)} · `
                  : ''}
                {activity.createdByName ?? 'Usuario'} ·{' '}
                {formatDateTime(activity.createdAt)}
              </small>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  )
}
