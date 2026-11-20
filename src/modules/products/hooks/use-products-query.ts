import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import type { Product } from '@/modules/products/types/product'
import { readOfflineSnapshot, writeOfflineSnapshot } from '@/shared/services/offline-snapshot'
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
  updateProductFavorite,
  uploadProductImages,
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
  const businessId = useAuthSessionStore((state) => state.user?.businessId)
  const query = useQuery({
    queryKey: productsQueryKey,
    queryFn: getProducts,
    initialData: () => readOfflineSnapshot<Product[]>(businessId, 'products'),
  })

  useEffect(() => {
    if (query.data) writeOfflineSnapshot(businessId, 'products', query.data)
  }, [businessId, query.data])

  return query
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

export function useUpdateProductFavoriteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      productId,
      isFavorite,
    }: {
      productId: string
      isFavorite: boolean
    }) => updateProductFavorite(productId, isFavorite),
    onMutate: async ({ productId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: productsQueryKey })
      const previousProducts = queryClient.getQueryData<Product[]>(productsQueryKey)
      queryClient.setQueryData<Product[]>(productsQueryKey, (currentProducts) =>
        currentProducts?.map((product) =>
          product.id === productId ? { ...product, isFavorite } : product,
        ),
      )
      return { previousProducts }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(productsQueryKey, context.previousProducts)
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: productsQueryKey })
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

export function useUploadProductImagesMutation() {
  return useMutation({
    mutationFn: (files: File[]) => uploadProductImages(files),
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
