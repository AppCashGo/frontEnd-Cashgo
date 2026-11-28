import type { BusinessSetupProgress } from '@/shared/types/business-setup-progress'

export type BestSellingProduct = {
  productId: string
  name: string
  quantitySold: number
  imageUrl?: string | null
}

export type LowStockAlert = {
  productId: string
  name: string
  stock: number
  imageUrl?: string | null
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
  businessDate?: string
  setupProgress?: BusinessSetupProgress
  collectionsToday?: number
  overdueReceivables?: { balance: number; count: number }
  lowStockCount?: number
  lowStockAlertsEnabled?: boolean
  salesToday: number
  revenueToday: number
  totalRevenue: number
  customersCount: number
  activeProductsCount: number
  bestSellingProducts: BestSellingProduct[]
  lowStockAlerts: LowStockAlert[]
  qaEvidence: QaEvidenceSummary
}
