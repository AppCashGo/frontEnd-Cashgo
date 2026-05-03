import type { InventoryMovementFilterType } from '@/modules/inventory/types/inventory'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import styles from './InventoryFiltersBar.module.css'

type InventoryFiltersBarProps = {
  movementType: InventoryMovementFilterType
  startDate: string
  endDate: string
  visibleCount: number
  totalCount: number
  onMovementTypeChange: (value: InventoryMovementFilterType) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onClearFilters: () => void
}

export function InventoryFiltersBar({
  movementType,
  startDate,
  endDate,
  visibleCount,
  totalCount,
  onMovementTypeChange,
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
}: InventoryFiltersBarProps) {
  const isFiltered =
    movementType !== 'ALL' || startDate.length > 0 || endDate.length > 0

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Movement filters</p>
          <h3 className={styles.title}>Refine the activity feed by type or date.</h3>
        </div>

        <button
          className={styles.clearButton}
          disabled={!isFiltered}
          type="button"
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      </div>

      <div className={styles.filtersGrid}>
        <label className={styles.field}>
          <span className={styles.label}>Movement type</span>
          <select
            className={styles.select}
            value={movementType}
            onChange={(event) =>
              onMovementTypeChange(
                event.target.value as InventoryMovementFilterType,
              )
            }
          >
            <option value="ALL">All movements</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>From date</span>
          <input
            className={styles.input}
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>To date</span>
          <input
            className={styles.input}
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
          />
        </label>
      </div>

      <p className={styles.resultHint}>
        Showing {visibleCount.toString()} of {totalCount.toString()} recorded
        movement{totalCount === 1 ? '' : 's'}.
      </p>
    </SurfaceCard>
  )
}
