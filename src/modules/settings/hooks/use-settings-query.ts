import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBusinessSettings,
  createManagedBusiness,
  createSettingsUser,
  deleteSettingsUser,
  getBusinessSettings,
  getSettingsRoles,
  getSettingsUsers,
  updateBusinessSettings,
  updateSettingsUser,
} from '@/modules/settings/services/settings-api'
import type {
  BusinessSettingsCreateInput,
  BusinessSettingsUpdateInput,
  SettingsUserCreateInput,
  SettingsUserUpdateInput,
} from '@/modules/settings/types/settings'

export const settingsBusinessQueryKey = ['settings', 'business'] as const
export const settingsBusinessesQueryKey = ['settings', 'businesses'] as const
export const settingsRolesQueryKey = ['settings', 'roles'] as const
export const settingsUsersQueryKey = ['settings', 'users'] as const

export function useBusinessSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: settingsBusinessQueryKey,
    queryFn: getBusinessSettings,
    enabled,
  })
}

export function useSettingsRolesQuery(enabled = true) {
  return useQuery({
    queryKey: settingsRolesQueryKey,
    queryFn: getSettingsRoles,
    enabled,
  })
}

export function useSettingsUsersQuery(enabled = true) {
  return useQuery({
    queryKey: settingsUsersQueryKey,
    queryFn: getSettingsUsers,
    enabled,
  })
}

export function useCreateBusinessSettingsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: BusinessSettingsCreateInput) =>
      createBusinessSettings(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: settingsBusinessQueryKey,
      })
    },
  })
}

export function useCreateManagedBusinessMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createManagedBusiness,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: settingsBusinessQueryKey,
      })
      await queryClient.invalidateQueries({
        queryKey: settingsBusinessesQueryKey,
      })
    },
  })
}

export function useUpdateBusinessSettingsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: BusinessSettingsUpdateInput) =>
      updateBusinessSettings(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: settingsBusinessQueryKey,
      })
    },
  })
}

export function useCreateSettingsUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SettingsUserCreateInput) => createSettingsUser(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: settingsUsersQueryKey,
      })
    },
  })
}

export function useUpdateSettingsUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string
      input: SettingsUserUpdateInput
    }) => updateSettingsUser(userId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: settingsUsersQueryKey,
      })
    },
  })
}

export function useDeleteSettingsUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => deleteSettingsUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: settingsUsersQueryKey,
      })
    },
  })
}
