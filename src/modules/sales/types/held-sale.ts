export type HeldSaleStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'

export type HeldSale = {
  id: string
  code: string
  label: string
  notes: string | null
  status: HeldSaleStatus
  subtotal: number
  discountTotal: number
  total: number
  version: number
  openedAt: string
  updatedAt: string
  customer: { id: string; name: string; avatarUrl: string | null } | null
  createdByUser: { id: string; name: string } | null
  items: Array<{
    id: string
    productId: string
    productName: string
    sku: string | null
    quantity: number
    unitPrice: number
    taxRate: number
    discount: number
    subtotal: number
    total: number
  }>
}

export type SaveHeldSaleInput = {
  label: string
  customerId?: string
  notes?: string
  discountTotal: number
  version?: number
  items: Array<{ productId: string; quantity: number; unitPrice: number }>
}
