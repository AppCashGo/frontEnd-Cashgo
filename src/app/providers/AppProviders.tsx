import { QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren, useState } from 'react'
import { createAppQueryClient } from '@/shared/services/query-client'

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => createAppQueryClient())

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
