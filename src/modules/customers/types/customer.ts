export type CustomerSummary = {
  id: string
  name: string
  email: string | null
  phone: string | null
  documentType: string | null
  documentNumber: string | null
  address: string | null
  notes: string | null
  balance: number
  purchaseCount: number
  lastPurchaseAt: string | null
  createdAt: string
  updatedAt: string
}

export type CustomerPurchaseHistoryItem = {
  saleId: string
  total: number
  createdAt: string
  itemCount: number
}

export type CustomerPaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'TRANSFER'
  | 'DIGITAL_WALLET'
  | 'BANK_DEPOSIT'
  | 'CREDIT'
  | 'OTHER'

export type CustomerReceivablePayment = {
  id: string
  amount: number
  method: CustomerPaymentMethod
  reference: string | null
  notes: string | null
  createdAt: string
}

export type CustomerReceivable = {
  id: string
  saleId: string
  saleNumber: string
  amount: number
  paidAmount: number
  balance: number
  dueDate: string | null
  status: string
  notes: string | null
  createdAt: string
  payments: CustomerReceivablePayment[]
}

export type CustomerDetail = CustomerSummary & {
  purchaseHistory: CustomerPurchaseHistoryItem[]
  receivables: CustomerReceivable[]
}

export type CustomerMutationInput = {
  name: string
  email?: string | null
  phone?: string | null
  documentType?: string | null
  documentNumber?: string | null
  address?: string | null
  notes?: string | null
  balance?: number
}

export type CustomerPaymentInput = {
  amount: number
  method: CustomerPaymentMethod
  cashRegisterId?: string
  reference?: string
  notes?: string
}
