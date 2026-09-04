import {
  getBlob,
  getJson,
  patchFormData,
  patchJson,
  postJson,
} from '@/shared/services/api-client'
import type {
  SupplierDetail,
  SupplierMutationInput,
  SupplierPurchaseCancellationInput,
  SupplierPurchasePaymentInput,
  SupplierSupplyHistoryItem,
  SupplierSummary,
} from '@/modules/suppliers/types/supplier'
import { normalizeNumber } from '@/shared/utils/normalize-number'

type SupplierSummaryApiRecord = Omit<SupplierSummary, 'id' | 'outstandingBalance'> & {
  id: number | string
  outstandingBalance: number | string
}

type SupplierSupplyHistoryItemApiRecord = Omit<
  SupplierSupplyHistoryItem,
  'purchaseId' | 'total' | 'paidAmount' | 'balance' | 'items' | 'payments'
> & {
  purchaseId: number | string
  total: number | string
  paidAmount: number | string
  balance: number | string
  items: Array<
    Omit<SupplierSupplyHistoryItem['items'][number], 'id' | 'productId' | 'unitCost' | 'subtotal'> & {
      id: number | string
      productId: number | string
      unitCost: number | string
      subtotal: number | string
    }
  >
  payments: Array<
    Omit<SupplierSupplyHistoryItem['payments'][number], 'id' | 'amount'> & {
      id: number | string
      amount: number | string
    }
  >
}

type SupplierDetailApiRecord = SupplierSummaryApiRecord & {
  purchaseHistory: SupplierSupplyHistoryItemApiRecord[]
}

function normalizeSupplierSummaryRecord(
  supplier: SupplierSummaryApiRecord,
): SupplierSummary {
  return {
    ...supplier,
    id: String(supplier.id),
    outstandingBalance: normalizeNumber(supplier.outstandingBalance),
  }
}

function normalizeSupplierDetailRecord(
  supplier: SupplierDetailApiRecord,
): SupplierDetail {
  return {
    ...normalizeSupplierSummaryRecord(supplier),
    purchaseHistory: supplier.purchaseHistory.map((purchase) => ({
      ...purchase,
      purchaseId: String(purchase.purchaseId),
      total: normalizeNumber(purchase.total),
      paidAmount: normalizeNumber(purchase.paidAmount),
      balance: normalizeNumber(purchase.balance),
      items: purchase.items.map((item) => ({
        ...item,
        id: String(item.id),
        productId: String(item.productId),
        unitCost: normalizeNumber(item.unitCost),
        subtotal: normalizeNumber(item.subtotal),
      })),
      payments: purchase.payments.map((payment) => ({
        ...payment,
        id: String(payment.id),
        amount: normalizeNumber(payment.amount),
      })),
    })),
  }
}

export async function getSuppliers() {
  const suppliers = await getJson<SupplierSummaryApiRecord[]>('/suppliers')

  return suppliers.map(normalizeSupplierSummaryRecord)
}

export async function getSupplierDetail(supplierId: string) {
  const supplier = await getJson<SupplierDetailApiRecord>(
    `/suppliers/${supplierId}`,
  )

  return normalizeSupplierDetailRecord(supplier)
}

export async function createSupplier(input: SupplierMutationInput) {
  const supplier = await postJson<SupplierDetailApiRecord, SupplierMutationInput>(
    '/suppliers',
    input,
  )

  return normalizeSupplierDetailRecord(supplier)
}

export async function updateSupplier(
  supplierId: string,
  input: SupplierMutationInput,
) {
  const supplier = await patchJson<SupplierDetailApiRecord, SupplierMutationInput>(
    `/suppliers/${supplierId}`,
    input,
  )

  return normalizeSupplierDetailRecord(supplier)
}

export async function uploadSupplierAvatar(supplierId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const supplier = await patchFormData<SupplierDetailApiRecord>(
    `/suppliers/${supplierId}/avatar`,
    formData,
  )

  return normalizeSupplierDetailRecord(supplier)
}

export async function markSupplierPurchaseAsPaid(
  supplierId: string,
  purchaseId: string,
) {
  const supplier = await patchJson<SupplierDetailApiRecord, Record<string, never>>(
    `/suppliers/${supplierId}/purchases/${purchaseId}/pay`,
    {},
  )

  return normalizeSupplierDetailRecord(supplier)
}

export async function registerSupplierPurchasePayment(
  supplierId: string,
  purchaseId: string,
  input: SupplierPurchasePaymentInput,
) {
  const supplier = await postJson<
    SupplierDetailApiRecord,
    SupplierPurchasePaymentInput
  >(`/suppliers/${supplierId}/purchases/${purchaseId}/payments`, input)

  return normalizeSupplierDetailRecord(supplier)
}

export async function cancelSupplierPurchase(
  supplierId: string,
  purchaseId: string,
  input: SupplierPurchaseCancellationInput,
) {
  const supplier = await patchJson<
    SupplierDetailApiRecord,
    SupplierPurchaseCancellationInput
  >(`/suppliers/${supplierId}/purchases/${purchaseId}/cancel`, input)

  return normalizeSupplierDetailRecord(supplier)
}

export async function downloadSupplierPurchaseReceipt(
  supplierId: string,
  purchaseId: string,
) {
  return getBlob(`/suppliers/${supplierId}/purchases/${purchaseId}/receipt`, {
    accept: 'text/html',
  })
}
