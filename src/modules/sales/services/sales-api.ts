import type { CancelSaleInput, CreateSaleInput } from '@/modules/sales/types/sale'
import { getBlob, getJson, patchJson, postJson } from '@/shared/services/api-client'
import { getAuthAccessToken } from '@/shared/services/auth-session'
import {
  normalizeSaleRecord,
  type SaleApiRecord,
} from '@/modules/sales/utils/normalize-sale-record'

export async function createSale(input: CreateSaleInput) {
  const sale = await postJson<SaleApiRecord, CreateSaleInput>('/sales', input, {
    accessToken: getAuthAccessToken(),
  })

  return normalizeSaleRecord(sale)
}

export async function getSales() {
  const sales = await getJson<SaleApiRecord[]>('/sales', {
    accessToken: getAuthAccessToken(),
  })

  return sales.map(normalizeSaleRecord)
}

export async function cancelSale(saleId: string, input: CancelSaleInput = {}) {
  const sale = await patchJson<SaleApiRecord, CancelSaleInput>(
    `/sales/${saleId}/cancel`,
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return normalizeSaleRecord(sale)
}

export function downloadSaleReceipt(saleId: string) {
  return getBlob(`/sales/${saleId}/receipt`, {
    accept: 'text/html',
    accessToken: getAuthAccessToken(),
  })
}
