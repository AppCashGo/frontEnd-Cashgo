import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBusinessSettings,
  createManagedBusiness,
  deleteBusinessSettings,
  createSettingsUser,
  deleteSettingsUser,
  getBusinessSettings,
  getSettingsRoles,
  getSettingsUsers,
  uploadBusinessLogo,
  uploadSettingsUserAvatar,
  updateBusinessSettings,
  updateSettingsUser,
} from '@/modules/settings/services/settings-api'
import type {
  BusinessSettings,
  BusinessSettingsCreateInput,
  BusinessSettingsUpdateInput,
  SettingsUser,
  SettingsUserCreateInput,
  SettingsUserUpdateInput,
} from '@/modules/settings/types/settings'

export const settingsBusinessQueryKey = ['settings', 'business'] as const
export const settingsBusinessesQueryKey = ['settings', 'businesses'] as const
export const settingsRolesQueryKey = ['settings', 'roles'] as const
export const settingsUsersQueryKey = ['settings', 'users'] as const

function upsertSettingsUserInCache(
  current: SettingsUser[] | undefined,
  user: SettingsUser,
) {
  if (!current) {
    return [user]
  }

  const existingIndex = current.findIndex((item) => item.id === user.id)

  if (existingIndex === -1) {
    return [user, ...current]
  }

  return current.map((item) => (item.id === user.id ? user : item))
}

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
    onSuccess: async (settings) => {
      queryClient.setQueryData<BusinessSettings>(
        settingsBusinessQueryKey,
        settings,
      )

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
    onSuccess: async (settings) => {
      queryClient.setQueryData<BusinessSettings>(
        settingsBusinessQueryKey,
        settings,
      )

      await queryClient.invalidateQueries({
        queryKey: settingsBusinessQueryKey,
      })
    },
  })
}

export function useUploadBusinessLogoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => uploadBusinessLogo(file),
    onSuccess: async (settings) => {
      queryClient.setQueryData<BusinessSettings>(
        settingsBusinessQueryKey,
        settings,
      )

      await queryClient.invalidateQueries({
        queryKey: settingsBusinessQueryKey,
      })
    },
  })
}

export function useDeleteBusinessSettingsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBusinessSettings,
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

export function useCreateSettingsUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SettingsUserCreateInput) => createSettingsUser(input),
    onSuccess: async (user) => {
      queryClient.setQueryData<SettingsUser[]>(
        settingsUsersQueryKey,
        (current) => upsertSettingsUserInCache(current, user),
      )

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
    onSuccess: async (user) => {
      queryClient.setQueryData<SettingsUser[]>(
        settingsUsersQueryKey,
        (current) => upsertSettingsUserInCache(current, user),
      )

      await queryClient.invalidateQueries({
        queryKey: settingsUsersQueryKey,
      })
    },
  })
}

export function useUploadSettingsUserAvatarMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, userId }: { file: File; userId: string }) =>
      uploadSettingsUserAvatar(userId, file),
    onSuccess: async (user) => {
      queryClient.setQueryData<SettingsUser[]>(
        settingsUsersQueryKey,
        (current) => upsertSettingsUserInCache(current, user),
      )

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
    onSuccess: async (_result, userId) => {
      queryClient.setQueryData<SettingsUser[]>(
        settingsUsersQueryKey,
        (current) => current?.filter((user) => user.id !== userId),
      )

      await queryClient.invalidateQueries({
        queryKey: settingsUsersQueryKey,
      })
    },
  })
}
