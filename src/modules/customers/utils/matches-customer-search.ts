import type { CustomerSummary } from '@/modules/customers/types/customer'

export function matchesCustomerSearch(
  customer: CustomerSummary,
  normalizedSearch: string,
) {
  if (!normalizedSearch) {
    return true
  }

  const searchableFields = [
    customer.name,
    customer.email ?? '',
    customer.phone ?? '',
    customer.documentNumber ?? '',
    customer.address ?? '',
  ]

  return searchableFields.some((field) =>
    field.toLowerCase().includes(normalizedSearch),
  )
}
