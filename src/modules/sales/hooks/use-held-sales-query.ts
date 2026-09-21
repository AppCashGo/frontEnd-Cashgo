import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productsQueryKey } from '@/modules/products/hooks/use-products-query'
import {
  cancelHeldSale,
  createHeldSale,
  getHeldSales,
  updateHeldSale,
} from '@/modules/sales/services/held-sales-api'
import type { SaveHeldSaleInput } from '@/modules/sales/types/held-sale'

export const heldSalesQueryKey = ['held-sales'] as const

export function useHeldSalesQuery() {
  return useQuery({ queryKey: heldSalesQueryKey, queryFn: getHeldSales })
}

function useInvalidateHeldSales() {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: heldSalesQueryKey }),
      queryClient.invalidateQueries({ queryKey: productsQueryKey }),
    ])
  }
}

export function useCreateHeldSaleMutation() {
  const invalidate = useInvalidateHeldSales()
  return useMutation({ mutationFn: createHeldSale, onSuccess: invalidate })
}

export function useUpdateHeldSaleMutation() {
  const invalidate = useInvalidateHeldSales()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SaveHeldSaleInput }) =>
      updateHeldSale(id, input),
    onSuccess: invalidate,
  })
}

export function useCancelHeldSaleMutation() {
  const invalidate = useInvalidateHeldSales()
  return useMutation({ mutationFn: cancelHeldSale, onSuccess: invalidate })
}
