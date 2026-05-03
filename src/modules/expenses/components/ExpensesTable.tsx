import type { Expense } from '@/modules/expenses/types/expense'
import {
  formatExpenseCurrency,
  formatExpenseDate,
  formatExpenseDateTime,
  getExpensePaymentMethodLabel,
  getExpenseStatusLabel,
} from '@/modules/expenses/utils/format-expense'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './ExpensesTable.module.css'

type ExpensesTableProps = {
  errorMessage: string | null
  expenses: Expense[]
  isLoading: boolean
  isRefreshing: boolean
  selectedExpenseId: string | null
  onDeleteExpense: (expense: Expense) => void
  onRetry: () => void
  onSelectExpense: (expenseId: string) => void
}

function getStatusClass(status: Expense['status']) {
  if (status === 'PAID') {
    return styles.statusPaid
  }

  if (status === 'PENDING') {
    return styles.statusPending
  }

  return styles.statusCancelled
}

export function ExpensesTable({
  errorMessage,
  expenses,
  isLoading,
  isRefreshing,
  selectedExpenseId,
  onDeleteExpense,
  onRetry,
  onSelectExpense,
}: ExpensesTableProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Movimientos de salida</p>
          <h3 className={styles.title}>Gastos registrados</h3>
          <p className={styles.description}>
            Selecciona un gasto para editarlo, revisar cómo fue pagado o
            depurar registros manuales.
          </p>
        </div>

        <div className={styles.headerMeta}>
          <span className={styles.countBadge}>
            {expenses.length.toString()} registros
          </span>
          {isRefreshing ? (
            <span className={styles.refreshingLabel}>Actualizando...</span>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <div className={styles.feedbackCard} role="alert">
          <p className={styles.feedbackTitle}>No pudimos cargar los gastos.</p>
          <p className={styles.feedbackDescription}>{errorMessage}</p>
          <button className={styles.feedbackButton} type="button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className={styles.feedbackCard}>
          <p className={styles.feedbackTitle}>Cargando gastos...</p>
          <p className={styles.feedbackDescription}>
            Estamos trayendo los últimos movimientos y categorías desde tu
            negocio activo.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && expenses.length === 0 ? (
        <div className={styles.feedbackCard}>
          <p className={styles.feedbackTitle}>Todavía no hay gastos visibles.</p>
          <p className={styles.feedbackDescription}>
            Crea el primer gasto para empezar a clasificar egresos y alimentar
            reportes, caja y flujo de efectivo.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && expenses.length > 0 ? (
        <>
          <div className={styles.mobileList}>
            {expenses.map((expense) => (
              <button
                key={expense.id}
                className={joinClassNames(
                  styles.mobileItem,
                  selectedExpenseId === expense.id && styles.mobileItemSelected,
                )}
                type="button"
                onClick={() => onSelectExpense(expense.id)}
              >
                <div className={styles.mobileRow}>
                  <div>
                    <p className={styles.mobileConcept}>{expense.concept}</p>
                    <p className={styles.mobileMeta}>
                      {expense.category?.name ?? 'Sin categoría'} ·{' '}
                      {getExpensePaymentMethodLabel(expense.paymentMethod)}
                    </p>
                  </div>

                  <p className={styles.mobileAmount}>
                    {formatExpenseCurrency(expense.amount)}
                  </p>
                </div>

                <div className={styles.mobileRow}>
                  <span
                    className={joinClassNames(
                      styles.statusBadge,
                      getStatusClass(expense.status),
                    )}
                  >
                    {getExpenseStatusLabel(expense.status)}
                  </span>

                  <span className={styles.mobileDate}>
                    {formatExpenseDate(expense.expenseDate)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className={styles.desktopTableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Valor</th>
                  <th>Método</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className={joinClassNames(
                      styles.row,
                      selectedExpenseId === expense.id && styles.rowSelected,
                    )}
                  >
                    <td>
                      <button
                        className={styles.selectButton}
                        type="button"
                        onClick={() => onSelectExpense(expense.id)}
                      >
                        <div className={styles.conceptCell}>
                          <p className={styles.concept}>{expense.concept}</p>
                          <p className={styles.meta}>
                            Creado {formatExpenseDateTime(expense.createdAt)}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td>
                      <span className={styles.categoryBadge}>
                        {expense.category?.name ?? 'Sin categoría'}
                      </span>
                    </td>
                    <td className={styles.amountCell}>
                      {formatExpenseCurrency(expense.amount)}
                    </td>
                    <td>{getExpensePaymentMethodLabel(expense.paymentMethod)}</td>
                    <td>{formatExpenseDate(expense.expenseDate)}</td>
                    <td>
                      <span
                        className={joinClassNames(
                          styles.statusBadge,
                          getStatusClass(expense.status),
                        )}
                      >
                        {getExpenseStatusLabel(expense.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.deleteButton}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDeleteExpense(expense)
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </SurfaceCard>
  )
}
