import type {
  ExpenseCategoryInput,
  ExpenseMutationInput,
} from "@/modules/expenses/types/expense";
import {
  normalizeExpenseCategoryRecord,
  normalizeExpenseRecord,
  type ExpenseApiRecord,
  type ExpenseCategoryApiRecord,
} from "@/modules/expenses/utils/normalize-expense-record";
import {
  deleteJson,
  getJson,
  patchJson,
  postJson,
} from "@/shared/services/api-client";
import { getAuthAccessToken } from "@/shared/services/auth-session";

export async function getExpenses() {
  const expenses = await getJson<ExpenseApiRecord[]>("/expenses", {
    accessToken: getAuthAccessToken(),
  });

  return expenses.map(normalizeExpenseRecord);
}

export async function getExpenseCategories() {
  const categories = await getJson<ExpenseCategoryApiRecord[]>(
    "/expenses/categories/list",
    {
      accessToken: getAuthAccessToken(),
    },
  );

  return categories.map(normalizeExpenseCategoryRecord);
}

export async function createExpenseCategory(input: ExpenseCategoryInput) {
  const category = await postJson<
    ExpenseCategoryApiRecord,
    ExpenseCategoryInput
  >("/expenses/categories", input, {
    accessToken: getAuthAccessToken(),
  });

  return normalizeExpenseCategoryRecord(category);
}

export async function createExpense(input: ExpenseMutationInput) {
  const expense = await postJson<ExpenseApiRecord, ExpenseMutationInput>(
    "/expenses",
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  );

  return normalizeExpenseRecord(expense);
}

export async function updateExpense(
  expenseId: string,
  input: ExpenseMutationInput,
) {
  const expense = await patchJson<ExpenseApiRecord, ExpenseMutationInput>(
    `/expenses/${expenseId}`,
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  );

  return normalizeExpenseRecord(expense);
}

export async function deleteExpense(expenseId: string) {
  const expense = await deleteJson<ExpenseApiRecord>(`/expenses/${expenseId}`, {
    accessToken: getAuthAccessToken(),
  });

  return normalizeExpenseRecord(expense);
}
