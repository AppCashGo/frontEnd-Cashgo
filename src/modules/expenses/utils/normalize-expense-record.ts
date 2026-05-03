import type {
  Expense,
  ExpenseCategory,
} from "@/modules/expenses/types/expense";
import { normalizeId, normalizeOptionalId } from "@/shared/utils/normalize-id";
import { normalizeNumber } from "@/shared/utils/normalize-number";

export type ExpenseCategoryApiRecord = Omit<
  ExpenseCategory,
  "id" | "businessId"
> & {
  id: number | string;
  businessId: number | string;
};

export type ExpenseApiRecord = Omit<
  Expense,
  | "id"
  | "businessId"
  | "categoryId"
  | "supplierId"
  | "createdByUserId"
  | "cashRegisterId"
  | "cashRegisterMovementId"
  | "amount"
  | "category"
  | "supplier"
> & {
  id: number | string;
  businessId: number | string;
  categoryId: number | string | null;
  supplierId: number | string | null;
  createdByUserId: number | string | null;
  cashRegisterId: number | string | null;
  cashRegisterMovementId: number | string | null;
  amount: number | string;
  category: ExpenseCategoryApiRecord | null;
  supplier: {
    id: number | string;
    name: string;
  } | null;
};

export function normalizeExpenseCategoryRecord(
  record: ExpenseCategoryApiRecord,
): ExpenseCategory {
  return {
    ...record,
    id: normalizeId(record.id),
    businessId: normalizeId(record.businessId),
  };
}

export function normalizeExpenseRecord(record: ExpenseApiRecord): Expense {
  return {
    ...record,
    id: normalizeId(record.id),
    businessId: normalizeId(record.businessId),
    categoryId: normalizeOptionalId(record.categoryId),
    supplierId: normalizeOptionalId(record.supplierId),
    createdByUserId: normalizeOptionalId(record.createdByUserId),
    cashRegisterId: normalizeOptionalId(record.cashRegisterId),
    cashRegisterMovementId: normalizeOptionalId(record.cashRegisterMovementId),
    notes: record.notes ?? null,
    amount: normalizeNumber(record.amount),
    category: record.category
      ? normalizeExpenseCategoryRecord(record.category)
      : null,
    supplier: record.supplier
      ? {
          ...record.supplier,
          id: normalizeId(record.supplier.id),
        }
      : null,
  };
}
