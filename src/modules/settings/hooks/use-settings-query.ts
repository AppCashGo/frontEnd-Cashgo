import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBusinessSettings,
  createManagedBusiness,
  deleteBusinessSettings,
  getBusinessSettings,
  uploadBusinessLogo,
  updateBusinessSettings,
} from '@/modules/settings/services/settings-api'
import type {
  BusinessSettings,
  BusinessSettingsCreateInput,
  BusinessSettingsUpdateInput,
} from '@/modules/settings/types/settings'

export const settingsBusinessQueryKey = ['settings', 'business'] as const
export const settingsBusinessesQueryKey = ['settings', 'businesses'] as const

export function useBusinessSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: settingsBusinessQueryKey,
    queryFn: getBusinessSettings,
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
