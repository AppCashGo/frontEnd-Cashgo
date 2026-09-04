import {
  getJson,
  patchFormData,
  patchJson,
  postJson,
} from '@/shared/services/api-client'
import type {
  SupplierDetail,
  SupplierMutationInput,
  SupplierSupplyHistoryItem,
  SupplierSummary,
} from '@/modules/suppliers/types/supplier'
import { normalizeNumber } from '@/shared/utils/normalize-number'

type SupplierSummaryApiRecord = Omit<SupplierSummary, 'id'> & {
  id: number | string
}

type SupplierSupplyHistoryItemApiRecord = Omit<
  SupplierSupplyHistoryItem,
  'purchaseId' | 'total'
> & {
  purchaseId: number | string
  total: number | string
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
