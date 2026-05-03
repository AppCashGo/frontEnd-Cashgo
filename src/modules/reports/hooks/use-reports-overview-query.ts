import { useQuery } from '@tanstack/react-query'
import { getReportsOverview } from '@/modules/reports/services/reports-api'
import type { ReportDateRangeFilters } from '@/modules/reports/types/report'

export const reportsOverviewQueryKey = (
  filters: ReportDateRangeFilters,
) => ['reports', 'overview', filters.from, filters.to] as const

export function useReportsOverviewQuery(filters: ReportDateRangeFilters) {
  return useQuery({
    queryKey: reportsOverviewQueryKey(filters),
    queryFn: () => getReportsOverview(filters),
  })
}
