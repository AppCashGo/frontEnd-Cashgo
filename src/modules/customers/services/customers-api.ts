import { getJson } from '@/shared/services/api-client'
import type {
  CustomerDetail,
  CustomerSummary,
} from '@/modules/customers/types/customer'

export function getCustomers() {
  return getJson<CustomerSummary[]>('/customers')
}

export function getCustomerDetail(customerId: string) {
  return getJson<CustomerDetail>(`/customers/${customerId}`)
}
