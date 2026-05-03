import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { ExpenseCategoriesPanel } from '@/modules/expenses/components/ExpenseCategoriesPanel'
import { ExpenseFormPanel } from '@/modules/expenses/components/ExpenseFormPanel'
import { ExpensesFiltersBar } from '@/modules/expenses/components/ExpensesFiltersBar'
import { ExpensesTable } from '@/modules/expenses/components/ExpensesTable'
import {
  useCreateExpenseCategoryMutation,
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useExpenseCategoriesQuery,
  useExpensesQuery,
  useUpdateExpenseMutation,
} from '@/modules/expenses/hooks/use-expenses-query'
import type {
  Expense,
  ExpenseCategory,
  ExpenseCategoryInput,
  ExpenseMutationInput,
  ExpenseStatus,
} from '@/modules/expenses/types/expense'
import {
  formatExpenseCurrency,
  toExpenseDateInputValue,
} from '@/modules/expenses/utils/format-expense'
import { MetricCard } from '@/shared/components/ui/MetricCard'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './ExpensesPage.module.css'

const emptyExpenses: Expense[] = []
const emptyCategories: ExpenseCategory[] = []

function matchesExpenseSearch(expense: Expense, query: string) {
  if (query.length === 0) {
    return true
  }

  const normalizedQuery = query.toLowerCase()

  return (
    expense.concept.toLowerCase().includes(normalizedQuery) ||
    expense.notes?.toLowerCase().includes(normalizedQuery) ||
    expense.category?.name.toLowerCase().includes(normalizedQuery) ||
    expense.paymentMethod.toLowerCase().includes(normalizedQuery)
  )
}

function isExpenseWithinRange(expense: Expense, fromDate: string, toDate: string) {
  const expenseDateValue = toExpenseDateInputValue(expense.expenseDate)

  if (fromDate && expenseDateValue < fromDate) {
    return false
  }

  if (toDate && expenseDateValue > toDate) {
    return false
  }

  return true
}

export function ExpensesPage() {
  const [searchValue, setSearchValue] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | ExpenseStatus>(
    'ALL',
  )
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase())
  const expensesQuery = useExpensesQuery()
  const categoriesQuery = useExpenseCategoriesQuery()
  const createExpenseMutation = useCreateExpenseMutation()
  const updateExpenseMutation = useUpdateExpenseMutation()
  const deleteExpenseMutation = useDeleteExpenseMutation()
  const createCategoryMutation = useCreateExpenseCategoryMutation()
  const expenses = expensesQuery.data ?? emptyExpenses
  const categories = categoriesQuery.data ?? emptyCategories
  const selectedExpense =
    expenses.find((expense) => expense.id === selectedExpenseId) ?? null
  const visibleExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => matchesExpenseSearch(expense, deferredSearchValue))
        .filter((expense) =>
          selectedStatus === 'ALL' ? true : expense.status === selectedStatus,
        )
        .filter((expense) =>
          selectedCategoryId ? expense.categoryId === selectedCategoryId : true,
        )
        .filter((expense) => isExpenseWithinRange(expense, fromDate, toDate))
        .sort((firstExpense, secondExpense) => {
          const expenseDateDifference =
            new Date(secondExpense.expenseDate).getTime() -
            new Date(firstExpense.expenseDate).getTime()

          if (expenseDateDifference !== 0) {
            return expenseDateDifference
          }

          return (
            new Date(secondExpense.createdAt).getTime() -
            new Date(firstExpense.createdAt).getTime()
          )
        }),
    [expenses, deferredSearchValue, selectedStatus, selectedCategoryId, fromDate, toDate],
  )
  const totalExpenses = visibleExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  )
  const totalPaid = visibleExpenses
    .filter((expense) => expense.status === 'PAID')
    .reduce((sum, expense) => sum + expense.amount, 0)
  const totalPending = visibleExpenses
    .filter((expense) => expense.status === 'PENDING')
    .reduce((sum, expense) => sum + expense.amount, 0)
  const categoriesInView = new Set(
    visibleExpenses
      .map((expense) => expense.category?.name ?? null)
      .filter((categoryName): categoryName is string => Boolean(categoryName)),
  ).size
  const isSubmitting =
    createExpenseMutation.isPending ||
    updateExpenseMutation.isPending ||
    deleteExpenseMutation.isPending ||
    createCategoryMutation.isPending
  const hasQueryError = expensesQuery.isError || categoriesQuery.isError
  const error =
    expensesQuery.error ?? categoriesQuery.error ?? null

  useEffect(() => {
    if (
      selectedExpenseId &&
      !expenses.some((expense) => expense.id === selectedExpenseId)
    ) {
      setSelectedExpenseId(null)
    }
  }, [expenses, selectedExpenseId])

  async function handleRefresh() {
    await Promise.allSettled([expensesQuery.refetch(), categoriesQuery.refetch()])
  }

  async function handleExpenseSubmit(input: ExpenseMutationInput) {
    const savedExpense = selectedExpense
      ? await updateExpenseMutation.mutateAsync({
          expenseId: selectedExpense.id,
          input,
        })
      : await createExpenseMutation.mutateAsync(input)

    setSelectedExpenseId(savedExpense.id)
  }

  async function handleDeleteExpense(expense: Expense) {
    const shouldDelete = window.confirm(
      `¿Quieres cancelar el gasto "${expense.concept}"?`,
    )

    if (!shouldDelete) {
      return
    }

    await deleteExpenseMutation.mutateAsync(expense.id)

    if (selectedExpenseId === expense.id) {
      setSelectedExpenseId(null)
    }
  }

  async function handleCreateCategory(input: ExpenseCategoryInput) {
    await createCategoryMutation.mutateAsync(input)
  }

  function handleResetFilters() {
    setSearchValue('')
    setSelectedStatus('ALL')
    setSelectedCategoryId('')
    setFromDate('')
    setToDate('')
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Gastos</p>
          <h2 className={styles.title}>
            Controla y clasifica cada salida de dinero en una sola vista.
          </h2>
          <p className={styles.description}>
            Registra egresos, sepáralos por categoría, detecta pendientes y
            deja lista la base para reportes y flujo de caja diario.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button
            className={styles.heroButton}
            type="button"
            onClick={() => void handleRefresh()}
          >
            Actualizar
          </button>
          <button
            className={styles.heroGhostButton}
            type="button"
            onClick={() => setSelectedExpenseId(null)}
          >
            Nuevo gasto
          </button>
        </div>
      </section>

      <div className={styles.metricsGrid}>
        <MetricCard
          hint="Suma total de los gastos visibles con los filtros actuales."
          label="Salida total"
          tone="alert"
          value={formatExpenseCurrency(totalExpenses)}
        />
        <MetricCard
          hint="Gastos ya pagados y listos para reflejar operación o caja."
          label="Pagados"
          tone="success"
          value={formatExpenseCurrency(totalPaid)}
        />
        <MetricCard
          hint="Compromisos pendientes por desembolsar o cerrar."
          label="Pendientes"
          tone={totalPending > 0 ? 'accent' : 'default'}
          value={formatExpenseCurrency(totalPending)}
        />
        <MetricCard
          label="Categorías en uso"
          value={categoriesInView.toString()}
          hint={
            categoriesInView > 0
              ? `${visibleExpenses.length.toString()} movimientos visibles en este momento.`
              : 'Crea categorías para leer mejor tus egresos.'
          }
        />
      </div>

      <ExpensesFiltersBar
        categories={categories}
        fromDate={fromDate}
        searchValue={searchValue}
        selectedCategoryId={selectedCategoryId}
        selectedStatus={selectedStatus}
        toDate={toDate}
        onCategoryChange={setSelectedCategoryId}
        onFromDateChange={setFromDate}
        onReset={handleResetFilters}
        onSearchChange={setSearchValue}
        onStatusChange={setSelectedStatus}
        onToDateChange={setToDate}
      />

      {hasQueryError ? (
        <div className={styles.feedbackBanner} role="alert">
          {getErrorMessage(
            error,
            'No pudimos cargar el módulo de gastos en este momento.',
          )}
        </div>
      ) : null}

      <div className={styles.workspace}>
        <div className={styles.primaryColumn}>
          <ExpensesTable
            errorMessage={
              expensesQuery.isError
                ? getErrorMessage(
                    expensesQuery.error,
                    'No pudimos cargar los gastos del negocio activo.',
                  )
                : null
            }
            expenses={visibleExpenses}
            isLoading={expensesQuery.isLoading}
            isRefreshing={expensesQuery.isFetching && !expensesQuery.isLoading}
            selectedExpenseId={selectedExpenseId}
            onDeleteExpense={(expense) => {
              void handleDeleteExpense(expense)
            }}
            onRetry={() => {
              void expensesQuery.refetch()
            }}
            onSelectExpense={setSelectedExpenseId}
          />
        </div>

        <div className={styles.secondaryColumn}>
          <ExpenseFormPanel
            categories={categories}
            expense={selectedExpense}
            isSubmitting={isSubmitting}
            onStartCreate={() => setSelectedExpenseId(null)}
            onSubmit={handleExpenseSubmit}
          />

          <ExpenseCategoriesPanel
            categories={categories}
            expenses={expenses}
            isSubmitting={createCategoryMutation.isPending}
            onSubmit={handleCreateCategory}
          />
        </div>
      </div>
    </div>
  )
}
