import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createExpense,
  createExpenseCategory,
  deleteExpense,
  getExpenseCategories,
  getExpenses,
  updateExpense,
} from '@/modules/expenses/services/expenses-api'
import type {
  ExpenseCategoryInput,
  ExpenseMutationInput,
} from '@/modules/expenses/types/expense'

export const expensesQueryKey = ['expenses'] as const
export const expenseCategoriesQueryKey = ['expense-categories'] as const

export function useExpensesQuery() {
  return useQuery({
    queryKey: expensesQueryKey,
    queryFn: getExpenses,
  })
}

export function useExpenseCategoriesQuery() {
  return useQuery({
    queryKey: expenseCategoriesQueryKey,
    queryFn: getExpenseCategories,
  })
}

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ExpenseMutationInput) => createExpense(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: expensesQueryKey,
      })
    },
  })
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      expenseId,
      input,
    }: {
      expenseId: string
      input: ExpenseMutationInput
    }) => updateExpense(expenseId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: expensesQueryKey,
      })
    },
  })
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (expenseId: string) => deleteExpense(expenseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: expensesQueryKey,
      })
    },
  })
}

export function useCreateExpenseCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ExpenseCategoryInput) => createExpenseCategory(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: expenseCategoriesQueryKey,
      })
    },
  })
}
