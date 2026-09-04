import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSupplier,
  cancelSupplierPurchase,
  createSupplierPurchaseReturn,
  getSupplierDetail,
  getSuppliers,
  markSupplierPurchaseAsPaid,
  registerSupplierPurchasePayment,
  updateSupplier,
  uploadSupplierAvatar,
} from '@/modules/suppliers/services/suppliers-api'
import type {
  SupplierDetail,
  SupplierMutationInput,
  SupplierPurchaseCancellationInput,
  SupplierPurchasePaymentInput,
  SupplierPurchaseReturnInput,
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
    outstandingBalance: supplier.outstandingBalance,
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

export function useRegisterSupplierPurchasePaymentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      supplierId,
      purchaseId,
      input,
    }: {
      supplierId: string
      purchaseId: string
      input: SupplierPurchasePaymentInput
    }) => registerSupplierPurchasePayment(supplierId, purchaseId, input),
    onSuccess: (supplier) => {
      queryClient.setQueryData(
        [...suppliersQueryKey, 'detail', supplier.id],
        supplier,
      )
      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['reports'] })
      void queryClient.invalidateQueries({ queryKey: ['cash-register'] })
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
    },
  })
}

export function useCancelSupplierPurchaseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      supplierId,
      purchaseId,
      input,
    }: {
      supplierId: string
      purchaseId: string
      input: SupplierPurchaseCancellationInput
    }) => cancelSupplierPurchase(supplierId, purchaseId, input),
    onSuccess: (supplier) => {
      queryClient.setQueryData(
        [...suppliersQueryKey, 'detail', supplier.id],
        supplier,
      )
      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['reports'] })
      void queryClient.invalidateQueries({ queryKey: ['cash-register'] })
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
    },
  })
}

export function useCreateSupplierPurchaseReturnMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      supplierId,
      purchaseId,
      input,
    }: {
      supplierId: string
      purchaseId: string
      input: SupplierPurchaseReturnInput
    }) => createSupplierPurchaseReturn(supplierId, purchaseId, input),
    onSuccess: (supplier) => {
      queryClient.setQueryData(
        [...suppliersQueryKey, 'detail', supplier.id],
        supplier,
      )
      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['reports'] })
      void queryClient.invalidateQueries({ queryKey: ['cash-register'] })
      void queryClient.invalidateQueries({ queryKey: ['movements'] })
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
