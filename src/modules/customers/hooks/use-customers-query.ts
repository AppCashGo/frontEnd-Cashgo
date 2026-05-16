import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCustomer,
  getCustomerDetail,
  getCustomers,
  registerCustomerPayment,
  updateCustomer,
} from '@/modules/customers/services/customers-api'
import type {
  CustomerDetail,
  CustomerMutationInput,
  CustomerPaymentInput,
  CustomerSummary,
} from '@/modules/customers/types/customer'

export const customersQueryKey = ['customers'] as const

function toCustomerSummary(customer: CustomerDetail): CustomerSummary {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    documentType: customer.documentType,
    documentNumber: customer.documentNumber,
    address: customer.address,
    notes: customer.notes,
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

export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      customerId,
      input,
    }: {
      customerId: string
      input: CustomerMutationInput
    }) => updateCustomer(customerId, input),
    onSuccess: async (customer) => {
      queryClient.setQueryData<CustomerSummary[]>(customersQueryKey, (current) => {
        const nextCustomer = toCustomerSummary(customer)

        if (!current) {
          return [nextCustomer]
        }

        return current.map((item) =>
          item.id === customer.id ? nextCustomer : item,
        )
      })

      queryClient.setQueryData<CustomerDetail>(
        [...customersQueryKey, 'detail', customer.id],
        customer,
      )

      await queryClient.invalidateQueries({
        queryKey: customersQueryKey,
      })
    },
  })
}

export function useRegisterCustomerPaymentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      receivableId,
      input,
    }: {
      receivableId: string
      input: CustomerPaymentInput
    }) => registerCustomerPayment(receivableId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: customersQueryKey,
      })
    },
  })
}
