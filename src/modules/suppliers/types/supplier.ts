export type SupplierSummary = {
  id: string
  name: string
  email: string | null
  phone: string | null
  purchaseCount: number
  lastPurchaseAt: string | null
  createdAt: string
  updatedAt: string
}

export type SupplierSupplyHistoryItem = {
  purchaseId: string
  total: number
  createdAt: string
}

export type SupplierDetail = SupplierSummary & {
  purchaseHistory: SupplierSupplyHistoryItem[]
}
