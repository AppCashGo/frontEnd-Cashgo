import type {
  BusinessSettings,
  BusinessSettingsCreateInput,
  BusinessSettingsUpdateInput,
  ManagedBusinessSummary,
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
