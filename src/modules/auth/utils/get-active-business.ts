import type {
  AuthBusiness,
  AuthUser,
} from '@/modules/auth/types/auth-session'

export function getActiveBusiness(user: AuthUser | null | undefined) {
  if (!user) {
    return null
  }

  return (
    user.businesses.find((business) => business.id === user.businessId) ??
    user.businesses.find((business) => business.isDefault) ??
    null
  )
}

export function getActiveBusinessCategory(user: AuthUser | null | undefined) {
  return getActiveBusiness(user)?.businessCategory ?? user?.businessCategory ?? null
}

export function getActiveBusinessRole(user: AuthUser | null | undefined) {
  return getActiveBusiness(user)?.role ?? user?.role ?? null
}

export function isActiveBusiness(
  business: AuthBusiness,
  user: AuthUser | null | undefined,
) {
  return business.id === getActiveBusiness(user)?.id
}
