import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'

export function getAuthAccessToken() {
  return useAuthSessionStore.getState().accessToken ?? undefined
}

export function getAuthBusinessId() {
  return useAuthSessionStore.getState().user?.businessId ?? undefined
}

export function clearAuthSession() {
  useAuthSessionStore.getState().clearSession()
}
