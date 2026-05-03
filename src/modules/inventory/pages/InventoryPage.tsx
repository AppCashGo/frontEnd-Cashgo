import { useDeferredValue, useState } from 'react'
import { InventoryAdjustmentPanel } from '@/modules/inventory/components/InventoryAdjustmentPanel'
import { InventoryFiltersBar } from '@/modules/inventory/components/InventoryFiltersBar'
import { InventoryLowStockPanel } from '@/modules/inventory/components/InventoryLowStockPanel'
import { InventoryMovementsTable } from '@/modules/inventory/components/InventoryMovementsTable'
import { RetailInventoryWorkspace } from '@/modules/inventory/components/RetailInventoryWorkspace'
import {
  useCreateInventoryAdjustmentMutation,
  useInventoryMovementsQuery,
  useInventoryLowStockQuery,
} from '@/modules/inventory/hooks/use-inventory-query'
import type {
  InventoryAdjustmentInput,
  InventoryMovementFilters,
} from '@/modules/inventory/types/inventory'
import { filterInventoryMovements } from '@/modules/inventory/utils/filter-inventory-movements'
import { useProductsQuery } from '@/modules/products/hooks/use-products-query'
import { useBusinessNavigationPreset } from '@/shared/hooks/use-business-navigation-preset'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './InventoryPage.module.css'

const defaultFilters: InventoryMovementFilters = {
  type: 'ALL',
  startDate: '',
  endDate: '',
}

export function InventoryPage() {
  const navigationPreset = useBusinessNavigationPreset()
  const isRetailPreset = navigationPreset === 'retail'
  const [filters, setFilters] = useState<InventoryMovementFilters>(defaultFilters)
  const deferredFilters = useDeferredValue(filters)
  const inventoryMovementsQuery = useInventoryMovementsQuery()
  const inventoryLowStockQuery = useInventoryLowStockQuery()
  const productsQuery = useProductsQuery()
  const createInventoryAdjustmentMutation = useCreateInventoryAdjustmentMutation()
  const movements = inventoryMovementsQuery.data ?? []
  const lowStockAlerts = inventoryLowStockQuery.data ?? []
  const products = productsQuery.data ?? []
  const visibleMovements = filterInventoryMovements(movements, deferredFilters)
  const movementsToday = movements.filter((movement) => {
    const movementDate = new Date(movement.createdAt)
    const today = new Date()

    return movementDate.toDateString() === today.toDateString()
  }).length
  const distinctProducts = new Set(movements.map((movement) => movement.productId))
  const adjustmentMovements = movements.filter(
    (movement) => movement.type === 'ADJUSTMENT',
  ).length

  async function handleSubmitAdjustment(input: InventoryAdjustmentInput) {
    await createInventoryAdjustmentMutation.mutateAsync(input)
  }

  if (isRetailPreset) {
    return <RetailInventoryWorkspace />
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Inventory workspace</p>
          <h2 className={styles.title}>
            Keep stock movements auditable, filtered and easy to adjust.
          </h2>
          <p className={styles.description}>
            Review the movement trail, narrow the feed by type or date and post
            manual adjustments from a single responsive inventory screen.
          </p>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatLabel}>Total movements</span>
            <strong className={styles.heroStatValue}>
              {movements.length.toString()}
            </strong>
          </div>

          <div className={styles.heroStat}>
            <span className={styles.heroStatLabel}>Movements today</span>
            <strong className={styles.heroStatValue}>
              {movementsToday.toString()}
            </strong>
          </div>

          <div className={styles.heroStat}>
            <span className={styles.heroStatLabel}>Affected products</span>
            <strong className={styles.heroStatValue}>
              {distinctProducts.size.toString()}
            </strong>
          </div>

          <div className={styles.heroStat}>
            <span className={styles.heroStatLabel}>Manual adjustments</span>
            <strong className={styles.heroStatValue}>
              {adjustmentMovements.toString()}
            </strong>
          </div>
        </div>
      </section>

      <InventoryFiltersBar
        endDate={filters.endDate}
        movementType={filters.type}
        startDate={filters.startDate}
        totalCount={movements.length}
        visibleCount={visibleMovements.length}
        onClearFilters={() => setFilters(defaultFilters)}
        onEndDateChange={(value) => {
          setFilters((currentFilters) => ({
            ...currentFilters,
            endDate: value,
          }))
        }}
        onMovementTypeChange={(value) => {
          setFilters((currentFilters) => ({
            ...currentFilters,
            type: value,
          }))
        }}
        onStartDateChange={(value) => {
          setFilters((currentFilters) => ({
            ...currentFilters,
            startDate: value,
          }))
        }}
      />

      <div className={styles.workspace}>
        <div className={styles.primaryColumn}>
          <InventoryMovementsTable
            errorMessage={
              inventoryMovementsQuery.isError
                ? getErrorMessage(
                    inventoryMovementsQuery.error,
                    'Unable to load the inventory movements right now. Please try again.',
                  )
                : null
            }
            isLoading={inventoryMovementsQuery.isLoading}
            isRefreshing={
              inventoryMovementsQuery.isFetching &&
              !inventoryMovementsQuery.isLoading
            }
            movements={visibleMovements}
            totalCount={movements.length}
            onRetry={() => {
              void inventoryMovementsQuery.refetch()
            }}
          />
        </div>

        <aside className={styles.secondaryColumn}>
          <InventoryAdjustmentPanel
            isSubmitting={createInventoryAdjustmentMutation.isPending}
            products={products}
            submitErrorMessage={
              productsQuery.isError
                ? getErrorMessage(
                    productsQuery.error,
                    'Unable to load products for manual adjustments.',
                  )
                : null
            }
            onSubmit={handleSubmitAdjustment}
          />

          <InventoryLowStockPanel
            alerts={lowStockAlerts}
            errorMessage={
              inventoryLowStockQuery.isError
                ? getErrorMessage(
                    inventoryLowStockQuery.error,
                    'Unable to load current low-stock alerts.',
                  )
                : null
            }
            isLoading={inventoryLowStockQuery.isLoading}
          />
        </aside>
      </div>
    </div>
  )
}
