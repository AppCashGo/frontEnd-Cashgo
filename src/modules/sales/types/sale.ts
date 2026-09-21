import type { CashRegisterPaymentMethod } from '@/modules/cash-register/types/cash-register'
import type { Product } from '@/modules/products/types/product'

export type SalePaymentMethod = CashRegisterPaymentMethod

export type SaleStatus =
  | 'COMPLETED'
  | 'PARTIALLY_PAID'
  | 'PENDING_PAYMENT'
  | 'CANCELLED'

export type CreateSaleInput = {
  idempotencyKey?: string
  heldSaleId?: string
  items?: Array<{
    productId: string
    quantity: number
    unitPriceOverride?: number
    taxRateOverride?: number
    discountOverride?: number
  }>
  manualSubtotal?: number
  customerId?: string
  cashRegisterId?: string
  discountTotal?: number
  taxTotal?: number
  notes?: string
  saleDate?: string
  dueDate?: string
  payments?: Array<{
    method: SalePaymentMethod
    amount: number
    reference?: string
    notes?: string
  }>
}

export type CancelSaleInput = {
  reason: string
}

export type SaleReturnInput = {
  items: Array<{
    saleItemId: string
    quantity: number
  }>
  reason: string
  refundMethod?: SalePaymentMethod
  returnDate?: string
}

export type SalePayment = {
  id: string
  method: SalePaymentMethod
  amount: number
  reference: string | null
  notes: string | null
  createdAt: string
}

export type SaleAccountReceivable = {
  id: string
  amount: number
  paidAmount: number
  balance: number
  dueDate: string | null
  status: string
  payments: SaleReceivablePayment[]
}

export type SaleReceivablePayment = SalePayment & {
  createdByUser?: {
    id: string
    name: string
  } | null
}

export type SalePerson = {
  id: string
  name: string
  avatarUrl: string | null
}

export type SaleReceipt = {
  id: string
  saleNumber: string
  status: SaleStatus
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  notes: string | null
  saleDate: string
  createdAt: string
  customer: {
    id: string
    name: string
    phone: string | null
    email: string | null
    documentType: string | null
    documentNumber: string | null
    address: string | null
    avatarUrl: string | null
  } | null
  seller: (SalePerson & { role: string }) | null
  invoice: {
    id: string
    documentNumber: string
    type: string
    status: string
  } | null
  items: Array<{
    id: string
    productId: string
    quantity: number
    price: number
    returnedQuantity: number
    product: Product
  }>
  payments: SalePayment[]
  accountReceivable: SaleAccountReceivable | null
  returns: Array<{
    id: string
    creditNumber: string
    amount: number
    balanceReduction: number
    refundAmount: number
    refundMethod: SalePaymentMethod | null
    reason: string
    returnDate: string
    createdAt: string
    items: Array<{
      id: string
      saleItemId: string
      productId: string
      quantity: number
      unitAmount: number
      subtotal: number
    }>
  }>
}

export type SalesHistoryStatus =
  | 'PAID'
  | 'PARTIAL'
  | 'PENDING'
  | 'OVERDUE'
  | 'CANCELLED'

export type SalesHistoryItem = {
  id: string
  saleNumber: string
  saleDate: string
  total: number
  collectedAmount: number
  balance: number
  status: SalesHistoryStatus
  itemCount: number
  paymentMethods: SalePaymentMethod[]
  customer: SalePerson | null
  seller: (SalePerson & { role: string }) | null
  invoice: {
    id: string
    documentNumber: string
    type: string
    status: string
  } | null
}

export type SalesHistoryFilters = {
  from?: string
  to?: string
  search?: string
  sellerUserId?: string
  status?: 'ALL' | SalesHistoryStatus
  paymentMethod?: SalePaymentMethod | ''
  page?: number
  pageSize?: number
}

export type SalesHistoryResponse = {
  summary: {
    salesTotal: number
    salesCount: number
    grossProfit: number
    collectedTotal: number
    outstandingTotal: number
    paymentMethods: Array<{ method: SalePaymentMethod; amount: number }>
  }
  items: SalesHistoryItem[]
  facets: {
    sellers: Array<{ id: string; name: string }>
  }
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export type SaleCartItem = {
  product: Product
  quantity: number
  unitPrice: number
  lineTotal: number
}
