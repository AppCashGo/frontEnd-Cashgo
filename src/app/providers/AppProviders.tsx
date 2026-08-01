import { QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren, useEffect, useState } from 'react'
import { appRouter } from '@/routes/app-router'
import { routePaths } from '@/routes/route-paths'
import { ToastProvider } from '@/shared/components/ui/ToastProvider'
import { createAppQueryClient } from '@/shared/services/query-client'
import { subscribeToAuthSessionExpired } from '@/shared/services/auth-session'

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => createAppQueryClient())

  useEffect(() => {
    return subscribeToAuthSessionExpired(() => {
      queryClient.clear()

      if (window.location.pathname !== routePaths.auth) {
        void appRouter.navigate(routePaths.auth, {
          replace: true,
          state: {
            from: window.location.pathname,
            reason: 'session-expired',
          },
        })
      }
    })
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  )
}
