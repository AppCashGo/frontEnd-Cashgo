import { formatCurrency } from "@/shared/utils/format-currency";
import type { CashRegisterPaymentMethod } from "@/modules/cash-register/types/cash-register";

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
});

const paymentMethodLabels: Record<CashRegisterPaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  DIGITAL_WALLET: "Billetera digital",
  BANK_DEPOSIT: "Consignación",
  CREDIT: "Crédito",
  OTHER: "Otro",
};

export function formatCashRegisterDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatCashRegisterDate(value: string | Date) {
  return dateFormatter.format(new Date(value));
}

export function formatCashRegisterCurrency(value: number) {
  return formatCurrency(value);
}

export function getPaymentMethodLabel(method: CashRegisterPaymentMethod) {
  return paymentMethodLabels[method];
}
