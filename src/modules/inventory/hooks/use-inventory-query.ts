import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardSummaryQueryKey } from '@/modules/dashboard/hooks/use-dashboard-summary-query'
import {
  createInventoryAdjustment,
  createInventoryCategory,
  deleteInventoryCategory,
  getInventoryCategories,
  getInventoryLowStockAlerts,
  getInventoryMovements,
  registerInventoryPurchase,
  updateInventoryCategory,
  updateInventoryProductTaxes,
} from '@/modules/inventory/services/inventory-api'
import type {
  InventoryAdjustmentInput,
  InventoryProductCategoryInput,
  InventoryProductTaxesInput,
  InventoryPurchaseInput,
} from '@/modules/inventory/types/inventory'
import { productsQueryKey } from '@/modules/products/hooks/use-products-query'

export const inventoryMovementsQueryKey = ['inventory', 'movements'] as const
export const inventoryLowStockQueryKey = ['inventory', 'low-stock'] as const
export const inventoryCategoriesQueryKey = ['inventory', 'categories'] as const

export function useInventoryMovementsQuery() {
  return useQuery({
    queryKey: inventoryMovementsQueryKey,
    queryFn: getInventoryMovements,
  })
}

export function useInventoryLowStockQuery() {
  return useQuery({
    queryKey: inventoryLowStockQueryKey,
    queryFn: getInventoryLowStockAlerts,
  })
}

export function useInventoryCategoriesQuery() {
  return useQuery({
    queryKey: inventoryCategoriesQueryKey,
    queryFn: getInventoryCategories,
  })
}

export function useCreateInventoryAdjustmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: InventoryAdjustmentInput) =>
      createInventoryAdjustment(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: inventoryMovementsQueryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: inventoryLowStockQueryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: productsQueryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardSummaryQueryKey,
        }),
      ])
    },
  })
}

async function invalidateInventoryDependencies(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
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
      queryKey: productsQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardSummaryQueryKey,
    }),
  ])
}

export function useCreateInventoryCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: InventoryProductCategoryInput) =>
      createInventoryCategory(input),
    onSuccess: async () => {
      await invalidateInventoryDependencies(queryClient)
    },
  })
}

export function useUpdateInventoryCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      categoryId,
      input,
    }: {
      categoryId: string
      input: Partial<InventoryProductCategoryInput>
    }) => updateInventoryCategory(categoryId, input),
    onSuccess: async () => {
      await invalidateInventoryDependencies(queryClient)
    },
  })
}

export function useDeleteInventoryCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (categoryId: string) => deleteInventoryCategory(categoryId),
    onSuccess: async () => {
      await invalidateInventoryDependencies(queryClient)
    },
  })
}

export function useUpdateInventoryProductTaxesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: InventoryProductTaxesInput) =>
      updateInventoryProductTaxes(input),
    onSuccess: async () => {
      await invalidateInventoryDependencies(queryClient)
    },
  })
}

export function useRegisterInventoryPurchaseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: InventoryPurchaseInput) =>
      registerInventoryPurchase(input),
    onSuccess: async () => {
      await invalidateInventoryDependencies(queryClient)
    },
  })
}
