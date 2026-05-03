export type ExpenseStatus = "PAID" | "PENDING" | "CANCELLED";

export type ExpensePaymentMethod =
  | "CASH"
  | "CARD"
  | "TRANSFER"
  | "DIGITAL_WALLET"
  | "BANK_DEPOSIT"
  | "CREDIT"
  | "OTHER";

export type ExpenseCategory = {
  id: string;
  businessId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type Expense = {
  id: string;
  businessId: string;
  categoryId: string | null;
  supplierId: string | null;
  createdByUserId: string | null;
  cashRegisterId: string | null;
  cashRegisterMovementId: string | null;
  concept: string;
  notes: string | null;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  status: ExpenseStatus;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  category: ExpenseCategory | null;
  supplier: {
    id: string;
    name: string;
  } | null;
};

export type ExpenseMutationInput = {
  concept: string;
  categoryId?: string | null;
  supplierId?: string | null;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  status: ExpenseStatus;
  expenseDate: string;
  notes?: string | null;
};

export type ExpenseCategoryInput = {
  name: string;
  color?: string;
};
