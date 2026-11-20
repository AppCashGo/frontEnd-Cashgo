import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getOfflineSales,
  retryOfflineSale,
  subscribeToOfflineSales,
  syncOfflineSales,
} from '@/modules/sales/services/offline-sales-queue'
import type { OfflineSaleRecord } from '@/modules/sales/types/offline-sale'

export function useOfflineSales(businessId?: string, userId?: string) {
  const queryClient = useQueryClient()
  const [records, setRecords] = useState<OfflineSaleRecord[]>([])
  const [isLoading, setLoading] = useState(Boolean(businessId))
  const [isSyncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    if (!businessId) {
      setRecords([])
      setLoading(false)
      return
    }

    try {
      setRecords(await getOfflineSales(businessId, userId))
    } finally {
      setLoading(false)
    }
  }, [businessId, userId])

  useEffect(() => {
    void refresh()
    return subscribeToOfflineSales(() => void refresh())
  }, [refresh])

  const synchronize = useCallback(async () => {
    if (!businessId || !userId || !navigator.onLine) return
    setSyncing(true)
    try {
      const result = await syncOfflineSales(businessId, userId)
      if (result.synced > 0) await queryClient.invalidateQueries()
      await refresh()
    } finally {
      setSyncing(false)
    }
  }, [businessId, queryClient, refresh, userId])

  const retry = useCallback(
    async (id: string) => {
      await retryOfflineSale(id)
      await synchronize()
    },
    [synchronize],
  )

  return { records, isLoading, isSyncing, refresh, retry, synchronize }
}
