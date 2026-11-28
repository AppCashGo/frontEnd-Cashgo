import { useState } from 'react'
import { createPortal } from 'react-dom'
import { getActiveBusiness } from '@/modules/auth/utils/get-active-business'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import cashgoSymbolUrl from '@/shared/assets/brand/cashgo-symbol.svg'
import { resolveApiAssetUrl } from '@/shared/services/api-client'
import styles from './PageLoadingState.module.css'

type PageLoadingStateProps = {
  title?: string
  description?: string
  brand?: 'cashgo' | 'business'
  layout?: 'screen' | 'workspace' | 'inline' | 'overlay'
}

export function PageLoadingState({
  brand = 'cashgo',
  description,
  layout = 'screen',
  title = 'Cargando…',
}: PageLoadingStateProps) {
  const user = useAuthSessionStore((state) => brand === 'business' ? state.user : null)
  const business = getActiveBusiness(user)
  const businessLogoUrl = resolveApiAssetUrl(business ? business.logoUrl : user?.logoUrl)
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null)
  const useBusinessLogo = Boolean(businessLogoUrl && businessLogoUrl !== failedLogoUrl)

  const loader = (
    <div className={styles.state} data-layout={layout} role="status">
      <div className={styles.content}>
        <div className={styles.mark} data-business={useBusinessLogo || undefined}>
          <img
            alt={useBusinessLogo ? (business?.businessName ?? user?.businessName ?? 'Logo del negocio') : 'CashGo'}
            onError={useBusinessLogo ? () => setFailedLogoUrl(businessLogoUrl) : undefined}
            src={useBusinessLogo ? businessLogoUrl ?? cashgoSymbolUrl : cashgoSymbolUrl}
          />
        </div>
        <p className={styles.title}>{title}</p>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
    </div>
  )

  return layout === 'overlay' ? createPortal(loader, document.body) : loader
}
