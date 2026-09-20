import { useQuery } from '@tanstack/react-query'
import { getSale, getSalesHistory } from '@/modules/sales/services/sales-api'
import type { SalesHistoryFilters } from '@/modules/sales/types/sale'

export const salesHistoryQueryKey = (filters: SalesHistoryFilters) =>
  ['sales', 'history', filters] as const

export function useSalesHistoryQuery(filters: SalesHistoryFilters) {
  return useQuery({
    queryKey: salesHistoryQueryKey(filters),
    queryFn: () => getSalesHistory(filters),
    placeholderData: (previousData) => previousData,
  })
}

export function useSaleDetailQuery(saleId: string | null) {
  return useQuery({
    queryKey: ['sales', 'detail', saleId],
    queryFn: () => getSale(saleId ?? ''),
    enabled: saleId !== null,
  })
}
