import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartPlaceholderState } from '@/modules/reports/components/ChartPlaceholderState'
import type {
  SalesReport,
  SalesReportDetailPoint,
} from '@/modules/reports/types/report'
import {
  formatReportBucketLabel,
  formatReportCurrency,
} from '@/modules/reports/utils/format-report'
import type { AppLanguageCode } from '@/shared/i18n/app-dictionary'

type RetailSalesComparisonChartProps = {
  currentLabel: string
  currentReport: SalesReport
  emptyDescription: string
  emptyTitle: string
  languageCode: AppLanguageCode
  previousLabel: string
  previousReport: SalesReport
}

type SalesComparisonPoint = {
  label: string
  currentRevenue: number
  previousRevenue: number
}

function buildHourLabel(hour: number, languageCode: AppLanguageCode) {
  const locale = languageCode === 'en' ? 'en-US' : 'es-CO'
  const startDate = new Date(2026, 0, 1, hour)
  const endDate = new Date(2026, 0, 1, hour + 2)
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`
}

function getPointHour(point: SalesReportDetailPoint) {
  return new Date(point.bucketStart).getHours()
}

function sumRevenueByHourBlock(
  detail: SalesReportDetailPoint[],
  blockStartHour: number,
) {
  return detail.reduce((total, point) => {
    const pointHour = getPointHour(point)

    if (pointHour >= blockStartHour && pointHour < blockStartHour + 2) {
      return total + point.revenue
    }

    return total
  }, 0)
}

function buildHourlyChartData({
  currentReport,
  languageCode,
  previousReport,
}: Pick<
  RetailSalesComparisonChartProps,
  'currentReport' | 'languageCode' | 'previousReport'
>): SalesComparisonPoint[] {
  return Array.from({ length: 12 }, (_, index) => {
    const hour = index * 2

    return {
      label: buildHourLabel(hour, languageCode),
      currentRevenue: sumRevenueByHourBlock(currentReport.detail, hour),
      previousRevenue: sumRevenueByHourBlock(previousReport.detail, hour),
    }
  })
}

function buildDailyChartData({
  currentReport,
  languageCode,
  previousReport,
}: Pick<
  RetailSalesComparisonChartProps,
  'currentReport' | 'languageCode' | 'previousReport'
>): SalesComparisonPoint[] {
  const maxLength = Math.max(
    currentReport.detail.length,
    previousReport.detail.length,
  )

  return Array.from({ length: maxLength }, (_, index) => {
    const currentPoint = currentReport.detail[index]
    const previousPoint = previousReport.detail[index]
    const bucketStart =
      currentPoint?.bucketStart ?? previousPoint?.bucketStart ?? ''

    return {
      label: bucketStart
        ? formatReportBucketLabel(bucketStart, 'DAY', languageCode)
        : `${index + 1}`,
      currentRevenue: currentPoint?.revenue ?? 0,
      previousRevenue: previousPoint?.revenue ?? 0,
    }
  })
}

export function RetailSalesComparisonChart({
  currentLabel,
  currentReport,
  emptyDescription,
  emptyTitle,
  languageCode,
  previousLabel,
  previousReport,
}: RetailSalesComparisonChartProps) {
  const chartData =
    currentReport.detailGranularity === 'HOUR'
      ? buildHourlyChartData({
          currentReport,
          languageCode,
          previousReport,
        })
      : buildDailyChartData({
          currentReport,
          languageCode,
          previousReport,
        })

  if (
    chartData.length === 0 ||
    chartData.every(
      (item) => item.currentRevenue <= 0 && item.previousRevenue <= 0,
    )
  ) {
    return (
      <ChartPlaceholderState
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <ResponsiveContainer height={360} width="100%">
      <BarChart data={chartData} margin={{ top: 24, right: 28, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
        <YAxis
          axisLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={(value) =>
            formatReportCurrency(Number(value), languageCode)
          }
          tickLine={false}
          width={92}
        />
        <XAxis
          axisLine={false}
          dataKey="label"
          interval={0}
          tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
          tickLine={false}
        />
        <Tooltip
          formatter={(value, name) => [
            formatReportCurrency(Number(value), languageCode),
            name === 'currentRevenue' ? currentLabel : previousLabel,
          ]}
          labelStyle={{ color: '#0f172a', fontWeight: 800 }}
          contentStyle={{
            border: '1px solid rgba(148, 163, 184, 0.24)',
            borderRadius: 14,
            boxShadow: '0 16px 32px rgba(15, 23, 42, 0.14)',
          }}
        />
        <Legend
          align="center"
          iconType="square"
          verticalAlign="top"
          wrapperStyle={{ color: '#475569', fontWeight: 800, paddingBottom: 16 }}
        />
        <Bar
          barSize={22}
          dataKey="previousRevenue"
          fill="#dff8ef"
          name={previousLabel}
          radius={[8, 8, 0, 0]}
        />
        <Bar
          barSize={22}
          dataKey="currentRevenue"
          fill="#11a875"
          name={currentLabel}
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
