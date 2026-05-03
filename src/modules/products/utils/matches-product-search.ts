import type { Product } from '@/modules/products/types/product'

export function matchesProductSearch(product: Product, query: string) {
  if (!query) {
    return true
  }

  const searchableContent =
    `${product.name} ${product.description ?? ''} ${product.sku ?? ''} ${product.barcode ?? ''}`.toLowerCase()

  return searchableContent.includes(query)
}
