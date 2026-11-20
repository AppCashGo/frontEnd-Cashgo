import type { CreateSaleInput } from '@/modules/sales/types/sale'

export type OfflineSaleStatus = 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED'

export type OfflineSaleRecord = {
  id: string
  businessId: string
  userId: string
  input: CreateSaleInput
  createdAt: string
  updatedAt: string
  total: number
  itemCount: number
  status: OfflineSaleStatus
  attemptCount: number
  lastError: string | null
  syncedAt: string | null
  saleId: string | null
  saleNumber: string | null
}

export type QueueOfflineSaleInput = {
  businessId: string
  userId: string
  input: CreateSaleInput & { idempotencyKey: string }
  total: number
  itemCount: number
}
