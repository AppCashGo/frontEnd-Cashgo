import { useState } from 'react'
import { Package } from 'lucide-react'
import { resolveApiAssetUrl } from '@/shared/services/api-client'
import styles from './DashboardProductPhoto.module.css'

export function DashboardProductPhoto({
  imageUrl,
  featured = false,
}: {
  imageUrl?: string | null
  featured?: boolean
}) {
  const resolvedUrl = resolveApiAssetUrl(imageUrl)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  return (
    <span
      className={styles.photo}
      data-featured={featured || undefined}
      aria-hidden="true"
    >
      {resolvedUrl && failedUrl !== resolvedUrl ? (
        <img
          alt=""
          decoding="async"
          loading={featured ? 'eager' : 'lazy'}
          src={resolvedUrl}
          onError={() => setFailedUrl(resolvedUrl)}
        />
      ) : (
        <Package />
      )}
    </span>
  )
}
