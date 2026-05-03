import type {
  RestaurantTable,
  RestaurantWorkspaceState,
  RestaurantZone,
} from '@/modules/restaurant/types/restaurant'
import { deleteJson, getJson, patchJson, postJson } from '@/shared/services/api-client'
import { getAuthAccessToken } from '@/shared/services/auth-session'

type RestaurantZoneApiRecord = Omit<RestaurantZone, 'id'> & {
  id: number | string
}

type RestaurantTableApiRecord = Omit<RestaurantTable, 'id' | 'zoneId'> & {
  id: number | string
  zoneId: number | string
}

type RestaurantWorkspaceApiRecord = {
  zones: RestaurantZoneApiRecord[]
  tables: RestaurantTableApiRecord[]
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

function toNumericId(value: string) {
  const numericId = Number(value)

  if (!Number.isFinite(numericId)) {
    throw new Error('El identificador enviado no es valido.')
  }

  return numericId
}

function normalizeWorkspace(
  record: RestaurantWorkspaceApiRecord,
): Pick<RestaurantWorkspaceState, 'zones' | 'tables'> {
  return {
    zones: record.zones.map(normalizeZone),
    tables: record.tables.map(normalizeTable),
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
