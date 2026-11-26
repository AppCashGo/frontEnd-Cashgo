import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import type { Product } from '@/modules/products/types/product'
import { matchesProductSearch } from '@/modules/products/utils/matches-product-search'
import { formatCurrency } from '@/shared/utils/format-currency'
import styles from './RetailInventoryWorkspace.module.css'

const pageSize = 30

type PurchaseProductPickerProps = {
  products: Product[]
  includedIds: ReadonlySet<string>
  label: string
  isEnglish: boolean
  onAdd: (products: Product[]) => void
  onCancel: () => void
}

export function PurchaseProductPicker({
  products,
  includedIds,
  label,
  isEnglish,
  onAdd,
  onCancel,
}: PurchaseProductPickerProps) {
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const available = useMemo(
    () => products.filter((product) => !includedIds.has(product.id)),
    [products, includedIds],
  )
  const filtered = available.filter((product) =>
    matchesProductSearch(product, query.trim().toLowerCase()),
  )
  const selectedProducts = available.filter((product) =>
    selected.has(product.id),
  )

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <section aria-label={label} className={styles.purchasePicker}>
      <label className={styles.purchasePickerSearch}>
        <Search aria-hidden="true" />
        <input
          aria-label={
            isEnglish
              ? 'Search products to add'
              : 'Buscar productos para agregar'
          }
          autoFocus
          placeholder={
            isEnglish
              ? 'Name, SKU or barcode'
              : 'Nombre, SKU o código de barras'
          }
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setVisibleCount(pageSize)
          }}
        />
      </label>
      {filtered.length ? (
        <ul className={styles.purchasePickerList}>
          {filtered.slice(0, visibleCount).map((product) => (
            <li key={product.id}>
              <label className={styles.purchasePickerOption}>
                <input
                  type="checkbox"
                  checked={selected.has(product.id)}
                  onChange={(event) => toggle(product.id, event.target.checked)}
                />
                <span>
                  <strong>{product.name}</strong>
                  {product.sku || product.barcode ? (
                    <small>{product.sku || product.barcode}</small>
                  ) : null}
                </span>
                <small>{formatCurrency(product.cost)}</small>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.fieldHint}>
          {query.trim()
            ? isEnglish
              ? 'No products match your search.'
              : 'No encontramos productos con esa búsqueda.'
            : isEnglish
              ? 'There are no more products to add.'
              : 'No hay más productos disponibles para agregar.'}
        </p>
      )}
      {filtered.length > visibleCount ? (
        <button
          className={styles.inlineFieldAction}
          type="button"
          onClick={() => setVisibleCount((current) => current + pageSize)}
        >
          {isEnglish ? 'Show more products' : 'Ver más productos'}
        </button>
      ) : null}
      <div className={styles.purchasePickerActions}>
        <button
          className={styles.inlineFieldAction}
          type="button"
          onClick={onCancel}
        >
          {isEnglish ? 'Cancel' : 'Cancelar'}
        </button>
        <button
          className={styles.addPurchaseItemButton}
          disabled={!selectedProducts.length}
          type="button"
          onClick={() => onAdd(selectedProducts)}
        >
          <Plus aria-hidden="true" />
          {isEnglish ? 'Add selected' : 'Agregar seleccionados'} (
          {selectedProducts.length})
        </button>
      </div>
    </section>
  )
}
