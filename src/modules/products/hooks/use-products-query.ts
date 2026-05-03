import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardSummaryQueryKey } from '@/modules/dashboard/hooks/use-dashboard-summary-query'
import {
  inventoryCategoriesQueryKey,
  inventoryLowStockQueryKey,
  inventoryMovementsQueryKey,
} from '@/modules/inventory/hooks/use-inventory-query'
import {
  createProduct,
  deleteProduct,
  getProducts,
  importProducts,
  updateProduct,
} from '@/modules/products/services/products-api'
import type {
  ProductImportMutationInput,
  ProductMutationInput,
} from '@/modules/products/types/product'

export const productsQueryKey = ['products'] as const

async function invalidateProductDependencies(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: productsQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: inventoryMovementsQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: inventoryLowStockQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: inventoryCategoriesQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardSummaryQueryKey,
    }),
  ])
}

export function useProductsQuery() {
  return useQuery({
    queryKey: productsQueryKey,
    queryFn: getProducts,
  })
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ProductMutationInput) => createProduct(input),
    onSuccess: async () => {
      await invalidateProductDependencies(queryClient)
    },
  })
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      productId,
      input,
    }: {
      productId: string
      input: ProductMutationInput
    }) => updateProduct(productId, input),
    onSuccess: async () => {
      await invalidateProductDependencies(queryClient)
    },
  })
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: async () => {
      await invalidateProductDependencies(queryClient)
    },
  })
}

export function useImportProductsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ProductImportMutationInput) => importProducts(input),
    onSuccess: async () => {
      await invalidateProductDependencies(queryClient)
    },
  })
}
