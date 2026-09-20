import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, MessageCircle, Printer, ReceiptText, WalletCards } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { useCurrentCashRegisterQuery } from '@/modules/cash-register/hooks/use-cash-register-query'
import {
  createCustomerCollectionActivity,
  registerCustomerPayment,
} from '@/modules/customers/services/customers-api'
import type { CustomerPaymentMethod } from '@/modules/customers/types/customer'
import { useSaleDetailQuery } from '@/modules/sales/hooks/use-sales-history-query'
import { downloadSaleReceipt } from '@/modules/sales/services/sales-api'
import { routePaths } from '@/routes/route-paths'
import { AppDrawer } from '@/shared/components/ui/AppDrawer'
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect'
import {
  COLLECTED_PAYMENT_METHOD_OPTIONS,
  getSharedPaymentMethodLabel,
} from '@/shared/payments/payment-methods'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { isCashSessionRequiredError } from '@/modules/cash-register/utils/is-cash-session-required-error'
import { normalizeWhatsAppPhone } from '@/shared/utils/normalize-whatsapp-phone'
import {
  downloadPdfBlob,
  openWhatsApp,
  printPdfBlob,
  sharePdfFile,
} from '@/shared/utils/pdf-document-actions'
import styles from './SaleDetailDrawer.module.css'

type SaleDetailDrawerProps = {
  saleId: string | null
  onClose: () => void
  onCashSessionRequired?: () => void
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function SaleDetailDrawer({
  saleId,
  onClose,
  onCashSessionRequired,
}: SaleDetailDrawerProps) {
  const queryClient = useQueryClient()
  const businessName = useAuthSessionStore(
    (state) => state.user?.businessName ?? 'CashGo',
  )
  const cashRegisterQuery = useCurrentCashRegisterQuery()
  const saleQuery = useSaleDetailQuery(saleId)
  const sale = saleQuery.data ?? null
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPaymentOpen, setPaymentOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<CustomerPaymentMethod>('CASH')
  const [reference, setReference] = useState('')
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const payments = useMemo(
    () => [
      ...(sale?.payments ?? []),
      ...(sale?.accountReceivable?.payments ?? []),
    ],
    [sale],
  )
  const balance = sale?.accountReceivable?.balance ?? 0
  const collected = Math.max(0, (sale?.total ?? 0) - balance)

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!sale?.accountReceivable) {
        throw new Error('La venta no tiene una cuenta por cobrar activa.')
      }
      const parsedAmount = Number(amount)
      if (
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0 ||
        parsedAmount > balance
      ) {
        throw new Error('Ingresa un abono válido que no supere el saldo pendiente.')
      }
      return registerCustomerPayment(sale.accountReceivable.id, {
        amount: parsedAmount,
        method,
        cashRegisterId: cashRegisterQuery.data?.id,
        reference: reference.trim() || undefined,
      })
    },
    onSuccess: async () => {
      setFeedback('El abono se registró correctamente.')
      setPaymentOpen(false)
      setAmount('')
      setReference('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['cash-register'] }),
      ])
    },
    onError: (error) => {
      if (isCashSessionRequiredError(error)) {
        setFeedback('Debes abrir caja para registrar el abono.')
        onCashSessionRequired?.()
        return
      }
      setFeedback(getErrorMessage(error, 'No pudimos registrar el abono.'))
    },
  })

  async function handleDocument(action: 'download' | 'print' | 'share') {
    if (!sale) return
    setActiveAction(action)
    setFeedback(null)
    try {
      const { blob, filename } = await downloadSaleReceipt(sale.id)
      const resolvedFilename = filename ?? `${sale.saleNumber}.pdf`
      if (action === 'download') {
        downloadPdfBlob(blob, resolvedFilename)
        setFeedback('El comprobante se descargó en PDF.')
      } else if (action === 'print') {
        printPdfBlob(blob)
        setFeedback('El comprobante está listo para imprimir.')
      } else {
        if (!sale.customer?.phone) {
          throw new Error('El cliente no tiene teléfono registrado.')
        }
        const phone = normalizeWhatsAppPhone(sale.customer.phone)
        if (!/^\d{10,15}$/.test(phone)) {
          throw new Error('El teléfono del cliente no tiene un formato válido.')
        }
        const message = `Hola ${sale.customer.name}, te compartimos el detalle de la venta ${sale.saleNumber} por ${formatCurrency(sale.total)}${balance > 0 ? `, con saldo pendiente de ${formatCurrency(balance)}` : ''}. Gracias, ${businessName}.`
        const result = await sharePdfFile({
          blob,
          filename: resolvedFilename,
          title: `Venta ${sale.saleNumber}`,
          text: message,
        })
        if (sale.accountReceivable) {
          await createCustomerCollectionActivity(sale.accountReceivable.id, {
            type: 'REMINDER',
            channel: 'WHATSAPP',
            notes: message,
          })
        }
        if (result === 'downloaded') {
          openWhatsApp(phone, message)
          setFeedback(
            'Descargamos el PDF y abrimos WhatsApp. Adjunta el archivo antes de enviar.',
          )
        } else {
          setFeedback(
            'El PDF y el mensaje están listos en el selector para compartir.',
          )
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setFeedback('Cancelaste la acción de compartir.')
      } else {
        setFeedback(getErrorMessage(error, 'No pudimos preparar el documento.'))
      }
    } finally {
      setActiveAction(null)
    }
  }

  function submitPayment(event: FormEvent) {
    event.preventDefault()
    setFeedback(null)
    paymentMutation.mutate()
  }

  return (
    <AppDrawer
      description="Productos, pagos y documentos asociados a la venta."
      isOpen={saleId !== null}
      size="xl"
      title={sale?.saleNumber ?? 'Detalle de venta'}
      onClose={onClose}
    >
      {saleQuery.isLoading ? <p className={styles.state}>Cargando venta…</p> : null}
      {saleQuery.isError ? (
        <div className={styles.error} role="alert">
          <strong>No pudimos cargar la venta.</strong>
          <span>
            {getErrorMessage(
              saleQuery.error,
              'La venta no existe o ya no está disponible.',
            )}
          </span>
        </div>
      ) : null}
      {sale ? (
        <div className={styles.content}>
          <div className={styles.headingRow}>
            <div>
              <span className={styles.muted}>Fecha y hora</span>
              <strong>{formatDateTime(sale.saleDate)}</strong>
            </div>
            <span
              className={`${styles.status} ${
                balance > 0 ? styles.statusPending : styles.statusPaid
              }`}
            >
              {balance > 0 ? (collected > 0 ? 'PARCIAL' : 'PENDIENTE') : 'PAGADA'}
            </span>
          </div>

          <div className={styles.peopleGrid}>
            <section className={styles.personCard}>
              <div className={styles.avatar}>
                {initials(sale.customer?.name ?? 'VM')}
              </div>
              <div>
                <span className={styles.muted}>Cliente</span>
                <strong>{sale.customer?.name ?? 'Venta de mostrador'}</strong>
                {sale.customer?.phone ? <small>{sale.customer.phone}</small> : null}
                {sale.customer?.documentNumber ? (
                  <small>Documento: {sale.customer.documentNumber}</small>
                ) : null}
              </div>
            </section>
            <section className={styles.personCard}>
              <div className={styles.avatar}>
                {initials(sale.seller?.name ?? 'NA')}
              </div>
              <div>
                <span className={styles.muted}>Vendedor</span>
                <strong>{sale.seller?.name ?? 'Sin asignar'}</strong>
                {sale.seller?.role ? <small>{sale.seller.role}</small> : null}
              </div>
            </section>
          </div>

          <section className={styles.section}>
            <h3>Productos</h3>
            <div className={styles.tableScroller}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.product.name}</strong>
                        {item.product.sku ? <small>SKU {item.product.sku}</small> : null}
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className={styles.financialGrid}>
            <section className={styles.section}>
              <h3>Pagos</h3>
              {payments.length > 0 ? (
                payments.map((payment) => (
                  <div
                    className={styles.paymentRow}
                    key={`${payment.id}-${payment.createdAt}`}
                  >
                    <span>
                      {getSharedPaymentMethodLabel(payment.method)}
                      <small>{formatDateTime(payment.createdAt)}</small>
                    </span>
                    <strong>{formatCurrency(payment.amount)}</strong>
                  </div>
                ))
              ) : (
                <p className={styles.muted}>No se registraron pagos.</p>
              )}
            </section>
            <section className={`${styles.section} ${styles.totals}`}>
              <div><span>Subtotal</span><strong>{formatCurrency(sale.subtotal)}</strong></div>
              {sale.discountTotal > 0 ? <div><span>Descuentos</span><strong>-{formatCurrency(sale.discountTotal)}</strong></div> : null}
              {sale.taxTotal > 0 ? <div><span>Impuestos</span><strong>{formatCurrency(sale.taxTotal)}</strong></div> : null}
              <div className={styles.total}><span>Total</span><strong>{formatCurrency(sale.total)}</strong></div>
              <div><span>Abonado</span><strong>{formatCurrency(collected)}</strong></div>
              <div className={balance > 0 ? styles.balance : ''}><span>Saldo pendiente</span><strong>{formatCurrency(balance)}</strong></div>
            </section>
          </div>

          {isPaymentOpen && sale.accountReceivable ? (
            <form className={styles.paymentForm} onSubmit={submitPayment}>
              <h3>Registrar abono</h3>
              <label>
                <span>Valor</span>
                <input max={balance} min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </label>
              <label>
                <span>Método</span>
                <SearchableSelect value={method} onChange={(event) => setMethod(event.target.value as CustomerPaymentMethod)}>
                  {COLLECTED_PAYMENT_METHOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </SearchableSelect>
              </label>
              <label>
                <span>Referencia</span>
                <input value={reference} onChange={(event) => setReference(event.target.value)} />
              </label>
              <div className={styles.formActions}>
                <button type="button" onClick={() => setPaymentOpen(false)}>Cancelar</button>
                <button disabled={paymentMutation.isPending} type="submit">{paymentMutation.isPending ? 'Registrando…' : 'Guardar abono'}</button>
              </div>
            </form>
          ) : null}

          {paymentMutation.isError ? (
            <p className={styles.feedback} role="alert">
              {getErrorMessage(paymentMutation.error, 'No pudimos registrar el abono.')}
            </p>
          ) : null}
          {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}

          <div className={styles.actions}>
            <button disabled={activeAction !== null} type="button" onClick={() => void handleDocument('print')}><Printer /> Imprimir</button>
            <button disabled={activeAction !== null} type="button" onClick={() => void handleDocument('download')}><Download /> Descargar</button>
            {sale.customer ? <button disabled={activeAction !== null} type="button" onClick={() => void handleDocument('share')}><MessageCircle /> Compartir</button> : null}
            {balance > 0 && sale.accountReceivable ? <button className={styles.primaryAction} type="button" onClick={() => setPaymentOpen(true)}><WalletCards /> Registrar abono</button> : null}
            {sale.invoice ? <Link to={routePaths.billing}><ReceiptText /> {sale.invoice.documentNumber}</Link> : null}
          </div>
        </div>
      ) : null}
    </AppDrawer>
  )
}
