import type { Product } from '@/modules/products/types/product'

export function getProductStockStatus(product: Product, defaultThreshold = 5) {
  if (!product.isActive) return 'inactive'
  if (product.inventoryBehavior === 'MADE_TO_ORDER') return 'madeToOrder'
  if (product.productType === 'VARIANT_PARENT') return 'variantParent'
  if (product.stock <= 0) return 'out'
  if (product.stock <= Math.max(product.minStock, defaultThreshold)) return 'low'
  return 'healthy'
}
