import type { CashRegisterPaymentMethod } from '@/modules/cash-register/types/cash-register'
import type { Product } from '@/modules/products/types/product'

export type SalePaymentMethod = CashRegisterPaymentMethod

export type SaleStatus =
  | 'COMPLETED'
  | 'PARTIALLY_PAID'
  | 'PENDING_PAYMENT'
  | 'CANCELLED'

export type CreateSaleInput = {
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
  dueDate?: string
  payments?: Array<{
    method: SalePaymentMethod
    amount: number
    reference?: string
    notes?: string
  }>
}

export type CancelSaleInput = {
  reason?: string
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
  createdAt: string
  customer: {
    id: string
    name: string
  } | null
  items: Array<{
    id: string
    productId: string
    quantity: number
    price: number
    product: Product
  }>
  payments: SalePayment[]
  accountReceivable: SaleAccountReceivable | null
}

export type SaleCartItem = {
  product: Product
  quantity: number
  lineTotal: number
}
