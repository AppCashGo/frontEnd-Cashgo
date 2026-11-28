import { useQuery } from '@tanstack/react-query'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { getDashboardSummary } from '@/modules/dashboard/services/dashboard-api'

export const dashboardSummaryQueryKey = ['dashboard', 'summary'] as const

export function useDashboardSummaryQuery() {
  const businessId = useAuthSessionStore((state) => state.user?.businessId)

  return useQuery({
    queryKey: [...dashboardSummaryQueryKey, businessId],
    queryFn: getDashboardSummary,
  })
}
