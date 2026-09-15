import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cashRegisterCurrentQueryKey,
  movementsOverviewQueryKey,
} from '@/modules/cash-register/hooks/use-cash-register-query'
import {
  createOwnerLoan,
  createOwnerLoanPayment,
  getOwnerLoans,
} from '@/modules/owner-loans/services/owner-loans-api'
import type {
  CreateOwnerLoanInput,
  CreateOwnerLoanPaymentInput,
} from '@/modules/owner-loans/types/owner-loan'

export const ownerLoansQueryKey = ['owner-loans'] as const

async function invalidateOwnerLoanDependencies(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ownerLoansQueryKey }),
    queryClient.invalidateQueries({ queryKey: cashRegisterCurrentQueryKey }),
    queryClient.invalidateQueries({ queryKey: movementsOverviewQueryKey }),
  ])
}

export function useOwnerLoansQuery() {
  return useQuery({ queryKey: ownerLoansQueryKey, queryFn: getOwnerLoans })
}

export function useCreateOwnerLoanMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOwnerLoanInput) => createOwnerLoan(input),
    onSuccess: () => invalidateOwnerLoanDependencies(queryClient),
  })
}

export function useCreateOwnerLoanPaymentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      ownerLoanId,
      input,
    }: {
      ownerLoanId: string
      input: CreateOwnerLoanPaymentInput
    }) => createOwnerLoanPayment(ownerLoanId, input),
    onSuccess: () => invalidateOwnerLoanDependencies(queryClient),
  })
}
