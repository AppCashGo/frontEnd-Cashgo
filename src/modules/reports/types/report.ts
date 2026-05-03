export type ReportDateRangeFilters = {
  from: string
  to: string
}

export type ReportRangePreset = 'WEEK' | 'MONTH' | 'ALL' | 'CUSTOM'
export type SalesDetailGranularity = 'HOUR' | 'DAY'

type ReportDateRangeMetadata = {
  from: string | null
  to: string | null
}

export type SalesReportDetailPoint = {
  bucketStart: string
  revenue: number
  grossProfit: number
  salesCount: number
}

export type SalesReportPaymentMethod = {
  method: string
  total: number
  paymentsCount: number
}

export type SalesReport = ReportDateRangeMetadata & {
  salesCount: number
  totalRevenue: number
  averageTicket: number
  grossProfit: number
  highestSale: number
  lowestSale: number
  detailGranularity: SalesDetailGranularity
  detail: SalesReportDetailPoint[]
  paymentMethods: SalesReportPaymentMethod[]
}

export type ExpensesReportCategory = {
  categoryId: string | null
  name: string
  total: number
  count: number
}

export type ExpensesReport = ReportDateRangeMetadata & {
  manualExpensesCount: number
  supplierPurchasesCount: number
  manualExpensesTotal: number
  supplierPurchasesTotal: number
  totalExpenses: number
  averageExpense: number
  highestExpense: number
  categories: ExpensesReportCategory[]
}

export type CashflowReport = ReportDateRangeMetadata & {
  salesRevenue: number
  manualIncomeTotal: number
  manualExpenseTotal: number
  supplierPurchasesTotal: number
  totalInflow: number
  totalOutflow: number
  netCashflow: number
}

export type TopProductsReportItem = {
  productId: string
  name: string
  quantitySold: number
  revenue: number
}

export type TopProductsReport = ReportDateRangeMetadata & {
  items: TopProductsReportItem[]
}

export type InventoryLowStockItem = {
  productId: string
  name: string
  stock: number
  minStock: number
  inventoryValue: number
}

export type InventoryReport = ReportDateRangeMetadata & {
  totalProducts: number
  activeProducts: number
  inventoryValue: number
  lowStockCount: number
  outOfStockCount: number
  lowStockItems: InventoryLowStockItem[]
}

export type CustomersTopCustomer = {
  customerId: string
  name: string
  totalSales: number
  salesCount: number
  balance: number
}

export type CustomersReport = ReportDateRangeMetadata & {
  totalCustomers: number
  newCustomersCount: number
  activeCustomersCount: number
  topCustomers: CustomersTopCustomer[]
}

export type DebtsTopDebtor = {
  customerId: string
  name: string
  balance: number
  receivablesCount: number
  overdueCount: number
}

export type DebtsReport = ReportDateRangeMetadata & {
  totalReceivable: number
  collectedAmount: number
  overdueCount: number
  averageDebt: number
  topDebtors: DebtsTopDebtor[]
}

export type EmployeesPerformance = {
  userId: string
  name: string
  role: string
  totalSales: number
  salesCount: number
  averageTicket: number
  totalExpensesRegistered: number
  lastLoginAt: string | null
}

export type EmployeesReport = ReportDateRangeMetadata & {
  employeeCount: number
  totalSales: number
  salesCount: number
  averageTicket: number
  totalExpensesRegistered: number
  employees: EmployeesPerformance[]
}

export type ReportsOverview = {
  sales: SalesReport
  expenses: ExpensesReport
  cashflow: CashflowReport
  topProducts: TopProductsReport
  inventory: InventoryReport
  customers: CustomersReport
  debts: DebtsReport
  employees: EmployeesReport
}
