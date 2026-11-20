import { ApiError } from '@/shared/services/api-client'
import { createSale } from '@/modules/sales/services/sales-api'
import type {
  OfflineSaleRecord,
  QueueOfflineSaleInput,
} from '@/modules/sales/types/offline-sale'

const DATABASE_NAME = 'cashgo-offline-sales'
const DATABASE_VERSION = 1
const STORE_NAME = 'sales'
const CHANGE_EVENT = 'cashgo:offline-sales-change'
const SYNCED_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000

let databasePromise: Promise<IDBDatabase> | null = null
const activeBusinessSyncs = new Map<string, Promise<OfflineSalesSyncResult>>()

export type OfflineSalesSyncResult = {
  synced: number
  failed: number
  pending: number
}

function openDatabase() {
  if (databasePromise) return databasePromise

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('businessId', 'businessId', { unique: false })
        store.createIndex('status', 'status', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir la cola local.'))
  })

  return databasePromise
}

function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Falló el almacenamiento local.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Se canceló el almacenamiento local.'))
  })
}

function notifyQueueChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

async function putRecord(record: OfflineSaleRecord) {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  transaction.objectStore(STORE_NAME).put(record)
  await waitForTransaction(transaction)
  notifyQueueChange()
  return record
}

async function deleteRecords(ids: string[]) {
  if (ids.length === 0) return
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  ids.forEach((id) => store.delete(id))
  await waitForTransaction(transaction)
}

export function subscribeToOfflineSales(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener)
  return () => window.removeEventListener(CHANGE_EVENT, listener)
}

export async function getOfflineSales(businessId: string, userId?: string) {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readonly')
  const request = transaction.objectStore(STORE_NAME).index('businessId').getAll(businessId)
  const records = await new Promise<OfflineSaleRecord[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as OfflineSaleRecord[])
    request.onerror = () => reject(request.error ?? new Error('No se pudo leer la cola local.'))
  })

  return records
    .filter((record) => !userId || record.userId === userId)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
}

export async function queueOfflineSale(input: QueueOfflineSaleInput) {
  const now = new Date().toISOString()
  const record: OfflineSaleRecord = {
    id: input.input.idempotencyKey,
    businessId: input.businessId,
    userId: input.userId,
    input: input.input,
    createdAt: now,
    updatedAt: now,
    total: input.total,
    itemCount: input.itemCount,
    status: 'PENDING',
    attemptCount: 0,
    lastError: null,
    syncedAt: null,
    saleId: null,
    saleNumber: null,
  }

  return putRecord(record)
}

export async function retryOfflineSale(id: string) {
  const record = await getOfflineSaleById(id)
  if (!record || record.status === 'SYNCED') return record

  return putRecord({
    ...record,
    status: 'PENDING',
    lastError: null,
    updatedAt: new Date().toISOString(),
  })
}

async function getOfflineSaleById(id: string) {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readonly')
  const request = transaction.objectStore(STORE_NAME).get(id)

  return new Promise<OfflineSaleRecord | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as OfflineSaleRecord | undefined)
    request.onerror = () => reject(request.error ?? new Error('No se pudo leer la venta local.'))
  })
}

async function runBusinessSync(
  businessId: string,
  userId: string,
): Promise<OfflineSalesSyncResult> {
  if (!navigator.onLine) return { synced: 0, failed: 0, pending: 0 }

  const records = await getOfflineSales(businessId, userId)
  const syncableRecords = records.filter(
    (record) => record.status === 'PENDING' || record.status === 'SYNCING',
  )
  let synced = 0
  let failed = 0
  let pending = 0

  for (const record of syncableRecords) {
    const syncingRecord: OfflineSaleRecord = {
      ...record,
      status: 'SYNCING',
      attemptCount: record.attemptCount + 1,
      updatedAt: new Date().toISOString(),
    }
    await putRecord(syncingRecord)

    try {
      const sale = await createSale(syncingRecord.input)
      const syncedAt = new Date().toISOString()
      await putRecord({
        ...syncingRecord,
        status: 'SYNCED',
        lastError: null,
        syncedAt,
        updatedAt: syncedAt,
        saleId: sale.id,
        saleNumber: sale.saleNumber,
      })
      synced += 1
    } catch (error) {
      const networkError = error instanceof ApiError && error.isNetworkError
      await putRecord({
        ...syncingRecord,
        status: networkError ? 'PENDING' : 'FAILED',
        lastError:
          error instanceof Error
            ? error.message
            : 'No fue posible sincronizar esta venta.',
        updatedAt: new Date().toISOString(),
      })

      if (networkError) {
        pending += 1
        break
      }
      failed += 1
    }
  }

  const expiration = Date.now() - SYNCED_RETENTION_MS
  const expiredIds = (await getOfflineSales(businessId, userId))
    .filter(
      (record) =>
        record.status === 'SYNCED' &&
        record.syncedAt !== null &&
        new Date(record.syncedAt).getTime() < expiration,
    )
    .map((record) => record.id)
  await deleteRecords(expiredIds)
  if (expiredIds.length > 0) notifyQueueChange()

  return { synced, failed, pending }
}

export function syncOfflineSales(businessId: string, userId: string) {
  const syncScope = `${businessId}:${userId}`
  const activeSync = activeBusinessSyncs.get(syncScope)
  if (activeSync) return activeSync

  const sync = runBusinessSync(businessId, userId).finally(() => {
    activeBusinessSyncs.delete(syncScope)
  })
  activeBusinessSyncs.set(syncScope, sync)
  return sync
}
