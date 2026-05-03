import type { Product } from '@/modules/products/types/product'
import type {
  DeliveryOrder,
  RestaurantOrderItem,
  RestaurantOrderModifier,
  RestaurantTableOrder,
  RestaurantWorkspaceState,
} from '@/modules/restaurant/types/restaurant'

const restaurantWorkspaceStoragePrefix = 'cashgo-restaurant-workspace'
const restaurantDeliveriesStoragePrefix = 'cashgo-restaurant-deliveries'

const defaultZoneNames = [
  'Sala principal',
  'Segundo piso',
  'Tercer piso',
  'Terraza',
  'Afuera',
]

const defaultModifierGroups: Array<{
  title: string
  options: RestaurantOrderModifier[]
}> = [
  {
    title: 'Adiciones',
    options: [
      { id: 'sauce', label: 'Salsa extra', amount: 0, kind: 'ADD' },
      { id: 'protein', label: 'Proteina adicional', amount: 5000, kind: 'ADD' },
      { id: 'drink', label: 'Bebida pequena', amount: 3000, kind: 'ADD' },
    ],
  },
  {
    title: 'Sin ingredientes',
    options: [
      { id: 'no-rice', label: 'Sin arroz', amount: 0, kind: 'REMOVE' },
      { id: 'no-onion', label: 'Sin cebolla', amount: 0, kind: 'REMOVE' },
      { id: 'no-sauce', label: 'Sin salsa', amount: 0, kind: 'REMOVE' },
    ],
  },
]

export const restaurantPaymentMethods = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'DIGITAL_WALLET', label: 'Billetera digital' },
  { value: 'BANK_DEPOSIT', label: 'Deposito bancario' },
  { value: 'OTHER', label: 'Otro' },
] as const

export function getDefaultModifierGroups() {
  return defaultModifierGroups
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createRestaurantOrderItem(
  product: Product,
  quantity = 1,
): RestaurantOrderItem {
  return {
    id: createId('item'),
    productId: product.id,
    productName: product.name,
    unitPrice: product.price,
    quantity,
    note: '',
    modifiers: [],
  }
}

export function calculateOrderItemUnitPrice(item: RestaurantOrderItem) {
  const modifierTotal = item.modifiers.reduce((total, modifier) => {
    if (modifier.kind === 'REMOVE') {
      return total - modifier.amount
    }

    return total + modifier.amount
  }, 0)

  return Math.max(item.unitPrice + modifierTotal, 0)
}

export function calculateOrderItemTotal(item: RestaurantOrderItem) {
  return calculateOrderItemUnitPrice(item) * item.quantity
}

export function calculateOrderSubtotal(items: RestaurantOrderItem[]) {
  return items.reduce((total, item) => total + calculateOrderItemTotal(item), 0)
}

export function buildSaleItemsFromOrderItems(
  items: RestaurantOrderItem[],
  extraAmount = 0,
) {
  const groupedItems = new Map<
    string,
    { productId: string; quantity: number; total: number }
  >()
  const orderSubtotal = calculateOrderSubtotal(items)

  for (const item of items) {
    const currentItem = groupedItems.get(item.productId)

    if (!currentItem) {
      groupedItems.set(item.productId, {
        productId: item.productId,
        quantity: item.quantity,
        total: calculateOrderItemTotal(item),
      })
      continue
    }

    currentItem.quantity += item.quantity
    currentItem.total += calculateOrderItemTotal(item)
  }

  return [...groupedItems.values()].map((item) => {
    const extraShare =
      orderSubtotal > 0 ? (item.total / orderSubtotal) * extraAmount : 0

    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPriceOverride: (item.total + extraShare) / item.quantity,
    }
  })
}

export function createDefaultRestaurantWorkspace(): RestaurantWorkspaceState {
  const zones = defaultZoneNames.map((name, index) => ({
    id: `zone-${index + 1}`,
    name,
    sortOrder: index,
  }))

  const tables = Array.from({ length: 14 }, (_, index) => ({
    id: `table-${index + 1}`,
    zoneId: zones[0].id,
    name: `Mesa ${index + 1}`,
    sortOrder: index,
  }))

  return {
    zones,
    tables,
    orders: {},
  }
}

export function createEmptyTableOrder(input: {
  tableId: string
  employeeId: string
  employeeName: string
  guestCount: number
  comment: string
}): RestaurantTableOrder {
  const now = new Date().toISOString()

  return {
    tableId: input.tableId,
    status: 'OPEN',
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    guestCount: input.guestCount,
    comment: input.comment,
    items: [],
    openedAt: now,
    updatedAt: now,
  }
}

export function touchTableOrder(order: RestaurantTableOrder) {
  return {
    ...order,
    updatedAt: new Date().toISOString(),
  }
}

export function createDeliveryOrder(
  input: Omit<DeliveryOrder, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
): DeliveryOrder {
  const now = new Date().toISOString()

  return {
    ...input,
    id: createId('delivery'),
    status: 'NEW',
    createdAt: now,
    updatedAt: now,
  }
}

export function touchDeliveryOrder(order: DeliveryOrder): DeliveryOrder {
  return {
    ...order,
    updatedAt: new Date().toISOString(),
  }
}

function getBusinessStorageKey(prefix: string, businessId: string | undefined) {
  return `${prefix}:${businessId ?? 'default'}`
}

export function readRestaurantWorkspace(
  businessId: string | undefined,
): RestaurantWorkspaceState {
  if (typeof window === 'undefined') {
    return createDefaultRestaurantWorkspace()
  }

  const storageKey = getBusinessStorageKey(
    restaurantWorkspaceStoragePrefix,
    businessId,
  )
  const storedValue = window.localStorage.getItem(storageKey)

  if (!storedValue) {
    return createDefaultRestaurantWorkspace()
  }

  try {
    return JSON.parse(storedValue) as RestaurantWorkspaceState
  } catch {
    return createDefaultRestaurantWorkspace()
  }
}

export function saveRestaurantWorkspace(
  businessId: string | undefined,
  workspace: RestaurantWorkspaceState,
) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    getBusinessStorageKey(restaurantWorkspaceStoragePrefix, businessId),
    JSON.stringify(workspace),
  )
}

export function readDeliveryOrders(
  businessId: string | undefined,
): DeliveryOrder[] {
  if (typeof window === 'undefined') {
    return []
  }

  const storedValue = window.localStorage.getItem(
    getBusinessStorageKey(restaurantDeliveriesStoragePrefix, businessId),
  )

  if (!storedValue) {
    return []
  }

  try {
    return JSON.parse(storedValue) as DeliveryOrder[]
  } catch {
    return []
  }
}

export function saveDeliveryOrders(
  businessId: string | undefined,
  orders: DeliveryOrder[],
) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    getBusinessStorageKey(restaurantDeliveriesStoragePrefix, businessId),
    JSON.stringify(orders),
  )
}
