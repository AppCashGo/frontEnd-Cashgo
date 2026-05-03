import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AuthBusiness,
  AuthUser,
} from '@/modules/auth/types/auth-session'

type AuthSessionState = {
  accessToken: string | null
  user: AuthUser | null
  setSession: (session: { accessToken: string; user: AuthUser }) => void
  setActiveBusiness: (businessId: string) => void
  addBusiness: (business: AuthBusiness, shouldSetActive?: boolean) => void
  clearSession: () => void
}

export const useAuthSessionStore = create<AuthSessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: ({ accessToken, user }) => set({ accessToken, user }),
      setActiveBusiness: (businessId) =>
        set((state) => {
          const currentUser = state.user

          if (!currentUser) {
            return state
          }

          const activeBusiness = currentUser.businesses.find(
            (business) => business.id === businessId,
          )

          if (!activeBusiness) {
            return state
          }

          return {
            ...state,
            user: {
              ...currentUser,
              businessId: activeBusiness.id,
              businessName: activeBusiness.businessName,
              businessCategory: activeBusiness.businessCategory,
              role: activeBusiness.role,
              businesses: currentUser.businesses.map((business) => ({
                ...business,
                isDefault: business.id === activeBusiness.id,
              })),
            },
          }
        }),
      addBusiness: (business, shouldSetActive = true) =>
        set((state) => {
          const currentUser = state.user

          if (!currentUser) {
            return state
          }

          const existingBusinesses = currentUser.businesses.filter(
            (currentBusiness) => currentBusiness.id !== business.id,
          )
          const nextBusinesses = [
            ...existingBusinesses.map((currentBusiness) => ({
              ...currentBusiness,
              isDefault: shouldSetActive ? false : currentBusiness.isDefault,
            })),
            {
              ...business,
              isDefault: shouldSetActive ? true : business.isDefault,
            },
          ]

          if (!shouldSetActive) {
            return {
              ...state,
              user: {
                ...currentUser,
                businesses: nextBusinesses,
              },
            }
          }

          return {
            ...state,
            user: {
              ...currentUser,
              businessId: business.id,
              businessName: business.businessName,
              businessCategory: business.businessCategory,
              role: business.role,
              businesses: nextBusinesses,
            },
          }
        }),
      clearSession: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'cashgo-auth-session',
    },
  ),
)
