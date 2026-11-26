import type {
  CashRegisterPaymentMethod,
  CashRegisterSession,
} from "@/modules/cash-register/types/cash-register";
import { formatCashRegisterCurrency } from "./format-cash-register";

type PaymentMethodSummary = {
  method: CashRegisterPaymentMethod;
  label: string;
};

type SummaryRow = {
  label: string;
  value: number;
  tone?: "danger";
};

export const cashRegisterPaymentMethods: PaymentMethodSummary[] = [
  { method: "CASH", label: "Efectivo" },
  { method: "CARD", label: "Tarjeta" },
  { method: "DIGITAL_WALLET", label: "Nequi / Daviplata" },
  { method: "TRANSFER", label: "Transferencia bancaria" },
  { method: "BANK_DEPOSIT", label: "Consignación bancaria" },
  { method: "OTHER", label: "Otros" },
];

function getPaymentMethodTotal(
  session: CashRegisterSession,
  method: CashRegisterPaymentMethod,
) {
  return (
    session.paymentMethods.find(
      (paymentMethod) => paymentMethod.method === method,
    )?.expectedAmount ?? 0
  );
}

export function getPaymentMethodRows(
  session: CashRegisterSession,
  method: CashRegisterPaymentMethod,
): SummaryRow[] {
  const paymentMethod = session.paymentMethods.find(
    (summary) => summary.method === method,
  );
  const financingRows = (
    [
      {
        label: "Préstamos recibidos",
        value: paymentMethod?.ownerLoanProceedsAmount ?? 0,
      },
      {
        label: "Abonos a préstamos",
        value: paymentMethod?.ownerLoanPaymentsAmount ?? 0,
        tone: "danger",
      },
    ] satisfies SummaryRow[]
  ).filter((row) => row.value > 0);
  const transferRows = (
    [
      {
        label: "Transferencias recibidas",
        value: paymentMethod?.transfersInAmount ?? 0,
      },
      {
        label: "Transferencias enviadas",
        value: paymentMethod?.transfersOutAmount ?? 0,
        tone: "danger",
      },
    ] satisfies SummaryRow[]
  ).filter((row) => row.value > 0);

  if (method === "CASH") {
    const manualIncomeRows =
      session.manualIncomeTotal > 0
        ? ([
            {
              label: "Otros ingresos",
              value: session.manualIncomeTotal,
            },
          ] satisfies SummaryRow[])
        : [];

    return [
      {
        label: "Saldo inicial",
        value: paymentMethod?.openingAmount ?? session.openingAmount,
      },
      { label: "Ventas", value: session.cashSalesTotal },
      { label: "Abonos", value: session.cashCollectionsTotal },
      ...manualIncomeRows,
      ...financingRows,
      ...transferRows,
      {
        label: "Gastos",
        value: paymentMethod?.expensesAmount ?? session.manualExpenseTotal,
        tone: "danger",
      },
      ...((paymentMethod?.reversalsAmount ?? 0) > 0
        ? ([
            {
              label: "Reversiones de venta",
              value: paymentMethod?.reversalsAmount ?? 0,
              tone: "danger",
            },
          ] satisfies SummaryRow[])
        : []),
    ];
  }

  return [
    { label: "Saldo inicial", value: paymentMethod?.openingAmount ?? 0 },
    { label: "Ventas", value: paymentMethod?.salesAmount ?? 0 },
    { label: "Abonos", value: paymentMethod?.collectionsAmount ?? 0 },
    ...financingRows,
    ...transferRows,
    {
      label: "Gastos",
      value: paymentMethod?.expensesAmount ?? 0,
      tone: "danger",
    },
    ...((paymentMethod?.reversalsAmount ?? 0) > 0
      ? ([
          {
            label: "Reversiones de venta",
            value: paymentMethod?.reversalsAmount ?? 0,
            tone: "danger",
          },
        ] satisfies SummaryRow[])
      : []),
  ];
}

export function getPaymentMethodBalance(
  session: CashRegisterSession,
  method: CashRegisterPaymentMethod,
) {
  if (method === "CASH") {
    return session.cashExpectedTotal;
  }

  return getPaymentMethodTotal(session, method);
}

export function getShiftBalance(session: CashRegisterSession, difference = 0) {
  return session.paymentMethods.reduce(
    (total, paymentMethod) => total + paymentMethod.expectedAmount,
    difference,
  );
}

export function getSignedCurrency(value: number) {
  if (value <= 0) {
    return formatCashRegisterCurrency(value);
  }

  return `-${formatCashRegisterCurrency(value)}`;
}
