import { getJson } from '@/shared/services/api-client'
import type {
  SupplierDetail,
  SupplierSummary,
} from '@/modules/suppliers/types/supplier'

export function getSuppliers() {
  return getJson<SupplierSummary[]>('/suppliers')
}

export function getSupplierDetail(supplierId: string) {
  return getJson<SupplierDetail>(`/suppliers/${supplierId}`)
}
