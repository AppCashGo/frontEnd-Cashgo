import type {
  BusinessSettings,
  BusinessSettingsCreateInput,
  BusinessSettingsUpdateInput,
  ManagedBusinessSummary,
  SettingsUser,
  SettingsUserCreateInput,
  SettingsUserRole,
  SettingsUserUpdateInput,
} from '@/modules/settings/types/settings'
import {
  deleteJson,
  getJson,
  patchFormData,
  patchJson,
  postJson,
} from '@/shared/services/api-client'
import { getAuthAccessToken } from '@/shared/services/auth-session'

export function getBusinessSettings() {
  return getJson<BusinessSettings | null>('/settings/business', {
    accessToken: getAuthAccessToken(),
  })
}

export function createBusinessSettings(input: BusinessSettingsCreateInput) {
  return postJson<BusinessSettings, BusinessSettingsCreateInput>(
    '/settings/business',
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  )
}

export function createManagedBusiness(input: BusinessSettingsCreateInput) {
  return postJson<ManagedBusinessSummary, BusinessSettingsCreateInput>(
    '/settings/businesses',
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  )
}

export function updateBusinessSettings(input: BusinessSettingsUpdateInput) {
  return patchJson<BusinessSettings, BusinessSettingsUpdateInput>(
    '/settings/business',
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  )
}

export function uploadBusinessLogo(file: File) {
  const formData = new FormData()

  formData.append('file', file)

  return patchFormData<BusinessSettings>('/settings/business/logo', formData, {
    accessToken: getAuthAccessToken(),
  })
}

export function deleteBusinessSettings() {
  return deleteJson<void>('/settings/business', {
    accessToken: getAuthAccessToken(),
  })
}

export function getSettingsRoles() {
  return getJson<SettingsUserRole[]>('/settings/roles', {
    accessToken: getAuthAccessToken(),
  })
}

export function getSettingsUsers() {
  return getJson<SettingsUser[]>('/settings/users', {
    accessToken: getAuthAccessToken(),
  })
}

export function createSettingsUser(input: SettingsUserCreateInput) {
  return postJson<SettingsUser, SettingsUserCreateInput>('/settings/users', input, {
    accessToken: getAuthAccessToken(),
  })
}

export function updateSettingsUser(
  userId: string,
  input: SettingsUserUpdateInput,
) {
  return patchJson<SettingsUser, SettingsUserUpdateInput>(
    `/settings/users/${userId}`,
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  )
}

export function uploadSettingsUserAvatar(userId: string, file: File) {
  const formData = new FormData()

  formData.append('file', file)

  return patchFormData<SettingsUser>(
    `/settings/users/${userId}/avatar`,
    formData,
    {
      accessToken: getAuthAccessToken(),
    },
  )
}

export function deleteSettingsUser(userId: string) {
  return deleteJson<void>(`/settings/users/${userId}`, {
    accessToken: getAuthAccessToken(),
  })
}
