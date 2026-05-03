import { useState } from 'react'
import { CashflowChart } from '@/modules/reports/components/CashflowChart'
import { EmployeesPerformanceChart } from '@/modules/reports/components/EmployeesPerformanceChart'
import { ExpensesBreakdownChart } from '@/modules/reports/components/ExpensesBreakdownChart'
import { ReportsChartCard } from '@/modules/reports/components/ReportsChartCard'
import { ReportsDateFilters } from '@/modules/reports/components/ReportsDateFilters'
import { ReportsMetricCard } from '@/modules/reports/components/ReportsMetricCard'
import { SalesPerformanceChart } from '@/modules/reports/components/SalesPerformanceChart'
import { TopProductsChart } from '@/modules/reports/components/TopProductsChart'
import { useReportsOverviewQuery } from '@/modules/reports/hooks/use-reports-overview-query'
import type {
  CustomersReport,
  DebtsReport,
  EmployeesReport,
  ExpensesReport,
  InventoryReport,
  ReportDateRangeFilters,
  ReportRangePreset,
  SalesReport,
} from '@/modules/reports/types/report'
import { formatReportCurrency } from '@/modules/reports/utils/format-report'
import { RetailEmptyState } from '@/shared/components/retail/RetailEmptyState'
import { RetailStatCard } from '@/shared/components/retail/RetailStatCard'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { useBusinessNavigationPreset } from '@/shared/hooks/use-business-navigation-preset'
import { useAppTranslation } from '@/shared/i18n/use-app-translation'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './ReportsPage.module.css'
import retailPageStyles from './ReportsRetailPage.module.css'

function formatDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getPresetFilters(preset: Exclude<ReportRangePreset, 'CUSTOM'>): ReportDateRangeFilters {
  const today = new Date()

  if (preset === 'ALL') {
    return {
      from: '',
      to: '',
    }
  }

  if (preset === 'WEEK') {
    return {
      from: formatDateInputValue(today),
      to: formatDateInputValue(today),
    }
  }

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  return {
    from: formatDateInputValue(firstDayOfMonth),
    to: formatDateInputValue(today),
  }
}

function formatHumanDate(value: string, languageCode: 'es' | 'en') {
  return new Intl.DateTimeFormat(languageCode === 'en' ? 'en-US' : 'es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${value}T12:00:00`))
}

function formatReportRangeLabel(
  filters: ReportDateRangeFilters,
  languageCode: 'es' | 'en',
) {
  if (!filters.from && !filters.to) {
    return languageCode === 'en'
      ? 'Full available history'
      : 'Todo el historial disponible'
  }

  if (filters.from && filters.to) {
    return `${formatHumanDate(filters.from, languageCode)} - ${formatHumanDate(filters.to, languageCode)}`
  }

  if (filters.from) {
    return languageCode === 'en'
      ? `From ${formatHumanDate(filters.from, languageCode)}`
      : `Desde ${formatHumanDate(filters.from, languageCode)}`
  }

  return languageCode === 'en'
    ? `Until ${formatHumanDate(filters.to, languageCode)}`
    : `Hasta ${formatHumanDate(filters.to, languageCode)}`
}

function formatPercent(value: number, languageCode: 'es' | 'en') {
  return new Intl.NumberFormat(languageCode === 'en' ? 'en-US' : 'es-CO', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

function getPaymentMethodLabel(method: string, languageCode: 'es' | 'en') {
  const dictionary: Record<string, { es: string; en: string }> = {
    CASH: { es: 'Efectivo', en: 'Cash' },
    CARD: { es: 'Tarjeta', en: 'Card' },
    TRANSFER: { es: 'Transferencia', en: 'Transfer' },
    DIGITAL_WALLET: { es: 'Billetera digital', en: 'Digital wallet' },
    BANK_DEPOSIT: { es: 'Depósito bancario', en: 'Bank deposit' },
    CREDIT: { es: 'Crédito', en: 'Credit' },
    OTHER: { es: 'Otro', en: 'Other' },
  }

  return dictionary[method]?.[languageCode] ?? method
}

function formatRole(role: string, languageCode: 'es' | 'en') {
  const normalizedRole = role.split('_').join(' ')
  const dictionary: Record<string, { es: string; en: string }> = {
    ADMIN: { es: 'Administrador', en: 'Administrator' },
    STAFF: { es: 'Operativo', en: 'Staff' },
    OWNER: { es: 'Propietario', en: 'Owner' },
    MANAGER: { es: 'Gerente', en: 'Manager' },
    CASHIER: { es: 'Cajero', en: 'Cashier' },
    SELLER: { es: 'Vendedor', en: 'Seller' },
    ACCOUNTANT: { es: 'Contador', en: 'Accountant' },
  }

  return dictionary[role]?.[languageCode] ?? normalizedRole
}

function buildReportsCopy(languageCode: 'es' | 'en') {
  if (languageCode === 'en') {
    return {
      tabs: {
        sales: 'Sales',
        expenses: 'Expenses',
        employees: 'Employees',
      },
      filters: {
        day: 'Daily',
        month: 'Monthly',
        all: 'All',
      },
      banner: {
        title: 'You are using a premium feature.',
        description:
          'Unlock deeper business visibility with consolidated operational reports.',
        action: 'See benefits',
      },
      sales: {
        totalRevenue: 'Total sales',
        grossProfit: 'Sales profit',
        averageTicket: 'Average ticket',
        receivable: 'Outstanding receivables',
        salesChart: 'Sales detail',
        paymentMethods: 'Payment methods',
        inventory: 'Critical inventory',
        debts: 'Customers with highest debt',
        products: 'Products sold detail',
        productsRevenue: 'Total sales',
        productsQuantity: 'Total products sold',
      },
      expenses: {
        totalExpenses: 'Total expenses',
        averageExpense: 'Average expense',
        highestExpense: 'Highest expense',
        netCashflow: 'Net balance',
        chart: 'Expense breakdown',
        categories: 'Expense categories',
        cashflow: 'Period pulse',
      },
      employees: {
        teamSales: 'Team sales',
        salesCount: 'Registered sales',
        averageTicket: 'Average ticket',
        expenses: 'Expenses logged',
        chart: 'Team performance',
        table: 'Employee detail',
      },
      common: {
        countSuffix: 'records',
        empty: 'No data available for this range yet.',
        records: 'records',
        units: 'units',
        compareHint: `Current reading for ${formatReportRangeLabel({ from: '', to: '' }, languageCode)}`,
      },
    }
  }

  return {
    tabs: {
      sales: 'Ventas',
      expenses: 'Gastos',
      employees: 'Empleados',
    },
    filters: {
      day: 'Diario',
      month: 'Mensual',
      all: 'Todo',
    },
    banner: {
      title: 'Estás usando una función premium.',
      description:
        'Activa el plan Pro y accede a toda la información para leer mejor tu negocio.',
      action: 'Ver beneficios',
    },
    sales: {
      totalRevenue: 'Total ventas',
      grossProfit: 'Ganancia de las ventas',
      averageTicket: 'Ticket promedio',
      receivable: 'Total por cobrar',
      salesChart: 'Detalle de ventas',
      paymentMethods: 'Métodos de pago',
      inventory: 'Inventario crítico',
      debts: 'Clientes con más deuda',
      products: 'Detalle de productos vendidos',
      productsRevenue: 'Total ventas',
      productsQuantity: 'Total de productos vendidos',
    },
    expenses: {
      totalExpenses: 'Total gastos',
      averageExpense: 'Gasto promedio',
      highestExpense: 'Gasto más alto',
      netCashflow: 'Balance neto',
      chart: 'Detalle de gastos',
      categories: 'Gastos por categoría',
      cashflow: 'Pulso del periodo',
    },
    employees: {
      teamSales: 'Ventas del equipo',
      salesCount: 'Ventas registradas',
      averageTicket: 'Ticket promedio',
      expenses: 'Gastos registrados',
      chart: 'Rendimiento del equipo',
      table: 'Detalle por empleado',
    },
    common: {
      countSuffix: 'registros',
      empty: 'Todavía no hay datos para este rango.',
      records: 'registros',
      units: 'unidades',
      compareHint: 'Lectura del rango actual.',
    },
  }
}

const emptySalesReport: SalesReport = {
  from: null,
  to: null,
  salesCount: 0,
  totalRevenue: 0,
  averageTicket: 0,
  grossProfit: 0,
  highestSale: 0,
  lowestSale: 0,
  detailGranularity: 'DAY',
  detail: [],
  paymentMethods: [],
}

const emptyExpensesReport: ExpensesReport = {
  from: null,
  to: null,
  manualExpensesCount: 0,
  supplierPurchasesCount: 0,
  manualExpensesTotal: 0,
  supplierPurchasesTotal: 0,
  totalExpenses: 0,
  averageExpense: 0,
  highestExpense: 0,
  categories: [],
}

const emptyInventoryReport: InventoryReport = {
  from: null,
  to: null,
  totalProducts: 0,
  activeProducts: 0,
  inventoryValue: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  lowStockItems: [],
}

const emptyCustomersReport: CustomersReport = {
  from: null,
  to: null,
  totalCustomers: 0,
  newCustomersCount: 0,
  activeCustomersCount: 0,
  topCustomers: [],
}

const emptyDebtsReport: DebtsReport = {
  from: null,
  to: null,
  totalReceivable: 0,
  collectedAmount: 0,
  overdueCount: 0,
  averageDebt: 0,
  topDebtors: [],
}

const emptyEmployeesReport: EmployeesReport = {
  from: null,
  to: null,
  employeeCount: 0,
  totalSales: 0,
  salesCount: 0,
  averageTicket: 0,
  totalExpensesRegistered: 0,
  employees: [],
}

export function ReportsPage() {
  const { languageCode } = useAppTranslation()
  const copy = buildReportsCopy(languageCode)
  const navigationPreset = useBusinessNavigationPreset()
  const isRetailPreset = navigationPreset === 'retail'
  const initialPreset: ReportRangePreset = 'WEEK'
  const initialFilters = getPresetFilters(initialPreset)
  const [selectedPreset, setSelectedPreset] =
    useState<ReportRangePreset>(initialPreset)
  const [draftFilters, setDraftFilters] =
    useState<ReportDateRangeFilters>(initialFilters)
  const [appliedFilters, setAppliedFilters] =
    useState<ReportDateRangeFilters>(initialFilters)
  const [retailTab, setRetailTab] =
    useState<'sales' | 'expenses' | 'employees'>('sales')
  const reportsOverviewQuery = useReportsOverviewQuery(appliedFilters)
  const reportsOverview = reportsOverviewQuery.data
  const salesReport = reportsOverview?.sales ?? emptySalesReport
  const expensesReport = reportsOverview?.expenses ?? emptyExpensesReport
  const cashflowReport = reportsOverview?.cashflow
  const topProductsReport = reportsOverview?.topProducts
  const inventoryReport = reportsOverview?.inventory ?? emptyInventoryReport
  const customersReport = reportsOverview?.customers ?? emptyCustomersReport
  const debtsReport = reportsOverview?.debts ?? emptyDebtsReport
  const employeesReport = reportsOverview?.employees ?? emptyEmployeesReport
  const topProduct = topProductsReport?.items[0]
  const rangeLabel = formatReportRangeLabel(appliedFilters, languageCode)
  const netCashflow = cashflowReport?.netCashflow ?? 0
  const salesCount = salesReport.salesCount
  const totalExpenses = expensesReport.totalExpenses
  const totalRevenue = salesReport.totalRevenue
  const grossProfit = salesReport.grossProfit
  const totalInflow = cashflowReport?.totalInflow ?? 0
  const totalOutflow = cashflowReport?.totalOutflow ?? 0
  const netProfit = grossProfit - totalExpenses
  const profitMargin =
    totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  function applyPreset(preset: ReportRangePreset) {
    setSelectedPreset(preset)

    if (preset === 'CUSTOM') {
      return
    }

    const nextFilters = getPresetFilters(preset)
    setDraftFilters(nextFilters)
    setAppliedFilters(nextFilters)
  }

  if (isRetailPreset) {
    return (
      <div className={retailPageStyles.page}>
        <div className={retailStyles.tabs}>
          <button
            className={
              retailTab === 'sales'
                ? retailStyles.tabButtonActive
                : retailStyles.tabButton
            }
            type="button"
            onClick={() => setRetailTab('sales')}
          >
            {copy.tabs.sales}
          </button>
          <button
            className={
              retailTab === 'expenses'
                ? retailStyles.tabButtonActive
                : retailStyles.tabButton
            }
            type="button"
            onClick={() => setRetailTab('expenses')}
          >
            {copy.tabs.expenses}
          </button>
          <button
            className={
              retailTab === 'employees'
                ? retailStyles.tabButtonActive
                : retailStyles.tabButton
            }
            type="button"
            onClick={() => setRetailTab('employees')}
          >
            {copy.tabs.employees}
          </button>
        </div>

        <section className={retailStyles.premiumBanner}>
          <p className={retailStyles.premiumTitle}>{copy.banner.title}</p>
          <p className={retailStyles.premiumDescription}>
            {copy.banner.description}
          </p>
          <button className={retailStyles.premiumLink} type="button">
            {copy.banner.action}
          </button>
        </section>

        <div className={retailStyles.filtersRow}>
          <label className={retailStyles.selectField}>
            <select
              className={retailStyles.select}
              value={selectedPreset}
              onChange={(event) =>
                applyPreset(event.target.value as ReportRangePreset)
              }
            >
              <option value="WEEK">{copy.filters.day}</option>
              <option value="MONTH">{copy.filters.month}</option>
              <option value="ALL">{copy.filters.all}</option>
            </select>
          </label>
          <label className={retailStyles.dateField}>
            <input
              className={retailStyles.input}
              type="date"
              value={draftFilters.to || draftFilters.from}
              onChange={(event) => {
                setSelectedPreset('CUSTOM')
                setDraftFilters((currentFilters) => ({
                  ...currentFilters,
                  from: event.target.value,
                  to: event.target.value,
                }))
                setAppliedFilters({
                  from: event.target.value,
                  to: event.target.value,
                })
              }}
            />
          </label>
        </div>

        {reportsOverviewQuery.isError ? (
          <SurfaceCard className={retailPageStyles.compactCard}>
            <p className={retailPageStyles.compactCardTitle}>
              {languageCode === 'en'
                ? 'We could not load the report'
                : 'No pudimos cargar el reporte'}
            </p>
            <p className={retailPageStyles.listItemDescription}>
              {getErrorMessage(
                reportsOverviewQuery.error,
                languageCode === 'en'
                  ? 'Try again in a moment.'
                  : 'Intenta de nuevo en un momento.',
              )}
            </p>
          </SurfaceCard>
        ) : null}

        {retailTab === 'sales' ? (
          <>
            <div className={retailPageStyles.summaryGrid}>
              <RetailStatCard
                label={copy.sales.totalRevenue}
                value={formatReportCurrency(totalRevenue, languageCode)}
                hint={copy.common.compareHint}
              />
              <RetailStatCard
                label={copy.sales.grossProfit}
                value={formatReportCurrency(grossProfit, languageCode)}
                hint={copy.common.compareHint}
              />
              <RetailStatCard
                label={copy.sales.averageTicket}
                value={formatReportCurrency(salesReport.averageTicket, languageCode)}
                hint={`${salesCount.toString()} ${copy.common.records} • ${customersReport.activeCustomersCount.toString()} ${languageCode === 'en' ? 'active customers' : 'clientes activos'}`}
              />
              <RetailStatCard
                label={copy.sales.receivable}
                value={formatReportCurrency(debtsReport.totalReceivable, languageCode)}
                hint={`${debtsReport.overdueCount.toString()} ${languageCode === 'en' ? 'overdue' : 'vencidas'}`}
              />
            </div>

            <SurfaceCard className={retailPageStyles.chartCard}>
              <p className={retailPageStyles.chartTitle}>{copy.sales.salesChart}</p>
              <SalesPerformanceChart
                emptyDescription={
                  languageCode === 'en'
                    ? 'Once the selected range has sales, this chart will show revenue and gross profit over time.'
                    : 'Cuando el rango seleccionado tenga ventas, esta gráfica mostrará ingresos y ganancia bruta por tramo del tiempo.'
                }
                emptyTitle={
                  languageCode === 'en'
                    ? 'No sales detail yet'
                    : 'Todavía no hay detalle de ventas'
                }
                languageCode={languageCode}
                profitSeriesLabel={
                  languageCode === 'en' ? 'Profit' : 'Ganancia'
                }
                report={salesReport}
                revenueSeriesLabel={
                  languageCode === 'en' ? 'Sales' : 'Ventas'
                }
              />
            </SurfaceCard>

            <div className={retailPageStyles.secondaryGrid}>
              <section className={retailStyles.tableCard}>
                <div className={retailStyles.tableHeader}>
                  <p className={retailStyles.tableTitle}>{copy.sales.products}</p>
                </div>

                <div className={retailStyles.tableScroller}>
                  <table className={retailStyles.table}>
                    <thead>
                      <tr>
                        <th>{languageCode === 'en' ? 'Product' : 'Producto'}</th>
                        <th>{copy.sales.productsRevenue}</th>
                        <th>{copy.sales.productsQuantity}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(topProductsReport?.items ?? []).length > 0 ? (
                        (topProductsReport?.items ?? []).map((item) => (
                          <tr key={item.productId}>
                            <td className={retailPageStyles.tableCellStrong}>
                              {item.name}
                            </td>
                            <td>{formatReportCurrency(item.revenue, languageCode)}</td>
                            <td>{item.quantitySold.toString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3}>
                            <RetailEmptyState
                              title={copy.common.empty}
                              description={rangeLabel}
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className={retailPageStyles.list}>
                <SurfaceCard className={retailPageStyles.compactCard}>
                  <p className={retailPageStyles.compactCardTitle}>
                    {copy.sales.paymentMethods}
                  </p>
                  <div className={retailPageStyles.list}>
                    {salesReport.paymentMethods.length > 0 ? (
                      salesReport.paymentMethods.map((paymentMethod) => (
                        <div
                          key={paymentMethod.method}
                          className={retailPageStyles.listItem}
                        >
                          <div className={retailPageStyles.listItemHeader}>
                            <p className={retailPageStyles.listItemTitle}>
                              {getPaymentMethodLabel(
                                paymentMethod.method,
                                languageCode,
                              )}
                            </p>
                            <span className={retailPageStyles.badge}>
                              {paymentMethod.paymentsCount.toString()}
                            </span>
                          </div>
                          <p className={retailPageStyles.listItemDescription}>
                            {formatReportCurrency(paymentMethod.total, languageCode)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <RetailEmptyState
                        title={copy.common.empty}
                        description={rangeLabel}
                      />
                    )}
                  </div>
                </SurfaceCard>

                <SurfaceCard className={retailPageStyles.compactCard}>
                  <p className={retailPageStyles.compactCardTitle}>
                    {copy.sales.debts}
                  </p>
                  <div className={retailPageStyles.list}>
                    {debtsReport.topDebtors.length > 0 ? (
                      debtsReport.topDebtors.map((debtor) => (
                        <div
                          key={debtor.customerId}
                          className={retailPageStyles.listItem}
                        >
                          <div className={retailPageStyles.listItemHeader}>
                            <p className={retailPageStyles.listItemTitle}>
                              {debtor.name}
                            </p>
                            <span className={retailPageStyles.badgeAlert}>
                              {debtor.overdueCount.toString()}
                            </span>
                          </div>
                          <p className={retailPageStyles.listItemDescription}>
                            {formatReportCurrency(debtor.balance, languageCode)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <RetailEmptyState
                        title={copy.common.empty}
                        description={rangeLabel}
                      />
                    )}
                  </div>
                </SurfaceCard>

                <SurfaceCard className={retailPageStyles.compactCard}>
                  <p className={retailPageStyles.compactCardTitle}>
                    {copy.sales.inventory}
                  </p>
                  <div className={retailPageStyles.list}>
                    {inventoryReport.lowStockItems.length > 0 ? (
                      inventoryReport.lowStockItems.map((item) => (
                        <div
                          key={item.productId}
                          className={retailPageStyles.listItem}
                        >
                          <div className={retailPageStyles.listItemHeader}>
                            <p className={retailPageStyles.listItemTitle}>
                              {item.name}
                            </p>
                            <span className={retailPageStyles.badgeAlert}>
                              {item.stock.toString()}
                            </span>
                          </div>
                          <p className={retailPageStyles.listItemDescription}>
                            {languageCode === 'en'
                              ? `Minimum ${item.minStock.toString()} units`
                              : `Mínimo ${item.minStock.toString()} unidades`}
                          </p>
                        </div>
                      ))
                    ) : (
                      <RetailEmptyState
                        title={
                          languageCode === 'en'
                            ? 'Inventory under control'
                            : 'Inventario bajo control'
                        }
                        description={
                          languageCode === 'en'
                            ? 'No critical products for the selected range.'
                            : 'No hay productos críticos en el rango seleccionado.'
                        }
                      />
                    )}
                  </div>
                </SurfaceCard>
              </div>
            </div>
          </>
        ) : null}

        {retailTab === 'expenses' ? (
          <>
            <div className={retailPageStyles.summaryGrid}>
              <RetailStatCard
                label={copy.expenses.totalExpenses}
                value={formatReportCurrency(totalExpenses, languageCode)}
                hint={copy.common.compareHint}
              />
              <RetailStatCard
                label={copy.expenses.averageExpense}
                value={formatReportCurrency(expensesReport.averageExpense, languageCode)}
                hint={`${expensesReport.categories.length.toString()} ${copy.common.countSuffix}`}
              />
              <RetailStatCard
                label={copy.expenses.highestExpense}
                value={formatReportCurrency(expensesReport.highestExpense, languageCode)}
                hint={copy.common.compareHint}
              />
              <RetailStatCard
                label={copy.expenses.netCashflow}
                value={formatReportCurrency(netCashflow, languageCode)}
                hint={
                  netCashflow >= 0
                    ? languageCode === 'en'
                      ? 'Positive close for this range.'
                      : 'Cierre positivo para este rango.'
                    : languageCode === 'en'
                      ? 'There is more cash out than cash in.'
                      : 'Hay más salida que entrada de dinero.'
                }
              />
            </div>

            <div className={retailPageStyles.secondaryGrid}>
              <SurfaceCard className={retailPageStyles.chartCard}>
                <p className={retailPageStyles.chartTitle}>{copy.expenses.chart}</p>
                <ExpensesBreakdownChart
                  languageCode={languageCode}
                  report={expensesReport}
                />
              </SurfaceCard>

              <SurfaceCard className={retailPageStyles.compactCard}>
                <p className={retailPageStyles.compactCardTitle}>
                  {copy.expenses.cashflow}
                </p>
                <div className={retailPageStyles.list}>
                  <div className={retailPageStyles.listItem}>
                    <div className={retailPageStyles.listItemHeader}>
                      <p className={retailPageStyles.listItemTitle}>
                        {languageCode === 'en' ? 'Cash in' : 'Ingresos'}
                      </p>
                    </div>
                    <p className={retailPageStyles.listItemDescription}>
                      {formatReportCurrency(totalInflow, languageCode)}
                    </p>
                  </div>
                  <div className={retailPageStyles.listItem}>
                    <div className={retailPageStyles.listItemHeader}>
                      <p className={retailPageStyles.listItemTitle}>
                        {languageCode === 'en' ? 'Cash out' : 'Egresos'}
                      </p>
                    </div>
                    <p className={retailPageStyles.listItemDescription}>
                      {formatReportCurrency(totalOutflow, languageCode)}
                    </p>
                  </div>
                  <div className={retailPageStyles.listItem}>
                    <div className={retailPageStyles.listItemHeader}>
                      <p className={retailPageStyles.listItemTitle}>
                        {languageCode === 'en' ? 'Net profit' : 'Ganancia neta'}
                      </p>
                      <span
                        className={
                          netProfit >= 0
                            ? retailPageStyles.badge
                            : retailPageStyles.badgeAlert
                        }
                      >
                        {formatPercent(profitMargin, languageCode)}
                      </span>
                    </div>
                    <p className={retailPageStyles.listItemDescription}>
                      {formatReportCurrency(netProfit, languageCode)}
                    </p>
                  </div>
                </div>
              </SurfaceCard>
            </div>

            <section className={retailStyles.tableCard}>
              <div className={retailStyles.tableHeader}>
                <p className={retailStyles.tableTitle}>{copy.expenses.categories}</p>
              </div>
              <div className={retailStyles.tableScroller}>
                <table className={retailStyles.table}>
                  <thead>
                    <tr>
                      <th>{languageCode === 'en' ? 'Category' : 'Categoría'}</th>
                      <th>{languageCode === 'en' ? 'Records' : 'Registros'}</th>
                      <th>{languageCode === 'en' ? 'Total' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesReport.categories.length > 0 ? (
                      expensesReport.categories.map((category) => (
                        <tr key={category.categoryId ?? category.name}>
                          <td className={retailPageStyles.tableCellStrong}>
                            {category.name}
                          </td>
                          <td>{category.count.toString()}</td>
                          <td>{formatReportCurrency(category.total, languageCode)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>
                          <RetailEmptyState
                            title={copy.common.empty}
                            description={rangeLabel}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        {retailTab === 'employees' ? (
          <>
            <div className={retailPageStyles.summaryGrid}>
              <RetailStatCard
                label={copy.employees.teamSales}
                value={formatReportCurrency(employeesReport.totalSales, languageCode)}
                hint={copy.common.compareHint}
              />
              <RetailStatCard
                label={copy.employees.salesCount}
                value={employeesReport.salesCount.toString()}
                hint={`${employeesReport.employeeCount.toString()} ${languageCode === 'en' ? 'employees' : 'empleados'}`}
              />
              <RetailStatCard
                label={copy.employees.averageTicket}
                value={formatReportCurrency(employeesReport.averageTicket, languageCode)}
                hint={copy.common.compareHint}
              />
              <RetailStatCard
                label={copy.employees.expenses}
                value={formatReportCurrency(
                  employeesReport.totalExpensesRegistered,
                  languageCode,
                )}
                hint={copy.common.compareHint}
              />
            </div>

            <SurfaceCard className={retailPageStyles.chartCard}>
              <p className={retailPageStyles.chartTitle}>{copy.employees.chart}</p>
              <EmployeesPerformanceChart
                languageCode={languageCode}
                report={employeesReport}
              />
            </SurfaceCard>

            <section className={retailStyles.tableCard}>
              <div className={retailStyles.tableHeader}>
                <p className={retailStyles.tableTitle}>{copy.employees.table}</p>
              </div>
              <div className={retailStyles.tableScroller}>
                <table className={retailStyles.table}>
                  <thead>
                    <tr>
                      <th>{languageCode === 'en' ? 'Employee' : 'Empleado'}</th>
                      <th>{languageCode === 'en' ? 'Role' : 'Rol'}</th>
                      <th>{languageCode === 'en' ? 'Sales' : 'Ventas'}</th>
                      <th>{languageCode === 'en' ? 'Average ticket' : 'Ticket promedio'}</th>
                      <th>{languageCode === 'en' ? 'Expenses' : 'Gastos'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeesReport.employees.length > 0 ? (
                      employeesReport.employees.map((employee) => (
                        <tr key={employee.userId}>
                          <td className={retailPageStyles.tableCellStrong}>
                            {employee.name}
                          </td>
                          <td className={retailPageStyles.mutedValue}>
                            {formatRole(employee.role, languageCode)}
                          </td>
                          <td>{formatReportCurrency(employee.totalSales, languageCode)}</td>
                          <td>{formatReportCurrency(employee.averageTicket, languageCode)}</td>
                          <td>
                            {formatReportCurrency(
                              employee.totalExpensesRegistered,
                              languageCode,
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          <RetailEmptyState
                            title={copy.common.empty}
                            description={rangeLabel}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Estadísticas</p>
          <h2 className={styles.title}>
            Conoce las cifras clave de tu negocio sin salir del panel operativo.
          </h2>
          <p className={styles.description}>
            Esta vista junta ventas, gastos, flujo de caja y productos más
            vendidos en un tablero claro, pensado para tomar decisiones rápidas
            sin perder contexto financiero.
          </p>
        </div>

        <div className={styles.heroSpotlight}>
          <p className={styles.spotlightLabel}>Pulso del periodo</p>
          <p className={styles.spotlightValue}>
            {netCashflow >= 0 ? 'Balance saludable' : 'Atención al gasto'}
          </p>
          <p className={styles.spotlightHint}>
            {topProduct
              ? `${topProduct.name} lidera con ${topProduct.quantitySold} ventas y ${formatReportCurrency(topProduct.revenue, languageCode)} facturados.`
              : 'Apenas empiece a entrar movimiento, aquí verás el producto o señal más importante del periodo.'}
          </p>
        </div>
      </section>

      <ReportsDateFilters
        from={draftFilters.from}
        isRefreshing={reportsOverviewQuery.isFetching}
        rangeLabel={rangeLabel}
        selectedPreset={selectedPreset}
        to={draftFilters.to}
        onApply={() => setAppliedFilters(draftFilters)}
        onClear={() => {
          setSelectedPreset('ALL')
          const emptyFilters = getPresetFilters('ALL')
          setDraftFilters(emptyFilters)
          setAppliedFilters(emptyFilters)
        }}
        onFromChange={(value) => {
          setSelectedPreset('CUSTOM')
          setDraftFilters((currentFilters) => ({
            ...currentFilters,
            from: value,
          }))
        }}
        onPresetChange={applyPreset}
        onRefresh={() => {
          void reportsOverviewQuery.refetch()
        }}
        onToChange={(value) => {
          setSelectedPreset('CUSTOM')
          setDraftFilters((currentFilters) => ({
            ...currentFilters,
            to: value,
          }))
        }}
      />

      <div className={styles.metricsGrid}>
        <ReportsMetricCard
          hint="Resultado neto entre lo que entra y lo que sale en el rango seleccionado."
          label="Balance"
          tone={netCashflow >= 0 ? 'success' : 'alert'}
          value={formatReportCurrency(netCashflow, languageCode)}
        />
        <ReportsMetricCard
          hint="Ventas consolidadas dentro del periodo filtrado."
          label="Ventas totales"
          tone="accent"
          value={formatReportCurrency(totalRevenue, languageCode)}
        />
        <ReportsMetricCard
          hint="Utilidad bruta calculada a partir de las ventas y el costo actual de los productos vendidos."
          label="Ganancia de ventas"
          tone={grossProfit >= 0 ? 'success' : 'alert'}
          value={formatReportCurrency(grossProfit, languageCode)}
        />
        <ReportsMetricCard
          hint={`Se registraron ${salesCount.toString()} ventas en el periodo.`}
          label="Ticket promedio"
          value={formatReportCurrency(salesReport.averageTicket, languageCode)}
        />
      </div>

      <div className={styles.summaryGrid}>
        <SurfaceCard className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Ingresos</p>
          <p className={styles.summaryValue}>{formatReportCurrency(totalInflow, languageCode)}</p>
          <p className={styles.summaryHint}>
            Ventas y otros ingresos capturados por el sistema.
          </p>
        </SurfaceCard>

        <SurfaceCard className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Egresos</p>
          <p className={styles.summaryValue}>{formatReportCurrency(totalOutflow, languageCode)}</p>
          <p className={styles.summaryHint}>
            Salidas de dinero manuales y compras a proveedores.
          </p>
        </SurfaceCard>

        <SurfaceCard className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Producto líder</p>
          <p className={styles.summaryValue}>
            {topProduct ? topProduct.name : 'Sin datos'}
          </p>
          <p className={styles.summaryHint}>
            {topProduct
              ? `${topProduct.quantitySold} unidades vendidas en el rango activo.`
              : 'Cuando existan ventas, aquí verás el producto que está jalonando el negocio.'}
          </p>
        </SurfaceCard>

        <SurfaceCard className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Actividad</p>
          <p className={styles.summaryValue}>{salesCount.toString()}</p>
          <p className={styles.summaryHint}>
            {`${expensesReport.manualExpensesCount.toString()} gastos manuales y ${expensesReport.supplierPurchasesCount.toString()} compras proveedor.`}
          </p>
        </SurfaceCard>
      </div>

      {reportsOverviewQuery.isError ? (
        <SurfaceCard className={styles.feedbackCard}>
          <p className={styles.feedbackTitle}>
            No pudimos cargar las estadísticas.
          </p>
          <p className={styles.feedbackDescription}>
            {getErrorMessage(
              reportsOverviewQuery.error,
              'No pudimos cargar el tablero estadístico en este momento. Intenta otra vez.',
            )}
          </p>
          <button
            className={styles.feedbackButton}
            type="button"
            onClick={() => {
              void reportsOverviewQuery.refetch()
            }}
          >
            Reintentar
          </button>
        </SurfaceCard>
      ) : null}

      <div className={styles.chartsGrid}>
        <ReportsChartCard
          description="Lectura rápida del volumen de ventas, ingreso total y ticket promedio."
          footer={`${salesCount.toString()} transacciones en el rango`}
          title="Ventas"
        >
          <SalesPerformanceChart
            emptyDescription="Cuando el periodo seleccionado tenga actividad, esta gráfica comparará ventas y ganancia por tramo del tiempo."
            emptyTitle="Todavía no hay detalle de ventas"
            languageCode={languageCode}
            profitSeriesLabel="Ganancia"
            report={salesReport}
            revenueSeriesLabel="Ventas"
          />
        </ReportsChartCard>

        <ReportsChartCard
          description="Separa los gastos por categoría para entender de dónde sale el dinero."
          footer={formatReportCurrency(totalExpenses, languageCode)}
          title="Gastos"
        >
          <ExpensesBreakdownChart
            languageCode={languageCode}
            report={expensesReport}
          />
        </ReportsChartCard>

        <ReportsChartCard
          description="Compara entradas y salidas para leer el equilibrio operativo del periodo."
          footer={`Neto ${formatReportCurrency(netCashflow, languageCode)}`}
          title="Flujo de caja"
        >
          <CashflowChart
            report={
              cashflowReport ?? {
                from: null,
                to: null,
                salesRevenue: 0,
                manualIncomeTotal: 0,
                manualExpenseTotal: 0,
                supplierPurchasesTotal: 0,
                totalInflow: 0,
                totalOutflow: 0,
                netCashflow: 0,
              }
            }
          />
        </ReportsChartCard>

        <ReportsChartCard
          description="Ranking de productos por volumen vendido con contexto de facturación."
          footer={topProduct ? `${topProduct.name} lidera` : 'Sin ranking todavía'}
          title="Productos destacados"
        >
          <TopProductsChart
            report={
              topProductsReport ?? {
                from: null,
                to: null,
                items: [],
              }
            }
          />
        </ReportsChartCard>
      </div>
    </div>
  )
}
