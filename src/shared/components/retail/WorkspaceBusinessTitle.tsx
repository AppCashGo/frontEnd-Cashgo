import type { ReactNode } from 'react'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { getActiveBusiness } from '@/modules/auth/utils/get-active-business'
import { SalesBusinessMark } from '@/modules/sales/components/SalesVisuals'
import styles from './WorkspaceVisual.module.css'

export function WorkspaceBusinessTitle({ children }: { children: ReactNode }) {
  const user = useAuthSessionStore((state) => state.user)
  const business = getActiveBusiness(user)

  return (
    <span className={styles.businessTitle}>
      <span aria-hidden="true">
        <SalesBusinessMark logoUrl={business?.logoUrl ?? user?.logoUrl} />
      </span>
      <span>{children}</span>
    </span>
  )
}
