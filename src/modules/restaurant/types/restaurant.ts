import type { SalePaymentMethod } from '@/modules/sales/types/sale'

export type RestaurantTableStatus = 'OPEN' | 'CLOSED'

export type RestaurantZone = {
  id: string
  name: string
  sortOrder: number
}

export type RestaurantTable = {
  id: string
  zoneId: string
  name: string
  sortOrder: number
}

export type RestaurantOrderModifier = {
  id: string
  label: string
  amount: number
  kind: 'ADD' | 'REMOVE'
}

export type RestaurantOrderItem = {
  id: string
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  note: string
  modifiers: RestaurantOrderModifier[]
}

export type RestaurantTableOrder = {
  tableId: string
  status: Extract<RestaurantTableStatus, 'OPEN'>
  employeeId: string
  employeeName: string
  guestCount: number
  comment: string
  items: RestaurantOrderItem[]
  openedAt: string
  updatedAt: string
}

export type RestaurantWorkspaceState = {
  zones: RestaurantZone[]
  tables: RestaurantTable[]
  orders: Record<string, RestaurantTableOrder>
}

export type DeliveryOrderStatus =
  | 'NEW'
  | 'PREPARING'
  | 'ON_ROUTE'
  | 'DELIVERED'
  | 'CANCELLED'

export type DeliveryOrder = {
  id: string
  status: DeliveryOrderStatus
  customerId: string
  customerName: string
  phone: string
  address: string
  paymentMethod: SalePaymentMethod
  deliveryFee: number
  notes: string
  items: RestaurantOrderItem[]
  createdAt: string
  updatedAt: string
}
