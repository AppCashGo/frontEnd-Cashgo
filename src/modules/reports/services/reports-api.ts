import type {
  CashflowReport,
  CustomersReport,
  CustomersTopCustomer,
  DebtsReport,
  DebtsTopDebtor,
  EmployeesPerformance,
  EmployeesReport,
  ExpensesReport,
  ExpensesReportCategory,
  InventoryLowStockItem,
  InventoryReport,
  ReportDateRangeFilters,
  ReportsOverview,
  SalesReport,
  SalesReportDetailPoint,
  SalesReportPaymentMethod,
  TopProductsReport,
  TopProductsReportItem,
} from '@/modules/reports/types/report'
import { getJson } from '@/shared/services/api-client'
import { getAuthAccessToken } from '@/shared/services/auth-session'
import { normalizeNumber } from '@/shared/utils/normalize-number'

type SalesReportDetailPointApiRecord = Omit<
  SalesReportDetailPoint,
  'revenue' | 'grossProfit' | 'salesCount'
> & {
  revenue: number | string
  grossProfit: number | string
  salesCount: number | string
}

type SalesReportPaymentMethodApiRecord = Omit<
  SalesReportPaymentMethod,
  'total' | 'paymentsCount'
> & {
  total: number | string
  paymentsCount: number | string
}

type SalesReportApiRecord = Omit<
  SalesReport,
  | 'salesCount'
  | 'totalRevenue'
  | 'averageTicket'
  | 'grossProfit'
  | 'highestSale'
  | 'lowestSale'
  | 'detail'
  | 'paymentMethods'
> & {
  salesCount: number | string
  totalRevenue: number | string
  averageTicket: number | string
  grossProfit: number | string
  highestSale: number | string
  lowestSale: number | string
  detail: SalesReportDetailPointApiRecord[]
  paymentMethods: SalesReportPaymentMethodApiRecord[]
}

type ExpensesReportCategoryApiRecord = Omit<
  ExpensesReportCategory,
  'total' | 'count'
> & {
  total: number | string
  count: number | string
}

type ExpensesReportApiRecord = Omit<
  ExpensesReport,
  | 'manualExpensesCount'
  | 'supplierPurchasesCount'
  | 'manualExpensesTotal'
  | 'supplierPurchasesTotal'
  | 'totalExpenses'
  | 'averageExpense'
  | 'highestExpense'
  | 'categories'
> & {
  manualExpensesCount: number | string
  supplierPurchasesCount: number | string
  manualExpensesTotal: number | string
  supplierPurchasesTotal: number | string
  totalExpenses: number | string
  averageExpense: number | string
  highestExpense: number | string
  categories: ExpensesReportCategoryApiRecord[]
}

type CashflowReportApiRecord = Omit<
  CashflowReport,
  | 'salesRevenue'
  | 'manualIncomeTotal'
  | 'manualExpenseTotal'
  | 'supplierPurchasesTotal'
  | 'totalInflow'
  | 'totalOutflow'
  | 'netCashflow'
> & {
  salesRevenue: number | string
  manualIncomeTotal: number | string
  manualExpenseTotal: number | string
  supplierPurchasesTotal: number | string
  totalInflow: number | string
  totalOutflow: number | string
  netCashflow: number | string
}

type TopProductsReportItemApiRecord = Omit<
  TopProductsReportItem,
  'quantitySold' | 'revenue'
> & {
  quantitySold: number | string
  revenue: number | string
}

type TopProductsReportApiRecord = Omit<TopProductsReport, 'items'> & {
  items: TopProductsReportItemApiRecord[]
}

type InventoryLowStockItemApiRecord = Omit<
  InventoryLowStockItem,
  'stock' | 'minStock' | 'inventoryValue'
> & {
  stock: number | string
  minStock: number | string
  inventoryValue: number | string
}

type InventoryReportApiRecord = Omit<
  InventoryReport,
  | 'totalProducts'
  | 'activeProducts'
  | 'inventoryValue'
  | 'lowStockCount'
  | 'outOfStockCount'
  | 'lowStockItems'
> & {
  totalProducts: number | string
  activeProducts: number | string
  inventoryValue: number | string
  lowStockCount: number | string
  outOfStockCount: number | string
  lowStockItems: InventoryLowStockItemApiRecord[]
}

type CustomersTopCustomerApiRecord = Omit<
  CustomersTopCustomer,
  'totalSales' | 'salesCount' | 'balance'
> & {
  totalSales: number | string
  salesCount: number | string
  balance: number | string
}

type CustomersReportApiRecord = Omit<
  CustomersReport,
  'totalCustomers' | 'newCustomersCount' | 'activeCustomersCount' | 'topCustomers'
> & {
  totalCustomers: number | string
  newCustomersCount: number | string
  activeCustomersCount: number | string
  topCustomers: CustomersTopCustomerApiRecord[]
}

type DebtsTopDebtorApiRecord = Omit<
  DebtsTopDebtor,
  'balance' | 'receivablesCount' | 'overdueCount'
> & {
  balance: number | string
  receivablesCount: number | string
  overdueCount: number | string
}

type DebtsReportApiRecord = Omit<
  DebtsReport,
  'totalReceivable' | 'collectedAmount' | 'overdueCount' | 'averageDebt' | 'topDebtors'
> & {
  totalReceivable: number | string
  collectedAmount: number | string
  overdueCount: number | string
  averageDebt: number | string
  topDebtors: DebtsTopDebtorApiRecord[]
}

type EmployeesPerformanceApiRecord = Omit<
  EmployeesPerformance,
  'totalSales' | 'salesCount' | 'averageTicket' | 'totalExpensesRegistered'
> & {
  totalSales: number | string
  salesCount: number | string
  averageTicket: number | string
  totalExpensesRegistered: number | string
}

type EmployeesReportApiRecord = Omit<
  EmployeesReport,
  | 'employeeCount'
  | 'totalSales'
  | 'salesCount'
  | 'averageTicket'
  | 'totalExpensesRegistered'
  | 'employees'
> & {
  employeeCount: number | string
  totalSales: number | string
  salesCount: number | string
  averageTicket: number | string
  totalExpensesRegistered: number | string
  employees: EmployeesPerformanceApiRecord[]
}

type ReportsOverviewApiRecord = {
  sales: SalesReportApiRecord
  expenses: ExpensesReportApiRecord
  cashflow: CashflowReportApiRecord
  topProducts: TopProductsReportApiRecord
  inventory: InventoryReportApiRecord
  customers: CustomersReportApiRecord
  debts: DebtsReportApiRecord
  employees: EmployeesReportApiRecord
}

function buildReportQueryString(filters: ReportDateRangeFilters) {
  const searchParams = new URLSearchParams()

  if (filters.from) {
    searchParams.set('from', filters.from)
  }

  if (filters.to) {
    searchParams.set('to', filters.to)
  }

  const search = searchParams.toString()

  return search ? `?${search}` : ''
}

function normalizeDateRangeMetadata<TRecord extends { from: string | null; to: string | null }>(
  record: TRecord,
) {
  return {
    ...record,
    from: record.from ?? null,
    to: record.to ?? null,
  }
}

function normalizeSalesReport(record: SalesReportApiRecord): SalesReport {
  return {
    ...normalizeDateRangeMetadata(record),
    salesCount: normalizeNumber(record.salesCount),
    totalRevenue: normalizeNumber(record.totalRevenue),
    averageTicket: normalizeNumber(record.averageTicket),
    grossProfit: normalizeNumber(record.grossProfit),
    highestSale: normalizeNumber(record.highestSale),
    lowestSale: normalizeNumber(record.lowestSale),
    detailGranularity: record.detailGranularity,
    detail: record.detail.map((point) => ({
      bucketStart: point.bucketStart,
      revenue: normalizeNumber(point.revenue),
      grossProfit: normalizeNumber(point.grossProfit),
      salesCount: normalizeNumber(point.salesCount),
    })),
    paymentMethods: record.paymentMethods.map((paymentMethod) => ({
      method: paymentMethod.method,
      total: normalizeNumber(paymentMethod.total),
      paymentsCount: normalizeNumber(paymentMethod.paymentsCount),
    })),
  }
}

function normalizeExpensesReport(record: ExpensesReportApiRecord): ExpensesReport {
  return {
    ...normalizeDateRangeMetadata(record),
    manualExpensesCount: normalizeNumber(record.manualExpensesCount),
    supplierPurchasesCount: normalizeNumber(record.supplierPurchasesCount),
    manualExpensesTotal: normalizeNumber(record.manualExpensesTotal),
    supplierPurchasesTotal: normalizeNumber(record.supplierPurchasesTotal),
    totalExpenses: normalizeNumber(record.totalExpenses),
    averageExpense: normalizeNumber(record.averageExpense),
    highestExpense: normalizeNumber(record.highestExpense),
    categories: record.categories.map((category) => ({
      categoryId: category.categoryId,
      name: category.name,
      total: normalizeNumber(category.total),
      count: normalizeNumber(category.count),
    })),
  }
}

function normalizeCashflowReport(record: CashflowReportApiRecord): CashflowReport {
  return {
    ...normalizeDateRangeMetadata(record),
    salesRevenue: normalizeNumber(record.salesRevenue),
    manualIncomeTotal: normalizeNumber(record.manualIncomeTotal),
    manualExpenseTotal: normalizeNumber(record.manualExpenseTotal),
    supplierPurchasesTotal: normalizeNumber(record.supplierPurchasesTotal),
    totalInflow: normalizeNumber(record.totalInflow),
    totalOutflow: normalizeNumber(record.totalOutflow),
    netCashflow: normalizeNumber(record.netCashflow),
  }
}

function normalizeTopProductsReport(record: TopProductsReportApiRecord): TopProductsReport {
  return {
    ...normalizeDateRangeMetadata(record),
    items: record.items.map((item) => ({
      ...item,
      quantitySold: normalizeNumber(item.quantitySold),
      revenue: normalizeNumber(item.revenue),
    })),
  }
}

function normalizeInventoryReport(record: InventoryReportApiRecord): InventoryReport {
  return {
    ...normalizeDateRangeMetadata(record),
    totalProducts: normalizeNumber(record.totalProducts),
    activeProducts: normalizeNumber(record.activeProducts),
    inventoryValue: normalizeNumber(record.inventoryValue),
    lowStockCount: normalizeNumber(record.lowStockCount),
    outOfStockCount: normalizeNumber(record.outOfStockCount),
    lowStockItems: record.lowStockItems.map((item) => ({
      productId: item.productId,
      name: item.name,
      stock: normalizeNumber(item.stock),
      minStock: normalizeNumber(item.minStock),
      inventoryValue: normalizeNumber(item.inventoryValue),
    })),
  }
}

function normalizeCustomersReport(record: CustomersReportApiRecord): CustomersReport {
  return {
    ...normalizeDateRangeMetadata(record),
    totalCustomers: normalizeNumber(record.totalCustomers),
    newCustomersCount: normalizeNumber(record.newCustomersCount),
    activeCustomersCount: normalizeNumber(record.activeCustomersCount),
    topCustomers: record.topCustomers.map((customer) => ({
      customerId: customer.customerId,
      name: customer.name,
      totalSales: normalizeNumber(customer.totalSales),
      salesCount: normalizeNumber(customer.salesCount),
      balance: normalizeNumber(customer.balance),
    })),
  }
}

function normalizeDebtsReport(record: DebtsReportApiRecord): DebtsReport {
  return {
    ...normalizeDateRangeMetadata(record),
    totalReceivable: normalizeNumber(record.totalReceivable),
    collectedAmount: normalizeNumber(record.collectedAmount),
    overdueCount: normalizeNumber(record.overdueCount),
    averageDebt: normalizeNumber(record.averageDebt),
    topDebtors: record.topDebtors.map((debtor) => ({
      customerId: debtor.customerId,
      name: debtor.name,
      balance: normalizeNumber(debtor.balance),
      receivablesCount: normalizeNumber(debtor.receivablesCount),
      overdueCount: normalizeNumber(debtor.overdueCount),
    })),
  }
}

function normalizeEmployeesReport(record: EmployeesReportApiRecord): EmployeesReport {
  return {
    ...normalizeDateRangeMetadata(record),
    employeeCount: normalizeNumber(record.employeeCount),
    totalSales: normalizeNumber(record.totalSales),
    salesCount: normalizeNumber(record.salesCount),
    averageTicket: normalizeNumber(record.averageTicket),
    totalExpensesRegistered: normalizeNumber(record.totalExpensesRegistered),
    employees: record.employees.map((employee) => ({
      userId: employee.userId,
      name: employee.name,
      role: employee.role,
      totalSales: normalizeNumber(employee.totalSales),
      salesCount: normalizeNumber(employee.salesCount),
      averageTicket: normalizeNumber(employee.averageTicket),
      totalExpensesRegistered: normalizeNumber(employee.totalExpensesRegistered),
      lastLoginAt: employee.lastLoginAt ?? null,
    })),
  }
}

export async function getReportsOverview(
  filters: ReportDateRangeFilters,
): Promise<ReportsOverview> {
  const queryString = buildReportQueryString(filters)
  const accessToken = getAuthAccessToken()
  const overview = await getJson<ReportsOverviewApiRecord>(
    `/reports/overview${queryString}`,
    {
      accessToken,
    },
  )

  return {
    sales: normalizeSalesReport(overview.sales),
    expenses: normalizeExpensesReport(overview.expenses),
    cashflow: normalizeCashflowReport(overview.cashflow),
    topProducts: normalizeTopProductsReport(overview.topProducts),
    inventory: normalizeInventoryReport(overview.inventory),
    customers: normalizeCustomersReport(overview.customers),
    debts: normalizeDebtsReport(overview.debts),
    employees: normalizeEmployeesReport(overview.employees),
  }
}
