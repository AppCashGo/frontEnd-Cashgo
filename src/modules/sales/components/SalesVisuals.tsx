import { useState } from 'react'
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  HandCoins,
  Landmark,
  Package,
  Smartphone,
  WalletCards,
} from 'lucide-react'
import type { SalePaymentMethod } from '@/modules/sales/types/sale'
import { BrandLogo } from '@/shared/components/brand/BrandLogo'
import { resolveApiAssetUrl } from '@/shared/services/api-client'
import styles from './SalesVisuals.module.css'

const paymentIcons = {
  CASH: Banknote,
  CARD: CreditCard,
  DIGITAL_WALLET: Smartphone,
  TRANSFER: ArrowLeftRight,
  BANK_DEPOSIT: Landmark,
  OTHER: WalletCards,
  CREDIT: HandCoins,
} satisfies Record<SalePaymentMethod, typeof Banknote>

export function SalesPaymentIcon({ method }: { method: SalePaymentMethod }) {
  const Icon = paymentIcons[method]
  return (
    <span
      className={styles.paymentIcon}
      data-method={method}
      aria-hidden="true"
    >
      <Icon />
    </span>
  )
}

export function SalesBusinessMark({ logoUrl }: { logoUrl?: string | null }) {
  const src = resolveApiAssetUrl(logoUrl)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  return src && src !== failedSrc ? (
    <img
      alt=""
      className={styles.businessMark}
      src={src}
      onError={() => setFailedSrc(src)}
    />
  ) : (
    <BrandLogo className={styles.businessMark} size="sm" variant="mark" />
  )
}

export function SalesProductPhoto({
  src,
  compact = false,
}: {
  src?: string | null
  compact?: boolean
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  return (
    <span
      className={styles.productPhoto}
      data-compact={compact || undefined}
      aria-hidden="true"
    >
      {src && src !== failedSrc ? (
        <img
          alt=""
          decoding="async"
          loading="lazy"
          src={src}
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <Package />
      )}
    </span>
  )
}

export function SalesCustomerAvatar({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl?: string | null
}) {
  const src = resolveApiAssetUrl(avatarUrl)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const initials = name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? '')
    .join('')
    .toLocaleUpperCase()
  return (
    <span className={styles.customerAvatar} aria-hidden="true">
      {src && src !== failedSrc ? (
        <img alt="" loading="lazy" src={src} onError={() => setFailedSrc(src)} />
      ) : initials}
    </span>
  )
}
