export const PAYMENT_METHOD_LABELS = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  DIGITAL_WALLET: 'Nequi / Daviplata',
  TRANSFER: 'Transferencia bancaria',
  BANK_DEPOSIT: 'Consignación bancaria',
  CREDIT: 'Crédito',
  OTHER: 'Otro',
} as const

export type SharedPaymentMethod = keyof typeof PAYMENT_METHOD_LABELS

export const COLLECTED_PAYMENT_METHOD_OPTIONS = (
  Object.entries(PAYMENT_METHOD_LABELS) as Array<
    [SharedPaymentMethod, (typeof PAYMENT_METHOD_LABELS)[SharedPaymentMethod]]
  >
)
  .filter(([value]) => value !== 'CREDIT')
  .map(([value, label]) => ({ value, label }))

export function getSharedPaymentMethodLabel(method: string | null | undefined) {
  if (!method) return 'Sin especificar'
  return PAYMENT_METHOD_LABELS[method as SharedPaymentMethod] ?? method
}
