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
  Hash,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  TrendingUp,
} from 'lucide-react'
import type {
  CustomerDetail,
  CustomerMutationInput,
  CustomerPaymentInput,
  CustomerPaymentMethod,
  CustomerReceivable,
} from '@/modules/customers/types/customer'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDate } from '@/shared/utils/format-date'
import { formatDateTime } from '@/shared/utils/format-date-time'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { joinClassNames } from '@/shared/utils/join-class-names'
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
  customerName: string
  saleNumber: string
  amount: number
  method: CustomerPaymentMethod
  reference: string | null
  notes: string | null
  createdAt: string
}

type RetailCustomerDrawerProps = {
  customer: CustomerDetail | null
  currentCashRegisterId: string | null
  errorMessage: string | null
  isLoading: boolean
  isOpen: boolean
  isPaymentSubmitting: boolean
  isSubmitting: boolean
  mode: RetailCustomerDrawerMode
  submitError: unknown
  onClose: () => void
  onModeChange: (mode: RetailCustomerDrawerMode) => void
  onRefresh: () => void
  onRegisterPayment: (
    receivableId: string,
    input: CustomerPaymentInput,
  ) => Promise<void>
  onSubmitCustomer: (input: CustomerMutationInput) => Promise<void>
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

const PAYMENT_METHOD_OPTIONS: Array<{
  value: CustomerPaymentMethod
  label: string
}> = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'DIGITAL_WALLET', label: 'Billetera digital' },
  { value: 'BANK_DEPOSIT', label: 'Deposito bancario' },
  { value: 'OTHER', label: 'Otro' },
]

function getPaymentMethodLabel(method: CustomerPaymentMethod) {
  return (
    PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ??
    method
  )
}

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
  const looksLikeThousandsWithDots = /^-?\d{1,3}(\.\d{3})+$/.test(
    compactValue,
  )
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildReceiptHtml(receipt: PaymentReceiptState) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Comprobante de pago</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1f2a37; }
    h1 { margin: 0 0 24px; font-size: 28px; }
    .row { display: flex; justify-content: space-between; gap: 24px; padding: 12px 0; border-bottom: 1px solid #dde5ef; }
    .total { margin-top: 28px; font-size: 28px; font-weight: 800; text-align: right; }
    .footer { margin-top: 48px; color: #66758c; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Comprobante de pago</h1>
  <div class="row"><strong>Cliente</strong><span>${escapeHtml(receipt.customerName)}</span></div>
  <div class="row"><strong>Venta</strong><span>${escapeHtml(receipt.saleNumber)}</span></div>
  <div class="row"><strong>Fecha y hora</strong><span>${escapeHtml(formatDateTime(receipt.createdAt))}</span></div>
  <div class="row"><strong>Medio de pago</strong><span>${escapeHtml(getPaymentMethodLabel(receipt.method))}</span></div>
  <div class="row"><strong>Referencia</strong><span>${escapeHtml(receipt.reference ?? 'Sin referencia')}</span></div>
  <div class="row"><strong>Nota</strong><span>${escapeHtml(receipt.notes ?? 'Sin nota')}</span></div>
  <p class="total">${escapeHtml(formatCurrency(receipt.amount))}</p>
  <p class="footer">Este comprobante fue generado desde el modulo de clientes.</p>
</body>
</html>`
}

function openReceipt(receipt: PaymentReceiptState, action: 'download' | 'print') {
  const receiptHtml = buildReceiptHtml(receipt)
  const receiptBlob = new Blob([receiptHtml], { type: 'text/html' })
  const receiptUrl = URL.createObjectURL(receiptBlob)

  if (action === 'download') {
    const linkElement = document.createElement('a')

    linkElement.href = receiptUrl
    linkElement.download = `comprobante-cliente-${receipt.saleNumber}.html`
    linkElement.click()
    URL.revokeObjectURL(receiptUrl)
    return
  }

  const printWindow = window.open(receiptUrl, '_blank', 'noopener,noreferrer')

  if (!printWindow) {
    URL.revokeObjectURL(receiptUrl)
    return
  }

  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }

  setTimeout(() => URL.revokeObjectURL(receiptUrl), 60000)
}

export function RetailCustomerDrawer({
  customer,
  currentCashRegisterId,
  errorMessage,
  isLoading,
  isOpen,
  isPaymentSubmitting,
  isSubmitting,
  mode,
  submitError,
  onClose,
  onModeChange,
  onRefresh,
  onRegisterPayment,
  onSubmitCustomer,
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

  const pendingReceivables = useMemo(
    () =>
      (customer?.receivables ?? []).filter((receivable) => receivable.balance > 0),
    [customer?.receivables],
  )
  const selectedReceivable =
    pendingReceivables.find(
      (receivable) => receivable.id === paymentForm.receivableId,
    ) ??
    pendingReceivables[0] ??
    null
  const totalPurchased = customer?.purchaseHistory.reduce(
    (sum, purchase) => sum + purchase.total,
    0,
  ) ?? 0
  const averageTicket =
    customer && customer.purchaseCount > 0
      ? totalPurchased / customer.purchaseCount
      : 0
  const paidReceivables = customer?.receivables.reduce(
    (sum, receivable) => sum + receivable.paidAmount,
    0,
  ) ?? 0
  const drawerTitle =
    mode === 'create'
      ? 'Crear cliente'
      : mode === 'edit'
        ? 'Editar cliente'
        : 'Detalle del cliente'

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setForm(toFormState(mode === 'create' ? null : customer))
    setFormError(null)
    setPaymentError(null)
    setLastReceipt(null)
  }, [customer, isOpen, mode])

  useEffect(() => {
    if (!isOpen || mode !== 'detail') {
      return
    }

    const firstPendingReceivable = pendingReceivables[0] ?? null

    setPaymentForm((currentForm) => ({
      ...currentForm,
      receivableId: firstPendingReceivable?.id ?? '',
      amount: firstPendingReceivable ? String(firstPendingReceivable.balance) : '',
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

    await onSubmitCustomer({
      name,
      phone: normalizeOptionalText(form.phone),
      email: normalizeOptionalText(form.email),
      documentType: normalizeOptionalText(form.documentType),
      documentNumber: normalizeOptionalText(form.documentNumber),
      address: normalizeOptionalText(form.address),
      notes: normalizeOptionalText(form.notes),
      balance,
    })
  }

  async function handleRegisterPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedReceivable || !customer) {
      setPaymentError('Selecciona una cuenta por cobrar.')
      return
    }

    const amount = parseMoney(paymentForm.amount)

    if (amount <= 0) {
      setPaymentError('El valor recibido debe ser mayor a cero.')
      return
    }

    if (amount > selectedReceivable.balance) {
      setPaymentError('El abono no puede superar el saldo pendiente.')
      return
    }

    setPaymentError(null)

    const input: CustomerPaymentInput = {
      amount,
      method: paymentForm.method,
      reference: normalizeOptionalText(paymentForm.reference) ?? undefined,
      notes: normalizeOptionalText(paymentForm.notes) ?? undefined,
      ...(currentCashRegisterId && paymentForm.method === 'CASH'
        ? { cashRegisterId: currentCashRegisterId }
        : {}),
    }

    await onRegisterPayment(selectedReceivable.id, input)
    setLastReceipt({
      customerName: customer.name,
      saleNumber: selectedReceivable.saleNumber,
      amount,
      method: paymentForm.method,
      reference: normalizeOptionalText(paymentForm.reference),
      notes: normalizeOptionalText(paymentForm.notes),
      createdAt: new Date().toISOString(),
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
            <select
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
            </select>
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
          <button className={styles.secondaryButton} type="button" onClick={onRefresh}>
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
            {customer.name.charAt(0).toUpperCase()}
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

        <section className={styles.infoGrid} aria-label="Informacion de contacto">
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
          <InfoItem icon={<MapPin />} label="Direccion" value={customer.address} />
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
            value={formatCurrency(paidReceivables)}
          />
          <MetricTile
            icon={<CalendarClock />}
            label="Ultima compra"
            value={
              customer.lastPurchaseAt ? formatDate(customer.lastPurchaseAt) : 'Sin compras'
            }
          />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h4>Cuentas por cobrar</h4>
            <span>{pendingReceivables.length.toString()} pendientes</span>
          </div>

          {customer.receivables.length > 0 ? (
            <div className={styles.receivableList}>
              {customer.receivables.map((receivable) => (
                <ReceivableCard key={receivable.id} receivable={receivable} />
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>
              Este cliente aun no tiene cuentas por cobrar.
            </p>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h4>Historial de compras</h4>
            <span>{customer.purchaseHistory.length.toString()} ventas</span>
          </div>

          {customer.purchaseHistory.length > 0 ? (
            <div className={styles.historyList}>
              {customer.purchaseHistory.slice(0, 6).map((purchase) => (
                <article key={purchase.saleId} className={styles.historyItem}>
                  <div>
                    <strong>Venta {purchase.saleId}</strong>
                    <span>{formatDateTime(purchase.createdAt)}</span>
                  </div>
                  <strong>{formatCurrency(purchase.total)}</strong>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>
              Cuando el cliente compre, aqui veras su historial.
            </p>
          )}
        </section>

        {pendingReceivables.length > 0 ? (
          <form className={styles.paymentForm} onSubmit={handleRegisterPayment}>
            <div className={styles.sectionHeader}>
              <h4>Registrar abono</h4>
              <span>Genera comprobante al guardar</span>
            </div>

            <label className={styles.field}>
              <span>Cuenta por cobrar</span>
              <select
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
                    {receivable.saleNumber} - {formatCurrency(receivable.balance)}
                  </option>
                ))}
              </select>
            </label>

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
                <select
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
                </select>
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
                onChange={(event) => updatePaymentValue('notes', event.target.value)}
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

        <section className={styles.receiptPanel}>
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
              disabled={!lastReceipt}
              type="button"
              onClick={() => {
                if (lastReceipt) {
                  openReceipt(lastReceipt, 'print')
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
                  openReceipt(lastReceipt, 'download')
                }
              }}
            >
              Descargar comprobante
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <SideDrawer
      bodyClassName={styles.drawerBody}
      footer={
        mode === 'detail' && customer ? (
          <div className={styles.footerActions}>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => onModeChange('edit')}
            >
              Editar cliente
            </button>
            <button className={styles.primaryButton} type="button" onClick={onClose}>
              Listo
            </button>
          </div>
        ) : null
      }
      isOpen={isOpen}
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

function ReceivableCard({ receivable }: { receivable: CustomerReceivable }) {
  const isPaid = receivable.balance <= 0

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

      {receivable.dueDate ? (
        <p className={styles.receivableDue}>
          Vence el {formatDate(receivable.dueDate)}
        </p>
      ) : null}
    </article>
  )
}
