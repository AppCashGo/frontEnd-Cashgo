import { useId, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import type { ReplenishmentSuggestion } from '@/modules/inventory/types/inventory'
import { AppButton } from '@/shared/components/ui/AppButton'
import { formatCurrency } from '@/shared/utils/format-currency'
import styles from './ReplenishmentSuggestions.module.css'

const pageSize = 6

const reasonLabels = {
  LOW_STOCK: 'Stock en el mínimo o por debajo',
  PRODUCTION_PLAN: 'Necesario para producir',
  SALES_VELOCITY: 'Consumo más rápido de lo habitual',
}

const urgencyLabels = {
  CRITICAL: 'Crítico',
  HIGH: 'Alta prioridad',
  MEDIUM: 'Planificar',
}

type Props = {
  suggestions: ReplenishmentSuggestion[]
  selectedProductIds: ReadonlySet<string>
  onToggle: (productId: string) => void
  onClear: () => void
  onReview: (selection: ReplenishmentSuggestion[]) => void
}

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase('es').normalize('NFD').replace(/\p{M}/gu, '').trim()
}

export function ReplenishmentSuggestions({
  suggestions,
  selectedProductIds,
  onToggle,
  onClear,
  onReview,
}: Props) {
  const titleId = useId()
  const [search, setSearch] = useState('')
  const [onlySelected, setOnlySelected] = useState(false)
  const [page, setPage] = useState(1)
  const selected = suggestions.filter((suggestion) =>
    suggestion.suggestedQuantity > 0 && selectedProductIds.has(suggestion.productId),
  )
  const total = selected.reduce((sum, suggestion) => sum + suggestion.estimatedCost, 0)
  const showOnlySelected = onlySelected && selected.length > 0
  const searchTerm = normalizeSearch(search)
  const filtered = (showOnlySelected ? selected : suggestions).filter((suggestion) =>
    normalizeSearch(suggestion.name).includes(searchTerm),
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const startIndex = (currentPage - 1) * pageSize
  const visible = filtered.slice(startIndex, startIndex + pageSize)

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <header className={styles.header}>
        <h4 id={titleId}>Sugerencias de reposición</h4>
        <small>Selecciona los productos para un proveedor.</small>
      </header>

      <div className={styles.selectionBar}>
        <div className={styles.selectionTotal} aria-live="polite">
          <span>{selected.length} {selected.length === 1 ? 'producto seleccionado' : 'productos seleccionados'}</span>
          <strong>{formatCurrency(total)}</strong>
          <small>Costo estimado</small>
        </div>
        <div className={styles.selectionActions}>
          {selected.length > 0 ? (
            <AppButton
              size="sm"
              variant="ghost"
              onClick={() => {
                onClear()
                setOnlySelected(false)
                setPage(1)
              }}
            >
              Limpiar selección
            </AppButton>
          ) : null}
          <AppButton
            disabled={selected.length === 0}
            endIcon={<ArrowRight aria-hidden="true" />}
            size="sm"
            onClick={() => {
              if (showOnlySelected) {
                setOnlySelected(false)
                setPage(1)
              }
              onReview(selected)
            }}
          >
            Preparar orden
          </AppButton>
        </div>
      </div>

      <div className={styles.filters}>
        <label className={styles.search}>
          <Search aria-hidden="true" size={16} />
          <input
            aria-label="Buscar productos sugeridos"
            placeholder="Buscar producto"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <label className={styles.selectedFilter}>
          <input
            checked={showOnlySelected}
            disabled={selected.length === 0}
            type="checkbox"
            onChange={(event) => {
              setOnlySelected(event.target.checked)
              setSearch('')
              setPage(1)
            }}
          />
          Solo seleccionados
        </label>
      </div>

      {visible.length ? (
        <ul className={styles.list}>
          {visible.map((suggestion) => {
            const canSelect = suggestion.suggestedQuantity > 0
            const isSelected = canSelect && selectedProductIds.has(suggestion.productId)

            return (
              <li
                className={styles.row}
                data-selected={isSelected || undefined}
                key={suggestion.productId}
              >
                <label className={styles.product}>
                  <input
                    checked={isSelected}
                    disabled={!canSelect}
                    type="checkbox"
                    onChange={() => {
                      onToggle(suggestion.productId)
                      if (showOnlySelected && isSelected && selected.length === 1) {
                        setOnlySelected(false)
                        setPage(1)
                      }
                    }}
                  />
                  <span>
                    <strong>{suggestion.name}</strong>
                    <small data-urgency={canSelect ? suggestion.urgency : 'COVERED'}>
                      {canSelect ? urgencyLabels[suggestion.urgency] : 'Ya cubierto'}
                    </small>
                  </span>
                </label>
                <dl className={styles.numbers}>
                  <div><dt>Stock</dt><dd>{suggestion.stock}</dd></div>
                  <div><dt>Ya pedido</dt><dd>{suggestion.pendingPurchaseQuantity}</dd></div>
                  <div><dt>A pedir</dt><dd>{suggestion.suggestedQuantity}</dd></div>
                  <div><dt>Costo estimado</dt><dd>{formatCurrency(suggestion.estimatedCost)}</dd></div>
                </dl>
                <details className={styles.details}>
                  <summary aria-label={`Detalle de ${suggestion.name}`}>Detalle</summary>
                  <p>{reasonLabels[suggestion.reason]}</p>
                  <dl>
                    <div><dt>Uso diario</dt><dd>{suggestion.averageDailyUsage}</dd></div>
                    <div><dt>Cobertura</dt><dd>{suggestion.daysOfStock === null ? 'Sin consumo' : `${suggestion.daysOfStock} días`}</dd></div>
                    <div><dt>Meta de stock</dt><dd>{suggestion.targetStock}</dd></div>
                    <div><dt>Stock de seguridad</dt><dd>{suggestion.safetyStock}</dd></div>
                  </dl>
                </details>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className={styles.empty} role="status">No encontramos productos con ese nombre.</p>
      )}

      {filtered.length > pageSize ? (
        <nav className={styles.pagination} aria-label="Páginas de sugerencias">
          <small aria-live="polite">{startIndex + 1}–{startIndex + visible.length} de {filtered.length}</small>
          <div>
            <AppButton
              aria-label="Página anterior de sugerencias"
              disabled={currentPage === 1}
              iconOnly
              size="sm"
              startIcon={<ChevronLeft aria-hidden="true" />}
              variant="secondary"
              onClick={() => setPage(currentPage - 1)}
            />
            <AppButton
              aria-label="Página siguiente de sugerencias"
              disabled={currentPage === pageCount}
              iconOnly
              size="sm"
              startIcon={<ChevronRight aria-hidden="true" />}
              variant="secondary"
              onClick={() => setPage(currentPage + 1)}
            />
          </div>
        </nav>
      ) : null}
    </section>
  )
}
