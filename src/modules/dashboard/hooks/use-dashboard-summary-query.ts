import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary } from '@/modules/dashboard/services/dashboard-api'

export const dashboardSummaryQueryKey = ['dashboard', 'summary'] as const

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: dashboardSummaryQueryKey,
    queryFn: getDashboardSummary,
  })
}
