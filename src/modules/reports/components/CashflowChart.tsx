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
import type { CashflowReport } from '@/modules/reports/types/report'
import { formatCurrency } from '@/shared/utils/format-currency'

type CashflowChartProps = {
  report: CashflowReport
}

export function CashflowChart({ report }: CashflowChartProps) {
  const chartData = [
    {
      label: 'Ventas',
      value: report.salesRevenue,
      color: '#0f766e',
      formattedValue: formatCurrency(report.salesRevenue),
    },
    {
      label: 'Ingresos manuales',
      value: report.manualIncomeTotal,
      color: '#14b8a6',
      formattedValue: formatCurrency(report.manualIncomeTotal),
    },
    {
      label: 'Gastos manuales',
      value: report.manualExpenseTotal * -1,
      color: '#f97316',
      formattedValue: formatCurrency(report.manualExpenseTotal),
    },
    {
      label: 'Compras proveedor',
      value: report.supplierPurchasesTotal * -1,
      color: '#fb923c',
      formattedValue: formatCurrency(report.supplierPurchasesTotal),
    },
    {
      label: 'Flujo neto',
      value: report.netCashflow,
      color: report.netCashflow >= 0 ? '#0f766e' : '#dc2626',
      formattedValue: formatCurrency(report.netCashflow),
    },
  ]

  if (chartData.every((item) => item.value === 0)) {
    return (
      <ChartPlaceholderState
        title="Aqui aparecera el flujo de caja"
        description="En cuanto el periodo seleccionado registre entradas o salidas, este grafico mostrara por donde se mueve el dinero."
      />
    )
  }

  return (
    <ResponsiveContainer height={288} width="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={(value) => formatCurrency(Number(value))}
          tickLine={false}
          width={84}
        />
        <Tooltip
          formatter={(_value, _name, payload) => payload.payload.formattedValue}
          labelStyle={{ color: '#0f172a', fontWeight: 700 }}
          contentStyle={{
            borderRadius: 14,
            border: '1px solid rgba(148, 163, 184, 0.24)',
            boxShadow: '0 16px 32px rgba(15, 23, 42, 0.14)',
          }}
        />
        <Bar barSize={34} dataKey="value" radius={[12, 12, 0, 0]}>
          {chartData.map((item) => (
            <Cell key={item.label} fill={item.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
