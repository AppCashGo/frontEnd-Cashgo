import { formatCurrency } from "@/shared/utils/format-currency";
import type { CashRegisterPaymentMethod } from "@/modules/cash-register/types/cash-register";
import { getSharedPaymentMethodLabel } from "@/shared/payments/payment-methods";

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
});

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
  return getSharedPaymentMethodLabel(method);
}
