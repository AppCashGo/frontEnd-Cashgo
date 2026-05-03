import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productsQueryKey } from '@/modules/products/hooks/use-products-query'
import { cancelSale, createSale, getSales } from '@/modules/sales/services/sales-api'
import type { CancelSaleInput, CreateSaleInput } from '@/modules/sales/types/sale'

export const salesQueryKey = ['sales'] as const

export function useSalesQuery() {
  return useQuery({
    queryKey: salesQueryKey,
    queryFn: getSales,
  })
}

export function useCreateSaleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSaleInput) => createSale(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: productsQueryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: salesQueryKey,
        }),
      ])
    },
  })
}

export function useCancelSaleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      saleId,
      input,
    }: {
      saleId: string
      input?: CancelSaleInput
    }) => cancelSale(saleId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: productsQueryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: salesQueryKey,
        }),
      ])
    },
  })
}
