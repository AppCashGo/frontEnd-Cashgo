import type {
  SaleAccountReceivable,
  SalePayment,
  SaleReceipt,
} from '@/modules/sales/types/sale'
import { normalizeProductRecord, type ProductApiRecord } from '@/modules/products/utils/normalize-product-record'
import { normalizeNumber } from '@/shared/utils/normalize-number'

type SalePaymentApiRecord = Omit<SalePayment, 'amount'> & {
  amount: number | string
}

type SaleAccountReceivableApiRecord = Omit<
  SaleAccountReceivable,
  'amount' | 'paidAmount' | 'balance'
> & {
  amount: number | string
  paidAmount: number | string
  balance: number | string
}

type SaleItemApiRecord = {
  id: string
  productId: string
  quantity: number
  price: number | string
  product: ProductApiRecord
}

export type SaleApiRecord = Omit<
  SaleReceipt,
  | 'subtotal'
  | 'discountTotal'
  | 'taxTotal'
  | 'total'
  | 'items'
  | 'payments'
  | 'accountReceivable'
> & {
  subtotal: number | string
  discountTotal: number | string
  taxTotal: number | string
  total: number | string
  items: SaleItemApiRecord[]
  payments: SalePaymentApiRecord[]
  accountReceivable: SaleAccountReceivableApiRecord | null
}

function normalizeSalePayment(record: SalePaymentApiRecord): SalePayment {
  return {
    ...record,
    amount: normalizeNumber(record.amount),
    reference: record.reference ?? null,
    notes: record.notes ?? null,
  }
}

function normalizeAccountReceivable(
  record: SaleAccountReceivableApiRecord | null,
) {
  if (!record) {
    return null
  }

  return {
    ...record,
    amount: normalizeNumber(record.amount),
    paidAmount: normalizeNumber(record.paidAmount),
    balance: normalizeNumber(record.balance),
  }
}

function normalizeSaleItem(record: SaleItemApiRecord) {
  return {
    ...record,
    price: normalizeNumber(record.price),
    product: normalizeProductRecord(record.product),
  }
}

export function normalizeSaleRecord(record: SaleApiRecord): SaleReceipt {
  return {
    ...record,
    notes: record.notes ?? null,
    subtotal: normalizeNumber(record.subtotal),
    discountTotal: normalizeNumber(record.discountTotal),
    taxTotal: normalizeNumber(record.taxTotal),
    total: normalizeNumber(record.total),
    customer: record.customer
      ? {
          id: record.customer.id,
          name: record.customer.name,
        }
      : null,
    items: record.items.map(normalizeSaleItem),
    payments: record.payments.map(normalizeSalePayment),
    accountReceivable: normalizeAccountReceivable(record.accountReceivable),
  }
}
