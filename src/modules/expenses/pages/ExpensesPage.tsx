import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Layers3,
  Plus,
  RefreshCw,
  TrendingDown,
} from 'lucide-react'
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
import { useConfirmDialog } from '@/shared/hooks/use-confirm-dialog'
import { WorkspaceBusinessTitle } from '@/shared/components/retail/WorkspaceBusinessTitle'
import workspaceVisual from '@/shared/components/retail/WorkspaceVisual.module.css'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { routePaths } from '@/routes/route-paths'
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

function isExpenseWithinRange(
  expense: Expense,
  fromDate: string,
  toDate: string,
) {
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
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | ExpenseStatus>(
    'ALL',
  )
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(
    null,
  )
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false)
  const [isCategoriesDrawerOpen, setIsCategoriesDrawerOpen] = useState(false)
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase())
  const expensesQuery = useExpensesQuery()
  const categoriesQuery = useExpenseCategoriesQuery()
  const createExpenseMutation = useCreateExpenseMutation()
  const updateExpenseMutation = useUpdateExpenseMutation()
  const deleteExpenseMutation = useDeleteExpenseMutation()
  const createCategoryMutation = useCreateExpenseCategoryMutation()
  const { confirm, confirmationDialog } = useConfirmDialog()
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
    [
      expenses,
      deferredSearchValue,
      selectedStatus,
      selectedCategoryId,
      fromDate,
      toDate,
    ],
  )
  const totalPaid = visibleExpenses
    .filter((expense) => expense.status === 'PAID')
    .reduce((sum, expense) => sum + expense.amount, 0)
  const totalPending = visibleExpenses
    .filter((expense) => expense.status === 'PENDING')
    .reduce((sum, expense) => sum + expense.amount, 0)
  const totalExpenses = totalPaid + totalPending
  const categoriesInView = new Set(
    visibleExpenses
      .map((expense) => expense.categoryId)
      .filter((categoryId): categoryId is string => Boolean(categoryId)),
  ).size
  const isSubmitting =
    createExpenseMutation.isPending ||
    updateExpenseMutation.isPending ||
    deleteExpenseMutation.isPending ||
    createCategoryMutation.isPending
  const hasQueryError = expensesQuery.isError || categoriesQuery.isError
  const error = expensesQuery.error ?? categoriesQuery.error ?? null

  useEffect(() => {
    if (
      selectedExpenseId &&
      !expenses.some((expense) => expense.id === selectedExpenseId)
    ) {
      setSelectedExpenseId(null)
    }
  }, [expenses, selectedExpenseId])

  async function handleRefresh() {
    await Promise.allSettled([
      expensesQuery.refetch(),
      categoriesQuery.refetch(),
    ])
  }

  async function handleExpenseSubmit(input: ExpenseMutationInput) {
    if (selectedExpense) {
      await updateExpenseMutation.mutateAsync({
          expenseId: selectedExpense.id,
          input,
        })
    } else {
      await createExpenseMutation.mutateAsync(input)
    }

    setIsExpenseDrawerOpen(false)
    setSelectedExpenseId(null)
  }

  async function handleDeleteExpense(expense: Expense) {
    const shouldDelete = await confirm({
      title: 'Cancelar gasto',
      description: `¿Quieres cancelar el gasto "${expense.concept}"? El registro dejará de contar como gasto activo.`,
      confirmLabel: 'Cancelar gasto',
      tone: 'warning',
    })

    if (!shouldDelete) {
      return
    }

    deleteExpenseMutation.mutate(expense.id, {
      onSuccess: () => {
        setSelectedExpenseId((current) => current === expense.id ? null : current)
      },
    })
  }

  function handleMarkExpensePaid(expense: Expense) {
    updateExpenseMutation.mutate({
      expenseId: expense.id,
      input: {
        concept: expense.concept,
        categoryId: expense.categoryId,
        supplierId: expense.supplierId,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
        fundSource: expense.fundSource,
        status: 'PAID',
        expenseDate: expense.expenseDate,
        notes: expense.notes,
      },
    })
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

  function handleStartCreate() {
    setSelectedExpenseId(null)
    setIsExpenseDrawerOpen(true)
  }

  function handleSelectExpense(expenseId: string) {
    setSelectedExpenseId(expenseId)
    setIsExpenseDrawerOpen(true)
  }

  return (
    <>
      {confirmationDialog}
      <div className={styles.page}>
        <section className={`${styles.hero} ${workspaceVisual.hero} ${workspaceVisual.catalogHeader}`}>
          <div className={styles.heroCopy}>
            <h1 className={styles.title}><WorkspaceBusinessTitle>Gastos</WorkspaceBusinessTitle></h1>
            <p className={styles.description}>
              Controla y clasifica cada salida de dinero en una sola vista.
            </p>
          </div>

          <div className={styles.heroActions}>
            <button
              className={`${styles.heroButton} ${workspaceVisual.catalogAction}`}
              disabled={expensesQuery.isFetching || categoriesQuery.isFetching}
              type="button"
              onClick={() => void handleRefresh()}
            >
              <RefreshCw aria-hidden="true" size={17} />
              Actualizar
            </button>
            <button
              className={`${styles.heroButton} ${workspaceVisual.catalogAction} ${workspaceVisual.catalogPrimary}`}
              type="button"
              onClick={handleStartCreate}
            >
              <Plus aria-hidden="true" size={18} />
              Nuevo gasto
            </button>
          </div>
        </section>

        <div className={styles.metricsGrid}>
          <article className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span>Gastos activos</span>
              <span className={styles.metricIcon}><TrendingDown aria-hidden="true" /></span>
            </div>
            <strong className={styles.metricValue}>
              {formatExpenseCurrency(totalExpenses)}
            </strong>
            <p className={styles.metricHint}>Según los filtros seleccionados</p>
          </article>

          <article className={styles.metricCard} data-tone="paid">
            <div className={styles.metricHeader}>
              <span>Pagados</span>
              <span className={styles.metricIcon}><CheckCircle2 aria-hidden="true" /></span>
            </div>
            <strong className={styles.metricValueSmall}>
              {formatExpenseCurrency(totalPaid)}
            </strong>
            <div className={styles.progressTrack} aria-hidden="true">
              <span
                className={styles.progressPaid}
                style={{
                  width: `${totalExpenses > 0 ? Math.min(100, (totalPaid / totalExpenses) * 100) : 0}%`,
                }}
              />
            </div>
          </article>

          <article className={styles.metricCard} data-tone="pending">
            <div className={styles.metricHeader}>
              <span>Pendientes</span>
              <span className={styles.metricIcon}><AlertTriangle aria-hidden="true" /></span>
            </div>
            <strong className={styles.metricValueSmallDanger}>
              {formatExpenseCurrency(totalPending)}
            </strong>
            <div className={styles.progressTrack} aria-hidden="true">
              <span
                className={styles.progressPending}
                style={{
                  width: `${totalExpenses > 0 ? Math.min(100, (totalPending / totalExpenses) * 100) : 0}%`,
                }}
              />
            </div>
          </article>

          <button
            className={styles.metricCardButton}
            type="button"
            onClick={() => setIsCategoriesDrawerOpen(true)}
          >
            <div className={styles.metricHeader}>
              <span>Categorías en uso</span>
              <span className={styles.metricIcon}><Layers3 aria-hidden="true" /></span>
            </div>
            <strong className={styles.metricValue}>{categoriesInView}</strong>
            <span className={styles.categoryLink}>
              Administrar categorías
              <ArrowUpRight aria-hidden="true" size={16} />
            </span>
          </button>
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

        {!isExpenseDrawerOpen && (deleteExpenseMutation.error || updateExpenseMutation.error) ? (
          <div className={styles.feedbackBanner} role="alert">
            {getErrorMessage(deleteExpenseMutation.error ?? updateExpenseMutation.error, 'No se pudo actualizar el gasto.')}
          </div>
        ) : null}

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
          isUpdating={updateExpenseMutation.isPending || deleteExpenseMutation.isPending}
          selectedExpenseId={selectedExpenseId}
          onDeleteExpense={(expense) => {
            void handleDeleteExpense(expense)
          }}
          onMarkPaid={handleMarkExpensePaid}
          onRetry={() => {
            void expensesQuery.refetch()
          }}
          onSelectExpense={handleSelectExpense}
        />

        <ExpenseFormPanel
          categories={categories}
          expense={selectedExpense}
          isOpen={isExpenseDrawerOpen}
          isSubmitting={isSubmitting}
          onClose={() => {
            setIsExpenseDrawerOpen(false)
            setSelectedExpenseId(null)
          }}
          onOpenInventoryPurchase={() => {
            navigate(`${routePaths.inventory}?mode=purchase`)
          }}
          onSubmit={handleExpenseSubmit}
        />

        <ExpenseCategoriesPanel
          categories={categories}
          expenses={expenses}
          isOpen={isCategoriesDrawerOpen}
          isSubmitting={createCategoryMutation.isPending}
          onClose={() => setIsCategoriesDrawerOpen(false)}
          onSubmit={handleCreateCategory}
        />
      </div>
    </>
  )
}
