import { zodResolver } from '@hookform/resolvers/zod'
import {
  Banknote,
  Building2,
  Check,
  CreditCard,
  Landmark,
  Save,
  Smartphone,
} from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  expenseFormSchema,
  type ExpenseFormValues,
} from '@/modules/expenses/schemas/expense-form-schema'
import type {
  Expense,
  ExpenseCategory,
  ExpenseMutationInput,
  ExpensePaymentMethod,
} from '@/modules/expenses/types/expense'
import {
  toExpenseDateInputValue,
  toExpenseRequestDate,
} from '@/modules/expenses/utils/format-expense'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import { ApiError } from '@/shared/services/api-client'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './ExpenseFormPanel.module.css'

type ExpenseFormPanelProps = {
  categories: ExpenseCategory[]
  expense: Expense | null
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (input: ExpenseMutationInput) => Promise<void>
}

const paymentMethods: Array<{
  icon: typeof Banknote
  label: string
  value: ExpensePaymentMethod
}> = [
  { icon: Banknote, label: 'Efectivo', value: 'CASH' },
  { icon: CreditCard, label: 'Tarjeta', value: 'CARD' },
  { icon: Landmark, label: 'Transf.', value: 'TRANSFER' },
  { icon: Smartphone, label: 'Billetera', value: 'DIGITAL_WALLET' },
  { icon: Building2, label: 'Depósito', value: 'BANK_DEPOSIT' },
]

function getDefaultValues(expense: Expense | null): ExpenseFormValues {
  return {
    concept: expense?.concept ?? '',
    categoryId: expense?.categoryId ?? '',
    amount: expense?.amount ?? 0,
    paymentMethod: expense?.paymentMethod ?? 'CASH',
    status: expense?.status ?? 'PAID',
    expenseDate: toExpenseDateInputValue(expense?.expenseDate ?? new Date()),
    notes: expense?.notes ?? '',
  }
}

function normalizeOptionalValue(value: string | undefined) {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : undefined
}

function normalizeOptionalRelationId(value: string | undefined) {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : null
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'No pudimos guardar el gasto en este momento.'
}

export function ExpenseFormPanel({
  categories,
  expense,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: ExpenseFormPanelProps) {
  const isEditing = expense !== null
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: getDefaultValues(expense),
  })

  const selectedStatus = watch('status')
  const selectedPaymentMethod = watch('paymentMethod')

  useEffect(() => {
    reset(getDefaultValues(expense))
  }, [expense, isOpen, reset])

  const submitExpense = handleSubmit(async (values) => {
    try {
      await onSubmit({
        concept: values.concept.trim(),
        categoryId: normalizeOptionalRelationId(values.categoryId),
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        status: values.status,
        expenseDate: toExpenseRequestDate(values.expenseDate),
        notes: normalizeOptionalValue(values.notes) ?? null,
      })
    } catch (error) {
      setError('root', { message: getErrorMessage(error) })
    }
  })

  const isPaid = selectedStatus === 'PAID'

  return (
    <SideDrawer
      bodyClassName={styles.drawerBody}
      closeButtonClassName={styles.closeButton}
      closeLabel="Cerrar formulario de gasto"
      description={isEditing ? 'Actualiza la información del egreso.' : 'Registra un egreso de caja.'}
      footer={
        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            disabled={isSubmitting}
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className={styles.primaryButton}
            disabled={isSubmitting}
            form="expense-drawer-form"
            type="submit"
          >
            <Save aria-hidden="true" size={16} />
            {isSubmitting
              ? 'Guardando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear gasto'}
          </button>
        </div>
      }
      isCloseDisabled={isSubmitting}
      isOpen={isOpen}
      panelClassName={styles.drawer}
      title={isEditing ? 'Editar gasto' : 'Nuevo gasto'}
      onClose={onClose}
    >
      <form
        className={styles.form}
        id="expense-drawer-form"
        noValidate
        onSubmit={submitExpense}
      >
        <label className={styles.amountCard}>
          <span className={styles.amountLabel}>Valor del gasto</span>
          <span className={styles.amountControl}>
            <span aria-hidden="true">$</span>
            <input
              aria-invalid={Boolean(errors.amount)}
              inputMode="decimal"
              min="0.01"
              placeholder="0"
              step="0.01"
              type="number"
              {...register('amount')}
            />
          </span>
          <span className={styles.currencyLabel}>COP (Pesos Colombianos)</span>
          {errors.amount ? (
            <span className={styles.errorMessage}>{errors.amount.message}</span>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Fecha del gasto</span>
          <input
            aria-invalid={Boolean(errors.expenseDate)}
            className={styles.input}
            type="date"
            {...register('expenseDate')}
          />
          {errors.expenseDate ? (
            <span className={styles.errorMessage}>{errors.expenseDate.message}</span>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Concepto / notas</span>
          <textarea
            aria-invalid={Boolean(errors.concept)}
            className={styles.textarea}
            placeholder="Ej. Compra de papelería para la oficina..."
            rows={3}
            {...register('concept')}
          />
          {errors.concept ? (
            <span className={styles.errorMessage}>{errors.concept.message}</span>
          ) : null}
        </label>

        <input type="hidden" {...register('notes')} />

        <label className={styles.field}>
          <span className={styles.label}>Categoría</span>
          <select className={styles.select} {...register('categoryId')}>
            <option value="">Selecciona una categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset className={styles.paymentFieldset}>
          <legend className={styles.label}>Método de pago</legend>
          <input type="hidden" {...register('paymentMethod')} />
          <div className={styles.paymentGrid}>
            {paymentMethods.map(({ icon: Icon, label, value }) => (
              <button
                key={value}
                aria-pressed={selectedPaymentMethod === value}
                className={joinClassNames(
                  styles.paymentButton,
                  selectedPaymentMethod === value && styles.paymentButtonActive,
                )}
                type="button"
                onClick={() => setValue('paymentMethod', value, { shouldDirty: true })}
              >
                <Icon aria-hidden="true" size={21} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className={styles.statusCard}>
          <span className={styles.label}>Estado del gasto</span>
          <input type="hidden" {...register('status')} />
          <button
            aria-pressed={isPaid}
            className={styles.statusToggle}
            type="button"
            onClick={() =>
              setValue('status', isPaid ? 'PENDING' : 'PAID', {
                shouldDirty: true,
              })
            }
          >
            <span className={styles.statusIcon}>
              {isPaid ? <Check aria-hidden="true" size={15} /> : null}
            </span>
            <span className={styles.statusCopy}>
              <strong>{isPaid ? 'Pagado' : 'Pendiente'}</strong>
              <small>
                {isPaid
                  ? 'El dinero ya salió de la caja.'
                  : 'El pago todavía está por realizarse.'}
              </small>
            </span>
            <span className={joinClassNames(styles.switch, isPaid && styles.switchActive)}>
              <span />
            </span>
          </button>
        </div>

        {isPaid && selectedPaymentMethod === 'CASH' ? (
          <div className={styles.helperBanner}>
            Si hay una caja abierta, este gasto impactará automáticamente el arqueo diario.
          </div>
        ) : null}

        {errors.root?.message ? (
          <div className={styles.errorBanner} role="alert">
            {errors.root.message}
          </div>
        ) : null}
      </form>
    </SideDrawer>
  )
}
