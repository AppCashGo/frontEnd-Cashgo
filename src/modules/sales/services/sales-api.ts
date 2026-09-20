import type {
  CancelSaleInput,
  CreateSaleInput,
  SaleReturnInput,
  SalesHistoryFilters,
  SalesHistoryResponse,
} from '@/modules/sales/types/sale'
import {
  getBlob,
  getJson,
  patchJson,
  postJson,
} from '@/shared/services/api-client'
import { getAuthAccessToken } from '@/shared/services/auth-session'
import {
  normalizeSaleRecord,
  type SaleApiRecord,
} from '@/modules/sales/utils/normalize-sale-record'
import { normalizeNumber } from '@/shared/utils/normalize-number'

const pendingSaleRequests = new Map<
  string,
  Promise<ReturnType<typeof normalizeSaleRecord>>
>()

function createIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function createSale(input: CreateSaleInput) {
  const accessToken = getAuthAccessToken()
  const requestSignature = `${accessToken ?? 'anonymous'}:${JSON.stringify(input)}`
  const pendingRequest = pendingSaleRequests.get(requestSignature)

  if (pendingRequest) {
    return pendingRequest
  }

  const requestInput = {
    ...input,
    idempotencyKey: input.idempotencyKey ?? createIdempotencyKey(),
  }
  const request = postJson<SaleApiRecord, CreateSaleInput>(
    '/sales',
    requestInput,
    { accessToken },
  ).then(normalizeSaleRecord)

  pendingSaleRequests.set(requestSignature, request)
  void request.then(
    () => {
      globalThis.setTimeout(() => {
        if (pendingSaleRequests.get(requestSignature) === request) {
          pendingSaleRequests.delete(requestSignature)
        }
      }, 5_000)
    },
    () => pendingSaleRequests.delete(requestSignature),
  )

  return request
}

export async function getSales() {
  const sales = await getJson<SaleApiRecord[]>('/sales', {
    accessToken: getAuthAccessToken(),
  })

  return sales.map(normalizeSaleRecord)
}

export async function getSale(saleId: string) {
  const sale = await getJson<SaleApiRecord>(`/sales/${saleId}`, {
    accessToken: getAuthAccessToken(),
  })

  return normalizeSaleRecord(sale)
}

type SalesHistoryApiResponse = Omit<SalesHistoryResponse, 'items' | 'facets'> & {
  summary: {
    salesTotal: number | string
    salesCount: number | string
    collectedTotal: number | string
    outstandingTotal: number | string
    paymentMethods: Array<{ method: SalesHistoryResponse['summary']['paymentMethods'][number]['method']; amount: number | string }>
  }
  items: Array<
    Omit<SalesHistoryResponse['items'][number], 'id' | 'total' | 'collectedAmount' | 'balance' | 'customer' | 'seller' | 'invoice'> & {
      id: string | number
      total: number | string
      collectedAmount: number | string
      balance: number | string
      customer: ({ id: string | number } & NonNullable<SalesHistoryResponse['items'][number]['customer']>) | null
      seller: ({ id: string | number } & NonNullable<SalesHistoryResponse['items'][number]['seller']>) | null
      invoice: ({ id: string | number } & NonNullable<SalesHistoryResponse['items'][number]['invoice']>) | null
    }
  >
  facets: {
    sellers: Array<{ id: string | number; name: string }>
  }
}

export async function getSalesHistory(filters: SalesHistoryFilters) {
  const searchParams = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') searchParams.set(key, String(value))
  })
  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  const response = await getJson<SalesHistoryApiResponse>(
    `/sales/history${suffix}`,
    { accessToken: getAuthAccessToken() },
  )

  return {
    ...response,
    summary: {
      ...response.summary,
      salesTotal: normalizeNumber(response.summary.salesTotal),
      salesCount: normalizeNumber(response.summary.salesCount),
      collectedTotal: normalizeNumber(response.summary.collectedTotal),
      outstandingTotal: normalizeNumber(response.summary.outstandingTotal),
      paymentMethods: response.summary.paymentMethods.map((item) => ({
        ...item,
        amount: normalizeNumber(item.amount),
      })),
    },
    items: response.items.map((item) => ({
      ...item,
      id: String(item.id),
      total: normalizeNumber(item.total),
      collectedAmount: normalizeNumber(item.collectedAmount),
      balance: normalizeNumber(item.balance),
      customer: item.customer ? { ...item.customer, id: String(item.customer.id) } : null,
      seller: item.seller ? { ...item.seller, id: String(item.seller.id) } : null,
      invoice: item.invoice ? { ...item.invoice, id: String(item.invoice.id) } : null,
    })),
    facets: {
      sellers: response.facets.sellers.map((seller) => ({
        ...seller,
        id: String(seller.id),
      })),
    },
  } satisfies SalesHistoryResponse
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
    accept: 'application/pdf',
    accessToken: getAuthAccessToken(),
  })
}

export async function createSaleReturn(saleId: string, input: SaleReturnInput) {
  const sale = await postJson<SaleApiRecord, SaleReturnInput>(
    `/sales/${saleId}/returns`,
    input,
    { accessToken: getAuthAccessToken() },
  )

  return normalizeSaleRecord(sale)
}

export function downloadSaleReturnCreditNote(saleId: string, returnId: string) {
  return getBlob(`/sales/${saleId}/returns/${returnId}/credit-note`, {
    accept: 'text/html',
    accessToken: getAuthAccessToken(),
  })
}
