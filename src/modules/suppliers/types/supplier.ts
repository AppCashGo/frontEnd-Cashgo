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
  cancelledAt: string | null
  cancellationReason: string | null
  returnedAmount: number
  netTotal: number
  notes: string | null
  items: Array<{
    id: string
    productId: string
    productName: string
    sku: string | null
    quantity: number
    unitCost: number
    subtotal: number
    returnedQuantity: number
    availableToReturn: number
  }>
  payments: Array<{
    id: string
    method: ExpensePaymentMethod
    amount: number
    reference: string | null
    notes: string | null
    paymentDate: string
  }>
  returns: Array<{
    id: string
    creditNumber: string
    amount: number
    balanceReduction: number
    refundAmount: number
    refundMethod: ExpensePaymentMethod | null
    reason: string
    returnDate: string
    items: Array<{
      id: string
      purchaseItemId: string
      productId: string
      quantity: number
      unitCost: number
      subtotal: number
    }>
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

export type SupplierPurchaseCancellationInput = {
  reason: string
}

export type SupplierPurchaseReturnInput = {
  items: Array<{
    purchaseItemId: number
    quantity: number
  }>
  reason: string
  refundMethod?: ExpensePaymentMethod
  returnDate?: string
}
import type {
  ExpensePaymentMethod,
  ExpenseStatus,
} from '@/modules/expenses/types/expense'
