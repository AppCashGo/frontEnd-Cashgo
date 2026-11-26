import type { CustomerPurchaseHistoryProduct } from '@/modules/customers/types/customer'
import { SalesProductPhoto } from '@/modules/sales/components/SalesVisuals'
import { resolveApiAssetUrl } from '@/shared/services/api-client'
import { formatCurrency } from '@/shared/utils/format-currency'
import styles from './CustomerPurchaseProduct.module.css'

export function CustomerPurchaseProduct({ product }: { product: CustomerPurchaseHistoryProduct }) {
  return (
    <div className={styles.product}>
      <SalesProductPhoto compact src={resolveApiAssetUrl(product.imageUrl)} />
      <div className={styles.copy}>
        <strong>{product.name}</strong>
        <small>
          {product.quantity} × {formatCurrency(product.unitPrice)}
          {product.sku ? ` · SKU ${product.sku}` : ''}
        </small>
      </div>
    </div>
  )
}
