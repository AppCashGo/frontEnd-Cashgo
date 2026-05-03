import { useQuery } from '@tanstack/react-query'
import {
  getSupplierDetail,
  getSuppliers,
} from '@/modules/suppliers/services/suppliers-api'

export const suppliersQueryKey = ['suppliers'] as const

export function useSuppliersQuery() {
  return useQuery({
    queryKey: suppliersQueryKey,
    queryFn: getSuppliers,
  })
}

export function useSupplierDetailQuery(supplierId: string | null) {
  return useQuery({
    queryKey: [...suppliersQueryKey, 'detail', supplierId],
    queryFn: () => getSupplierDetail(supplierId as string),
    enabled: supplierId !== null,
  })
}
