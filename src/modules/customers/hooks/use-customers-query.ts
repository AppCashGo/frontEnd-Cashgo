import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCustomer,
  getCustomerDetail,
  getCustomers,
} from '@/modules/customers/services/customers-api'
import type {
  CustomerDetail,
  CustomerMutationInput,
  CustomerSummary,
} from '@/modules/customers/types/customer'

export const customersQueryKey = ['customers'] as const

function toCustomerSummary(customer: CustomerDetail): CustomerSummary {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    balance: customer.balance,
    purchaseCount: customer.purchaseCount,
    lastPurchaseAt: customer.lastPurchaseAt,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  }
}

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

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CustomerMutationInput) => createCustomer(input),
    onSuccess: async (customer) => {
      queryClient.setQueryData<CustomerSummary[]>(customersQueryKey, (current) => {
        const nextCustomer = toCustomerSummary(customer)

        if (!current) {
          return [nextCustomer]
        }

        return [
          nextCustomer,
          ...current.filter((item) => item.id !== customer.id),
        ]
      })

      await queryClient.invalidateQueries({
        queryKey: customersQueryKey,
      })
    },
  })
}
