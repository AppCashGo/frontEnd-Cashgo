import { useState } from 'react'
import type { ExpensePaymentMethod } from '@/modules/expenses/types/expense'
import {
  getExpensePaymentMethodLabel,
  getExpenseStatusLabel,
  toExpenseDateInputValue,
  toExpenseRequestDate,
} from '@/modules/expenses/utils/format-expense'
import type {
  SupplierPurchasePaymentInput,
  SupplierPurchaseReturnInput,
  SupplierSupplyHistoryItem,
} from '@/modules/suppliers/types/supplier'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { useAppTranslation } from '@/shared/i18n/use-app-translation'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDateTime } from '@/shared/utils/format-date-time'
import styles from './SupplierSupplyHistoryPanel.module.css'

type SupplierSupplyHistoryPanelProps = {
  supplierName: string | null
  purchaseHistory: SupplierSupplyHistoryItem[]
  isLoading: boolean
  payingPurchaseId?: string | null
  cancellingPurchaseId?: string | null
  returningPurchaseId?: string | null
  paymentError?: string | null
  onRegisterPayment?: (
    purchaseId: string,
    input: SupplierPurchasePaymentInput,
  ) => void
  onDownloadReceipt?: (purchaseId: string) => void
  onCancelPurchase?: (purchaseId: string, reason: string) => void
  onCreateReturn?: (
    purchaseId: string,
    input: SupplierPurchaseReturnInput,
  ) => void
  onDownloadCreditNote?: (purchaseId: string, returnId: string) => void
}

type PaymentDraft = {
  purchaseId: string
  amount: string
  method: ExpensePaymentMethod
  reference: string
  paymentDate: string
}

const englishPaymentMethodLabels = {
  CASH: 'Cash',
  CARD: 'Card',
  TRANSFER: 'Transfer',
  DIGITAL_WALLET: 'Digital wallet',
  BANK_DEPOSIT: 'Bank deposit',
  CREDIT: 'Credit',
  OTHER: 'Other',
} as const

const englishStatusLabels = {
  PAID: 'Paid',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
} as const

const paymentMethods = Object.keys(
  englishPaymentMethodLabels,
) as ExpensePaymentMethod[]

export function SupplierSupplyHistoryPanel({
  supplierName,
  purchaseHistory,
  isLoading,
  payingPurchaseId = null,
  cancellingPurchaseId = null,
  returningPurchaseId = null,
  paymentError = null,
  onRegisterPayment,
  onDownloadReceipt,
  onCancelPurchase,
  onCreateReturn,
  onDownloadCreditNote,
}: SupplierSupplyHistoryPanelProps) {
  const { languageCode } = useAppTranslation()
  const isEnglish = languageCode === 'en'
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null)
  const [cancellationDraft, setCancellationDraft] = useState<{
    purchaseId: string
    reason: string
  } | null>(null)
  const [returnDraft, setReturnDraft] = useState<{
    purchaseId: string
    quantities: Record<string, string>
    reason: string
    refundMethod: ExpensePaymentMethod
    returnDate: string
  } | null>(null)

  function getPaymentMethodLabel(method: ExpensePaymentMethod) {
    return isEnglish
      ? englishPaymentMethodLabels[method]
      : getExpensePaymentMethodLabel(method)
  }

  function startPayment(purchase: SupplierSupplyHistoryItem) {
    setPaymentDraft({
      purchaseId: purchase.purchaseId,
      amount: String(purchase.balance),
      method: purchase.paymentMethod,
      reference: '',
      paymentDate: toExpenseDateInputValue(new Date()),
    })
  }

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {isEnglish ? 'Accounts payable' : 'Cuentas por pagar'}
          </p>
          <h3 className={styles.title}>
            {supplierName
              ? isEnglish
                ? `${supplierName}'s purchase history`
                : `Compras registradas a ${supplierName}`
              : isEnglish
                ? 'Purchase history'
                : 'Compras registradas'}
          </h3>
        </div>

        <span className={styles.countPill}>
          {purchaseHistory.length.toString()}{' '}
          {purchaseHistory.length === 1
            ? isEnglish ? 'entry' : 'registro'
            : isEnglish ? 'entries' : 'registros'}
        </span>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>
          <p className={styles.loadingTitle}>
            {isEnglish ? 'Loading purchase history...' : 'Cargando historial...'}
          </p>
          <p className={styles.loadingDescription}>
            {isEnglish
              ? 'Fetching purchases, balances and payments.'
              : 'Consultando compras, saldos y pagos.'}
          </p>
        </div>
      ) : null}

      {!isLoading && purchaseHistory.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>
            {isEnglish ? 'No purchases yet' : 'Aún no hay compras registradas'}
          </p>
          <p className={styles.emptyDescription}>
            {isEnglish
              ? 'Inventory purchases for this supplier will appear here.'
              : 'Las compras de inventario asociadas con este proveedor aparecerán aquí.'}
          </p>
        </div>
      ) : null}

      {!isLoading && purchaseHistory.length > 0 ? (
        <div className={styles.historyList}>
          {paymentError ? (
            <p className={styles.paymentError}>{paymentError}</p>
          ) : null}
          {purchaseHistory.map((purchase) => {
            const isPaymentOpen = paymentDraft?.purchaseId === purchase.purchaseId
            const isPartial = purchase.status === 'PENDING' && purchase.paidAmount > 0
            const returnAmount = returnDraft?.purchaseId === purchase.purchaseId
              ? purchase.items.reduce(
                  (total, item) =>
                    total +
                    Math.max(0, Number(returnDraft.quantities[item.id] ?? 0)) *
                      item.unitCost,
                  0,
                )
              : 0
            const refundRequired = Math.max(0, returnAmount - purchase.balance)

            return (
              <article key={purchase.purchaseId} className={styles.historyItem}>
                <div className={styles.historyTopRow}>
                  <div>
                    <p className={styles.purchaseId}>
                      {purchase.reference ||
                        `${isEnglish ? 'Purchase' : 'Compra'} ${purchase.purchaseId}`}
                    </p>
                    <p className={styles.purchaseDate}>
                      {formatDateTime(purchase.purchaseDate)}
                      {purchase.dueDate
                        ? ` · ${isEnglish ? 'Due' : 'Vence'} ${formatDateTime(purchase.dueDate)}`
                        : ''}
                    </p>
                  </div>

                  <strong className={styles.purchaseTotal}>
                    {formatCurrency(purchase.netTotal)}
                    {purchase.returnedAmount > 0 ? (
                      <small>
                        {isEnglish ? 'Original' : 'Original'}: {formatCurrency(purchase.total)}
                      </small>
                    ) : null}
                  </strong>
                </div>

                <div className={styles.balanceGrid}>
                  <div><span>{isEnglish ? 'Paid' : 'Pagado'}</span><strong>{formatCurrency(purchase.paidAmount)}</strong></div>
                  <div><span>{isEnglish ? 'Outstanding' : 'Pendiente'}</span><strong>{formatCurrency(purchase.balance)}</strong></div>
                  <span
                    className={`${styles.statusPill} ${
                      purchase.status === 'PAID'
                        ? styles.statusPaid
                        : purchase.status === 'PENDING'
                          ? styles.statusPending
                          : styles.statusCancelled
                    }`}
                  >
                    {isPartial
                      ? isEnglish ? 'Partial' : 'Parcial'
                      : isEnglish
                        ? englishStatusLabels[purchase.status]
                        : getExpenseStatusLabel(purchase.status)}
                  </span>
                </div>

                <div className={styles.purchaseItemsList}>
                  {purchase.items.map((item) => (
                    <div key={item.id}>
                      <span>{item.productName} × {item.quantity}</span>
                      <strong>{formatCurrency(item.subtotal)}</strong>
                    </div>
                  ))}
                </div>

                {purchase.payments.length > 0 ? (
                  <div className={styles.paymentsList}>
                    <strong>{isEnglish ? 'Payments' : 'Pagos registrados'}</strong>
                    {purchase.payments.map((payment) => (
                      <div key={payment.id}>
                        <span>{getPaymentMethodLabel(payment.method)} · {formatDateTime(payment.paymentDate)}</span>
                        <strong>{formatCurrency(payment.amount)}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}

                {purchase.returns.length > 0 ? (
                  <div className={styles.creditNotesList}>
                    <strong>{isEnglish ? 'Credit notes' : 'Notas crédito'}</strong>
                    {purchase.returns.map((purchaseReturn) => (
                      <div key={purchaseReturn.id}>
                        <span>
                          {purchaseReturn.creditNumber} · {formatDateTime(purchaseReturn.returnDate)}
                        </span>
                        <strong>-{formatCurrency(purchaseReturn.amount)}</strong>
                        {onDownloadCreditNote ? (
                          <button
                            type="button"
                            onClick={() => onDownloadCreditNote(purchase.purchaseId, purchaseReturn.id)}
                          >
                            {isEnglish ? 'Download' : 'Descargar'}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {purchase.notes ? (
                  <p className={styles.purchaseNotes}>{purchase.notes}</p>
                ) : null}

                {purchase.status === 'CANCELLED' ? (
                  <div className={styles.cancellationNotice}>
                    <strong>{isEnglish ? 'Cancelled purchase' : 'Compra anulada'}</strong>
                    <span>
                      {purchase.cancellationReason ??
                        (isEnglish ? 'No reason recorded.' : 'Sin motivo registrado.')}
                    </span>
                    {purchase.cancelledAt ? (
                      <small>{formatDateTime(purchase.cancelledAt)}</small>
                    ) : null}
                  </div>
                ) : null}

                <div className={styles.purchaseActions}>
                  {onDownloadReceipt ? (
                    <button type="button" onClick={() => onDownloadReceipt(purchase.purchaseId)}>
                      {isEnglish ? 'Download receipt' : 'Descargar comprobante'}
                    </button>
                  ) : null}
                  {purchase.status === 'PENDING' && onRegisterPayment ? (
                    <button type="button" onClick={() => startPayment(purchase)}>
                      {isEnglish ? 'Register payment' : 'Registrar abono'}
                    </button>
                  ) : null}
                  {purchase.status !== 'CANCELLED' &&
                  purchase.items.some((item) => item.availableToReturn > 0) &&
                  onCreateReturn ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentDraft(null)
                        setCancellationDraft(null)
                        setReturnDraft({
                          purchaseId: purchase.purchaseId,
                          quantities: {},
                          reason: '',
                          refundMethod:
                            purchase.paymentMethod === 'CREDIT'
                              ? 'OTHER'
                              : purchase.paymentMethod,
                          returnDate: toExpenseDateInputValue(new Date()),
                        })
                      }}
                    >
                      {isEnglish ? 'Return products' : 'Devolver productos'}
                    </button>
                  ) : null}
                  {purchase.status !== 'CANCELLED' && onCancelPurchase ? (
                    <button
                      className={styles.cancelPurchaseButton}
                      type="button"
                      onClick={() => {
                        setPaymentDraft(null)
                        setCancellationDraft({
                          purchaseId: purchase.purchaseId,
                          reason: '',
                        })
                      }}
                    >
                      {isEnglish ? 'Cancel purchase' : 'Anular compra'}
                    </button>
                  ) : null}
                </div>

                {returnDraft?.purchaseId === purchase.purchaseId ? (
                  <div className={styles.returnForm}>
                    <div className={styles.returnFormHeader}>
                      <div>
                        <strong>{isEnglish ? 'Create credit note' : 'Crear nota crédito'}</strong>
                        <p>
                          {isEnglish
                            ? 'Choose the products and quantities returned to the supplier.'
                            : 'Selecciona los productos y las cantidades que regresan al proveedor.'}
                        </p>
                      </div>
                      <strong>{formatCurrency(returnAmount)}</strong>
                    </div>
                    <div className={styles.returnItems}>
                      {purchase.items.map((item) => (
                        <label key={item.id}>
                          <span>
                            <strong>{item.productName}</strong>
                            <small>
                              {isEnglish ? 'Available' : 'Disponible'}: {item.availableToReturn}
                            </small>
                          </span>
                          <input
                            max={item.availableToReturn}
                            min="0"
                            step="1"
                            type="number"
                            value={returnDraft.quantities[item.id] ?? ''}
                            onChange={(event) =>
                              setReturnDraft({
                                ...returnDraft,
                                quantities: {
                                  ...returnDraft.quantities,
                                  [item.id]: event.target.value,
                                },
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <label>
                      <span>{isEnglish ? 'Return date' : 'Fecha de devolución'}</span>
                      <input
                        type="date"
                        value={returnDraft.returnDate}
                        onChange={(event) => setReturnDraft({ ...returnDraft, returnDate: event.target.value })}
                      />
                    </label>
                    {refundRequired > 0 ? (
                      <label>
                        <span>
                          {isEnglish ? 'Refund method' : 'Método de reembolso'} · {formatCurrency(refundRequired)}
                        </span>
                        <select
                          value={returnDraft.refundMethod}
                          onChange={(event) => setReturnDraft({ ...returnDraft, refundMethod: event.target.value as ExpensePaymentMethod })}
                        >
                          {paymentMethods.filter((method) => method !== 'CREDIT').map((method) => (
                            <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <p className={styles.balanceApplicationNotice}>
                        {isEnglish
                          ? 'The credit note will reduce the outstanding balance.'
                          : 'La nota crédito reducirá primero el saldo pendiente.'}
                      </p>
                    )}
                    <label className={styles.returnReason}>
                      <span>{isEnglish ? 'Reason' : 'Motivo de la devolución'}</span>
                      <textarea
                        maxLength={255}
                        rows={3}
                        value={returnDraft.reason}
                        onChange={(event) => setReturnDraft({ ...returnDraft, reason: event.target.value })}
                      />
                    </label>
                    <div className={styles.paymentFormActions}>
                      <button type="button" onClick={() => setReturnDraft(null)}>
                        {isEnglish ? 'Go back' : 'Volver'}
                      </button>
                      <button
                        disabled={
                          returningPurchaseId !== null ||
                          returnAmount <= 0 ||
                          !returnDraft.returnDate ||
                          returnDraft.reason.trim().length < 3 ||
                          purchase.items.some((item) => {
                            const quantity = Number(returnDraft.quantities[item.id] ?? 0)
                            return !Number.isInteger(quantity) || quantity < 0 || quantity > item.availableToReturn
                          })
                        }
                        type="button"
                        onClick={() => {
                          onCreateReturn?.(purchase.purchaseId, {
                            items: purchase.items
                              .map((item) => ({
                                purchaseItemId: Number(item.id),
                                quantity: Number(returnDraft.quantities[item.id] ?? 0),
                              }))
                              .filter((item) => item.quantity > 0),
                            reason: returnDraft.reason.trim(),
                            refundMethod: refundRequired > 0 ? returnDraft.refundMethod : undefined,
                            returnDate: toExpenseRequestDate(returnDraft.returnDate),
                          })
                          setReturnDraft(null)
                        }}
                      >
                        {returningPurchaseId === purchase.purchaseId
                          ? isEnglish ? 'Saving...' : 'Guardando...'
                          : isEnglish ? 'Create credit note' : 'Crear nota crédito'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {cancellationDraft?.purchaseId === purchase.purchaseId ? (
                  <div className={styles.cancellationForm}>
                    <div>
                      <strong>
                        {isEnglish
                          ? 'Confirm purchase cancellation'
                          : 'Confirma la anulación de la compra'}
                      </strong>
                      <p>
                        {isEnglish
                          ? 'Inventory will be removed and cash payments will be reversed. This action cannot be undone.'
                          : 'Se retirará el inventario y se reversarán los pagos en efectivo. Esta acción no se puede deshacer.'}
                      </p>
                    </div>
                    <label>
                      <span>{isEnglish ? 'Reason' : 'Motivo de la anulación'}</span>
                      <textarea
                        maxLength={255}
                        rows={3}
                        value={cancellationDraft.reason}
                        onChange={(event) =>
                          setCancellationDraft({
                            ...cancellationDraft,
                            reason: event.target.value,
                          })
                        }
                      />
                    </label>
                    <div className={styles.paymentFormActions}>
                      <button type="button" onClick={() => setCancellationDraft(null)}>
                        {isEnglish ? 'Go back' : 'Volver'}
                      </button>
                      <button
                        className={styles.confirmCancellationButton}
                        disabled={
                          cancellingPurchaseId !== null ||
                          cancellationDraft.reason.trim().length < 3
                        }
                        type="button"
                        onClick={() => {
                          onCancelPurchase?.(
                            purchase.purchaseId,
                            cancellationDraft.reason.trim(),
                          )
                          setCancellationDraft(null)
                        }}
                      >
                        {cancellingPurchaseId === purchase.purchaseId
                          ? isEnglish ? 'Cancelling...' : 'Anulando...'
                          : isEnglish ? 'Confirm cancellation' : 'Confirmar anulación'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {isPaymentOpen && paymentDraft ? (
                  <div className={styles.paymentForm}>
                    <label>
                      <span>{isEnglish ? 'Amount' : 'Valor del abono'}</span>
                      <input
                        max={purchase.balance}
                        min="0.01"
                        step="0.01"
                        type="number"
                        value={paymentDraft.amount}
                        onChange={(event) => setPaymentDraft({ ...paymentDraft, amount: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>{isEnglish ? 'Payment method' : 'Método de pago'}</span>
                      <select
                        value={paymentDraft.method}
                        onChange={(event) => setPaymentDraft({ ...paymentDraft, method: event.target.value as ExpensePaymentMethod })}
                      >
                        {paymentMethods.map((method) => (
                          <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{isEnglish ? 'Payment date' : 'Fecha del pago'}</span>
                      <input
                        type="date"
                        value={paymentDraft.paymentDate}
                        onChange={(event) => setPaymentDraft({ ...paymentDraft, paymentDate: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>{isEnglish ? 'Reference' : 'Referencia'}</span>
                      <input
                        maxLength={120}
                        value={paymentDraft.reference}
                        onChange={(event) => setPaymentDraft({ ...paymentDraft, reference: event.target.value })}
                      />
                    </label>
                    <div className={styles.paymentFormActions}>
                      <button type="button" onClick={() => setPaymentDraft(null)}>
                        {isEnglish ? 'Cancel' : 'Cancelar'}
                      </button>
                      <button
                        disabled={
                          payingPurchaseId !== null ||
                          Number(paymentDraft.amount) <= 0 ||
                          Number(paymentDraft.amount) > purchase.balance
                        }
                        type="button"
                        onClick={() => {
                          onRegisterPayment?.(purchase.purchaseId, {
                            amount: Number(paymentDraft.amount),
                            method: paymentDraft.method,
                            reference: paymentDraft.reference.trim() || undefined,
                            paymentDate: toExpenseRequestDate(paymentDraft.paymentDate),
                          })
                          setPaymentDraft(null)
                        }}
                      >
                        {payingPurchaseId === purchase.purchaseId
                          ? isEnglish ? 'Saving...' : 'Guardando...'
                          : isEnglish ? 'Save payment' : 'Guardar abono'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : null}
    </SurfaceCard>
  )
}
