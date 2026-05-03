import type { SupplierSummary } from '@/modules/suppliers/types/supplier'

export function matchesSupplierSearch(
  supplier: SupplierSummary,
  normalizedSearch: string,
) {
  if (!normalizedSearch) {
    return true
  }

  const searchableFields = [supplier.name, supplier.email ?? '', supplier.phone ?? '']

  return searchableFields.some((field) =>
    field.toLowerCase().includes(normalizedSearch),
  )
}
