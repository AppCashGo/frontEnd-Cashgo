import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRestaurantTable,
  createRestaurantZone,
  deleteRestaurantTable,
  deleteRestaurantZone,
  getRestaurantWorkspace,
  updateRestaurantTable,
  updateRestaurantZone,
  type RestaurantTableInput,
  type RestaurantZoneInput,
} from '@/modules/restaurant/services/restaurant-api'

export const restaurantWorkspaceQueryKey = ['restaurant', 'workspace'] as const

export function useRestaurantWorkspaceQuery() {
  return useQuery({
    queryKey: restaurantWorkspaceQueryKey,
    queryFn: getRestaurantWorkspace,
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
