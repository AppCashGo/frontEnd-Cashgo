import type {
  InventoryMovement,
  InventoryMovementFilters,
} from '@/modules/inventory/types/inventory'

function getStartDateBoundary(value: string) {
  return value ? new Date(`${value}T00:00:00`) : null
}

function getEndDateBoundary(value: string) {
  return value ? new Date(`${value}T23:59:59.999`) : null
}

export function filterInventoryMovements(
  movements: InventoryMovement[],
  filters: InventoryMovementFilters,
) {
  const startBoundary = getStartDateBoundary(filters.startDate)
  const endBoundary = getEndDateBoundary(filters.endDate)

  return movements.filter((movement) => {
    const movementDate = new Date(movement.createdAt)

    if (filters.type !== 'ALL' && movement.type !== filters.type) {
      return false
    }

    if (startBoundary && movementDate < startBoundary) {
      return false
    }

    if (endBoundary && movementDate > endBoundary) {
      return false
    }

    return true
  })
}
