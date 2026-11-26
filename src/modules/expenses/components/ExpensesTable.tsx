import type { Expense } from '@/modules/expenses/types/expense'
import { CircleCheck, CircleX, Pencil, ReceiptText } from 'lucide-react'
import { SalesPaymentIcon } from '@/modules/sales/components/SalesVisuals'
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
import { getExpenseCategoryLabel } from '@/modules/expenses/utils/expense-category-label'

type ExpensesTableProps = {
  errorMessage: string | null
  expenses: Expense[]
  isLoading: boolean
  isRefreshing: boolean
  isUpdating: boolean
  selectedExpenseId: string | null
  onDeleteExpense: (expense: Expense) => void
  onMarkPaid: (expense: Expense) => void
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
  isUpdating,
  selectedExpenseId,
  onDeleteExpense,
  onMarkPaid,
  onRetry,
  onSelectExpense,
}: ExpensesTableProps) {
  function renderActions(expense: Expense) {
    return (
      <>
        <button
          aria-label={`Editar ${expense.concept}`}
          className={styles.editButton}
          disabled={isUpdating}
          type="button"
          onClick={() => onSelectExpense(expense.id)}
        >
          <Pencil aria-hidden="true" size={15} />
          Editar
        </button>
        {expense.status === 'PENDING' ? (
          <button
            aria-label={`Marcar pagado ${expense.concept}`}
            className={styles.payButton}
            disabled={isUpdating}
            type="button"
            onClick={() => onMarkPaid(expense)}
          >
            <CircleCheck aria-hidden="true" size={15} />
            Marcar pagado
          </button>
        ) : null}
        {expense.status !== 'CANCELLED' ? (
          <button
            aria-label={`Cancelar ${expense.concept}`}
            className={styles.deleteButton}
            disabled={isUpdating}
            title="Cancelar gasto"
            type="button"
            onClick={() => onDeleteExpense(expense)}
          >
            <CircleX aria-hidden="true" size={16} />
          </button>
        ) : null}
      </>
    )
  }

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.receiptIcon}><ReceiptText aria-hidden="true" /></span>
          Gastos registrados
        </h2>
        {isRefreshing ? (
          <span className={styles.refreshingLabel} role="status">Actualizando...</span>
        ) : null}
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
              <article
                key={expense.id}
                className={joinClassNames(
                  styles.mobileItem,
                  selectedExpenseId === expense.id && styles.mobileItemSelected,
                )}
              >
                <button
                  className={styles.mobileSelectButton}
                  type="button"
                  onClick={() => onSelectExpense(expense.id)}
                >
                  <div className={styles.mobileRow}>
                    <div>
                      <p className={styles.mobileConcept}>{expense.concept}</p>
                      <p className={styles.mobileMeta}>
                        {expense.category
                          ? getExpenseCategoryLabel(expense.category.name)
                          : 'Sin categoría'} ·{' '}
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

                <div className={styles.mobileActions}>
                  {renderActions(expense)}
                </div>
              </article>
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
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acción</th>
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
                          <span className={styles.rowIcon}><ReceiptText aria-hidden="true" /></span>
                          <div>
                            <p className={styles.concept}>{expense.concept}</p>
                            <p className={styles.meta}>
                              {expense.supplier?.name ??
                                expense.notes ??
                                `Creado ${formatExpenseDateTime(expense.createdAt)}`}
                            </p>
                          </div>
                        </div>
                      </button>
                    </td>
                    <td>
                      <span className={styles.categoryBadge}>
                        {expense.category
                          ? getExpenseCategoryLabel(expense.category.name)
                          : 'Sin categoría'}
                      </span>
                    </td>
                    <td className={styles.amountCell}>
                      {formatExpenseCurrency(expense.amount)}
                    </td>
                    <td>
                      <span className={styles.paymentCell}>
                        <SalesPaymentIcon method={expense.paymentMethod} />
                        {getExpensePaymentMethodLabel(expense.paymentMethod)}
                      </span>
                    </td>
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
                    <td>{formatExpenseDate(expense.expenseDate)}</td>
                    <td>
                      <div className={styles.rowActions}>{renderActions(expense)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.tableFooter}>
            <span>
              {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'}
            </span>
          </div>
        </>
      ) : null}
    </SurfaceCard>
  )
}
