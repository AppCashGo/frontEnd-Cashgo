import { resolveApiAssetUrl } from '@/shared/services/api-client'

export function resolveProductImageUrl(
  imageUrls?: string[] | null,
  index = 0,
) {
  return resolveApiAssetUrl(imageUrls?.[index])
}
