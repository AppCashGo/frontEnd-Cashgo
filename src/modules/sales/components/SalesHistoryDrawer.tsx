import { useEffect, useMemo, useState } from 'react'
import { Download, RotateCcw, Search, XCircle } from 'lucide-react'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import {
  useCancelSaleMutation,
  useCreateSaleReturnMutation,
} from '@/modules/sales/hooks/use-create-sale-mutation'
import {
  downloadSaleReceipt,
  downloadSaleReturnCreditNote,
} from '@/modules/sales/services/sales-api'
import type {
  SalePaymentMethod,
  SaleReceipt,
  SaleReturnInput,
} from '@/modules/sales/types/sale'
import { AppDrawer } from '@/shared/components/ui/AppDrawer'
import { downloadBlobFile } from '@/shared/utils/download-blob-file'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDate } from '@/shared/utils/format-date'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './SalesHistoryDrawer.module.css'

type SalesHistoryDrawerProps = {
  initialSaleId?: string | null
  isOpen: boolean
  sales: SaleReceipt[]
  onClose: () => void
}

type DraftMode = 'return' | 'cancel' | null

const refundMethods: Array<{ value: SalePaymentMethod; label: string }> = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'DIGITAL_WALLET', label: 'Billetera digital' },
  { value: 'BANK_DEPOSIT', label: 'Consignación bancaria' },
  { value: 'OTHER', label: 'Otro' },
]

function todayInputValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function saleReturnedAmount(sale: SaleReceipt) {
  return sale.returns.reduce((total, item) => total + item.amount, 0)
}

function statusLabel(sale: SaleReceipt) {
  if (sale.status === 'CANCELLED') return 'Anulada'
  if (saleReturnedAmount(sale) >= sale.total - 0.01) return 'Devuelta'
  if (sale.returns.length > 0) return 'Devolución parcial'
  if (sale.status === 'PENDING_PAYMENT') return 'Pendiente'
  if (sale.status === 'PARTIALLY_PAID') return 'Pago parcial'
  return 'Pagada'
}

export function SalesHistoryDrawer({
  initialSaleId = null,
  isOpen,
  sales,
  onClose,
}: SalesHistoryDrawerProps) {
  const currentUser = useAuthSessionStore((state) => state.user)
  const canManageReturns = ['OWNER', 'ADMIN', 'MANAGER'].includes(
    currentUser?.role ?? '',
  )
  const cancelMutation = useCancelSaleMutation()
  const returnMutation = useCreateSaleReturnMutation()
  const [search, setSearch] = useState('')
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [draftMode, setDraftMode] = useState<DraftMode>(null)
  const [reason, setReason] = useState('')
  const [returnDate, setReturnDate] = useState(todayInputValue)
  const [refundMethod, setRefundMethod] = useState<SalePaymentMethod>('CASH')
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<string | null>(null)

  const normalizedSearch = search.trim().toLowerCase()
  const visibleSales = useMemo(
    () =>
      sales.filter((sale) =>
        [sale.saleNumber, sale.customer?.name, sale.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch),
      ),
    [normalizedSearch, sales],
  )
  const selectedSale = sales.find((sale) => sale.id === selectedSaleId) ?? null
  const selectedLines =
    selectedSale?.items
      .map((item) => ({
        item,
        available: item.quantity - item.returnedQuantity,
        quantity: Math.max(0, Number(quantities[item.id] ?? 0)),
      }))
      .filter((line) => line.available > 0) ?? []
  const originalItemsAmount =
    selectedSale?.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    ) ?? 0
  const estimatedReturnAmount = selectedSale
    ? selectedLines.reduce(
        (total, line) =>
          total +
          (originalItemsAmount > 0
            ? (selectedSale.total * line.item.price * line.quantity) /
              originalItemsAmount
            : 0),
        0,
      )
    : 0
  const estimatedRefund = Math.max(
    estimatedReturnAmount - (selectedSale?.accountReceivable?.balance ?? 0),
    0,
  )
  const isSubmitting = cancelMutation.isPending || returnMutation.isPending

  useEffect(() => {
    if (isOpen && initialSaleId) {
      setSelectedSaleId(initialSaleId)
    }
  }, [initialSaleId, isOpen])

  function resetDraft() {
    setDraftMode(null)
    setReason('')
    setQuantities({})
    setReturnDate(todayInputValue())
    setRefundMethod('CASH')
    setFeedback(null)
  }

  function selectSale(saleId: string) {
    setSelectedSaleId(saleId)
    resetDraft()
  }

  async function downloadReceipt(sale: SaleReceipt) {
    try {
      const { blob, filename } = await downloadSaleReceipt(sale.id)
      downloadBlobFile(blob, filename ?? `${sale.saleNumber}.html`)
    } catch (error) {
      setFeedback(
        getErrorMessage(error, 'No pudimos descargar el comprobante.'),
      )
    }
  }

  async function downloadCreditNote(saleId: string, returnId: string) {
    try {
      const { blob, filename } = await downloadSaleReturnCreditNote(
        saleId,
        returnId,
      )
      downloadBlobFile(blob, filename ?? `nota-credito-${returnId}.html`)
    } catch (error) {
      setFeedback(
        getErrorMessage(error, 'No pudimos descargar la nota crédito.'),
      )
    }
  }

  async function submitReturn() {
    if (!selectedSale) return

    const items = selectedLines
      .filter((line) => Number.isInteger(line.quantity) && line.quantity > 0)
      .map((line) => ({
        saleItemId: line.item.id,
        quantity: line.quantity,
      }))
    const hasInvalidQuantity = selectedLines.some(
      (line) =>
        line.quantity < 0 ||
        !Number.isInteger(line.quantity) ||
        line.quantity > line.available,
    )
    if (items.length === 0 || hasInvalidQuantity || reason.trim().length < 3) {
      setFeedback(
        'Selecciona cantidades válidas y escribe el motivo de la devolución.',
      )
      return
    }

    const input: SaleReturnInput = {
      items,
      reason: reason.trim(),
      returnDate,
      refundMethod: estimatedRefund > 0 ? refundMethod : undefined,
    }

    try {
      await returnMutation.mutateAsync({ saleId: selectedSale.id, input })
      setFeedback(
        'La devolución y la nota crédito se registraron correctamente.',
      )
      setDraftMode(null)
      setQuantities({})
      setReason('')
    } catch (error) {
      setFeedback(getErrorMessage(error, 'No pudimos registrar la devolución.'))
    }
  }

  async function submitCancellation() {
    if (!selectedSale) return
    try {
      await cancelMutation.mutateAsync({
        saleId: selectedSale.id,
        input: { reason: reason.trim() || undefined },
      })
      setFeedback('La venta fue anulada y el inventario quedó restaurado.')
      setDraftMode(null)
      setReason('')
    } catch (error) {
      setFeedback(getErrorMessage(error, 'No pudimos anular la venta.'))
    }
  }

  return (
    <AppDrawer
      description="Consulta comprobantes, devoluciones y notas crédito."
      isOpen={isOpen}
      size="lg"
      title={selectedSale ? selectedSale.saleNumber : 'Historial de ventas'}
      onClose={() => {
        if (initialSaleId) {
          setSelectedSaleId(null)
          resetDraft()
          onClose()
          return
        }

        if (selectedSale) {
          setSelectedSaleId(null)
          resetDraft()
          return
        }
        onClose()
      }}
    >
      {!selectedSale ? (
        <>
          <label className={styles.searchField}>
            <Search aria-hidden="true" />
            <input
              placeholder="Buscar por venta o cliente"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className={styles.salesList}>
            {visibleSales.length === 0 ? (
              <div className={styles.emptyState}>
                No encontramos ventas con ese criterio.
              </div>
            ) : (
              visibleSales.map((sale) => (
                <button
                  className={styles.saleCard}
                  key={sale.id}
                  type="button"
                  onClick={() => selectSale(sale.id)}
                >
                  <span>
                    <strong>{sale.saleNumber}</strong>
                    <small>
                      {sale.customer?.name ?? 'Venta de mostrador'} ·{' '}
                      {formatDate(sale.saleDate)}
                    </small>
                  </span>
                  <span className={styles.saleCardValue}>
                    <strong>{formatCurrency(sale.total)}</strong>
                    <small>{statusLabel(sale)}</small>
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      ) : (
        <div className={styles.detail}>
          <section className={styles.summaryCard}>
            <div>
              <span>Cliente</span>
              <strong>
                {selectedSale.customer?.name ?? 'Venta de mostrador'}
              </strong>
            </div>
            <div>
              <span>Total original</span>
              <strong>{formatCurrency(selectedSale.total)}</strong>
            </div>
            <div>
              <span>Notas crédito</span>
              <strong>
                -{formatCurrency(saleReturnedAmount(selectedSale))}
              </strong>
            </div>
            <div>
              <span>Total neto</span>
              <strong>
                {formatCurrency(
                  selectedSale.total - saleReturnedAmount(selectedSale),
                )}
              </strong>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <strong>Productos vendidos</strong>
                <small>Selecciona una acción para gestionar esta venta.</small>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                onClick={() => void downloadReceipt(selectedSale)}
              >
                <Download aria-hidden="true" /> Comprobante
              </button>
            </div>
            <div className={styles.itemList}>
              {selectedSale.items.map((item) => (
                <div className={styles.itemRow} key={item.id}>
                  <span>
                    <strong>{item.product.name}</strong>
                    <small>
                      {item.quantity - item.returnedQuantity} de {item.quantity}{' '}
                      disponibles para devolver
                    </small>
                  </span>
                  <strong>{formatCurrency(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
          </section>

          {selectedSale.returns.length > 0 ? (
            <section className={styles.section}>
              <strong>Notas crédito</strong>
              <div className={styles.creditList}>
                {selectedSale.returns.map((saleReturn) => (
                  <div key={saleReturn.id}>
                    <span>
                      <strong>{saleReturn.creditNumber}</strong>
                      <small>
                        {formatDate(saleReturn.returnDate)} ·{' '}
                        {saleReturn.reason}
                      </small>
                    </span>
                    <span>
                      <strong>{formatCurrency(saleReturn.amount)}</strong>
                      <button
                        type="button"
                        onClick={() =>
                          void downloadCreditNote(
                            selectedSale.id,
                            saleReturn.id,
                          )
                        }
                      >
                        Descargar
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {feedback ? (
            <p className={styles.feedback} role="status">
              {feedback}
            </p>
          ) : null}

          {draftMode === 'return' ? (
            <section className={styles.actionForm}>
              <div className={styles.sectionHeader}>
                <div>
                  <strong>Registrar devolución</strong>
                  <small>
                    El saldo pendiente se reduce antes de generar un reembolso.
                  </small>
                </div>
                <strong>{formatCurrency(estimatedReturnAmount)}</strong>
              </div>
              <div className={styles.returnItems}>
                {selectedLines.map((line) => (
                  <label key={line.item.id}>
                    <span>
                      <strong>{line.item.product.name}</strong>
                      <small>Máximo {line.available}</small>
                    </span>
                    <input
                      min="0"
                      max={line.available}
                      step="1"
                      type="number"
                      value={quantities[line.item.id] ?? ''}
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [line.item.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <div className={styles.fieldGrid}>
                <label>
                  <span>Fecha</span>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(event) => setReturnDate(event.target.value)}
                  />
                </label>
                {estimatedRefund > 0 ? (
                  <label>
                    <span>Método de reembolso</span>
                    <select
                      value={refundMethod}
                      onChange={(event) =>
                        setRefundMethod(event.target.value as SalePaymentMethod)
                      }
                    >
                      {refundMethods.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className={styles.balanceNotice}>
                    <span>Aplicado a cartera</span>
                    <strong>
                      {formatCurrency(
                        Math.min(
                          estimatedReturnAmount,
                          selectedSale.accountReceivable?.balance ?? 0,
                        ),
                      )}
                    </strong>
                  </div>
                )}
              </div>
              <label className={styles.reasonField}>
                <span>Motivo</span>
                <textarea
                  maxLength={255}
                  placeholder="Ej. producto defectuoso o cambio solicitado"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <div className={styles.formActions}>
                <button
                  className={styles.secondaryButton}
                  disabled={isSubmitting}
                  type="button"
                  onClick={resetDraft}
                >
                  Cancelar
                </button>
                <button
                  className={styles.primaryButton}
                  disabled={isSubmitting || estimatedReturnAmount <= 0}
                  type="button"
                  onClick={() => void submitReturn()}
                >
                  {returnMutation.isPending
                    ? 'Registrando…'
                    : 'Crear nota crédito'}
                </button>
              </div>
            </section>
          ) : null}

          {draftMode === 'cancel' ? (
            <section className={styles.actionForm}>
              <strong>Anular venta completa</strong>
              <p>
                Esta acción restaura todo el inventario y revierte el saldo
                pendiente. Úsala solo si la venta completa debe quedar sin
                efecto.
              </p>
              <label className={styles.reasonField}>
                <span>Motivo de anulación</span>
                <textarea
                  maxLength={255}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <div className={styles.formActions}>
                <button
                  className={styles.secondaryButton}
                  disabled={isSubmitting}
                  type="button"
                  onClick={resetDraft}
                >
                  Volver
                </button>
                <button
                  className={styles.dangerButton}
                  disabled={isSubmitting}
                  type="button"
                  onClick={() => void submitCancellation()}
                >
                  {cancelMutation.isPending
                    ? 'Anulando…'
                    : 'Confirmar anulación'}
                </button>
              </div>
            </section>
          ) : null}

          {canManageReturns &&
          !draftMode &&
          selectedSale.status !== 'CANCELLED' ? (
            <div className={styles.mainActions}>
              {selectedLines.length > 0 ? (
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => {
                    setFeedback(null)
                    setDraftMode('return')
                  }}
                >
                  <RotateCcw aria-hidden="true" /> Registrar devolución
                </button>
              ) : null}
              {selectedSale.returns.length === 0 ? (
                <button
                  className={styles.dangerGhostButton}
                  type="button"
                  onClick={() => {
                    setFeedback(null)
                    setDraftMode('cancel')
                  }}
                >
                  <XCircle aria-hidden="true" /> Anular venta
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </AppDrawer>
  )
}
