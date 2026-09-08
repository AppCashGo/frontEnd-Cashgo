import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidateCashRegisterQueries } from '@/modules/cash-register/hooks/use-cash-register-query'
import { productsQueryKey } from '@/modules/products/hooks/use-products-query'
import { customersQueryKey } from '@/modules/customers/hooks/use-customers-query'
import {
  cancelSale,
  createSale,
  createSaleReturn,
  getSales,
} from '@/modules/sales/services/sales-api'
import type {
  CancelSaleInput,
  CreateSaleInput,
  SaleReturnInput,
} from '@/modules/sales/types/sale'

export const salesQueryKey = ['sales'] as const

function invalidateSaleFlowQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return Promise.all([
    invalidateCashRegisterQueries(queryClient),
    queryClient.invalidateQueries({
      queryKey: productsQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: salesQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: customersQueryKey,
    }),
  ])
}

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
      await invalidateSaleFlowQueries(queryClient)
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
      await invalidateSaleFlowQueries(queryClient)
    },
  })
}

export function useCreateSaleReturnMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      saleId,
      input,
    }: {
      saleId: string
      input: SaleReturnInput
    }) => createSaleReturn(saleId, input),
    onSuccess: async () => {
      await invalidateSaleFlowQueries(queryClient)
    },
  })
}
