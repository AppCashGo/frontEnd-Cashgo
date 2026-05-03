export type CustomerSummary = {
  id: string
  name: string
  email: string | null
  phone: string | null
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

export type CustomerDetail = CustomerSummary & {
  purchaseHistory: CustomerPurchaseHistoryItem[]
}
