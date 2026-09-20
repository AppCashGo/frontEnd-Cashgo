import type { AppUserRole } from "@/shared/constants/user-roles";

export type CashRegisterEntryType = "INCOME" | "EXPENSE";
export type CashRegisterSessionStatus = "OPEN" | "CLOSED";
export type CashRegisterPaymentMethod =
  | "CASH"
  | "CARD"
  | "TRANSFER"
  | "DIGITAL_WALLET"
  | "BANK_DEPOSIT"
  | "CREDIT"
  | "OTHER";
export type MovementLedgerScope = "CASH" | "INVENTORY";
export type MovementLedgerDirection = "IN" | "OUT" | "ADJUSTMENT";
export type PaymentFundSource = "REGISTER" | "RESERVE";
export type ReserveTransferDirection = "TO_RESERVE" | "FROM_RESERVE";

export type CashRegisterAssignee = {
  id: string;
  name: string;
  role: AppUserRole;
};

export type CashRegisterPaymentSummary = {
  method: CashRegisterPaymentMethod;
  amount: number;
  salesAmount: number;
  collectionsAmount: number;
  expensesAmount: number;
  reversalsAmount: number;
  ownerLoanProceedsAmount: number;
  ownerLoanPaymentsAmount: number;
  openingAmount: number;
  transfersInAmount: number;
  transfersOutAmount: number;
  expectedAmount: number;
  closingAmount: number | null;
  difference: number | null;
};

export type PaymentMethodTransfer = {
  id: string;
  fromMethod: CashRegisterPaymentMethod;
  toMethod: CashRegisterPaymentMethod;
  amount: number;
  notes: string | null;
  createdAt: string;
};

export type CashRegisterTransaction = {
  id: string;
  type: CashRegisterEntryType;
  kind: string;
  concept: string;
  amount: number;
  paymentMethod: CashRegisterPaymentMethod | null;
  paymentMethods?: CashRegisterPaymentMethod[];
  collectedAmount?: number | null;
  pendingAmount?: number | null;
  status: string;
  createdAt: string;
};

export type MovementLedgerItem = {
  id: string;
  scope: MovementLedgerScope;
  direction: MovementLedgerDirection;
  kind: string;
  source: string;
  concept: string;
  details: string | null;
  amount: number | null;
  quantity: number | null;
  paymentMethod: CashRegisterPaymentMethod | null;
  paymentMethods?: CashRegisterPaymentMethod[];
  collectedAmount?: number | null;
  pendingAmount?: number | null;
  productName: string | null;
  productNames?: string[];
  previousStock: number | null;
  newStock: number | null;
  userName: string | null;
  referenceId: string | null;
  referenceType: string | null;
  status: string;
  createdAt: string;
};

export type MovementsOverview = {
  balance: number;
  salesTotal: number;
  expensesTotal: number;
  receivablesTotal: number;
  payablesTotal: number;
  transactions: MovementLedgerItem[];
};

export type CashRegisterEntry = {
  id: string;
  type: CashRegisterEntryType;
  amount: number;
  reason: string;
  createdAt: string;
};

export type CashRegisterSession = {
  id: string;
  status: CashRegisterSessionStatus;
  responsibleUserId: string | null;
  responsibleUserName: string | null;
  openingAmount: number;
  closingAmount: number | null;
  balance: number;
  salesTotal: number;
  receivableCollectionsTotal: number;
  totalIncome: number;
  expensesTotal: number;
  reversalsTotal: number;
  cashExpectedTotal: number;
  cashSalesTotal: number;
  cashCollectionsTotal: number;
  paymentMethods: CashRegisterPaymentSummary[];
  transactionCount: number;
  manualIncomeTotal: number;
  manualExpenseTotal: number;
  ownerLoanProceedsTotal: number;
  ownerLoanPaymentsTotal: number;
  ownerLoansOutstandingTotal: number;
  difference: number | null;
  openingNote: string | null;
  closingNote: string | null;
  openedAt: string;
  closedAt: string | null;
  entries: CashRegisterEntry[];
  transactions: CashRegisterTransaction[];
  transfers: PaymentMethodTransfer[];
};

export type CashRegisterMethodBalanceInput = {
  method: CashRegisterPaymentMethod;
  amount: number;
};

export type OpenCashRegisterInput = {
  responsibleUserId?: string;
  openingAmount: number;
  openingBalances?: CashRegisterMethodBalanceInput[];
  openingNote?: string;
};

export type CloseCashRegisterInput = {
  closingAmount: number;
  closingBalances?: CashRegisterMethodBalanceInput[];
  closingNote?: string;
};

export type PaymentMethodTransferInput = {
  fromMethod: CashRegisterPaymentMethod;
  toMethod: CashRegisterPaymentMethod;
  amount: number;
  notes?: string;
};

export type ReserveBalance = {
  method: CashRegisterPaymentMethod;
  amount: number;
};

export type ReserveMovement = {
  id: string;
  cashRegisterId: string | null;
  method: CashRegisterPaymentMethod;
  kind:
    | "TRANSFER_FROM_REGISTER"
    | "TRANSFER_TO_REGISTER"
    | "SUPPLIER_PAYMENT"
    | "SUPPLIER_REFUND"
    | "ADJUSTMENT";
  amount: number;
  notes: string | null;
  createdAt: string;
};

export type ReserveSummary = {
  balances: ReserveBalance[];
  total: number;
  movements: ReserveMovement[];
};

export type ReserveTransferInput = {
  method: CashRegisterPaymentMethod;
  direction: ReserveTransferDirection;
  amount: number;
  notes?: string;
};

export type ReserveBalanceAdjustmentInput = {
  method: CashRegisterPaymentMethod;
  amount: number;
  notes?: string;
};

export type CashRegisterManualEntryInput = {
  type: CashRegisterEntryType;
  amount: number;
  reason: string;
};

export type CashRegisterReportView = "transactions" | "closures";

export type CashRegisterReportDownloadInput = {
  view: CashRegisterReportView;
  from?: string;
  to?: string;
  search?: string;
  type?: "ALL" | CashRegisterEntryType;
};
