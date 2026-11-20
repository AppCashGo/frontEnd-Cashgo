import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { syncOfflineSales } from '@/modules/sales/services/offline-sales-queue'

const SYNC_INTERVAL_MS = 30_000

export function OfflineSalesSyncManager() {
  const businessId = useAuthSessionStore((state) => state.user?.businessId)
  const userId = useAuthSessionStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const businessIdRef = useRef(businessId)
  const userIdRef = useRef(userId)

  useEffect(() => {
    businessIdRef.current = businessId
    userIdRef.current = userId
  }, [businessId, userId])

  useEffect(() => {
    async function synchronize() {
      const currentBusinessId = businessIdRef.current
      const currentUserId = userIdRef.current
      if (!currentBusinessId || !currentUserId || !navigator.onLine) return

      const result = await syncOfflineSales(currentBusinessId, currentUserId)
      if (result.synced > 0) {
        await queryClient.invalidateQueries()
      }
    }

    const handleOnline = () => void synchronize()
    window.addEventListener('online', handleOnline)
    const intervalId = window.setInterval(() => void synchronize(), SYNC_INTERVAL_MS)
    void synchronize()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.clearInterval(intervalId)
    }
  }, [queryClient])

  return null
}
