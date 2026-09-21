import type {
  HeldSale,
  SaveHeldSaleInput,
} from '@/modules/sales/types/held-sale'
import { getJson, patchJson, postJson } from '@/shared/services/api-client'
import { getAuthAccessToken } from '@/shared/services/auth-session'
import { normalizeNumber } from '@/shared/utils/normalize-number'

type HeldSaleApiRecord = Omit<
  HeldSale,
  'id' | 'subtotal' | 'discountTotal' | 'total' | 'customer' | 'createdByUser' | 'items'
> & {
  id: string | number
  subtotal: string | number
  discountTotal: string | number
  total: string | number
  customer: ({ id: string | number } & NonNullable<HeldSale['customer']>) | null
  createdByUser: ({ id: string | number } & NonNullable<HeldSale['createdByUser']>) | null
  items: Array<
    Omit<HeldSale['items'][number], 'id' | 'productId' | 'unitPrice' | 'taxRate' | 'discount' | 'subtotal' | 'total'> & {
      id: string | number
      productId: string | number
      unitPrice: string | number
      taxRate: string | number
      discount: string | number
      subtotal: string | number
      total: string | number
    }
  >
}

function normalizeHeldSale(record: HeldSaleApiRecord): HeldSale {
  return {
    ...record,
    id: String(record.id),
    code: record.code ?? `ESP-${record.id}`,
    subtotal: normalizeNumber(record.subtotal),
    discountTotal: normalizeNumber(record.discountTotal),
    total: normalizeNumber(record.total),
    customer: record.customer ? { ...record.customer, id: String(record.customer.id) } : null,
    createdByUser: record.createdByUser
      ? { ...record.createdByUser, id: String(record.createdByUser.id) }
      : null,
    items: record.items.map((item) => ({
      ...item,
      id: String(item.id),
      productId: String(item.productId),
      unitPrice: normalizeNumber(item.unitPrice),
      taxRate: normalizeNumber(item.taxRate),
      discount: normalizeNumber(item.discount),
      subtotal: normalizeNumber(item.subtotal),
      total: normalizeNumber(item.total),
    })),
  }
}

function serializeInput(input: SaveHeldSaleInput) {
  return {
    ...input,
    customerId: input.customerId ? Number(input.customerId) : undefined,
    items: input.items.map((item) => ({
      ...item,
      productId: Number(item.productId),
    })),
  }
}

export async function getHeldSales() {
  const records = await getJson<HeldSaleApiRecord[]>('/held-sales', {
    accessToken: getAuthAccessToken(),
  })
  return records.map(normalizeHeldSale)
}

export async function createHeldSale(input: SaveHeldSaleInput) {
  const record = await postJson<HeldSaleApiRecord, ReturnType<typeof serializeInput>>(
    '/held-sales',
    serializeInput(input),
    { accessToken: getAuthAccessToken() },
  )
  return normalizeHeldSale(record)
}

export async function updateHeldSale(id: string, input: SaveHeldSaleInput) {
  const record = await patchJson<HeldSaleApiRecord, ReturnType<typeof serializeInput>>(
    `/held-sales/${id}`,
    serializeInput(input),
    { accessToken: getAuthAccessToken() },
  )
  return normalizeHeldSale(record)
}

export async function cancelHeldSale(id: string) {
  const record = await postJson<HeldSaleApiRecord, Record<string, never>>(
    `/held-sales/${id}/cancel`,
    {},
    { accessToken: getAuthAccessToken() },
  )
  return normalizeHeldSale(record)
}
