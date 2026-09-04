export type SupplierSummary = {
  id: string
  name: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  purchaseCount: number
  lastPurchaseAt: string | null
  createdAt: string
  updatedAt: string
}

export type SupplierSupplyHistoryItem = {
  purchaseId: string
  total: number
  reference: string | null
  paymentMethod: ExpensePaymentMethod
  status: ExpenseStatus
  purchaseDate: string
  notes: string | null
  createdAt: string
}

export type SupplierDetail = SupplierSummary & {
  purchaseHistory: SupplierSupplyHistoryItem[]
}

export type SupplierMutationInput = {
  name: string
  email?: string | null
  phone?: string | null
}
import type {
  ExpensePaymentMethod,
  ExpenseStatus,
} from '@/modules/expenses/types/expense'
