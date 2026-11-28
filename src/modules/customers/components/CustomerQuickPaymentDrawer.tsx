import { useId, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Banknote, Store } from 'lucide-react'
import { useCustomerDetailQuery, useRegisterCustomerOldestPaymentMutation } from '@/modules/customers/hooks/use-customers-query'
import type { CustomerPaymentMethod, CustomerSummary } from '@/modules/customers/types/customer'
import { isCashSessionRequiredError } from '@/modules/cash-register/utils/is-cash-session-required-error'
import { AppButton } from '@/shared/components/ui/AppButton'
import { AppDrawer } from '@/shared/components/ui/AppDrawer'
import { COLLECTED_PAYMENT_METHOD_OPTIONS } from '@/shared/payments/payment-methods'
import { ApiError } from '@/shared/services/api-client'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './CustomerQuickPaymentDrawer.module.css'

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

type Props = {
  customer: CustomerSummary
  cashRegisterId: string | null
  cashRegisterLoading: boolean
  cashRegisterError: boolean
  isSuspended: boolean
  onClose: () => void
  onOpenCash?: () => void
  onRefreshCash: () => Promise<unknown>
  onRecorded: (customerName: string, amount: string, remaining: string) => void
}

function parseAmountInCents(value: string) {
  const normalized = value.trim()
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(normalized)) return 0
  const cents = Math.round(Number(normalized.replace(',', '.')) * 100)
  return Number.isSafeInteger(cents) ? cents : 0
}

function formatCents(cents: number) {
  return currencyFormatter.format(cents / 100)
}

export function CustomerQuickPaymentDrawer({
  customer,
  cashRegisterId,
  cashRegisterLoading,
  cashRegisterError,
  isSuspended,
  onClose,
  onOpenCash,
  onRefreshCash,
  onRecorded,
}: Props) {
  const formId = useId()
  const balanceQuery = useCustomerDetailQuery(customer.id, 'always')
  const payment = useRegisterCustomerOldestPaymentMutation()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<CustomerPaymentMethod>('CASH')
  const [feedback, setFeedback] = useState<string | null>(null)
  const balanceInCents = balanceQuery.data?.receivables.reduce(
    (total, receivable) => total + (
      receivable.status !== 'CANCELLED' && receivable.balance > 0
        ? Math.round(receivable.balance * 100)
        : 0
    ),
    0,
  )
  const amountInCents = parseAmountInCents(amount)
  const isOverBalance = balanceInCents !== undefined && amountInCents > balanceInCents
  const invalidAmount = amount.trim().length > 0 && amountInCents === 0
  const remaining = balanceInCents !== undefined && !isOverBalance && !invalidAmount
    ? balanceInCents - amountInCents
    : undefined
  const canConfirm = Boolean(cashRegisterId) && !cashRegisterLoading && !cashRegisterError &&
    !balanceQuery.isFetching && !balanceQuery.isError && !payment.isPending &&
    balanceInCents !== undefined && amountInCents > 0 && remaining !== undefined

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canConfirm || !cashRegisterId || balanceInCents === undefined || remaining === undefined) return

    setFeedback(null)
    try {
      const result = await payment.mutateAsync({
        customerId: customer.id,
        input: {
          amount: amountInCents / 100,
          method,
          cashRegisterId,
          expectedOutstandingBalance: balanceInCents / 100,
        },
      })
      onRecorded(customer.name, currencyFormatter.format(result.amount), formatCents(remaining))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'RECEIVABLE_BALANCE_CHANGED') {
        setFeedback('El saldo cambió. Revisa el nuevo saldo antes de confirmar.')
        await balanceQuery.refetch()
      } else if (isCashSessionRequiredError(error)) {
        setFeedback('El turno de caja cambió. Revisa el estado de caja antes de confirmar.')
        await onRefreshCash()
      } else {
        setFeedback(getErrorMessage(error, 'No pudimos registrar el abono. Intenta de nuevo.'))
      }
    }
  }

  return createPortal(
    <AppDrawer
      description={customer.name}
      isOpen={!isSuspended}
      title="Registrar abono"
      titleAccessory={<Banknote aria-hidden="true" size={21} />}
      footer={(
        <div className={styles.actions}>
          <AppButton disabled={payment.isPending} variant="secondary" onClick={onClose}>Cancelar</AppButton>
          <AppButton
            disabled={!canConfirm}
            form={formId}
            isLoading={payment.isPending}
            loadingLabel="Registrando…"
            type="submit"
          >
            Confirmar abono
          </AppButton>
        </div>
      )}
      onClose={() => { if (!payment.isPending) onClose() }}
    >
      <form className={styles.form} id={formId} onSubmit={(event) => void submitPayment(event)}>
        <dl className={styles.balances} aria-live="polite">
          <div>
            <dt>Saldo de facturas</dt>
            <dd>{balanceInCents === undefined || balanceQuery.isError ? '—' : formatCents(balanceInCents)}</dd>
          </div>
          <div>
            <dt>Saldo después del abono</dt>
            <dd>{remaining === undefined || balanceQuery.isError ? '—' : formatCents(remaining)}</dd>
          </div>
        </dl>

        {balanceQuery.isError ? (
          <div className={styles.notice} role="alert">
            No pudimos consultar el saldo.
            <AppButton size="sm" variant="secondary" onClick={() => void balanceQuery.refetch()}>Reintentar</AppButton>
          </div>
        ) : balanceQuery.isFetching ? (
          <p className={styles.hint} role="status">Consultando el saldo…</p>
        ) : balanceInCents === 0 ? (
          <p className={styles.hint} role="status">Este cliente ya no tiene facturas pendientes.</p>
        ) : null}

        <div className={styles.fields}>
          <label>
            Valor recibido
            <input
              aria-invalid={isOverBalance || invalidAmount}
              disabled={payment.isPending}
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value)
                setFeedback(null)
              }}
            />
          </label>
          <label>
            Medio de pago
            <select
              disabled={payment.isPending}
              value={method}
              onChange={(event) => setMethod(event.target.value as CustomerPaymentMethod)}
            >
              {COLLECTED_PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        {isOverBalance || invalidAmount ? (
          <p className={styles.error} role="alert">
            {isOverBalance ? 'El abono no puede superar el saldo pendiente.' : 'Escribe un valor mayor a cero, sin separador de miles y con hasta dos decimales.'}
          </p>
        ) : null}
        <p className={styles.hint}>El abono se aplica primero a las facturas más antiguas.</p>
        {cashRegisterError ? (
          <div className={styles.notice} role="alert">
            No pudimos consultar la caja.
            <AppButton size="sm" variant="secondary" onClick={() => void onRefreshCash()}>Reintentar</AppButton>
          </div>
        ) : !cashRegisterLoading && !cashRegisterId ? (
          <div className={styles.notice}>
            <span>{onOpenCash ? 'Abre caja para registrar el abono.' : 'Pide a un encargado que abra caja para registrar el abono.'}</span>
            {onOpenCash ? (
              <AppButton size="sm" startIcon={<Store aria-hidden="true" />} variant="secondary" onClick={onOpenCash}>
                Abrir caja
              </AppButton>
            ) : null}
          </div>
        ) : null}
        {feedback ? <p className={styles.error} role="alert">{feedback}</p> : null}
      </form>
    </AppDrawer>,
    document.body,
  )
}
