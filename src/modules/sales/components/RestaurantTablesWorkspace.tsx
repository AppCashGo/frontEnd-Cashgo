import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCurrentCashRegisterQuery } from '@/modules/cash-register/hooks/use-cash-register-query'
import { useCustomersQuery } from '@/modules/customers/hooks/use-customers-query'
import { useEmployeesQuery } from '@/modules/employees/hooks/use-employees-query'
import { useInventoryCategoriesQuery } from '@/modules/inventory/hooks/use-inventory-query'
import { useProductsQuery } from '@/modules/products/hooks/use-products-query'
import type { Product } from '@/modules/products/types/product'
import type {
  RestaurantOrderItem,
  RestaurantTableOrder,
} from '@/modules/restaurant/types/restaurant'
import {
  useCreateRestaurantTableMutation,
  useCreateRestaurantZoneMutation,
  useDeleteRestaurantTableMutation,
  useDeleteRestaurantZoneMutation,
  useRestaurantWorkspaceQuery,
  useUpdateRestaurantTableMutation,
  useUpdateRestaurantZoneMutation,
} from '@/modules/restaurant/hooks/use-restaurant-query'
import {
  buildSaleItemsFromOrderItems,
  calculateOrderItemTotal,
  calculateOrderItemUnitPrice,
  calculateOrderSubtotal,
  createDefaultRestaurantWorkspace,
  createEmptyTableOrder,
  createRestaurantOrderItem,
  getDefaultModifierGroups,
  readRestaurantWorkspace,
  restaurantPaymentMethods,
  saveRestaurantWorkspace,
  touchTableOrder,
} from '@/modules/restaurant/utils/restaurant-workspace'
import { useCreateSaleMutation } from '@/modules/sales/hooks/use-create-sale-mutation'
import type { SalePaymentMethod } from '@/modules/sales/types/sale'
import { routePaths } from '@/routes/route-paths'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './RestaurantTablesWorkspace.module.css'

type TablePanelMode = 'ORDER' | 'CLOSE'
type GuestOption = '1' | '2' | '3' | '4' | '5' | '6' | '7' | 'OTHER'

const guestOptions: GuestOption[] = ['1', '2', '3', '4', '5', '6', '7', 'OTHER']

type CounterSaleItem = {
  product: Product
  quantity: number
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function parseMoneyInput(value: string) {
  const normalizedValue = value.replace(/[^\d.]/g, '')
  const parsedValue = Number(normalizedValue)

  return Number.isFinite(parsedValue) ? Math.max(parsedValue, 0) : 0
}

function getProductCategoryLabel(
  product: Product,
  categoryNameById: Map<string, string>,
) {
  if (!product.categoryId) {
    return 'Sin categoria'
  }

  return categoryNameById.get(product.categoryId) ?? 'Sin categoria'
}

function getItemModifierSummary(item: RestaurantOrderItem) {
  if (item.modifiers.length === 0) {
    return ''
  }

  return item.modifiers
    .map((modifier) => {
      const prefix = modifier.kind === 'REMOVE' ? 'Sin' : '+'
      const amount = modifier.amount > 0 ? ` ${formatCurrency(modifier.amount)}` : ''

      return `${prefix} ${modifier.label}${amount}`
    })
    .join(', ')
}

function createSaleNotes(input: {
  source: string
  location: string
  employeeName: string
  guestCount: number
  comment: string
  items: RestaurantOrderItem[]
  tipAmount: number
}) {
  const itemLines = input.items.map((item) => {
    const modifierSummary = getItemModifierSummary(item)
    const note = normalizeOptionalText(item.note)
    const details = [modifierSummary, note].filter(Boolean).join(' | ')

    return `${item.quantity} x ${item.productName}${details ? ` (${details})` : ''}`
  })

  return [
    `${input.source}: ${input.location}`,
    `Atendido por: ${input.employeeName}`,
    `Personas: ${input.guestCount}`,
    input.comment ? `Comentario: ${input.comment}` : null,
    input.tipAmount > 0 ? `Propina incluida: ${formatCurrency(input.tipAmount)}` : null,
    `Productos: ${itemLines.join('; ')}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function RestaurantTablesWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentUser = useAuthSessionStore((state) => state.user)
  const businessId = currentUser?.businessId
  const currentCashRegisterQuery = useCurrentCashRegisterQuery()
  const productsQuery = useProductsQuery()
  const customersQuery = useCustomersQuery()
  const employeesQuery = useEmployeesQuery()
  const categoriesQuery = useInventoryCategoriesQuery()
  const restaurantWorkspaceQuery = useRestaurantWorkspaceQuery()
  const createRestaurantZoneMutation = useCreateRestaurantZoneMutation()
  const updateRestaurantZoneMutation = useUpdateRestaurantZoneMutation()
  const deleteRestaurantZoneMutation = useDeleteRestaurantZoneMutation()
  const createRestaurantTableMutation = useCreateRestaurantTableMutation()
  const updateRestaurantTableMutation = useUpdateRestaurantTableMutation()
  const deleteRestaurantTableMutation = useDeleteRestaurantTableMutation()
  const createSaleMutation = useCreateSaleMutation()

  const [workspace, setWorkspace] = useState(createDefaultRestaurantWorkspace)
  const [hasLoadedWorkspace, setHasLoadedWorkspace] = useState(false)
  const [activeZoneId, setActiveZoneId] = useState('')
  const [selectedTableId, setSelectedTableId] = useState('')
  const [tableSearchValue, setTableSearchValue] = useState('')
  const [panelMode, setPanelMode] = useState<TablePanelMode>('ORDER')
  const [isProductBrowserOpen, setIsProductBrowserOpen] = useState(false)
  const [productSearchValue, setProductSearchValue] = useState('')
  const [activeProductCategory, setActiveProductCategory] = useState('ALL')
  const [operationError, setOperationError] = useState<string | null>(null)
  const [isCounterSaleOpen, setIsCounterSaleOpen] = useState(false)
  const [counterSaleItems, setCounterSaleItems] = useState<CounterSaleItem[]>([])
  const [counterSaleSearchValue, setCounterSaleSearchValue] = useState('')
  const [counterSaleCategory, setCounterSaleCategory] = useState('ALL')
  const [counterSaleCustomerId, setCounterSaleCustomerId] = useState('')
  const [counterSalePaymentMethod, setCounterSalePaymentMethod] =
    useState<SalePaymentMethod>('CASH')
  const [counterSaleDiscountInput, setCounterSaleDiscountInput] = useState('0')
  const [counterSaleTipPercentInput, setCounterSaleTipPercentInput] = useState('0')
  const [counterSaleCashReceivedInput, setCounterSaleCashReceivedInput] = useState('')
  const [isFreeSaleOpen, setIsFreeSaleOpen] = useState(false)
  const [freeSaleConcept, setFreeSaleConcept] = useState('')
  const [freeSaleAmountInput, setFreeSaleAmountInput] = useState('')
  const [freeSaleCustomerId, setFreeSaleCustomerId] = useState('')
  const [freeSalePaymentMethod, setFreeSalePaymentMethod] =
    useState<SalePaymentMethod>('CASH')
  const [freeSaleCashReceivedInput, setFreeSaleCashReceivedInput] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [guestCountOption, setGuestCountOption] = useState<GuestOption>('1')
  const [customGuestCount, setCustomGuestCount] = useState('')
  const [tableComment, setTableComment] = useState('')
  const [modifierItemId, setModifierItemId] = useState<string | null>(null)
  const [selectedCloseItemIds, setSelectedCloseItemIds] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('CASH')
  const [customerId, setCustomerId] = useState('')
  const [discountInput, setDiscountInput] = useState('0')
  const [tipPercentInput, setTipPercentInput] = useState('0')
  const [cashReceivedInput, setCashReceivedInput] = useState('')
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false)
  const [moveTargetZoneId, setMoveTargetZoneId] = useState('')
  const [moveTargetTableId, setMoveTargetTableId] = useState('')
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isAddingZone, setIsAddingZone] = useState(false)
  const [isEditingZone, setIsEditingZone] = useState(false)
  const [editingZoneName, setEditingZoneName] = useState('')
  const [newZoneName, setNewZoneName] = useState('')
  const [isAddingTable, setIsAddingTable] = useState(false)
  const [newTableName, setNewTableName] = useState('')
  const [newTableZoneId, setNewTableZoneId] = useState('')
  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const [editingTableName, setEditingTableName] = useState('')

  const currentCashRegisterSession = currentCashRegisterQuery.data ?? null
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data])
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )

  const employeeOptions = useMemo(() => {
    const options = new Map<string, string>()

    if (currentUser) {
      options.set(currentUser.id, currentUser.name)
    }

    for (const employee of employeesQuery.data ?? []) {
      options.set(employee.id, employee.name)
    }

    return [...options.entries()].map(([id, name]) => ({ id, name }))
  }, [currentUser, employeesQuery.data])

  useEffect(() => {
    const saleMode = searchParams.get('sale')

    if (saleMode !== 'products' && saleMode !== 'free') {
      return
    }

    if (saleMode === 'products') {
      setIsCounterSaleOpen(true)
    } else {
      setIsFreeSaleOpen(true)
    }

    setOperationError(null)

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('sale')
    setSearchParams(nextSearchParams, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const storedWorkspace = readRestaurantWorkspace(businessId)

    setWorkspace(storedWorkspace)
    setActiveZoneId(storedWorkspace.zones[0]?.id ?? '')
    setSelectedTableId('')
    setNewTableZoneId(storedWorkspace.zones[0]?.id ?? '')
    setHasLoadedWorkspace(true)
  }, [businessId])

  useEffect(() => {
    const remoteWorkspace = restaurantWorkspaceQuery.data

    if (!remoteWorkspace) {
      return
    }

    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      zones: remoteWorkspace.zones,
      tables: remoteWorkspace.tables,
    }))

    setActiveZoneId((currentActiveZoneId) => {
      if (
        currentActiveZoneId &&
        remoteWorkspace.zones.some((zone) => zone.id === currentActiveZoneId)
      ) {
        return currentActiveZoneId
      }

      return remoteWorkspace.zones[0]?.id ?? ''
    })
    setNewTableZoneId((currentZoneId) => {
      if (
        currentZoneId &&
        remoteWorkspace.zones.some((zone) => zone.id === currentZoneId)
      ) {
        return currentZoneId
      }

      return remoteWorkspace.zones[0]?.id ?? ''
    })
  }, [restaurantWorkspaceQuery.data])

  useEffect(() => {
    if (!hasLoadedWorkspace) {
      return
    }

    saveRestaurantWorkspace(businessId, workspace)
  }, [businessId, hasLoadedWorkspace, workspace])

  useEffect(() => {
    if (employeeId || employeeOptions.length === 0) {
      return
    }

    setEmployeeId(employeeOptions[0].id)
  }, [employeeId, employeeOptions])

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const productCategories = useMemo(() => {
    const categoryLabels = new Map<string, string>()

    for (const product of products) {
      if (!product.isActive || !product.isVisibleInCatalog) {
        continue
      }

      categoryLabels.set(
        product.categoryId ?? 'UNCATEGORIZED',
        getProductCategoryLabel(product, categoryNameById),
      )
    }

    return [...categoryLabels.entries()].map(([id, label]) => ({ id, label }))
  }, [categoryNameById, products])

  const filteredProducts = useMemo(() => {
    const normalizedSearchValue = productSearchValue.trim().toLowerCase()

    return products
      .filter((product) => product.isActive && product.isVisibleInCatalog)
      .filter((product) => {
        if (activeProductCategory === 'ALL') {
          return true
        }

        return (product.categoryId ?? 'UNCATEGORIZED') === activeProductCategory
      })
      .filter((product) => {
        if (!normalizedSearchValue) {
          return true
        }

        return product.name.toLowerCase().includes(normalizedSearchValue)
      })
      .sort((firstProduct, secondProduct) =>
        firstProduct.name.localeCompare(secondProduct.name),
      )
  }, [activeProductCategory, productSearchValue, products])

  const filteredCounterSaleProducts = useMemo(() => {
    const normalizedSearchValue = counterSaleSearchValue.trim().toLowerCase()

    return products
      .filter((product) => product.isActive && product.isVisibleInCatalog)
      .filter((product) => {
        if (counterSaleCategory === 'ALL') {
          return true
        }

        return (product.categoryId ?? 'UNCATEGORIZED') === counterSaleCategory
      })
      .filter((product) => {
        if (!normalizedSearchValue) {
          return true
        }

        return product.name.toLowerCase().includes(normalizedSearchValue)
      })
      .sort((firstProduct, secondProduct) =>
        firstProduct.name.localeCompare(secondProduct.name),
      )
  }, [counterSaleCategory, counterSaleSearchValue, products])

  const activeZone = workspace.zones.find((zone) => zone.id === activeZoneId)
  const selectedTable = workspace.tables.find((table) => table.id === selectedTableId)
  const selectedOrder = selectedTableId ? workspace.orders[selectedTableId] : undefined
  const visibleTables = workspace.tables
    .filter((table) => table.zoneId === activeZoneId)
    .filter((table) =>
      table.name.toLowerCase().includes(tableSearchValue.trim().toLowerCase()),
    )
    .sort((firstTable, secondTable) => firstTable.sortOrder - secondTable.sortOrder)
  const activeZoneTables = workspace.tables
    .filter((table) => table.zoneId === activeZoneId)
    .sort((firstTable, secondTable) => firstTable.sortOrder - secondTable.sortOrder)
  const selectedEmployeeName =
    employeeOptions.find((employee) => employee.id === employeeId)?.name ??
    currentUser?.name ??
    'Empleado'
  const guestCount =
    guestCountOption === 'OTHER'
      ? Math.max(Math.trunc(parseMoneyInput(customGuestCount)), 0)
      : Number(guestCountOption)
  const closeItems =
    selectedOrder?.items.filter((item) => selectedCloseItemIds.includes(item.id)) ?? []
  const selectedSubtotal = calculateOrderSubtotal(closeItems)
  const discountTotal = Math.min(parseMoneyInput(discountInput), selectedSubtotal)
  const tipPercent = Math.min(parseMoneyInput(tipPercentInput), 100)
  const tipAmount = Math.round((selectedSubtotal * tipPercent) / 100)
  const selectedTotal = Math.max(selectedSubtotal + tipAmount - discountTotal, 0)
  const cashReceived = parseMoneyInput(cashReceivedInput)
  const changeDue =
    paymentMethod === 'CASH' && cashReceived > selectedTotal
      ? cashReceived - selectedTotal
      : 0
  const counterSaleSubtotal = counterSaleItems.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  )
  const counterSaleDiscountTotal = Math.min(
    parseMoneyInput(counterSaleDiscountInput),
    counterSaleSubtotal,
  )
  const counterSaleTipPercent = Math.min(
    parseMoneyInput(counterSaleTipPercentInput),
    100,
  )
  const counterSaleTipAmount = Math.round(
    (counterSaleSubtotal * counterSaleTipPercent) / 100,
  )
  const counterSaleTotal = Math.max(
    counterSaleSubtotal + counterSaleTipAmount - counterSaleDiscountTotal,
    0,
  )
  const counterSaleCashReceived = parseMoneyInput(counterSaleCashReceivedInput)
  const counterSaleChangeDue =
    counterSalePaymentMethod === 'CASH' && counterSaleCashReceived > counterSaleTotal
      ? counterSaleCashReceived - counterSaleTotal
      : 0
  const freeSaleAmount = parseMoneyInput(freeSaleAmountInput)
  const freeSaleCashReceived = parseMoneyInput(freeSaleCashReceivedInput)
  const freeSaleChangeDue =
    freeSalePaymentMethod === 'CASH' && freeSaleCashReceived > freeSaleAmount
      ? freeSaleCashReceived - freeSaleAmount
      : 0
  const modifierItem =
    selectedOrder?.items.find((item) => item.id === modifierItemId) ?? null
  const closedMoveTargets = workspace.tables.filter(
    (table) => table.id !== selectedTableId && !workspace.orders[table.id],
  )

  function handleSelectZone(zoneId: string) {
    setActiveZoneId(zoneId)
    setNewTableZoneId(zoneId)
    setSelectedTableId('')
    setSelectedCloseItemIds([])
    setPanelMode('ORDER')
    setOperationError(null)
  }

  function selectTable(tableId: string) {
    setSelectedTableId(tableId)
    setPanelMode('ORDER')
    setOperationError(null)

    const order = workspace.orders[tableId]

    if (order) {
      setSelectedCloseItemIds(order.items.map((item) => item.id))
    } else {
      setSelectedCloseItemIds([])
    }
  }

  function resetCounterSaleForm() {
    setCounterSaleItems([])
    setCounterSaleSearchValue('')
    setCounterSaleCategory('ALL')
    setCounterSaleCustomerId('')
    setCounterSalePaymentMethod('CASH')
    setCounterSaleDiscountInput('0')
    setCounterSaleTipPercentInput('0')
    setCounterSaleCashReceivedInput('')
  }

  function resetFreeSaleForm() {
    setFreeSaleConcept('')
    setFreeSaleAmountInput('')
    setFreeSaleCustomerId('')
    setFreeSalePaymentMethod('CASH')
    setFreeSaleCashReceivedInput('')
  }

  function handleAddCounterSaleProduct(product: Product) {
    setCounterSaleItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product.id === product.id,
      )

      if (!existingItem) {
        return [...currentItems, { product, quantity: 1 }]
      }

      return currentItems.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      )
    })
    setOperationError(null)
  }

  function handleCounterSaleQuantityChange(productId: string, nextQuantity: number) {
    setCounterSaleItems((currentItems) =>
      currentItems.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(nextQuantity, 1) }
          : item,
      ),
    )
  }

  function handleRemoveCounterSaleProduct(productId: string) {
    setCounterSaleItems((currentItems) =>
      currentItems.filter((item) => item.product.id !== productId),
    )
  }

  async function handleCreateCounterSale() {
    if (counterSaleItems.length === 0) {
      setOperationError('Agrega al menos un producto a la venta.')
      return
    }

    try {
      const sale = await createSaleMutation.mutateAsync({
        items: counterSaleItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        customerId: normalizeOptionalText(counterSaleCustomerId),
        cashRegisterId: currentCashRegisterSession?.id,
        discountTotal: counterSaleDiscountTotal,
        notes: 'Mostrador restaurante',
        payments:
          counterSaleTotal > 0
            ? [
                {
                  method: counterSalePaymentMethod,
                  amount: counterSaleTotal,
                  notes: 'Venta con productos desde mostrador',
                },
              ]
            : [],
      })

      setOperationError(`Venta ${sale.saleNumber} registrada desde mostrador.`)
      resetCounterSaleForm()
      setIsCounterSaleOpen(false)
    } catch (error) {
      setOperationError(
        getErrorMessage(error, 'No se pudo registrar la venta con productos.'),
      )
    }
  }

  async function handleCreateFreeSale() {
    if (freeSaleAmount <= 0) {
      setOperationError('Ingresa un valor valido para la venta libre.')
      return
    }

    try {
      const sale = await createSaleMutation.mutateAsync({
        items: [],
        manualSubtotal: freeSaleAmount,
        customerId: normalizeOptionalText(freeSaleCustomerId),
        cashRegisterId: currentCashRegisterSession?.id,
        notes:
          normalizeOptionalText(freeSaleConcept) ?? 'Venta libre restaurante',
        payments:
          freeSaleAmount > 0
            ? [
                {
                  method: freeSalePaymentMethod,
                  amount: freeSaleAmount,
                  notes: 'Venta libre desde restaurante',
                },
              ]
            : [],
      })

      setOperationError(`Venta libre ${sale.saleNumber} registrada.`)
      resetFreeSaleForm()
      setIsFreeSaleOpen(false)
    } catch (error) {
      setOperationError(
        getErrorMessage(error, 'No se pudo registrar la venta libre.'),
      )
    }
  }

  function updateSelectedOrder(
    updater: (order: RestaurantTableOrder) => RestaurantTableOrder,
  ) {
    if (!selectedOrder) {
      return
    }

    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      orders: {
        ...currentWorkspace.orders,
        [selectedOrder.tableId]: touchTableOrder(updater(selectedOrder)),
      },
    }))
  }

  function handleOpenTable() {
    if (!selectedTable) {
      return
    }

    if (guestCount <= 0) {
      setOperationError('Indica cuantas personas atendera esta mesa.')
      return
    }

    const order = createEmptyTableOrder({
      tableId: selectedTable.id,
      employeeId,
      employeeName: selectedEmployeeName,
      guestCount,
      comment: tableComment.trim(),
    })

    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      orders: {
        ...currentWorkspace.orders,
        [selectedTable.id]: order,
      },
    }))
    setTableComment('')
    setGuestCountOption('1')
    setCustomGuestCount('')
    setSelectedCloseItemIds([])
    setPanelMode('ORDER')
    setOperationError(null)
  }

  function handleAddProduct(product: Product) {
    if (!selectedOrder) {
      setOperationError('Abre o selecciona una mesa antes de agregar productos.')
      return
    }

    updateSelectedOrder((order) => {
      const existingItem = order.items.find(
        (item) =>
          item.productId === product.id &&
          item.modifiers.length === 0 &&
          item.note.trim().length === 0,
      )

      if (existingItem) {
        return {
          ...order,
          items: order.items.map((item) =>
            item.id === existingItem.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        }
      }

      return {
        ...order,
        items: [...order.items, createRestaurantOrderItem(product)],
      }
    })
    setOperationError(null)
  }

  function handleQuantityChange(itemId: string, nextQuantity: number) {
    updateSelectedOrder((order) => ({
      ...order,
      items: order.items.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(nextQuantity, 1) }
          : item,
      ),
    }))
  }

  function handleRemoveItem(itemId: string) {
    updateSelectedOrder((order) => ({
      ...order,
      items: order.items.filter((item) => item.id !== itemId),
    }))
    setSelectedCloseItemIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== itemId),
    )
  }

  function handleToggleModifier(itemId: string, modifierId: string) {
    const modifier = getDefaultModifierGroups()
      .flatMap((group) => group.options)
      .find((option) => option.id === modifierId)

    if (!modifier) {
      return
    }

    updateSelectedOrder((order) => ({
      ...order,
      items: order.items.map((item) => {
        if (item.id !== itemId) {
          return item
        }

        const hasModifier = item.modifiers.some(
          (currentModifier) => currentModifier.id === modifier.id,
        )

        return {
          ...item,
          modifiers: hasModifier
            ? item.modifiers.filter(
                (currentModifier) => currentModifier.id !== modifier.id,
              )
            : [...item.modifiers, modifier],
        }
      }),
    }))
  }

  function handleItemNoteChange(itemId: string, note: string) {
    updateSelectedOrder((order) => ({
      ...order,
      items: order.items.map((item) =>
        item.id === itemId ? { ...item, note } : item,
      ),
    }))
  }

  function handleMoveTable() {
    if (!selectedOrder || !moveTargetTableId) {
      return
    }

    setWorkspace((currentWorkspace) => {
      const nextOrders = { ...currentWorkspace.orders }
      nextOrders[moveTargetTableId] = {
        ...selectedOrder,
        tableId: moveTargetTableId,
        updatedAt: new Date().toISOString(),
      }
      delete nextOrders[selectedOrder.tableId]

      return {
        ...currentWorkspace,
        orders: nextOrders,
      }
    })
    setSelectedTableId(moveTargetTableId)
    setIsMoveDialogOpen(false)
    setMoveTargetTableId('')
  }

  async function handleAddZone() {
    const trimmedName = newZoneName.trim()

    if (!trimmedName) {
      return
    }

    const normalizedName = trimmedName.toLowerCase()
    const duplicatedZone = workspace.zones.some(
      (zone) => zone.name.trim().toLowerCase() === normalizedName,
    )

    if (duplicatedZone) {
      setOperationError('Ya existe una sala con ese nombre.')
      return
    }

    try {
      const zone = await createRestaurantZoneMutation.mutateAsync({
        name: trimmedName,
        sortOrder: workspace.zones.length,
      })

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        zones: [...currentWorkspace.zones, zone],
      }))
      setActiveZoneId(zone.id)
      setNewTableZoneId(zone.id)
      setNewZoneName('')
      setIsAddingZone(false)
      setIsEditingZone(false)
      setEditingZoneName('')
      setOperationError(null)
    } catch (error) {
      setOperationError(
        getErrorMessage(error, 'No se pudo crear la sala en este momento.'),
      )
    }
  }

  function handleStartEditZone() {
    if (!activeZone) {
      return
    }

    setIsAddingTable(false)
    setEditingTableId(null)
    setEditingTableName('')
    setIsAddingZone(false)
    setIsEditingZone(true)
    setEditingZoneName(activeZone.name)
  }

  async function handleSaveZoneName() {
    const trimmedName = editingZoneName.trim()

    if (!activeZone || !trimmedName) {
      return
    }

    const normalizedName = trimmedName.toLowerCase()
    const duplicatedZone = workspace.zones.some(
      (zone) =>
        zone.id !== activeZone.id &&
        zone.name.trim().toLowerCase() === normalizedName,
    )

    if (duplicatedZone) {
      setOperationError('Ya existe una sala con ese nombre.')
      return
    }

    try {
      const updatedZone = await updateRestaurantZoneMutation.mutateAsync({
        zoneId: activeZone.id,
        input: {
          name: trimmedName,
        },
      })

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        zones: currentWorkspace.zones.map((zone) =>
          zone.id === updatedZone.id ? updatedZone : zone,
        ),
      }))
      setIsEditingZone(false)
      setEditingZoneName('')
      setOperationError(null)
    } catch (error) {
      setOperationError(
        getErrorMessage(error, 'No se pudo actualizar la sala.'),
      )
    }
  }

  async function handleDeleteZone() {
    if (!activeZone) {
      return
    }

    if (workspace.zones.length <= 1) {
      setOperationError('Debes conservar al menos una sala.')
      return
    }

    const tableIdsInZone = workspace.tables
      .filter((table) => table.zoneId === activeZone.id)
      .map((table) => table.id)
    const hasOpenOrders = tableIdsInZone.some((tableId) => workspace.orders[tableId])

    if (hasOpenOrders) {
      setOperationError('Cierra o mueve las mesas abiertas antes de eliminar la sala.')
      return
    }

    const nextZones = workspace.zones
      .filter((zone) => zone.id !== activeZone.id)
      .map((zone, index) => ({ ...zone, sortOrder: index }))
    const nextActiveZoneId = nextZones[0]?.id ?? ''

    try {
      await deleteRestaurantZoneMutation.mutateAsync(activeZone.id)

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        zones: nextZones,
        tables: currentWorkspace.tables.filter(
          (table) => table.zoneId !== activeZone.id,
        ),
      }))
      setActiveZoneId(nextActiveZoneId)
      setNewTableZoneId(nextActiveZoneId)
      setSelectedTableId('')
      setIsAddingTable(false)
      setEditingTableId(null)
      setIsEditingZone(false)
      setEditingZoneName('')
      setOperationError(null)
    } catch (error) {
      setOperationError(
        getErrorMessage(error, 'No se pudo eliminar la sala.'),
      )
    }
  }

  function handleStartAddTable() {
    const nextNumber = activeZoneTables.length + 1

    setIsAddingTable(true)
    setIsAddingZone(false)
    setIsEditingZone(false)
    setEditingZoneName('')
    setEditingTableId(null)
    setNewTableZoneId(activeZoneId)
    setNewTableName(`Mesa ${nextNumber}`)
    setOperationError(null)
  }

  async function handleAddTable() {
    const trimmedName = newTableName.trim()
    const zoneId = newTableZoneId || activeZoneId || workspace.zones[0]?.id

    if (!trimmedName || !zoneId) {
      return
    }

    const normalizedName = trimmedName.toLowerCase()
    const duplicatedTable = workspace.tables.some(
      (table) =>
        table.zoneId === zoneId &&
        table.name.trim().toLowerCase() === normalizedName,
    )

    if (duplicatedTable) {
      setOperationError('Ya existe una mesa con ese nombre en esta sala.')
      return
    }

    try {
      const tablesInZone = workspace.tables.filter((table) => table.zoneId === zoneId)
      const table = await createRestaurantTableMutation.mutateAsync({
        zoneId,
        name: trimmedName,
        sortOrder: tablesInZone.length,
      })

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        tables: [...currentWorkspace.tables, table],
      }))
      setActiveZoneId(table.zoneId)
      if (!isConfigOpen) {
        setSelectedTableId(table.id)
      }
      setNewTableName('')
      setIsAddingTable(false)
      setOperationError(null)
    } catch (error) {
      setOperationError(
        getErrorMessage(error, 'No se pudo crear la mesa en este momento.'),
      )
    }
  }

  function handleStartEditTable(tableId: string) {
    const table = workspace.tables.find((currentTable) => currentTable.id === tableId)

    if (!table) {
      return
    }

    setEditingTableId(table.id)
    setEditingTableName(table.name)
    setIsAddingTable(false)
    setIsAddingZone(false)
    setIsEditingZone(false)
    setEditingZoneName('')
    setNewTableZoneId(table.zoneId)
  }

  async function handleSaveTableName() {
    const trimmedName = editingTableName.trim()
    const tableToUpdate = workspace.tables.find((table) => table.id === editingTableId)

    if (!editingTableId || !trimmedName || !tableToUpdate) {
      return
    }

    const normalizedName = trimmedName.toLowerCase()
    const duplicatedTable = workspace.tables.some(
      (table) =>
        table.id !== editingTableId &&
        table.zoneId === tableToUpdate.zoneId &&
        table.name.trim().toLowerCase() === normalizedName,
    )

    if (duplicatedTable) {
      setOperationError('Ya existe una mesa con ese nombre en esta sala.')
      return
    }

    try {
      const updatedTable = await updateRestaurantTableMutation.mutateAsync({
        tableId: editingTableId,
        input: {
          name: trimmedName,
          zoneId: tableToUpdate.zoneId,
        },
      })

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        tables: currentWorkspace.tables.map((table) =>
          table.id === updatedTable.id ? updatedTable : table,
        ),
      }))
      setEditingTableId(null)
      setEditingTableName('')
      setOperationError(null)
    } catch (error) {
      setOperationError(
        getErrorMessage(error, 'No se pudo actualizar la mesa.'),
      )
    }
  }

  async function handleDeleteTable(tableId: string) {
    if (workspace.orders[tableId]) {
      setOperationError('Cierra o mueve el pedido antes de eliminar la mesa.')
      return
    }

    try {
      await deleteRestaurantTableMutation.mutateAsync(tableId)

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        tables: currentWorkspace.tables.filter((table) => table.id !== tableId),
      }))

      if (selectedTableId === tableId) {
        setSelectedTableId('')
      }

      if (editingTableId === tableId) {
        setEditingTableId(null)
        setEditingTableName('')
      }

      setOperationError(null)
    } catch (error) {
      setOperationError(
        getErrorMessage(error, 'No se pudo eliminar la mesa.'),
      )
    }
  }

  function handleFinishConfiguration() {
    setIsConfigOpen(false)
    setIsAddingZone(false)
    setIsEditingZone(false)
    setEditingZoneName('')
    setNewZoneName('')
    setIsAddingTable(false)
    setNewTableName('')
    setEditingTableId(null)
    setEditingTableName('')
    setOperationError(null)
  }

  function resetCloseForm() {
    setCustomerId('')
    setDiscountInput('0')
    setTipPercentInput('0')
    setCashReceivedInput('')
    setPaymentMethod('CASH')
  }

  async function handleConfirmClose() {
    if (!selectedOrder || !selectedTable) {
      return
    }

    if (closeItems.length === 0) {
      setOperationError('Selecciona al menos un producto para cobrar.')
      return
    }

    try {
      const sale = await createSaleMutation.mutateAsync({
        items: buildSaleItemsFromOrderItems(closeItems, tipAmount),
        customerId: normalizeOptionalText(customerId),
        cashRegisterId: currentCashRegisterSession?.id,
        discountTotal,
        notes: createSaleNotes({
          source: 'Mesa',
          location: selectedTable.name,
          employeeName: selectedOrder.employeeName,
          guestCount: selectedOrder.guestCount,
          comment: selectedOrder.comment,
          items: closeItems,
          tipAmount,
        }),
        payments:
          selectedTotal > 0
            ? [
                {
                  method: paymentMethod,
                  amount: selectedTotal,
                  notes: 'Cierre de mesa',
                },
              ]
            : [],
      })

      setWorkspace((currentWorkspace) => {
        const remainingItems = selectedOrder.items.filter(
          (item) => !selectedCloseItemIds.includes(item.id),
        )
        const nextOrders = { ...currentWorkspace.orders }

        if (remainingItems.length === 0) {
          delete nextOrders[selectedOrder.tableId]
        } else {
          nextOrders[selectedOrder.tableId] = touchTableOrder({
            ...selectedOrder,
            items: remainingItems,
          })
        }

        return {
          ...currentWorkspace,
          orders: nextOrders,
        }
      })
      setOperationError(`Venta ${sale.saleNumber} registrada correctamente.`)
      setPanelMode('ORDER')
      setSelectedCloseItemIds([])
      resetCloseForm()
    } catch (error) {
      setOperationError(
        getErrorMessage(error, 'No se pudo cerrar la mesa en este momento.'),
      )
    }
  }

  function renderEmptyTablePanel() {
    return (
      <aside className={`${styles.detailPanel} ${styles.emptySelectionPanel}`}>
        <div className={styles.emptySelectionIcon}>MS</div>
        <strong>Elige una mesa</strong>
        <span>Selecciona una mesa para abrirla, atenderla o revisar su cuenta.</span>
      </aside>
    )
  }

  function renderClosedTablePanel() {
    return (
      <aside className={styles.detailPanel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Mesa cerrada</p>
            <h3>{selectedTable?.name ?? 'Selecciona una mesa'}</h3>
          </div>
        </div>

        <label className={styles.field}>
          <span>Empleado encargado</span>
          <select
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
          >
            {employeeOptions.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.field}>
          <span>Numero de personas</span>
          <div className={styles.chipGrid}>
            {guestOptions.map((option) => (
              <button
                className={
                  guestCountOption === option ? styles.activeChip : styles.chip
                }
                key={option}
                type="button"
                onClick={() => setGuestCountOption(option)}
              >
                {option === 'OTHER' ? 'Otro' : option}
              </button>
            ))}
          </div>
          {guestCountOption === 'OTHER' ? (
            <input
              inputMode="numeric"
              placeholder="Cantidad"
              value={customGuestCount}
              onChange={(event) => setCustomGuestCount(event.target.value)}
            />
          ) : null}
        </div>

        <label className={styles.field}>
          <span>Comentario</span>
          <textarea
            rows={4}
            value={tableComment}
            onChange={(event) => setTableComment(event.target.value)}
          />
        </label>

        <button
          className={styles.primaryAction}
          disabled={!selectedTable || employeeOptions.length === 0}
          type="button"
          onClick={handleOpenTable}
        >
          Abrir mesa
        </button>
      </aside>
    )
  }

  function renderOrderPanel() {
    if (!selectedTable) {
      return renderEmptyTablePanel()
    }

    if (!selectedOrder) {
      return renderClosedTablePanel()
    }

    const subtotal = calculateOrderSubtotal(selectedOrder.items)

    if (panelMode === 'CLOSE') {
      return (
        <aside className={styles.detailPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Cerrar</p>
              <h3>{selectedTable.name}</h3>
            </div>
            <button
              className={styles.iconButton}
              type="button"
              onClick={() => setPanelMode('ORDER')}
            >
              x
            </button>
          </div>

          <div className={styles.closeList}>
            {selectedOrder.items.map((item) => (
              <label className={styles.payableItem} key={item.id}>
                <span>
                  <strong>{item.productName}</strong>
                  <small>
                    {item.quantity} und - {formatCurrency(calculateOrderItemTotal(item))}
                  </small>
                </span>
                <input
                  checked={selectedCloseItemIds.includes(item.id)}
                  type="checkbox"
                  onChange={(event) => {
                    setSelectedCloseItemIds((currentIds) =>
                      event.target.checked
                        ? [...currentIds, item.id]
                        : currentIds.filter((currentId) => currentId !== item.id),
                    )
                  }}
                />
              </label>
            ))}
          </div>

          <label className={styles.field}>
            <span>Cliente</span>
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="">Sin cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.twoColumns}>
            <label className={styles.field}>
              <span>Descuento</span>
              <input
                inputMode="decimal"
                value={discountInput}
                onChange={(event) => setDiscountInput(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Propina %</span>
              <input
                inputMode="decimal"
                value={tipPercentInput}
                onChange={(event) => setTipPercentInput(event.target.value)}
              />
            </label>
          </div>

          <div className={styles.paymentGrid}>
            {restaurantPaymentMethods.map((method) => (
              <button
                className={
                  paymentMethod === method.value
                    ? styles.activePaymentMethod
                    : styles.paymentMethod
                }
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value)}
              >
                {method.label}
              </button>
            ))}
          </div>

          {paymentMethod === 'CASH' ? (
            <label className={styles.field}>
              <span>Con cuanto paga</span>
              <input
                inputMode="decimal"
                placeholder={formatCurrency(selectedTotal)}
                value={cashReceivedInput}
                onChange={(event) => setCashReceivedInput(event.target.value)}
              />
            </label>
          ) : null}

          <div className={styles.totalsBox}>
            <span>Subtotal</span>
            <strong>{formatCurrency(selectedSubtotal)}</strong>
            <span>Propina</span>
            <strong>{formatCurrency(tipAmount)}</strong>
            <span>Descuento</span>
            <strong>-{formatCurrency(discountTotal)}</strong>
            <span>Cambio</span>
            <strong>{formatCurrency(changeDue)}</strong>
            <span>Total</span>
            <strong>{formatCurrency(selectedTotal)}</strong>
          </div>

          <button
            className={styles.primaryAction}
            disabled={createSaleMutation.isPending || closeItems.length === 0}
            type="button"
            onClick={() => {
              void handleConfirmClose()
            }}
          >
            {createSaleMutation.isPending ? 'Confirmando...' : 'Confirmar cierre'}
          </button>
        </aside>
      )
    }

    return (
      <aside className={styles.detailPanel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>
              Atendido por {selectedOrder.employeeName}
            </p>
            <h3>{selectedTable.name}</h3>
          </div>
          <button
            className={styles.iconButton}
            type="button"
            onClick={() => {
              setMoveTargetZoneId(activeZoneId)
              setIsMoveDialogOpen(true)
            }}
          >
            Mover
          </button>
        </div>

        <div className={styles.orderMeta}>
          <span>{selectedOrder.guestCount} personas</span>
          {selectedOrder.comment ? <span>{selectedOrder.comment}</span> : null}
        </div>

        <div className={styles.panelSectionHeader}>
          <h4>Productos</h4>
          <button
            className={styles.secondaryAction}
            type="button"
            onClick={() => setIsProductBrowserOpen(true)}
          >
            Agregar productos
          </button>
        </div>

        {selectedOrder.items.length === 0 ? (
          <div className={styles.emptyPanel}>
            <strong>Elige los platos o bebidas.</strong>
            <span>Cuando agregues productos aparecera la comanda de la mesa.</span>
          </div>
        ) : (
          <div className={styles.orderItems}>
            {selectedOrder.items.map((item) => (
              <article className={styles.orderItem} key={item.id}>
                <div>
                  <strong>{item.productName}</strong>
                  <span>{formatCurrency(calculateOrderItemUnitPrice(item))}</span>
                  {getItemModifierSummary(item) ? (
                    <small>{getItemModifierSummary(item)}</small>
                  ) : null}
                </div>
                <div className={styles.itemControls}>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  className={styles.fullButton}
                  type="button"
                  onClick={() => setModifierItemId(item.id)}
                >
                  Editar o agregar modificador
                </button>
                <button
                  className={styles.dangerLink}
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  Eliminar
                </button>
              </article>
            ))}
          </div>
        )}

        <button
          className={styles.linkAction}
          type="button"
          onClick={() => window.print()}
        >
          Imprimir cuenta
        </button>

        <div className={styles.panelFooter}>
          <span>Subtotal</span>
          <strong>{formatCurrency(subtotal)}</strong>
        </div>

        <button
          className={styles.primaryAction}
          disabled={selectedOrder.items.length === 0}
          type="button"
          onClick={() => {
            setSelectedCloseItemIds(selectedOrder.items.map((item) => item.id))
            setPanelMode('CLOSE')
          }}
        >
          Cerrar mesa
        </button>
      </aside>
    )
  }

  function renderCounterSaleDrawer() {
    return (
      <div className={styles.overlayPanel}>
        <section className={styles.counterSaleDrawer}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Mostrador</p>
              <h3>Nueva venta con productos</h3>
            </div>
            <button
              className={styles.iconButton}
              type="button"
              onClick={() => setIsCounterSaleOpen(false)}
            >
              x
            </button>
          </div>

          <div className={styles.counterSaleLayout}>
            <div className={styles.counterSaleCatalog}>
              <input
                className={styles.searchInput}
                placeholder="Buscar productos"
                value={counterSaleSearchValue}
                onChange={(event) => setCounterSaleSearchValue(event.target.value)}
              />

              <div className={styles.categoryTabs}>
                <button
                  className={
                    counterSaleCategory === 'ALL'
                      ? styles.activeZoneTab
                      : styles.zoneTab
                  }
                  type="button"
                  onClick={() => setCounterSaleCategory('ALL')}
                >
                  Todos
                </button>
                {productCategories.map((category) => (
                  <button
                    className={
                      counterSaleCategory === category.id
                        ? styles.activeZoneTab
                        : styles.zoneTab
                    }
                    key={category.id}
                    type="button"
                    onClick={() => setCounterSaleCategory(category.id)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              <div className={styles.productGrid}>
                {filteredCounterSaleProducts.map((product) => (
                  <button
                    className={styles.productCard}
                    key={product.id}
                    type="button"
                    onClick={() => handleAddCounterSaleProduct(product)}
                  >
                    <span className={styles.productImagePlaceholder}>CG</span>
                    <strong>{formatCurrency(product.price)}</strong>
                    <span>{product.name}</span>
                    <small>{getProductCategoryLabel(product, categoryNameById)}</small>
                  </button>
                ))}
              </div>
            </div>

            <aside className={styles.counterSalePanel}>
              <div className={styles.panelSectionHeader}>
                <h4>Productos</h4>
                <span>{counterSaleItems.length}</span>
              </div>

              {counterSaleItems.length === 0 ? (
                <div className={styles.emptyPanel}>
                  <strong>Elige productos de la carta.</strong>
                  <span>Esta venta no abre mesa y queda como mostrador.</span>
                </div>
              ) : (
                <div className={styles.orderItems}>
                  {counterSaleItems.map((item) => (
                    <article className={styles.orderItem} key={item.product.id}>
                      <div>
                        <strong>{item.product.name}</strong>
                        <span>{formatCurrency(item.product.price)}</span>
                      </div>
                      <div className={styles.itemControls}>
                        <button
                          type="button"
                          onClick={() =>
                            handleCounterSaleQuantityChange(
                              item.product.id,
                              item.quantity - 1,
                            )
                          }
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCounterSaleQuantityChange(
                              item.product.id,
                              item.quantity + 1,
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        className={styles.dangerLink}
                        type="button"
                        onClick={() => handleRemoveCounterSaleProduct(item.product.id)}
                      >
                        Eliminar
                      </button>
                    </article>
                  ))}
                </div>
              )}

              <label className={styles.field}>
                <span>Cliente</span>
                <select
                  value={counterSaleCustomerId}
                  onChange={(event) => setCounterSaleCustomerId(event.target.value)}
                >
                  <option value="">Sin cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.twoColumns}>
                <label className={styles.field}>
                  <span>Descuento</span>
                  <input
                    inputMode="decimal"
                    value={counterSaleDiscountInput}
                    onChange={(event) =>
                      setCounterSaleDiscountInput(event.target.value)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Propina %</span>
                  <input
                    inputMode="decimal"
                    value={counterSaleTipPercentInput}
                    onChange={(event) =>
                      setCounterSaleTipPercentInput(event.target.value)
                    }
                  />
                </label>
              </div>

              <div className={styles.paymentGrid}>
                {restaurantPaymentMethods.map((method) => (
                  <button
                    className={
                      counterSalePaymentMethod === method.value
                        ? styles.activePaymentMethod
                        : styles.paymentMethod
                    }
                    key={method.value}
                    type="button"
                    onClick={() => setCounterSalePaymentMethod(method.value)}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              {counterSalePaymentMethod === 'CASH' ? (
                <label className={styles.field}>
                  <span>Con cuanto paga</span>
                  <input
                    inputMode="decimal"
                    placeholder={formatCurrency(counterSaleTotal)}
                    value={counterSaleCashReceivedInput}
                    onChange={(event) =>
                      setCounterSaleCashReceivedInput(event.target.value)
                    }
                  />
                </label>
              ) : null}

              <div className={styles.totalsBox}>
                <span>Subtotal</span>
                <strong>{formatCurrency(counterSaleSubtotal)}</strong>
                <span>Propina</span>
                <strong>{formatCurrency(counterSaleTipAmount)}</strong>
                <span>Descuento</span>
                <strong>-{formatCurrency(counterSaleDiscountTotal)}</strong>
                <span>Cambio</span>
                <strong>{formatCurrency(counterSaleChangeDue)}</strong>
                <span>Total</span>
                <strong>{formatCurrency(counterSaleTotal)}</strong>
              </div>

              <button
                className={styles.primaryAction}
                disabled={
                  createSaleMutation.isPending || counterSaleItems.length === 0
                }
                type="button"
                onClick={() => {
                  void handleCreateCounterSale()
                }}
              >
                {createSaleMutation.isPending ? 'Creando...' : 'Crear venta'}
              </button>
            </aside>
          </div>
        </section>
      </div>
    )
  }

  function renderFreeSaleModal() {
    return (
      <div className={styles.modalBackdrop}>
        <section className={styles.freeSaleModal}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Venta libre</p>
              <h3>Registrar servicio o venta sin producto</h3>
            </div>
            <button
              className={styles.iconButton}
              type="button"
              onClick={() => setIsFreeSaleOpen(false)}
            >
              x
            </button>
          </div>

          <label className={styles.field}>
            <span>Concepto</span>
            <input
              placeholder="Ej. Bano, servicio adicional"
              value={freeSaleConcept}
              onChange={(event) => setFreeSaleConcept(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Valor de la venta</span>
            <input
              inputMode="decimal"
              placeholder="$ 0"
              value={freeSaleAmountInput}
              onChange={(event) => setFreeSaleAmountInput(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Cliente</span>
            <select
              value={freeSaleCustomerId}
              onChange={(event) => setFreeSaleCustomerId(event.target.value)}
            >
              <option value="">Sin cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.paymentGrid}>
            {restaurantPaymentMethods.map((method) => (
              <button
                className={
                  freeSalePaymentMethod === method.value
                    ? styles.activePaymentMethod
                    : styles.paymentMethod
                }
                key={method.value}
                type="button"
                onClick={() => setFreeSalePaymentMethod(method.value)}
              >
                {method.label}
              </button>
            ))}
          </div>

          {freeSalePaymentMethod === 'CASH' ? (
            <label className={styles.field}>
              <span>Con cuanto paga</span>
              <input
                inputMode="decimal"
                placeholder={formatCurrency(freeSaleAmount)}
                value={freeSaleCashReceivedInput}
                onChange={(event) => setFreeSaleCashReceivedInput(event.target.value)}
              />
            </label>
          ) : null}

          <div className={styles.totalsBox}>
            <span>Total</span>
            <strong>{formatCurrency(freeSaleAmount)}</strong>
            <span>Cambio</span>
            <strong>{formatCurrency(freeSaleChangeDue)}</strong>
          </div>

          <button
            className={styles.primaryAction}
            disabled={createSaleMutation.isPending || freeSaleAmount <= 0}
            type="button"
            onClick={() => {
              void handleCreateFreeSale()
            }}
          >
            {createSaleMutation.isPending ? 'Creando...' : 'Crear venta libre'}
          </button>
        </section>
      </div>
    )
  }

  function renderConfigWorkspace() {
    return (
      <main className={styles.configWorkspace}>
        <header className={styles.configHeader}>
          <div className={styles.configTitleGroup}>
            <button
              aria-label="Volver a mesas"
              className={styles.configBackButton}
              type="button"
              onClick={handleFinishConfiguration}
            >
              ←
            </button>
            <h2>Configurar salas y mesas</h2>
            <button
              className={styles.configFinishButton}
              type="button"
              onClick={handleFinishConfiguration}
            >
              Finalizar configuracion
            </button>
          </div>
        </header>

        <section className={styles.configLayout}>
          <div className={styles.configMain}>
            <div className={styles.configToolbar}>
              <div className={styles.zoneTabs}>
                {workspace.zones.map((zone) => (
                  <button
                    className={
                      activeZoneId === zone.id
                        ? styles.activeZoneTab
                        : styles.zoneTab
                    }
                    key={zone.id}
                    type="button"
                    onClick={() => {
                      handleSelectZone(zone.id)
                      setIsAddingTable(false)
                      setEditingTableId(null)
                      setEditingTableName('')
                      setIsEditingZone(false)
                      setEditingZoneName('')
                    }}
                  >
                    {zone.name}
                  </button>
                ))}
              </div>

              <button
                className={styles.configAddZoneButton}
                type="button"
                onClick={() => {
                  setIsAddingZone(true)
                  setIsEditingZone(false)
                  setIsAddingTable(false)
                  setEditingTableId(null)
                  setNewZoneName('')
                }}
              >
                Agregar sala
              </button>
            </div>

            <div className={styles.configTablesGrid}>
              <button
                className={styles.configAddTableCard}
                disabled={!activeZone}
                type="button"
                onClick={handleStartAddTable}
              >
                <span>+</span>
                <strong>Anadir nueva mesa</strong>
              </button>

              {activeZoneTables.map((table) => (
                <article className={styles.configTableCard} key={table.id}>
                  <strong>{table.name}</strong>
                  <button
                    aria-label={`Editar ${table.name}`}
                    className={styles.configEditButton}
                    type="button"
                    onClick={() => handleStartEditTable(table.id)}
                  >
                    Editar
                  </button>
                </article>
              ))}
            </div>

            {activeZoneTables.length === 0 && !isAddingTable ? (
              <div className={styles.emptyState}>
                <strong>No hay mesas en {activeZone?.name ?? 'esta sala'}.</strong>
                <span>Usa Anadir nueva mesa para crear la primera.</span>
              </div>
            ) : null}
          </div>

          <aside className={styles.configSidebar}>
            <h3>{isAddingTable || editingTableId ? 'Mesa' : 'Sala'}</h3>

            {isAddingTable ? (
              <div className={styles.configSidebarCard}>
                <h4>Nueva mesa</h4>
                <label className={styles.field}>
                  <span>Sala</span>
                  <select
                    value={newTableZoneId}
                    onChange={(event) => setNewTableZoneId(event.target.value)}
                  >
                    {workspace.zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Nombre de la mesa</span>
                  <input
                    autoFocus
                    value={newTableName}
                    onChange={(event) => setNewTableName(event.target.value)}
                  />
                </label>
                <div className={styles.configFormActions}>
                  <button
                    className={styles.configPrimaryButton}
                    disabled={createRestaurantTableMutation.isPending}
                    type="button"
                    onClick={() => {
                      void handleAddTable()
                    }}
                  >
                    {createRestaurantTableMutation.isPending
                      ? 'Guardando...'
                      : 'Guardar mesa'}
                  </button>
                  <button
                    className={styles.configSecondaryButton}
                    type="button"
                    onClick={() => {
                      setIsAddingTable(false)
                      setNewTableName('')
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : editingTableId ? (
              <div className={styles.configSidebarCard}>
                <h4>Editar mesa</h4>
                <label className={styles.field}>
                  <span>Nombre de la mesa</span>
                  <input
                    autoFocus
                    value={editingTableName}
                    onChange={(event) => setEditingTableName(event.target.value)}
                  />
                </label>
                <div className={styles.configFormActions}>
                  <button
                    className={styles.configPrimaryButton}
                    disabled={updateRestaurantTableMutation.isPending}
                    type="button"
                    onClick={() => {
                      void handleSaveTableName()
                    }}
                  >
                    {updateRestaurantTableMutation.isPending
                      ? 'Guardando...'
                      : 'Guardar cambios'}
                  </button>
                  <button
                    className={styles.configSecondaryButton}
                    type="button"
                    onClick={() => {
                      setEditingTableId(null)
                      setEditingTableName('')
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    className={styles.configDangerButton}
                    disabled={deleteRestaurantTableMutation.isPending}
                    type="button"
                    onClick={() => {
                      void handleDeleteTable(editingTableId)
                    }}
                  >
                    Eliminar mesa
                  </button>
                </div>
              </div>
            ) : isAddingZone ? (
              <div className={styles.configSidebarCard}>
                <h4>Nueva sala</h4>
                <label className={styles.field}>
                  <span>Nombre de la sala</span>
                  <input
                    autoFocus
                    placeholder="Ej. Terraza"
                    value={newZoneName}
                    onChange={(event) => setNewZoneName(event.target.value)}
                  />
                </label>
                <div className={styles.configFormActions}>
                  <button
                    className={styles.configPrimaryButton}
                    disabled={createRestaurantZoneMutation.isPending}
                    type="button"
                    onClick={() => {
                      void handleAddZone()
                    }}
                  >
                    {createRestaurantZoneMutation.isPending
                      ? 'Guardando...'
                      : 'Guardar sala'}
                  </button>
                  <button
                    className={styles.configSecondaryButton}
                    type="button"
                    onClick={() => {
                      setIsAddingZone(false)
                      setNewZoneName('')
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : activeZone ? (
              <>
                <div className={styles.configSummaryCard}>
                  {isEditingZone ? (
                    <label className={styles.field}>
                      <span>Nombre de la sala</span>
                      <input
                        autoFocus
                        value={editingZoneName}
                        onChange={(event) => setEditingZoneName(event.target.value)}
                      />
                    </label>
                  ) : (
                    <>
                      <span>Nombre de la sala</span>
                      <strong>{activeZone.name}</strong>
                      <div className={styles.configSummaryRow}>
                        <span>Numero de mesas</span>
                        <strong>{activeZoneTables.length}</strong>
                      </div>
                    </>
                  )}
                </div>

                {isEditingZone ? (
                  <div className={styles.configActions}>
                    <button
                      className={styles.configPrimaryButton}
                      disabled={updateRestaurantZoneMutation.isPending}
                      type="button"
                      onClick={() => {
                        void handleSaveZoneName()
                      }}
                    >
                      {updateRestaurantZoneMutation.isPending
                        ? 'Guardando...'
                        : 'Guardar cambios'}
                    </button>
                    <button
                      className={styles.configSecondaryButton}
                      type="button"
                      onClick={() => {
                        setIsEditingZone(false)
                        setEditingZoneName('')
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className={styles.configActions}>
                    <button
                      className={styles.configTextButton}
                      type="button"
                      onClick={handleStartEditZone}
                    >
                      Editar
                    </button>
                    <button
                      className={styles.configDangerTextButton}
                      disabled={deleteRestaurantZoneMutation.isPending}
                      type="button"
                      onClick={() => {
                        void handleDeleteZone()
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.emptyPanel}>
                <strong>No hay salas configuradas.</strong>
                <span>Agrega una sala para poder crear mesas.</span>
              </div>
            )}
          </aside>
        </section>
      </main>
    )
  }

  if (isConfigOpen) {
    return (
      <div className={styles.page}>
        {operationError ? (
          <div className={styles.feedback} role="status">
            {operationError}
          </div>
        ) : null}

        {renderConfigWorkspace()}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Operacion restaurante</p>
          <h2>Mesas</h2>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.cashRegisterPill} to={routePaths.movements}>
            {currentCashRegisterSession ? 'Caja abierta' : 'Abrir caja'}
          </Link>
          <button
            className={styles.successButton}
            type="button"
            onClick={() => {
              setIsCounterSaleOpen(true)
              setOperationError(null)
            }}
          >
            Nueva venta
          </button>
          <button
            className={styles.successButton}
            type="button"
            onClick={() => {
              setIsFreeSaleOpen(true)
              setOperationError(null)
            }}
          >
            Nueva venta libre
          </button>
          <Link className={styles.dangerButton} to={routePaths.expenses}>
            Nuevo gasto
          </Link>
        </div>
      </header>

      {operationError ? (
        <div className={styles.feedback} role="status">
          {operationError}
        </div>
      ) : null}

      <main className={styles.workspace}>
        <section className={styles.tablesSection}>
          <div className={styles.zoneBar}>
            <div className={styles.zoneTabs}>
              {workspace.zones.map((zone) => (
                <button
                  className={
                    activeZoneId === zone.id ? styles.activeZoneTab : styles.zoneTab
                  }
                  key={zone.id}
                  type="button"
                  onClick={() => {
                    handleSelectZone(zone.id)
                  }}
                >
                  {zone.name}
                </button>
              ))}
            </div>
            <button
              className={styles.settingsButton}
              type="button"
              onClick={() => setIsConfigOpen(true)}
            >
              Configurar
            </button>
            <input
              className={styles.searchInput}
              placeholder="Numero de mesa"
              value={tableSearchValue}
              onChange={(event) => setTableSearchValue(event.target.value)}
            />
          </div>

          <div className={styles.tableGrid}>
            {visibleTables.map((table) => {
              const order = workspace.orders[table.id]
              const isSelected = selectedTableId === table.id

              return (
                <button
                  className={isSelected ? styles.selectedTableCard : styles.tableCard}
                  key={table.id}
                  type="button"
                  onClick={() => selectTable(table.id)}
                >
                  <span className={styles.tableIcon}>II</span>
                  <strong>{table.name}</strong>
                  <span className={order ? styles.openBadge : styles.closedBadge}>
                    {order ? `${order.guestCount} - Abierta` : 'Cerrada'}
                  </span>
                  <span className={styles.tableArrow}>›</span>
                </button>
              )
            })}
          </div>

          {visibleTables.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>No hay mesas en {activeZone?.name ?? 'esta sala'}.</strong>
              <span>Agrega mesas desde configuracion para empezar a atender.</span>
            </div>
          ) : null}
        </section>

        {renderOrderPanel()}
      </main>

      {isCounterSaleOpen ? renderCounterSaleDrawer() : null}

      {isFreeSaleOpen ? renderFreeSaleModal() : null}

      {isProductBrowserOpen ? (
        <div className={styles.overlayPanel}>
          <section className={styles.productBrowser}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Carta</p>
                <h3>Agregar productos a {selectedTable?.name}</h3>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                onClick={() => setIsProductBrowserOpen(false)}
              >
                x
              </button>
            </div>

            <div className={styles.productToolbar}>
              <input
                placeholder="Buscar productos"
                value={productSearchValue}
                onChange={(event) => setProductSearchValue(event.target.value)}
              />
              <div className={styles.categoryTabs}>
                <button
                  className={
                    activeProductCategory === 'ALL'
                      ? styles.activeZoneTab
                      : styles.zoneTab
                  }
                  type="button"
                  onClick={() => setActiveProductCategory('ALL')}
                >
                  Todos
                </button>
                {productCategories.map((category) => (
                  <button
                    className={
                      activeProductCategory === category.id
                        ? styles.activeZoneTab
                        : styles.zoneTab
                    }
                    key={category.id}
                    type="button"
                    onClick={() => setActiveProductCategory(category.id)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {productsQuery.isError ? (
              <div className={styles.feedback}>
                {getErrorMessage(productsQuery.error, 'No se pudo cargar la carta.')}
              </div>
            ) : null}

            <div className={styles.productGrid}>
              {filteredProducts.map((product) => (
                <button
                  className={styles.productCard}
                  key={product.id}
                  type="button"
                  onClick={() => handleAddProduct(product)}
                >
                  <span className={styles.productImagePlaceholder}>CG</span>
                  <strong>{formatCurrency(product.price)}</strong>
                  <span>{product.name}</span>
                  <small>{getProductCategoryLabel(product, categoryNameById)}</small>
                </button>
              ))}
            </div>

            {productsQuery.isLoading ? (
              <div className={styles.emptyState}>Cargando carta...</div>
            ) : null}
          </section>
        </div>
      ) : null}

      {modifierItem ? (
        <div className={styles.modalBackdrop}>
          <section className={styles.modifierModal}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Modificar producto</p>
                <h3>{modifierItem.productName}</h3>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                onClick={() => setModifierItemId(null)}
              >
                x
              </button>
            </div>

            {getDefaultModifierGroups().map((group) => (
              <div className={styles.modifierGroup} key={group.title}>
                <h4>{group.title}</h4>
                <div className={styles.modifierOptions}>
                  {group.options.map((option) => {
                    const isSelected = modifierItem.modifiers.some(
                      (modifier) => modifier.id === option.id,
                    )

                    return (
                      <button
                        className={isSelected ? styles.activeChip : styles.chip}
                        key={option.id}
                        type="button"
                        onClick={() => handleToggleModifier(modifierItem.id, option.id)}
                      >
                        {option.label}
                        {option.amount > 0 ? ` ${formatCurrency(option.amount)}` : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <label className={styles.field}>
              <span>Comentario del producto</span>
              <textarea
                rows={3}
                value={modifierItem.note}
                onChange={(event) =>
                  handleItemNoteChange(modifierItem.id, event.target.value)
                }
              />
            </label>

            <button
              className={styles.primaryAction}
              type="button"
              onClick={() => setModifierItemId(null)}
            >
              Guardar modificadores
            </button>
          </section>
        </div>
      ) : null}

      {isMoveDialogOpen ? (
        <div className={styles.modalBackdrop}>
          <section className={styles.moveModal}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Mover mesa</p>
                <h3>{selectedTable?.name}</h3>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                onClick={() => setIsMoveDialogOpen(false)}
              >
                x
              </button>
            </div>

            <label className={styles.field}>
              <span>Zona</span>
              <select
                value={moveTargetZoneId}
                onChange={(event) => {
                  setMoveTargetZoneId(event.target.value)
                  setMoveTargetTableId('')
                }}
              >
                {workspace.zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Nueva mesa</span>
              <select
                value={moveTargetTableId}
                onChange={(event) => setMoveTargetTableId(event.target.value)}
              >
                <option value="">Selecciona una mesa</option>
                {closedMoveTargets
                  .filter((table) => table.zoneId === moveTargetZoneId)
                  .map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name}
                    </option>
                  ))}
              </select>
            </label>

            <button
              className={styles.primaryAction}
              disabled={!moveTargetTableId}
              type="button"
              onClick={handleMoveTable}
            >
              Mover mesa
            </button>
          </section>
        </div>
      ) : null}
    </div>
  )
}
