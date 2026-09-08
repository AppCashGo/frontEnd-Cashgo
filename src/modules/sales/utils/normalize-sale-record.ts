import type {
  SaleAccountReceivable,
  SalePayment,
  SaleReceipt,
} from '@/modules/sales/types/sale'
import {
  normalizeProductRecord,
  type ProductApiRecord,
} from '@/modules/products/utils/normalize-product-record'
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
  returnItems?: Array<{ quantity: number }>
}

type SaleReturnApiRecord = Omit<
  SaleReceipt['returns'][number],
  'id' | 'amount' | 'balanceReduction' | 'refundAmount' | 'items'
> & {
  id: string | number
  amount: number | string
  balanceReduction: number | string
  refundAmount: number | string
  items: Array<
    Omit<
      SaleReceipt['returns'][number]['items'][number],
      'id' | 'saleItemId' | 'productId' | 'unitAmount' | 'subtotal'
    > & {
      id: string | number
      saleItemId: string | number
      productId: string | number
      unitAmount: number | string
      subtotal: number | string
    }
  >
}

export type SaleApiRecord = Omit<
  SaleReceipt,
  | 'subtotal'
  | 'discountTotal'
  | 'taxTotal'
  | 'total'
  | 'saleDate'
  | 'items'
  | 'payments'
  | 'accountReceivable'
  | 'returns'
> & {
  subtotal: number | string
  discountTotal: number | string
  taxTotal: number | string
  total: number | string
  saleDate?: string | null
  items: SaleItemApiRecord[]
  payments: SalePaymentApiRecord[]
  accountReceivable: SaleAccountReceivableApiRecord | null
  returns?: SaleReturnApiRecord[]
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
    returnedQuantity: (record.returnItems ?? []).reduce(
      (total, item) => total + Number(item.quantity),
      0,
    ),
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
    saleDate: record.saleDate ?? record.createdAt,
    customer: record.customer
      ? {
          id: record.customer.id,
          name: record.customer.name,
        }
      : null,
    items: record.items.map(normalizeSaleItem),
    payments: record.payments.map(normalizeSalePayment),
    accountReceivable: normalizeAccountReceivable(record.accountReceivable),
    returns: (record.returns ?? []).map((saleReturn) => ({
      ...saleReturn,
      id: String(saleReturn.id),
      amount: normalizeNumber(saleReturn.amount),
      balanceReduction: normalizeNumber(saleReturn.balanceReduction),
      refundAmount: normalizeNumber(saleReturn.refundAmount),
      refundMethod: saleReturn.refundMethod ?? null,
      items: saleReturn.items.map((item) => ({
        ...item,
        id: String(item.id),
        saleItemId: String(item.saleItemId),
        productId: String(item.productId),
        unitAmount: normalizeNumber(item.unitAmount),
        subtotal: normalizeNumber(item.subtotal),
      })),
    })),
  }
}
