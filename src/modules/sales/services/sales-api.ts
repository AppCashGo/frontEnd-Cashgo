import type {
  CancelSaleInput,
  CreateSaleInput,
  SaleReturnInput,
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
