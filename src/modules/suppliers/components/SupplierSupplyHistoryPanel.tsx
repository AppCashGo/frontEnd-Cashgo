import { SearchableSelect } from '@/shared/components/ui/SearchableSelect'
import { useState } from 'react'
import {
  useCurrentCashRegisterQuery,
  useReserveSummaryQuery,
} from '@/modules/cash-register/hooks/use-cash-register-query'
import type { PaymentFundSource } from '@/modules/cash-register/types/cash-register'
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
  SupplierPurchaseUpdateInput,
  SupplierSupplyHistoryItem,
} from '@/modules/suppliers/types/supplier'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { useAppTranslation } from '@/shared/i18n/use-app-translation'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDateTime } from '@/shared/utils/format-date-time'
import { resolveApiAssetUrl } from '@/shared/services/api-client'
import styles from './SupplierSupplyHistoryPanel.module.css'

type SupplierSupplyHistoryPanelProps = {
  supplierName: string | null
  purchaseHistory: SupplierSupplyHistoryItem[]
  isLoading: boolean
  payingPurchaseId?: string | null
  cancellingPurchaseId?: string | null
  editingPurchaseId?: string | null
  returningPurchaseId?: string | null
  paymentError?: string | null
  onRegisterPayment?: (
    purchaseId: string,
    input: SupplierPurchasePaymentInput,
  ) => void
  onDownloadReceipt?: (purchaseId: string) => void
  onCancelPurchase?: (purchaseId: string, reason: string) => void
  onUpdatePurchase?: (
    purchaseId: string,
    input: SupplierPurchaseUpdateInput,
  ) => Promise<void>
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
  fundSource: PaymentFundSource
  reference: string
  paymentDate: string
}

type PurchaseEditDraft = {
  purchaseId: string
  reference: string
  purchaseDate: string
  dueDate: string
  notes: string
  items: Record<string, { quantity: string; unitCost: string }>
  paymentMethod: ExpensePaymentMethod
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
  editingPurchaseId = null,
  returningPurchaseId = null,
  paymentError = null,
  onRegisterPayment,
  onDownloadReceipt,
  onCancelPurchase,
  onUpdatePurchase,
  onCreateReturn,
  onDownloadCreditNote,
}: SupplierSupplyHistoryPanelProps) {
  const { languageCode } = useAppTranslation()
  const currentCashRegisterQuery = useCurrentCashRegisterQuery()
  const reserveSummaryQuery = useReserveSummaryQuery()
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
  const [editDraft, setEditDraft] = useState<PurchaseEditDraft | null>(null)

  function getPaymentMethodLabel(method: ExpensePaymentMethod) {
    return isEnglish
      ? englishPaymentMethodLabels[method]
      : getExpensePaymentMethodLabel(method)
  }

  function startPayment(purchase: SupplierSupplyHistoryItem) {
    setEditDraft(null)
    setPaymentDraft({
      purchaseId: purchase.purchaseId,
      amount: String(purchase.balance),
      method: purchase.paymentMethod,
      fundSource: 'REGISTER',
      reference: '',
      paymentDate: toExpenseDateInputValue(new Date()),
    })
  }

  function startEditing(purchase: SupplierSupplyHistoryItem) {
    setPaymentDraft(null)
    setCancellationDraft(null)
    setReturnDraft(null)
    setEditDraft({
      purchaseId: purchase.purchaseId,
      reference: purchase.reference ?? '',
      purchaseDate: toExpenseDateInputValue(new Date(purchase.purchaseDate)),
      dueDate: purchase.dueDate
        ? toExpenseDateInputValue(new Date(purchase.dueDate))
        : '',
      notes: purchase.notes ?? '',
      paymentMethod: purchase.paymentMethod,
      items: Object.fromEntries(
        purchase.items.map((item) => [
          item.id,
          { quantity: String(item.quantity), unitCost: String(item.unitCost) },
        ]),
      ),
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
            ? isEnglish
              ? 'entry'
              : 'registro'
            : isEnglish
              ? 'entries'
              : 'registros'}
        </span>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>
          <p className={styles.loadingTitle}>
            {isEnglish
              ? 'Loading purchase history...'
              : 'Cargando historial...'}
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
            const invoiceImageUrl = resolveApiAssetUrl(purchase.invoiceImageUrl)
            const isPaymentOpen =
              paymentDraft?.purchaseId === purchase.purchaseId
            const draftedPaymentAmount = isPaymentOpen
              ? Number(paymentDraft?.amount ?? 0)
              : 0
            const draftedMethodBalance = isPaymentOpen
              ? paymentDraft?.fundSource === 'RESERVE'
                ? (reserveSummaryQuery.data?.balances?.find(
                    (balance) => balance.method === paymentDraft.method,
                  )?.amount ?? 0)
                : (currentCashRegisterQuery.data?.paymentMethods?.find(
                    (paymentMethod) =>
                      paymentMethod.method === paymentDraft?.method,
                  )?.expectedAmount ?? 0)
              : 0
            const draftedPaymentShortfall = Math.max(
              draftedPaymentAmount - draftedMethodBalance,
              0,
            )
            const isPartial =
              purchase.status === 'PENDING' && purchase.paidAmount > 0
            const returnAmount =
              returnDraft?.purchaseId === purchase.purchaseId
                ? purchase.items.reduce(
                    (total, item) =>
                      total +
                      Math.max(
                        0,
                        Number(returnDraft.quantities[item.id] ?? 0),
                      ) *
                        item.unitCost,
                    0,
                  )
                : 0
            const refundRequired = Math.max(0, returnAmount - purchase.balance)
            const isEditing = editDraft?.purchaseId === purchase.purchaseId
            const editedTotal = isEditing
              ? purchase.items.reduce((total, item) => {
                  const editedItem = editDraft.items[item.id]
                  return (
                    total +
                    Number(editedItem?.quantity ?? 0) *
                      Number(editedItem?.unitCost ?? 0)
                  )
                }, 0)
              : purchase.total
            const hasInvalidEditedItem = isEditing
              ? purchase.items.some((item) => {
                  const editedItem = editDraft.items[item.id]
                  const quantity = Number(editedItem?.quantity ?? 0)
                  const unitCost = Number(editedItem?.unitCost ?? -1)
                  return (
                    !Number.isInteger(quantity) ||
                    quantity < 1 ||
                    !Number.isFinite(unitCost) ||
                    unitCost < 0
                  )
                })
              : false

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
                        {isEnglish ? 'Original' : 'Original'}:{' '}
                        {formatCurrency(purchase.total)}
                      </small>
                    ) : null}
                  </strong>
                </div>

                <div className={styles.balanceGrid}>
                  <div>
                    <span>{isEnglish ? 'Paid' : 'Pagado'}</span>
                    <strong>{formatCurrency(purchase.paidAmount)}</strong>
                  </div>
                  <div>
                    <span>{isEnglish ? 'Outstanding' : 'Pendiente'}</span>
                    <strong>{formatCurrency(purchase.balance)}</strong>
                  </div>
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
                      ? isEnglish
                        ? 'Partial'
                        : 'Parcial'
                      : isEnglish
                        ? englishStatusLabels[purchase.status]
                        : getExpenseStatusLabel(purchase.status)}
                  </span>
                </div>

                <div className={styles.purchaseItemsList}>
                  {purchase.items.map((item) => (
                    <div key={item.id}>
                      <span>
                        {item.productName} × {item.quantity}
                        {item.unitCost === 0 ? (
                          <small className={styles.giftItemBadge}>
                            {isEnglish ? 'Gift' : 'Obsequio'}
                          </small>
                        ) : null}
                      </span>
                      <strong>
                        {item.unitCost === 0
                          ? isEnglish
                            ? 'Gift · $0'
                            : 'Obsequio · $0'
                          : formatCurrency(item.subtotal)}
                      </strong>
                    </div>
                  ))}
                </div>

                {purchase.payments.length > 0 ? (
                  <div className={styles.paymentsList}>
                    <strong>
                      {isEnglish ? 'Payments' : 'Pagos registrados'}
                    </strong>
                    {purchase.payments.map((payment) => (
                      <div key={payment.id}>
                        <span>
                          {getPaymentMethodLabel(payment.method)} ·{' '}
                          {payment.fundSource === 'RESERVE'
                            ? isEnglish
                              ? 'Reserve'
                              : 'Reserva'
                            : isEnglish
                              ? 'Open register'
                              : 'Caja abierta'}{' '}
                          · {formatDateTime(payment.paymentDate)}
                        </span>
                        <strong>{formatCurrency(payment.amount)}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}

                {purchase.returns.length > 0 ? (
                  <div className={styles.creditNotesList}>
                    <strong>
                      {isEnglish ? 'Credit notes' : 'Notas crédito'}
                    </strong>
                    {purchase.returns.map((purchaseReturn) => (
                      <div key={purchaseReturn.id}>
                        <span>
                          {purchaseReturn.creditNumber} ·{' '}
                          {formatDateTime(purchaseReturn.returnDate)}
                        </span>
                        <strong>
                          -{formatCurrency(purchaseReturn.amount)}
                        </strong>
                        {onDownloadCreditNote ? (
                          <button
                            type="button"
                            onClick={() =>
                              onDownloadCreditNote(
                                purchase.purchaseId,
                                purchaseReturn.id,
                              )
                            }
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

                {invoiceImageUrl ? (
                  <a
                    className={styles.invoiceAttachment}
                    href={invoiceImageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={invoiceImageUrl}
                      alt={
                        isEnglish
                          ? `Invoice for purchase ${purchase.purchaseId}`
                          : `Factura de la compra ${purchase.purchaseId}`
                      }
                    />
                    <span>
                      <strong>
                        {isEnglish ? 'Invoice attached' : 'Factura adjunta'}
                      </strong>
                      <small>
                        {isEnglish
                          ? 'Open the original photo'
                          : 'Abrir la foto original'}
                      </small>
                    </span>
                  </a>
                ) : null}

                {purchase.status === 'CANCELLED' ? (
                  <div className={styles.cancellationNotice}>
                    <strong>
                      {isEnglish ? 'Cancelled purchase' : 'Compra anulada'}
                    </strong>
                    <span>
                      {purchase.cancellationReason ??
                        (isEnglish
                          ? 'No reason recorded.'
                          : 'Sin motivo registrado.')}
                    </span>
                    {purchase.cancelledAt ? (
                      <small>{formatDateTime(purchase.cancelledAt)}</small>
                    ) : null}
                  </div>
                ) : null}

                <div className={styles.purchaseActions}>
                  {onDownloadReceipt ? (
                    <button
                      type="button"
                      onClick={() => onDownloadReceipt(purchase.purchaseId)}
                    >
                      {isEnglish ? 'Download receipt' : 'Descargar comprobante'}
                    </button>
                  ) : null}
                  {purchase.status === 'PENDING' && onRegisterPayment ? (
                    <button
                      type="button"
                      onClick={() => startPayment(purchase)}
                    >
                      {isEnglish ? 'Register payment' : 'Registrar abono'}
                    </button>
                  ) : null}
                  {purchase.status !== 'CANCELLED' &&
                  purchase.returns.length === 0 &&
                  onUpdatePurchase ? (
                    <button
                      type="button"
                      onClick={() => startEditing(purchase)}
                    >
                      {isEnglish ? 'Edit purchase' : 'Editar compra'}
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
                        setEditDraft(null)
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
                        setEditDraft(null)
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

                {isEditing && editDraft ? (
                  <div className={styles.editPurchaseForm}>
                    <div className={styles.editPurchaseHeader}>
                      <div>
                        <strong>
                          {isEnglish ? 'Correct purchase' : 'Corregir compra'}
                        </strong>
                        <p>
                          {isEnglish
                            ? 'Changes update inventory, product costs and the original payment.'
                            : 'Los cambios actualizarán inventario, costos y el pago original.'}
                        </p>
                      </div>
                      <strong>{formatCurrency(editedTotal)}</strong>
                    </div>

                    <div className={styles.editPurchaseItems}>
                      {purchase.items.map((item) => (
                        <div key={item.id}>
                          <span>
                            <strong>{item.productName}</strong>
                            <small>{item.sku ?? 'Sin SKU'}</small>
                          </span>
                          <label>
                            <span>{isEnglish ? 'Quantity' : 'Cantidad'}</span>
                            <input
                              min="1"
                              step="1"
                              type="number"
                              value={editDraft.items[item.id]?.quantity ?? ''}
                              onChange={(event) =>
                                setEditDraft({
                                  ...editDraft,
                                  items: {
                                    ...editDraft.items,
                                    [item.id]: {
                                      ...editDraft.items[item.id],
                                      quantity: event.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>{isEnglish ? 'Unit cost' : 'Costo unitario'}</span>
                            <input
                              min="0"
                              step="0.01"
                              type="number"
                              value={editDraft.items[item.id]?.unitCost ?? ''}
                              onChange={(event) =>
                                setEditDraft({
                                  ...editDraft,
                                  items: {
                                    ...editDraft.items,
                                    [item.id]: {
                                      ...editDraft.items[item.id],
                                      unitCost: event.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </label>
                        </div>
                      ))}
                    </div>

                    <label>
                      <span>{isEnglish ? 'Reference' : 'Referencia'}</span>
                      <input
                        maxLength={120}
                        value={editDraft.reference}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            reference: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>
                        {isEnglish ? 'Payment method' : 'Método de pago'}
                      </span>
                      <SearchableSelect
                        value={editDraft.paymentMethod}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            paymentMethod: event.target
                              .value as ExpensePaymentMethod,
                          })
                        }
                      >
                        {paymentMethods.map((method) => (
                          <option key={method} value={method}>
                            {getPaymentMethodLabel(method)}
                          </option>
                        ))}
                      </SearchableSelect>
                    </label>
                    <label>
                      <span>{isEnglish ? 'Purchase date' : 'Fecha de compra'}</span>
                      <input
                        type="date"
                        value={editDraft.purchaseDate}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            purchaseDate: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>{isEnglish ? 'Due date' : 'Fecha de vencimiento'}</span>
                      <input
                        min={editDraft.purchaseDate}
                        type="date"
                        value={editDraft.dueDate}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            dueDate: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className={styles.editPurchaseNotes}>
                      <span>{isEnglish ? 'Notes' : 'Notas'}</span>
                      <textarea
                        maxLength={500}
                        rows={3}
                        value={editDraft.notes}
                        onChange={(event) =>
                          setEditDraft({
                            ...editDraft,
                            notes: event.target.value,
                          })
                        }
                      />
                    </label>

                    <div className={styles.editPurchaseNotice}>
                      {isEnglish
                        ? 'For safety, products cannot be added or removed here. You can correct the quantity and cost of every original line.'
                        : 'Por seguridad no se agregan ni eliminan productos aquí. Puedes corregir la cantidad y el costo de cada producto original.'}
                    </div>
                    <div className={styles.paymentFormActions}>
                      <button type="button" onClick={() => setEditDraft(null)}>
                        {isEnglish ? 'Cancel' : 'Cancelar'}
                      </button>
                      <button
                        disabled={
                          editingPurchaseId !== null ||
                          hasInvalidEditedItem ||
                          editedTotal < 0 ||
                          !editDraft.purchaseDate ||
                          Boolean(
                            editDraft.dueDate &&
                              editDraft.dueDate < editDraft.purchaseDate,
                          )
                        }
                        type="button"
                        onClick={async () => {
                          try {
                            await onUpdatePurchase?.(purchase.purchaseId, {
                              items: purchase.items.map((item) => ({
                                purchaseItemId: Number(item.id),
                                quantity: Number(
                                  editDraft.items[item.id]?.quantity,
                                ),
                                unitCost: Number(
                                  editDraft.items[item.id]?.unitCost,
                                ),
                              })),
                              paymentMethod: editDraft.paymentMethod,
                              reference: editDraft.reference.trim() || null,
                              purchaseDate: toExpenseRequestDate(
                                editDraft.purchaseDate,
                              ),
                              dueDate: editDraft.dueDate
                                ? toExpenseRequestDate(editDraft.dueDate)
                                : null,
                              notes: editDraft.notes.trim() || null,
                            })
                            setEditDraft(null)
                          } catch {
                            // The page exposes the API error above the purchase list.
                          }
                        }}
                      >
                        {editingPurchaseId === purchase.purchaseId
                          ? isEnglish
                            ? 'Saving...'
                            : 'Guardando...'
                          : isEnglish
                            ? 'Save correction'
                            : 'Guardar corrección'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {returnDraft?.purchaseId === purchase.purchaseId ? (
                  <div className={styles.returnForm}>
                    <div className={styles.returnFormHeader}>
                      <div>
                        <strong>
                          {isEnglish
                            ? 'Create credit note'
                            : 'Crear nota crédito'}
                        </strong>
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
                              {isEnglish ? 'Available' : 'Disponible'}:{' '}
                              {item.availableToReturn}
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
                      <span>
                        {isEnglish ? 'Return date' : 'Fecha de devolución'}
                      </span>
                      <input
                        type="date"
                        value={returnDraft.returnDate}
                        onChange={(event) =>
                          setReturnDraft({
                            ...returnDraft,
                            returnDate: event.target.value,
                          })
                        }
                      />
                    </label>
                    {refundRequired > 0 ? (
                      <label>
                        <span>
                          {isEnglish ? 'Refund method' : 'Método de reembolso'}{' '}
                          · {formatCurrency(refundRequired)}
                        </span>
                        <SearchableSelect
                          value={returnDraft.refundMethod}
                          onChange={(event) =>
                            setReturnDraft({
                              ...returnDraft,
                              refundMethod: event.target
                                .value as ExpensePaymentMethod,
                            })
                          }
                        >
                          {paymentMethods
                            .filter((method) => method !== 'CREDIT')
                            .map((method) => (
                              <option key={method} value={method}>
                                {getPaymentMethodLabel(method)}
                              </option>
                            ))}
                        </SearchableSelect>
                      </label>
                    ) : (
                      <p className={styles.balanceApplicationNotice}>
                        {isEnglish
                          ? 'The credit note will reduce the outstanding balance.'
                          : 'La nota crédito reducirá primero el saldo pendiente.'}
                      </p>
                    )}
                    <label className={styles.returnReason}>
                      <span>
                        {isEnglish ? 'Reason' : 'Motivo de la devolución'}
                      </span>
                      <textarea
                        maxLength={255}
                        rows={3}
                        value={returnDraft.reason}
                        onChange={(event) =>
                          setReturnDraft({
                            ...returnDraft,
                            reason: event.target.value,
                          })
                        }
                      />
                    </label>
                    <div className={styles.paymentFormActions}>
                      <button
                        type="button"
                        onClick={() => setReturnDraft(null)}
                      >
                        {isEnglish ? 'Go back' : 'Volver'}
                      </button>
                      <button
                        disabled={
                          returningPurchaseId !== null ||
                          returnAmount <= 0 ||
                          !returnDraft.returnDate ||
                          returnDraft.reason.trim().length < 3 ||
                          purchase.items.some((item) => {
                            const quantity = Number(
                              returnDraft.quantities[item.id] ?? 0,
                            )
                            return (
                              !Number.isInteger(quantity) ||
                              quantity < 0 ||
                              quantity > item.availableToReturn
                            )
                          })
                        }
                        type="button"
                        onClick={() => {
                          onCreateReturn?.(purchase.purchaseId, {
                            items: purchase.items
                              .map((item) => ({
                                purchaseItemId: Number(item.id),
                                quantity: Number(
                                  returnDraft.quantities[item.id] ?? 0,
                                ),
                              }))
                              .filter((item) => item.quantity > 0),
                            reason: returnDraft.reason.trim(),
                            refundMethod:
                              refundRequired > 0
                                ? returnDraft.refundMethod
                                : undefined,
                            returnDate: toExpenseRequestDate(
                              returnDraft.returnDate,
                            ),
                          })
                          setReturnDraft(null)
                        }}
                      >
                        {returningPurchaseId === purchase.purchaseId
                          ? isEnglish
                            ? 'Saving...'
                            : 'Guardando...'
                          : isEnglish
                            ? 'Create credit note'
                            : 'Crear nota crédito'}
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
                      <span>
                        {isEnglish ? 'Reason' : 'Motivo de la anulación'}
                      </span>
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
                      <button
                        type="button"
                        onClick={() => setCancellationDraft(null)}
                      >
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
                          ? isEnglish
                            ? 'Cancelling...'
                            : 'Anulando...'
                          : isEnglish
                            ? 'Confirm cancellation'
                            : 'Confirmar anulación'}
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
                        onChange={(event) =>
                          setPaymentDraft({
                            ...paymentDraft,
                            amount: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>
                        {isEnglish
                          ? 'Money source'
                          : '¿De dónde sale el dinero?'}
                      </span>
                      <SearchableSelect
                        value={paymentDraft.fundSource}
                        onChange={(event) =>
                          setPaymentDraft({
                            ...paymentDraft,
                            fundSource: event.target.value as PaymentFundSource,
                          })
                        }
                      >
                        <option value="REGISTER">
                          {isEnglish
                            ? 'Open register'
                            : 'Caja abierta del turno'}
                        </option>
                        <option value="RESERVE">
                          {isEnglish
                            ? 'Business reserve'
                            : 'Reserva del negocio'}
                        </option>
                      </SearchableSelect>
                    </label>
                    <label>
                      <span>
                        {isEnglish ? 'Payment method' : 'Método de pago'}
                      </span>
                      <SearchableSelect
                        value={paymentDraft.method}
                        onChange={(event) =>
                          setPaymentDraft({
                            ...paymentDraft,
                            method: event.target.value as ExpensePaymentMethod,
                          })
                        }
                      >
                        {paymentMethods.map((method) => (
                          <option key={method} value={method}>
                            {getPaymentMethodLabel(method)}
                          </option>
                        ))}
                      </SearchableSelect>
                    </label>
                    <label>
                      <span>
                        {isEnglish ? 'Payment date' : 'Fecha del pago'}
                      </span>
                      <input
                        type="date"
                        value={paymentDraft.paymentDate}
                        onChange={(event) =>
                          setPaymentDraft({
                            ...paymentDraft,
                            paymentDate: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>{isEnglish ? 'Reference' : 'Referencia'}</span>
                      <input
                        maxLength={120}
                        value={paymentDraft.reference}
                        onChange={(event) =>
                          setPaymentDraft({
                            ...paymentDraft,
                            reference: event.target.value,
                          })
                        }
                      />
                    </label>
                    {paymentDraft.method !== 'CREDIT' &&
                    draftedPaymentShortfall >= 0.01 ? (
                      <div
                        className={styles.paymentBalanceWarning}
                        role="alert"
                      >
                        <strong>
                          {isEnglish
                            ? 'Insufficient balance in this payment method'
                            : 'Saldo insuficiente en este medio de pago'}
                        </strong>
                        <span>
                          {paymentDraft.fundSource === 'RESERVE'
                            ? isEnglish
                              ? 'Reserve available'
                              : 'Reserva disponible'
                            : isEnglish
                              ? 'Register available'
                              : 'Caja disponible'}
                          : {formatCurrency(draftedMethodBalance)} ·{' '}
                          {isEnglish ? 'It would remain at' : 'Quedaría en'}{' '}
                          {formatCurrency(-draftedPaymentShortfall)}.
                        </span>
                      </div>
                    ) : null}
                    <div className={styles.paymentFormActions}>
                      <button
                        type="button"
                        onClick={() => setPaymentDraft(null)}
                      >
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
                            fundSource: paymentDraft.fundSource,
                            reference:
                              paymentDraft.reference.trim() || undefined,
                            paymentDate: toExpenseRequestDate(
                              paymentDraft.paymentDate,
                            ),
                          })
                          setPaymentDraft(null)
                        }}
                      >
                        {payingPurchaseId === purchase.purchaseId
                          ? isEnglish
                            ? 'Saving...'
                            : 'Guardando...'
                          : isEnglish
                            ? 'Save payment'
                            : 'Guardar abono'}
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
