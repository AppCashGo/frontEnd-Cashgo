import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'

export const AUTH_SESSION_EXPIRED_EVENT = 'cashgo:auth-session-expired'

export function getAuthAccessToken() {
  return useAuthSessionStore.getState().accessToken ?? undefined
}

export function getAuthBusinessId() {
  return useAuthSessionStore.getState().user?.businessId ?? undefined
}

export function clearAuthSession() {
  useAuthSessionStore.getState().clearSession()
}

export function notifyAuthSessionExpired() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT))
}

export function subscribeToAuthSessionExpired(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener)

  return () => {
    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, listener)
  }
}
