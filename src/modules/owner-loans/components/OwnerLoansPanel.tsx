import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { useState } from 'react'
import type { FormEvent } from 'react'
import { HandCoins, Plus, WalletCards } from 'lucide-react'
import type { CashRegisterPaymentMethod } from '@/modules/cash-register/types/cash-register'
import { formatCashRegisterCurrency } from '@/modules/cash-register/utils/format-cash-register'
import type {
  CreateOwnerLoanInput,
  CreateOwnerLoanPaymentInput,
  OwnerLoan,
} from '@/modules/owner-loans/types/owner-loan'
import { COLLECTED_PAYMENT_METHOD_OPTIONS } from '@/shared/payments/payment-methods'
import {
  toDateInputValue,
  toOperationDateTime,
} from '@/shared/utils/date-input'
import styles from './OwnerLoansPanel.module.css'

type Props = {
  loans: OwnerLoan[]
  isLoading: boolean
  isSubmitting: boolean
  onCreate: (input: CreateOwnerLoanInput) => Promise<void>
  onPayment: (
    ownerLoanId: string,
    input: CreateOwnerLoanPaymentInput,
  ) => Promise<void>
}

const methods = COLLECTED_PAYMENT_METHOD_OPTIONS.filter(
  ({ value }) => value !== 'CREDIT',
)

export function OwnerLoansPanel({
  loans,
  isLoading,
  isSubmitting,
  onCreate,
  onPayment,
}: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null)
  const [lenderName, setLenderName] = useState('Jose Alberneth Diaz Fernandez')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<CashRegisterPaymentMethod>('CASH')
  const [date, setDate] = useState(() => toDateInputValue(new Date()))
  const [notes, setNotes] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] =
    useState<CashRegisterPaymentMethod>('CASH')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await onCreate({
        lenderName: lenderName.trim(),
        amount: Number(amount),
        method,
        receivedAt: toOperationDateTime(date),
        notes: notes.trim() || undefined,
      })
      setAmount('')
      setNotes('')
      setShowCreate(false)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No fue posible registrar el préstamo.',
      )
    }
  }

  async function handlePayment(event: FormEvent, loan: OwnerLoan) {
    event.preventDefault()
    setError(null)
    try {
      await onPayment(loan.id, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        paymentDate: new Date().toISOString(),
      })
      setPaymentAmount('')
      setPaymentLoanId(null)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No fue posible registrar el abono.',
      )
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Financiación del negocio</span>
          <h3>Préstamos del propietario</h3>
          <p>Registra el dinero prestado y controla cuánto falta por devolver.</p>
        </div>
        <button type="button" onClick={() => setShowCreate((value) => !value)}>
          <Plus /> Registrar préstamo
        </button>
      </div>

      {showCreate ? (
        <form className={styles.form} onSubmit={handleCreate}>
          <label>
            <span>Prestamista</span>
            <input
              required
              value={lenderName}
              onChange={(event) => setLenderName(event.target.value)}
            />
          </label>
          <label>
            <span>Valor prestado</span>
            <input
              required
              min="0.01"
              step="0.01"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label>
            <span>Medio de ingreso</span>
            <SearchableSelect
              value={method}
              onChange={(event) =>
                setMethod(event.target.value as CashRegisterPaymentMethod)
              }
            >
              {methods.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SearchableSelect>
          </label>
          <label>
            <span>Fecha</span>
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label className={styles.wideField}>
            <span>Nota (opcional)</span>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <button disabled={isSubmitting} type="submit">
            Guardar préstamo
          </button>
        </form>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      {isLoading ? (
        <p className={styles.empty}>Consultando préstamos...</p>
      ) : loans.length === 0 ? (
        <p className={styles.empty}>Todavía no hay préstamos registrados.</p>
      ) : (
        <div className={styles.list}>
          {loans.map((loan) => (
            <article className={styles.loan} key={loan.id}>
              <div className={styles.loanIcon}>
                <HandCoins />
              </div>
              <div className={styles.loanMain}>
                <strong>{loan.lenderName}</strong>
                <span>
                  Prestado: {formatCashRegisterCurrency(loan.originalAmount)} ·
                  Pagado:{' '}
                  {formatCashRegisterCurrency(
                    loan.originalAmount - loan.balance,
                  )}
                </span>
              </div>
              <div className={styles.balance}>
                <span>Saldo pendiente</span>
                <strong>{formatCashRegisterCurrency(loan.balance)}</strong>
              </div>
              {loan.status === 'ACTIVE' ? (
                <button
                  className={styles.paymentToggle}
                  type="button"
                  onClick={() =>
                    setPaymentLoanId((current) =>
                      current === loan.id ? null : loan.id,
                    )
                  }
                >
                  <WalletCards /> Registrar abono
                </button>
              ) : (
                <span className={styles.paid}>Pagado</span>
              )}

              {paymentLoanId === loan.id ? (
                <form
                  className={styles.paymentForm}
                  onSubmit={(event) => handlePayment(event, loan)}
                >
                  <input
                    required
                    max={loan.balance}
                    min="0.01"
                    placeholder="Valor del abono"
                    step="0.01"
                    type="number"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                  />
                  <SearchableSelect
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target.value as CashRegisterPaymentMethod,
                      )
                    }
                  >
                    {methods.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SearchableSelect>
                  <button disabled={isSubmitting} type="submit">
                    Confirmar abono
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
