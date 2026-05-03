import { useQuery } from '@tanstack/react-query'
import {
  getCustomerDetail,
  getCustomers,
} from '@/modules/customers/services/customers-api'

export const customersQueryKey = ['customers'] as const

export function useCustomersQuery() {
  return useQuery({
    queryKey: customersQueryKey,
    queryFn: getCustomers,
  })
}

export function useCustomerDetailQuery(customerId: string | null) {
  return useQuery({
    queryKey: [...customersQueryKey, 'detail', customerId],
    queryFn: () => getCustomerDetail(customerId as string),
    enabled: customerId !== null,
  })
}
