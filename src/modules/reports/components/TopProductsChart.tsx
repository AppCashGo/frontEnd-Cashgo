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
import type { TopProductsReport } from '@/modules/reports/types/report'
import { formatCurrency } from '@/shared/utils/format-currency'

const TOP_PRODUCTS_COLORS = ['#0f766e', '#0ea5a6', '#14b8a6', '#f97316', '#fb923c']

type TopProductsChartProps = {
  report: TopProductsReport
}

export function TopProductsChart({ report }: TopProductsChartProps) {
  const chartData = report.items.slice(0, 5)

  if (chartData.length === 0) {
    return (
      <ChartPlaceholderState
        title="Todavia no hay ranking"
        description="Cuando existan ventas en el periodo seleccionado, este grafico ordenara los productos mas fuertes por cantidad vendida."
      />
    )
  }

  return (
    <ResponsiveContainer height={288} width="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
      >
        <CartesianGrid horizontal={false} stroke="rgba(148, 163, 184, 0.16)" />
        <XAxis hide type="number" />
        <YAxis
          axisLine={false}
          dataKey="name"
          tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
          tickLine={false}
          type="category"
          width={112}
        />
        <Tooltip
          formatter={(value, _name, payload) => [
            `${value} unidad${Number(value) === 1 ? '' : 'es'} • ${formatCurrency(payload.payload.revenue)}`,
            'Cantidad vendida',
          ]}
          labelStyle={{ color: '#0f172a', fontWeight: 700 }}
          contentStyle={{
            borderRadius: 14,
            border: '1px solid rgba(148, 163, 184, 0.24)',
            boxShadow: '0 16px 32px rgba(15, 23, 42, 0.14)',
          }}
        />
        <Bar barSize={24} dataKey="quantitySold" radius={[0, 12, 12, 0]}>
          {chartData.map((item, index) => (
            <Cell key={item.productId} fill={TOP_PRODUCTS_COLORS[index] ?? TOP_PRODUCTS_COLORS[0]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
