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
  SupplierPurchaseReturnInput,
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
  'purchaseId' | 'total' | 'paidAmount' | 'balance' | 'returnedAmount' | 'netTotal' | 'items' | 'payments' | 'returns'
> & {
  purchaseId: number | string
  total: number | string
  paidAmount: number | string
  balance: number | string
  returnedAmount: number | string
  netTotal: number | string
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
  returns: Array<
    Omit<SupplierSupplyHistoryItem['returns'][number], 'id' | 'amount' | 'balanceReduction' | 'refundAmount' | 'items'> & {
      id: number | string
      amount: number | string
      balanceReduction: number | string
      refundAmount: number | string
      items: Array<
        Omit<SupplierSupplyHistoryItem['returns'][number]['items'][number], 'id' | 'purchaseItemId' | 'productId' | 'unitCost' | 'subtotal'> & {
          id: number | string
          purchaseItemId: number | string
          productId: number | string
          unitCost: number | string
          subtotal: number | string
        }
      >
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
      returnedAmount: normalizeNumber(purchase.returnedAmount ?? 0),
      netTotal: normalizeNumber(
        purchase.netTotal ??
          normalizeNumber(purchase.total) - normalizeNumber(purchase.returnedAmount ?? 0),
      ),
      items: purchase.items.map((item) => ({
        ...item,
        id: String(item.id),
        productId: String(item.productId),
        unitCost: normalizeNumber(item.unitCost),
        subtotal: normalizeNumber(item.subtotal),
        returnedQuantity: normalizeNumber(item.returnedQuantity ?? 0),
        availableToReturn: normalizeNumber(
          item.availableToReturn ?? item.quantity,
        ),
      })),
      payments: purchase.payments.map((payment) => ({
        ...payment,
        id: String(payment.id),
        amount: normalizeNumber(payment.amount),
      })),
      returns: (purchase.returns ?? []).map((purchaseReturn) => ({
        ...purchaseReturn,
        id: String(purchaseReturn.id),
        amount: normalizeNumber(purchaseReturn.amount),
        balanceReduction: normalizeNumber(purchaseReturn.balanceReduction),
        refundAmount: normalizeNumber(purchaseReturn.refundAmount),
        items: purchaseReturn.items.map((item) => ({
          ...item,
          id: String(item.id),
          purchaseItemId: String(item.purchaseItemId),
          productId: String(item.productId),
          unitCost: normalizeNumber(item.unitCost),
          subtotal: normalizeNumber(item.subtotal),
        })),
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

export async function createSupplierPurchaseReturn(
  supplierId: string,
  purchaseId: string,
  input: SupplierPurchaseReturnInput,
) {
  const supplier = await postJson<
    SupplierDetailApiRecord,
    SupplierPurchaseReturnInput
  >(`/suppliers/${supplierId}/purchases/${purchaseId}/returns`, input)

  return normalizeSupplierDetailRecord(supplier)
}

export async function downloadSupplierPurchaseReturnCreditNote(
  supplierId: string,
  purchaseId: string,
  returnId: string,
) {
  return getBlob(
    `/suppliers/${supplierId}/purchases/${purchaseId}/returns/${returnId}/credit-note`,
    { accept: 'text/html' },
  )
}

export async function downloadSupplierPurchaseReceipt(
  supplierId: string,
  purchaseId: string,
) {
  return getBlob(`/suppliers/${supplierId}/purchases/${purchaseId}/receipt`, {
    accept: 'text/html',
  })
}
