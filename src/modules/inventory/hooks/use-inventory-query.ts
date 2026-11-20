import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardSummaryQueryKey } from '@/modules/dashboard/hooks/use-dashboard-summary-query'
import {
  applyInventoryCount,
  createInventoryAdjustment,
  createInventoryCategory,
  deleteInventoryCategory,
  getInventoryCategories,
  getInventoryLowStockAlerts,
  getInventoryMovements,
  registerInventoryPurchase,
  registerInventoryProduction,
  registerInventoryWaste,
  deleteProductRecipe,
  getProductRecipes,
  getProductionPlan,
  upsertProductRecipe,
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrders,
  getReplenishmentSuggestions,
  sendPurchaseOrder,
  getBakeryDailySummary,
  uploadInventoryPurchaseInvoice,
  updateInventoryCategory,
  updateInventoryProductTaxes,
} from '@/modules/inventory/services/inventory-api'
import type {
  InventoryAdjustmentInput,
  InventoryCountInput,
  InventoryProductCategoryInput,
  InventoryProductTaxesInput,
  InventoryPurchaseInput,
  InventoryOperationInput,
  ProductRecipeInput,
  PurchaseOrderInput,
} from '@/modules/inventory/types/inventory'
import { productsQueryKey } from '@/modules/products/hooks/use-products-query'
import { suppliersQueryKey } from '@/modules/suppliers/hooks/use-suppliers-query'

export const inventoryMovementsQueryKey = ['inventory', 'movements'] as const
export const inventoryLowStockQueryKey = ['inventory', 'low-stock'] as const
export const inventoryCategoriesQueryKey = ['inventory', 'categories'] as const
export const productRecipesQueryKey = ['inventory', 'recipes'] as const
export const productionPlanQueryKey = ['inventory', 'production-plan'] as const
export const purchaseOrdersQueryKey = ['inventory', 'purchase-orders'] as const
export const replenishmentSuggestionsQueryKey = ['inventory', 'replenishment-suggestions'] as const
export const bakeryDailySummaryQueryKey = ['inventory', 'bakery-daily-summary'] as const

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

export function useProductRecipesQuery() {
  return useQuery({
    queryKey: productRecipesQueryKey,
    queryFn: getProductRecipes,
  })
}

export function useProductionPlanQuery(coverageDays = 1) {
  return useQuery({
    queryKey: [...productionPlanQueryKey, coverageDays],
    queryFn: () => getProductionPlan(coverageDays),
  })
}

export function useBakeryDailySummaryQuery(date: string) {
  return useQuery({
    queryKey: [...bakeryDailySummaryQueryKey, date],
    queryFn: () => getBakeryDailySummary(date),
    enabled: Boolean(date),
  })
}

export function usePurchaseOrdersQuery() {
  return useQuery({ queryKey: purchaseOrdersQueryKey, queryFn: getPurchaseOrders })
}

export function useReplenishmentSuggestionsQuery() {
  return useQuery({
    queryKey: replenishmentSuggestionsQueryKey,
    queryFn: getReplenishmentSuggestions,
  })
}

export function useCreatePurchaseOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PurchaseOrderInput) => createPurchaseOrder(input),
    onSuccess: async () => invalidateInventoryDependencies(queryClient),
  })
}

export function useSendPurchaseOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: sendPurchaseOrder,
    onSuccess: async () => invalidateInventoryDependencies(queryClient),
  })
}

export function useCancelPurchaseOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelPurchaseOrder,
    onSuccess: async () => invalidateInventoryDependencies(queryClient),
  })
}

export function useUpsertProductRecipeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, input }: { productId: string; input: ProductRecipeInput }) =>
      upsertProductRecipe(productId, input),
    onSuccess: async () => invalidateInventoryDependencies(queryClient),
  })
}

export function useDeleteProductRecipeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteProductRecipe,
    onSuccess: async () => invalidateInventoryDependencies(queryClient),
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

export function useApplyInventoryCountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: InventoryCountInput) => applyInventoryCount(input),
    onSuccess: async () => {
      await invalidateInventoryDependencies(queryClient)
    },
  })
}

export function useRegisterInventoryProductionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: InventoryOperationInput) =>
      registerInventoryProduction(input),
    onSuccess: async () => invalidateInventoryDependencies(queryClient),
  })
}

export function useRegisterInventoryWasteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: InventoryOperationInput) => registerInventoryWaste(input),
    onSuccess: async () => invalidateInventoryDependencies(queryClient),
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
    queryClient.invalidateQueries({
      queryKey: suppliersQueryKey,
    }),
    queryClient.invalidateQueries({ queryKey: ['reports'] }),
    queryClient.invalidateQueries({ queryKey: ['cash-register'] }),
    queryClient.invalidateQueries({ queryKey: ['movements'] }),
    queryClient.invalidateQueries({ queryKey: productRecipesQueryKey }),
    queryClient.invalidateQueries({ queryKey: productionPlanQueryKey }),
    queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey }),
    queryClient.invalidateQueries({ queryKey: replenishmentSuggestionsQueryKey }),
    queryClient.invalidateQueries({ queryKey: bakeryDailySummaryQueryKey }),
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

export function useUploadInventoryPurchaseInvoiceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadInventoryPurchaseInvoice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
    },
  })
}
