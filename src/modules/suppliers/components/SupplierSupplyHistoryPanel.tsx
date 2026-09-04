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
  paymentError?: string | null
  onRegisterPayment?: (
    purchaseId: string,
    input: SupplierPurchasePaymentInput,
  ) => void
  onDownloadReceipt?: (purchaseId: string) => void
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
  paymentError = null,
  onRegisterPayment,
  onDownloadReceipt,
}: SupplierSupplyHistoryPanelProps) {
  const { languageCode } = useAppTranslation()
  const isEnglish = languageCode === 'en'
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null)

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
                    {formatCurrency(purchase.total)}
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

                {purchase.notes ? (
                  <p className={styles.purchaseNotes}>{purchase.notes}</p>
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
                </div>

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
