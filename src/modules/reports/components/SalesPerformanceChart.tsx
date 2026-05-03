import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartPlaceholderState } from '@/modules/reports/components/ChartPlaceholderState'
import type { SalesReport } from '@/modules/reports/types/report'
import { formatReportBucketLabel, formatReportCurrency } from '@/modules/reports/utils/format-report'
import type { AppLanguageCode } from '@/shared/i18n/app-dictionary'

const SALES_COLORS = ['#0f766e', '#14b8a6']

type SalesPerformanceChartProps = {
  report: SalesReport
  languageCode: AppLanguageCode
  emptyTitle: string
  emptyDescription: string
  revenueSeriesLabel: string
  profitSeriesLabel: string
}

export function SalesPerformanceChart({
  report,
  languageCode,
  emptyTitle,
  emptyDescription,
  revenueSeriesLabel,
  profitSeriesLabel,
}: SalesPerformanceChartProps) {
  const chartData = report.detail.map((point) => ({
    label: formatReportBucketLabel(
      point.bucketStart,
      report.detailGranularity,
      languageCode,
    ),
    revenue: point.revenue,
    grossProfit: point.grossProfit,
  }))

  if (chartData.length === 0 || chartData.every((item) => item.revenue <= 0)) {
    return (
      <ChartPlaceholderState
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <ResponsiveContainer height={288} width="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 18, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" vertical={false} />
        <YAxis
          axisLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={(value) => formatReportCurrency(Number(value), languageCode)}
          tickLine={false}
          width={86}
        />
        <XAxis
          axisLine={false}
          dataKey="label"
          tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
          tickLine={false}
        />
        <Tooltip
          formatter={(value, name) => [
            formatReportCurrency(Number(value), languageCode),
            name === 'revenue' ? revenueSeriesLabel : profitSeriesLabel,
          ]}
          labelStyle={{ color: '#0f172a', fontWeight: 700 }}
          contentStyle={{
            borderRadius: 14,
            border: '1px solid rgba(148, 163, 184, 0.24)',
            boxShadow: '0 16px 32px rgba(15, 23, 42, 0.14)',
          }}
        />
        <Bar barSize={22} dataKey="revenue" name={revenueSeriesLabel} radius={[10, 10, 0, 0]}>
          {chartData.map((item) => (
            <Cell key={`${item.label}-revenue`} fill={SALES_COLORS[0]} />
          ))}
        </Bar>
        <Bar barSize={22} dataKey="grossProfit" name={profitSeriesLabel} radius={[10, 10, 0, 0]}>
          {chartData.map((item) => (
            <Cell key={`${item.label}-profit`} fill={SALES_COLORS[1]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
