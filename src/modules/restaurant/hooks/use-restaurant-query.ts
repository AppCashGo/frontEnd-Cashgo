import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDeliveryOrder,
  createRestaurantTable,
  createRestaurantZone,
  deleteDeliveryOrder,
  deleteRestaurantTable,
  deleteRestaurantTableOrder,
  deleteRestaurantZone,
  getDeliveryOrders,
  getRestaurantWorkspace,
  moveRestaurantTableOrder,
  updateRestaurantTable,
  updateDeliveryOrder,
  updateRestaurantZone,
  upsertRestaurantTableOrder,
  type RestaurantTableInput,
  type RestaurantZoneInput,
} from '@/modules/restaurant/services/restaurant-api'
import type {
  CreateDeliveryOrderInput,
  RestaurantTableOrderInput,
  UpdateDeliveryOrderInput,
} from '@/modules/restaurant/types/restaurant'

export const restaurantWorkspaceQueryKey = ['restaurant', 'workspace'] as const
export const deliveryOrdersQueryKey = ['restaurant', 'delivery-orders'] as const

export function useRestaurantWorkspaceQuery() {
  return useQuery({
    queryKey: restaurantWorkspaceQueryKey,
    queryFn: getRestaurantWorkspace,
  })
}

export function useDeliveryOrdersQuery() {
  return useQuery({
    queryKey: deliveryOrdersQueryKey,
    queryFn: getDeliveryOrders,
  })
}

function useInvalidateRestaurantWorkspace() {
  const queryClient = useQueryClient()

  return async () => {
    await queryClient.invalidateQueries({
      queryKey: restaurantWorkspaceQueryKey,
    })
  }
}

function useInvalidateDeliveryOrders() {
  const queryClient = useQueryClient()

  return async () => {
    await queryClient.invalidateQueries({
      queryKey: deliveryOrdersQueryKey,
    })
  }
}

export function useCreateRestaurantZoneMutation() {
  const invalidateWorkspace = useInvalidateRestaurantWorkspace()

  return useMutation({
    mutationFn: (input: RestaurantZoneInput) => createRestaurantZone(input),
    onSuccess: invalidateWorkspace,
  })
}

export function useUpdateRestaurantZoneMutation() {
  const invalidateWorkspace = useInvalidateRestaurantWorkspace()

  return useMutation({
    mutationFn: ({
      zoneId,
      input,
    }: {
      zoneId: string
      input: Partial<RestaurantZoneInput>
    }) => updateRestaurantZone(zoneId, input),
    onSuccess: invalidateWorkspace,
  })
}

export function useDeleteRestaurantZoneMutation() {
  const invalidateWorkspace = useInvalidateRestaurantWorkspace()

  return useMutation({
    mutationFn: (zoneId: string) => deleteRestaurantZone(zoneId),
    onSuccess: invalidateWorkspace,
  })
}

export function useCreateRestaurantTableMutation() {
  const invalidateWorkspace = useInvalidateRestaurantWorkspace()

  return useMutation({
    mutationFn: (input: RestaurantTableInput) => createRestaurantTable(input),
    onSuccess: invalidateWorkspace,
  })
}

export function useUpdateRestaurantTableMutation() {
  const invalidateWorkspace = useInvalidateRestaurantWorkspace()

  return useMutation({
    mutationFn: ({
      tableId,
      input,
    }: {
      tableId: string
      input: Partial<RestaurantTableInput>
    }) => updateRestaurantTable(tableId, input),
    onSuccess: invalidateWorkspace,
  })
}

export function useDeleteRestaurantTableMutation() {
  const invalidateWorkspace = useInvalidateRestaurantWorkspace()

  return useMutation({
    mutationFn: (tableId: string) => deleteRestaurantTable(tableId),
    onSuccess: invalidateWorkspace,
  })
}

export function useSaveRestaurantTableOrderMutation() {
  return useMutation({
    mutationFn: (input: RestaurantTableOrderInput) =>
      upsertRestaurantTableOrder(input),
  })
}

export function useMoveRestaurantTableOrderMutation() {
  const invalidateWorkspace = useInvalidateRestaurantWorkspace()

  return useMutation({
    mutationFn: (input: { tableId: string; targetTableId: string }) =>
      moveRestaurantTableOrder(input),
    onSuccess: invalidateWorkspace,
  })
}

export function useDeleteRestaurantTableOrderMutation() {
  const invalidateWorkspace = useInvalidateRestaurantWorkspace()

  return useMutation({
    mutationFn: (tableId: string) => deleteRestaurantTableOrder(tableId),
    onSuccess: invalidateWorkspace,
  })
}

export function useCreateDeliveryOrderMutation() {
  const invalidateDeliveryOrders = useInvalidateDeliveryOrders()

  return useMutation({
    mutationFn: (input: CreateDeliveryOrderInput) => createDeliveryOrder(input),
    onSuccess: invalidateDeliveryOrders,
  })
}

export function useUpdateDeliveryOrderMutation() {
  const invalidateDeliveryOrders = useInvalidateDeliveryOrders()

  return useMutation({
    mutationFn: ({
      orderId,
      input,
    }: {
      orderId: string
      input: UpdateDeliveryOrderInput
    }) => updateDeliveryOrder(orderId, input),
    onSuccess: invalidateDeliveryOrders,
  })
}

export function useDeleteDeliveryOrderMutation() {
  const invalidateDeliveryOrders = useInvalidateDeliveryOrders()

  return useMutation({
    mutationFn: (orderId: string) => deleteDeliveryOrder(orderId),
    onSuccess: invalidateDeliveryOrders,
  })
}
