import type {
  CashRegisterPaymentMethod,
  PaymentFundSource,
} from '@/modules/cash-register/types/cash-register'

export type OwnerLoanPayment = {
  id: string
  amount: number
  method: CashRegisterPaymentMethod
  fundSource: PaymentFundSource
  paymentDate: string
  notes: string | null
}

export type OwnerLoan = {
  id: string
  lenderName: string
  originalAmount: number
  balance: number
  method: CashRegisterPaymentMethod
  status: 'ACTIVE' | 'PAID'
  receivedAt: string
  notes: string | null
  payments: OwnerLoanPayment[]
}

export type CreateOwnerLoanInput = {
  lenderName: string
  amount: number
  method: CashRegisterPaymentMethod
  receivedAt?: string
  notes?: string
}

export type CreateOwnerLoanPaymentInput = {
  amount: number
  method: CashRegisterPaymentMethod
  fundSource?: PaymentFundSource
  paymentDate?: string
  notes?: string
}
