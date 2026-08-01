import type {
  CreateDeliveryOrderInput,
  DeliveryOrder,
  RestaurantOrderItem,
  RestaurantTable,
  RestaurantTableOrder,
  RestaurantTableOrderInput,
  RestaurantWorkspaceState,
  RestaurantZone,
  UpdateDeliveryOrderInput,
} from '@/modules/restaurant/types/restaurant'
import type { SalePaymentMethod } from '@/modules/sales/types/sale'
import {
  deleteJson,
  getJson,
  patchJson,
  postJson,
  putJson,
} from '@/shared/services/api-client'
import { getAuthAccessToken } from '@/shared/services/auth-session'

type RestaurantZoneApiRecord = Omit<RestaurantZone, 'id'> & {
  id: number | string
}

type RestaurantTableApiRecord = Omit<RestaurantTable, 'id' | 'zoneId'> & {
  id: number | string
  zoneId: number | string
}

type RestaurantTableOrderApiRecord = Omit<
  RestaurantTableOrder,
  'tableId' | 'employeeId'
> & {
  id: number | string
  businessId: number | string
  tableId: number | string
  employeeId?: string | null
}

type DeliveryOrderApiRecord = Omit<DeliveryOrder, 'id' | 'customerId'> & {
  id: number | string
  businessId: number | string
  customerId?: number | string | null
}

type RestaurantWorkspaceApiRecord = {
  zones: RestaurantZoneApiRecord[]
  tables: RestaurantTableApiRecord[]
  orders: RestaurantTableOrderApiRecord[]
}

export type RestaurantZoneInput = {
  name: string
  sortOrder?: number
}

export type RestaurantTableInput = {
  zoneId: string
  name: string
  sortOrder?: number
}

type RestaurantTableApiInput = Omit<RestaurantTableInput, 'zoneId'> & {
  zoneId: number
}

type RestaurantTableOrderApiInput = {
  employeeId: string | null
  employeeName: string
  guestCount: number
  comment: string
  items: RestaurantOrderItem[]
  openedAt: string
}

type CreateDeliveryOrderApiInput = Omit<
  CreateDeliveryOrderInput,
  'customerId'
> & {
  customerId: number | null
}

type UpdateDeliveryOrderApiInput = Omit<UpdateDeliveryOrderInput, 'customerId'> & {
  customerId?: number | null
}

function normalizeZone(record: RestaurantZoneApiRecord): RestaurantZone {
  return {
    id: String(record.id),
    name: record.name,
    sortOrder: record.sortOrder,
  }
}

function normalizeTable(record: RestaurantTableApiRecord): RestaurantTable {
  return {
    id: String(record.id),
    zoneId: String(record.zoneId),
    name: record.name,
    sortOrder: record.sortOrder,
  }
}

function normalizeTableOrder(
  record: RestaurantTableOrderApiRecord,
): RestaurantTableOrder {
  return {
    tableId: String(record.tableId),
    status: 'OPEN',
    employeeId: record.employeeId ?? '',
    employeeName: record.employeeName,
    guestCount: record.guestCount,
    comment: record.comment,
    items: record.items,
    openedAt: record.openedAt,
    updatedAt: record.updatedAt,
  }
}

function normalizeDeliveryOrder(record: DeliveryOrderApiRecord): DeliveryOrder {
  return {
    id: String(record.id),
    status: record.status,
    source: record.source,
    customerId: record.customerId ? String(record.customerId) : '',
    customerName: record.customerName,
    phone: record.phone,
    address: record.address,
    paymentMethod: record.paymentMethod as SalePaymentMethod,
    deliveryFee: Number(record.deliveryFee),
    discountAmount: Number(record.discountAmount),
    tipAmount: Number(record.tipAmount),
    notes: record.notes,
    items: record.items,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function normalizeWorkspace(
  record: RestaurantWorkspaceApiRecord,
): RestaurantWorkspaceState {
  return {
    zones: record.zones.map(normalizeZone),
    tables: record.tables.map(normalizeTable),
    orders: Object.fromEntries(
      record.orders.map((order) => {
        const normalizedOrder = normalizeTableOrder(order)

        return [normalizedOrder.tableId, normalizedOrder]
      }),
    ),
  }
}

function toNumericId(value: string) {
  const numericId = Number(value)

  if (!Number.isFinite(numericId)) {
    throw new Error('El identificador enviado no es valido.')
  }

  return numericId
}

function toOptionalNumericId(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const numericId = Number(value)

  return Number.isFinite(numericId) ? numericId : null
}

function toTableOrderPayload(
  input: RestaurantTableOrderInput,
): RestaurantTableOrderApiInput {
  return {
    employeeId: input.employeeId.trim() || null,
    employeeName: input.employeeName,
    guestCount: input.guestCount,
    comment: input.comment,
    items: input.items,
    openedAt: input.openedAt,
  }
}

export async function getRestaurantWorkspace() {
  const workspace = await getJson<RestaurantWorkspaceApiRecord>(
    '/restaurant/workspace',
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return normalizeWorkspace(workspace)
}

export async function createRestaurantZone(input: RestaurantZoneInput) {
  const zone = await postJson<RestaurantZoneApiRecord, RestaurantZoneInput>(
    '/restaurant/zones',
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return normalizeZone(zone)
}

export async function updateRestaurantZone(
  zoneId: string,
  input: Partial<RestaurantZoneInput>,
) {
  const zone = await patchJson<RestaurantZoneApiRecord, Partial<RestaurantZoneInput>>(
    `/restaurant/zones/${zoneId}`,
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return normalizeZone(zone)
}

export async function deleteRestaurantZone(zoneId: string) {
  const zone = await deleteJson<RestaurantZoneApiRecord>(
    `/restaurant/zones/${zoneId}`,
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return normalizeZone(zone)
}

export async function createRestaurantTable(input: RestaurantTableInput) {
  const table = await postJson<RestaurantTableApiRecord, RestaurantTableApiInput>(
    '/restaurant/tables',
    {
      ...input,
      zoneId: toNumericId(input.zoneId),
    },
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return normalizeTable(table)
}

export async function updateRestaurantTable(
  tableId: string,
  input: Partial<RestaurantTableInput>,
) {
  const payload = {
    ...input,
    ...(input.zoneId !== undefined
      ? {
          zoneId: toNumericId(input.zoneId),
        }
      : {}),
  }
  const table = await patchJson<RestaurantTableApiRecord, typeof payload>(
    `/restaurant/tables/${tableId}`,
    payload,
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return normalizeTable(table)
}

export async function deleteRestaurantTable(tableId: string) {
  const table = await deleteJson<RestaurantTableApiRecord>(
    `/restaurant/tables/${tableId}`,
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return normalizeTable(table)
}

export async function upsertRestaurantTableOrder(
  input: RestaurantTableOrderInput,
) {
  const order = await putJson<
    RestaurantTableOrderApiRecord,
    RestaurantTableOrderApiInput
  >(`/restaurant/table-orders/${input.tableId}`, toTableOrderPayload(input), {
    accessToken: getAuthAccessToken(),
  })

  return normalizeTableOrder(order)
}

export async function moveRestaurantTableOrder(input: {
  tableId: string
  targetTableId: string
}) {
  const order = await patchJson<
    RestaurantTableOrderApiRecord,
    { targetTableId: number }
  >(
    `/restaurant/table-orders/${input.tableId}/move`,
    {
      targetTableId: toNumericId(input.targetTableId),
    },
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return normalizeTableOrder(order)
}

export function deleteRestaurantTableOrder(tableId: string) {
  return deleteJson<void>(`/restaurant/table-orders/${tableId}`, {
    accessToken: getAuthAccessToken(),
  })
}

export async function getDeliveryOrders() {
  const orders = await getJson<DeliveryOrderApiRecord[]>(
    '/restaurant/delivery-orders',
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return orders.map(normalizeDeliveryOrder)
}

export async function createDeliveryOrder(input: CreateDeliveryOrderInput) {
  const order = await postJson<DeliveryOrderApiRecord, CreateDeliveryOrderApiInput>(
    '/restaurant/delivery-orders',
    {
      ...input,
      customerId: toOptionalNumericId(input.customerId),
    },
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return normalizeDeliveryOrder(order)
}

export async function updateDeliveryOrder(
  orderId: string,
  input: UpdateDeliveryOrderInput,
) {
  const { customerId, ...restInput } = input
  const payload: UpdateDeliveryOrderApiInput = {
    ...restInput,
    ...(customerId !== undefined
      ? {
          customerId: toOptionalNumericId(customerId),
        }
      : {}),
  }
  const order = await patchJson<DeliveryOrderApiRecord, UpdateDeliveryOrderApiInput>(
    `/restaurant/delivery-orders/${orderId}`,
    payload,
    {
      accessToken: getAuthAccessToken(),
    },
  )

  return normalizeDeliveryOrder(order)
}

export function deleteDeliveryOrder(orderId: string) {
  return deleteJson<void>(`/restaurant/delivery-orders/${orderId}`, {
    accessToken: getAuthAccessToken(),
  })
}
