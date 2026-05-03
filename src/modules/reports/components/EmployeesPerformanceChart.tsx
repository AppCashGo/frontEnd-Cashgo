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
import type { EmployeesReport } from '@/modules/reports/types/report'
import { formatReportCurrency } from '@/modules/reports/utils/format-report'
import type { AppLanguageCode } from '@/shared/i18n/app-dictionary'

const EMPLOYEE_COLORS = ['#1f9d63', '#35b37a', '#7ad7af', '#bbeed8']

type EmployeesPerformanceChartProps = {
  report: EmployeesReport
  languageCode: AppLanguageCode
}

export function EmployeesPerformanceChart({
  report,
  languageCode,
}: EmployeesPerformanceChartProps) {
  const chartData = report.employees.map((employee) => ({
    label: employee.name,
    totalSales: employee.totalSales,
  }))

  if (chartData.length === 0 || chartData.every((item) => item.totalSales <= 0)) {
    return (
      <ChartPlaceholderState
        title={
          languageCode === 'en'
            ? 'No employee activity yet'
            : 'Todavía no hay actividad del equipo'
        }
        description={
          languageCode === 'en'
            ? 'Team performance will appear here once employees register sales or expenses.'
            : 'Aquí aparecerá el rendimiento del equipo cuando los empleados registren ventas o gastos.'
        }
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
          formatter={(value) => [
            formatReportCurrency(Number(value), languageCode),
            languageCode === 'en' ? 'Sales' : 'Ventas',
          ]}
          labelStyle={{ color: '#0f172a', fontWeight: 700 }}
          contentStyle={{
            borderRadius: 14,
            border: '1px solid rgba(148, 163, 184, 0.24)',
            boxShadow: '0 16px 32px rgba(15, 23, 42, 0.14)',
          }}
        />
        <Bar
          barSize={28}
          dataKey="totalSales"
          name={languageCode === 'en' ? 'Sales' : 'Ventas'}
          radius={[10, 10, 0, 0]}
        >
          {chartData.map((item, index) => (
            <Cell
              key={`${item.label}-sales`}
              fill={EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
