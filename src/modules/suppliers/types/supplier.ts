export type SupplierSummary = {
  id: string
  name: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  purchaseCount: number
  outstandingBalance: number
  lastPurchaseAt: string | null
  createdAt: string
  updatedAt: string
}

export type SupplierSupplyHistoryItem = {
  purchaseId: string
  total: number
  paidAmount: number
  balance: number
  reference: string | null
  paymentMethod: ExpensePaymentMethod
  status: ExpenseStatus
  purchaseDate: string
  dueDate: string | null
  notes: string | null
  items: Array<{
    id: string
    productId: string
    productName: string
    sku: string | null
    quantity: number
    unitCost: number
    subtotal: number
  }>
  payments: Array<{
    id: string
    method: ExpensePaymentMethod
    amount: number
    reference: string | null
    notes: string | null
    paymentDate: string
  }>
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

export type SupplierPurchasePaymentInput = {
  amount: number
  method: ExpensePaymentMethod
  reference?: string
  notes?: string
  paymentDate?: string
}
import type {
  ExpensePaymentMethod,
  ExpenseStatus,
} from '@/modules/expenses/types/expense'
