import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartPlaceholderState } from '@/modules/reports/components/ChartPlaceholderState'
import type { ExpensesReport } from '@/modules/reports/types/report'
import { formatReportCurrency } from '@/modules/reports/utils/format-report'
import type { AppLanguageCode } from '@/shared/i18n/app-dictionary'

const EXPENSE_COLORS = [
  '#f97316',
  '#fb923c',
  '#f59e0b',
  '#fbbf24',
  '#fdba74',
  '#fed7aa',
]

type ExpensesBreakdownChartProps = {
  report: ExpensesReport
  languageCode: AppLanguageCode
}

export function ExpensesBreakdownChart({
  report,
  languageCode,
}: ExpensesBreakdownChartProps) {
  const chartData = report.categories.map((category) => ({
    label: category.name,
    value: category.total,
    detail:
      languageCode === 'en'
        ? `${category.count} record${category.count === 1 ? '' : 's'}`
        : `${category.count} registro${category.count === 1 ? '' : 's'}`,
  }))

  if (chartData.length === 0 || chartData.every((item) => item.value <= 0)) {
    return (
      <ChartPlaceholderState
        title={
          languageCode === 'en'
            ? 'No expenses in this range'
            : 'No hay gastos en el rango'
        }
        description={
          languageCode === 'en'
            ? 'Expense categories will appear here once the selected period has outflows.'
            : 'Las categorías de gasto aparecerán aquí cuando el periodo seleccionado tenga salidas.'
        }
      />
    )
  }

  return (
    <ResponsiveContainer height={288} width="100%">
      <PieChart>
        <Pie
          cx="50%"
          cy="50%"
          data={chartData}
          dataKey="value"
          innerRadius={72}
          outerRadius={102}
          paddingAngle={4}
          stroke="rgba(255, 255, 255, 0.92)"
          strokeWidth={3}
        >
          {chartData.map((item, index) => (
            <Cell
              key={item.label}
              fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, _name, payload) =>
            `${formatReportCurrency(Number(value), languageCode)} • ${payload.payload.detail}`
          }
          labelFormatter={(label) => label}
          contentStyle={{
            borderRadius: 14,
            border: '1px solid rgba(148, 163, 184, 0.24)',
            boxShadow: '0 16px 32px rgba(15, 23, 42, 0.14)',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
