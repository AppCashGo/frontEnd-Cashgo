import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCustomer,
  createCustomerCollectionActivity,
  createCustomerGeneralReminder,
  deleteCustomer,
  getCustomerDetail,
  getCustomerCollectionAgenda,
  getCustomers,
  registerCustomerPayment,
  registerCustomerOldestPayment,
  sendCustomerReminderEmail,
  uploadCustomerAvatar,
  updateCustomer,
  updateCustomerReceivableTerms,
  updateCustomerPaymentMethod,
} from '@/modules/customers/services/customers-api'
import type {
  CustomerDetail,
  CustomerCollectionActivityInput,
  CustomerMutationInput,
  CustomerPaymentInput,
  CustomerPaymentMethodCorrectionInput,
  CustomerReceivableTermsInput,
  CustomerReminderEmailInput,
  CustomerSummary,
} from '@/modules/customers/types/customer'
import {
  cashRegisterCurrentQueryKey,
  movementsOverviewQueryKey,
} from '@/modules/cash-register/hooks/use-cash-register-query'

export const customersQueryKey = ['customers'] as const
export const customerCollectionAgendaQueryKey = [
  'accounts-receivable',
  'collection-agenda',
] as const

function toCustomerSummary(customer: CustomerDetail): CustomerSummary {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    avatarUrl: customer.avatarUrl,
    documentType: customer.documentType,
    documentNumber: customer.documentNumber,
    address: customer.address,
    notes: customer.notes,
    balance: customer.balance,
    overdueBalance: customer.overdueBalance,
    currentBalance: customer.currentBalance,
    overdue1To30Balance: customer.overdue1To30Balance,
    overdue31To60Balance: customer.overdue31To60Balance,
    overdueOver60Balance: customer.overdueOver60Balance,
    undatedBalance: customer.undatedBalance,
    overdueReceivablesCount: customer.overdueReceivablesCount,
    openReceivablesCount: customer.openReceivablesCount,
    nextDueDate: customer.nextDueDate,
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

export function useCustomerCollectionAgendaQuery() {
  return useQuery({
    queryKey: customerCollectionAgendaQueryKey,
    queryFn: getCustomerCollectionAgenda,
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
      queryClient.setQueryData<CustomerSummary[]>(
        customersQueryKey,
        (current) => {
          const nextCustomer = toCustomerSummary(customer)

          if (!current) {
            return [nextCustomer]
          }

          return [
            nextCustomer,
            ...current.filter((item) => item.id !== customer.id),
          ]
        },
      )

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
      queryClient.setQueryData<CustomerSummary[]>(
        customersQueryKey,
        (current) => {
          const nextCustomer = toCustomerSummary(customer)

          if (!current) {
            return [nextCustomer]
          }

          return current.map((item) =>
            item.id === customer.id ? nextCustomer : item,
          )
        },
      )

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

export function useDeleteCustomerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (customerId: string) => deleteCustomer(customerId),
    onSuccess: async (_, customerId) => {
      queryClient.setQueryData<CustomerSummary[]>(
        customersQueryKey,
        (current) => current?.filter((customer) => customer.id !== customerId),
      )
      queryClient.removeQueries({
        queryKey: [...customersQueryKey, 'detail', customerId],
      })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customersQueryKey }),
        queryClient.invalidateQueries({
          queryKey: customerCollectionAgendaQueryKey,
        }),
      ])
    },
  })
}

export function useUploadCustomerAvatarMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ customerId, file }: { customerId: string; file: File }) =>
      uploadCustomerAvatar(customerId, file),
    onSuccess: async (customer) => {
      queryClient.setQueryData<CustomerSummary[]>(
        customersQueryKey,
        (current) => {
          const nextCustomer = toCustomerSummary(customer)

          if (!current) {
            return [nextCustomer]
          }

          return current.map((item) =>
            item.id === customer.id ? nextCustomer : item,
          )
        },
      )

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customersQueryKey }),
        queryClient.invalidateQueries({
          queryKey: cashRegisterCurrentQueryKey,
        }),
        queryClient.invalidateQueries({ queryKey: movementsOverviewQueryKey }),
        queryClient.invalidateQueries({
          queryKey: customerCollectionAgendaQueryKey,
        }),
      ])
    },
  })
}

export function useUpdateCustomerPaymentMethodMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      paymentId,
      input,
    }: {
      paymentId: string
      input: CustomerPaymentMethodCorrectionInput
    }) => updateCustomerPaymentMethod(paymentId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customersQueryKey }),
        queryClient.invalidateQueries({ queryKey: cashRegisterCurrentQueryKey }),
        queryClient.invalidateQueries({ queryKey: movementsOverviewQueryKey }),
      ])
    },
  })
}

export function useRegisterCustomerOldestPaymentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      customerId,
      input,
    }: {
      customerId: string
      input: CustomerPaymentInput
    }) => registerCustomerOldestPayment(customerId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customersQueryKey }),
        queryClient.invalidateQueries({
          queryKey: cashRegisterCurrentQueryKey,
        }),
        queryClient.invalidateQueries({ queryKey: movementsOverviewQueryKey }),
        queryClient.invalidateQueries({
          queryKey: customerCollectionAgendaQueryKey,
        }),
      ])
    },
  })
}

export function useUpdateCustomerReceivableTermsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      receivableId,
      input,
    }: {
      receivableId: string
      input: CustomerReceivableTermsInput
    }) => updateCustomerReceivableTerms(receivableId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customersQueryKey }),
        queryClient.invalidateQueries({
          queryKey: customerCollectionAgendaQueryKey,
        }),
      ])
    },
  })
}

export function useCreateCustomerCollectionActivityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      receivableId,
      input,
    }: {
      receivableId: string
      input: CustomerCollectionActivityInput
    }) => createCustomerCollectionActivity(receivableId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customersQueryKey }),
        queryClient.invalidateQueries({
          queryKey: customerCollectionAgendaQueryKey,
        }),
      ])
    },
  })
}

export function useSendCustomerReminderEmailMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      customerId,
      input,
    }: {
      customerId: string
      input: CustomerReminderEmailInput
    }) => sendCustomerReminderEmail(customerId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customersQueryKey }),
        queryClient.invalidateQueries({
          queryKey: customerCollectionAgendaQueryKey,
        }),
      ])
    },
  })
}

export function useCreateCustomerGeneralReminderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      customerId,
      input,
    }: {
      customerId: string
      input: CustomerCollectionActivityInput
    }) => createCustomerGeneralReminder(customerId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customersQueryKey }),
        queryClient.invalidateQueries({
          queryKey: customerCollectionAgendaQueryKey,
        }),
      ])
    },
  })
}
