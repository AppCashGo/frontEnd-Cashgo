import type { DashboardSummary } from '@/modules/dashboard/types/dashboard-summary'
import { getJson } from '@/shared/services/api-client'
import { getAuthAccessToken } from '@/shared/services/auth-session'
import { normalizeNumber } from '@/shared/utils/normalize-number'

type DashboardSummaryApiRecord = Omit<DashboardSummary, 'totalRevenue'> & {
  totalRevenue: number | string
}

const emptyQaEvidence: DashboardSummary['qaEvidence'] = {
  latestRunLabel: null,
  totalRecords: 0,
  counts: {
    users: 0,
    customers: 0,
    suppliers: 0,
    productCategories: 0,
    products: 0,
    inventoryMovements: 0,
    cashRegisterMovements: 0,
    sales: 0,
    salePayments: 0,
    accountReceivables: 0,
    accountReceivablePayments: 0,
    expenseCategories: 0,
    expenses: 0,
    quotations: 0,
    invoices: 0,
  },
}

export async function getDashboardSummary() {
  const summary = await getJson<DashboardSummaryApiRecord>('/dashboard/summary', {
    accessToken: getAuthAccessToken(),
  })

  return {
    ...summary,
    totalRevenue: normalizeNumber(summary.totalRevenue),
    qaEvidence: summary.qaEvidence ?? emptyQaEvidence,
  }
}
