import { QueryClient } from '@tanstack/react-query'
import { shouldRetryApiError } from '@/shared/services/api-client'

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          shouldRetryApiError(error, failureCount),
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  })
}
