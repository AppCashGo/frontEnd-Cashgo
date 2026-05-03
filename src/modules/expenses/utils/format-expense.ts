import type {
  ExpensePaymentMethod,
  ExpenseStatus,
} from '@/modules/expenses/types/expense'
import { formatCurrency } from '@/shared/utils/format-currency'

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const paymentMethodLabels: Record<ExpensePaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  DIGITAL_WALLET: 'Billetera digital',
  BANK_DEPOSIT: 'Consignación',
  CREDIT: 'Crédito',
  OTHER: 'Otro',
}

const expenseStatusLabels: Record<ExpenseStatus, string> = {
  PAID: 'Pagado',
  PENDING: 'Pendiente',
  CANCELLED: 'Cancelado',
}

export function formatExpenseCurrency(value: number) {
  return formatCurrency(value)
}

export function formatExpenseDate(value: string | Date) {
  return dateFormatter.format(new Date(value))
}

export function formatExpenseDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value))
}

export function getExpensePaymentMethodLabel(method: ExpensePaymentMethod) {
  return paymentMethodLabels[method]
}

export function getExpenseStatusLabel(status: ExpenseStatus) {
  return expenseStatusLabels[status]
}

export function toExpenseDateInputValue(value: string | Date) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function toExpenseRequestDate(value: string) {
  return new Date(`${value}T12:00:00`).toISOString()
}
