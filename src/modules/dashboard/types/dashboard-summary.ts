export type BestSellingProduct = {
  productId: string
  name: string
  quantitySold: number
}

export type LowStockAlert = {
  productId: string
  name: string
  stock: number
}

export type QaEvidenceCounts = {
  users: number
  customers: number
  suppliers: number
  productCategories: number
  products: number
  inventoryMovements: number
  cashRegisterMovements: number
  sales: number
  salePayments: number
  accountReceivables: number
  accountReceivablePayments: number
  expenseCategories: number
  expenses: number
  quotations: number
  invoices: number
}

export type QaEvidenceSummary = {
  latestRunLabel: string | null
  totalRecords: number
  counts: QaEvidenceCounts
}

export type DashboardSummary = {
  salesToday: number
  totalRevenue: number
  bestSellingProducts: BestSellingProduct[]
  lowStockAlerts: LowStockAlert[]
  qaEvidence: QaEvidenceSummary
}
