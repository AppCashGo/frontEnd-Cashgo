import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSupplier,
  getSupplierDetail,
  getSuppliers,
  markSupplierPurchaseAsPaid,
  updateSupplier,
  uploadSupplierAvatar,
} from '@/modules/suppliers/services/suppliers-api'
import type {
  SupplierDetail,
  SupplierMutationInput,
  SupplierSummary,
} from '@/modules/suppliers/types/supplier'

export const suppliersQueryKey = ['suppliers'] as const

function toSupplierSummary(supplier: SupplierDetail): SupplierSummary {
  return {
    id: supplier.id,
    name: supplier.name,
    email: supplier.email,
    phone: supplier.phone,
    avatarUrl: supplier.avatarUrl,
    purchaseCount: supplier.purchaseCount,
    lastPurchaseAt: supplier.lastPurchaseAt,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  }
}

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

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SupplierMutationInput) => createSupplier(input),
    onSuccess: (supplier) => {
      queryClient.setQueryData<SupplierSummary[]>(suppliersQueryKey, (current) =>
        current ? [toSupplierSummary(supplier), ...current] : [toSupplierSummary(supplier)],
      )

      queryClient.setQueryData(
        [...suppliersQueryKey, 'detail', supplier.id],
        supplier,
      )

      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
    },
  })
}

export function useUpdateSupplierMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      supplierId,
      input,
    }: {
      supplierId: string
      input: SupplierMutationInput
    }) => updateSupplier(supplierId, input),
    onSuccess: (supplier) => {
      queryClient.setQueryData<SupplierSummary[]>(suppliersQueryKey, (current) =>
        current?.map((item) =>
          item.id === supplier.id ? toSupplierSummary(supplier) : item,
        ),
      )

      queryClient.setQueryData(
        [...suppliersQueryKey, 'detail', supplier.id],
        supplier,
      )

      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
    },
  })
}

export function useMarkSupplierPurchaseAsPaidMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      supplierId,
      purchaseId,
    }: {
      supplierId: string
      purchaseId: string
    }) => markSupplierPurchaseAsPaid(supplierId, purchaseId),
    onSuccess: (supplier) => {
      queryClient.setQueryData(
        [...suppliersQueryKey, 'detail', supplier.id],
        supplier,
      )
      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

export function useUploadSupplierAvatarMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      supplierId,
      file,
    }: {
      supplierId: string
      file: File
    }) => uploadSupplierAvatar(supplierId, file),
    onSuccess: (supplier) => {
      queryClient.setQueryData<SupplierSummary[]>(suppliersQueryKey, (current) =>
        current?.map((item) =>
          item.id === supplier.id ? toSupplierSummary(supplier) : item,
        ),
      )

      queryClient.setQueryData(
        [...suppliersQueryKey, 'detail', supplier.id],
        supplier,
      )

      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
    },
  })
}
