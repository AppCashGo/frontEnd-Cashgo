import { useEffect, useMemo, useState } from 'react'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { useCurrentCashRegisterQuery } from '@/modules/cash-register/hooks/use-cash-register-query'
import { useCustomersQuery } from '@/modules/customers/hooks/use-customers-query'
import { useInventoryCategoriesQuery } from '@/modules/inventory/hooks/use-inventory-query'
import { useProductsQuery } from '@/modules/products/hooks/use-products-query'
import type { Product } from '@/modules/products/types/product'
import type {
  DeliveryOrder,
  DeliveryOrderSource,
  DeliveryOrderStatus,
  RestaurantOrderItem,
} from '@/modules/restaurant/types/restaurant'
import {
  buildSaleItemsFromOrderItems,
  calculateOrderItemTotal,
  calculateOrderSubtotal,
  createDeliveryOrder,
  createRestaurantOrderItem,
  readDeliveryOrders,
  restaurantPaymentMethods,
  saveDeliveryOrders,
  touchDeliveryOrder,
} from '@/modules/restaurant/utils/restaurant-workspace'
import { useCreateSaleMutation } from '@/modules/sales/hooks/use-create-sale-mutation'
import type { SalePaymentMethod } from '@/modules/sales/types/sale'
import { AppIcon } from '@/shared/components/icons/AppIcon'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './DeliveriesPage.module.css'

type DeliveryCreationStep = 'catalog' | 'customer' | 'payment'

const boardColumns: Array<{
  value: Extract<DeliveryOrderStatus, 'PREPARING' | 'ON_ROUTE'>
  label: string
  emptyTitle: string
  emptyDescription: string
}> = [
  {
    value: 'PREPARING',
    label: 'En preparacion',
    emptyTitle: 'Sin pedidos',
    emptyDescription: 'Aqui se listaran los pedidos en preparacion',
  },
  {
    value: 'ON_ROUTE',
    label: 'Ordenes en reparto',
    emptyTitle: 'Sin ordenes',
    emptyDescription: 'Aqui se listaran las ordenes en reparto',
  },
]

const deliverySources: Array<{
  value: DeliveryOrderSource
  label: string
}> = [
  { value: 'PHONE', label: 'Telefono' },
  { value: 'WHATSAPP', label: 'Whatsapp' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'ON_SITE', label: 'En sitio' },
  { value: 'RAPPI', label: 'Rappi' },
  { value: 'DIDI_FOOD', label: 'DidiFood' },
  { value: 'OWN_DELIVERY', label: 'Domicilio propio' },
]

const fallbackPaymentLabels = new Map<SalePaymentMethod, string>([
  ['CASH', 'Efectivo'],
  ['TRANSFER', 'Transferencia bancaria'],
  ['CARD', 'Tarjeta'],
  ['DIGITAL_WALLET', 'Nequi'],
  ['BANK_DEPOSIT', 'Daviplata'],
  ['OTHER', 'Otro datafono'],
])

function parseMoneyInput(value: string) {
  const parsedValue = Number(value.replace(/[^\d.]/g, ''))

  return Number.isFinite(parsedValue) ? Math.max(parsedValue, 0) : 0
}

function parsePercentageInput(value: string) {
  const parsedValue = Number(value.replace(/[^\d.]/g, ''))

  if (!Number.isFinite(parsedValue)) {
    return 0
  }

  return Math.min(Math.max(parsedValue, 0), 100)
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function getProductInitials(product: Product) {
  return product.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

function getPaymentLabel(method: SalePaymentMethod) {
  return (
    fallbackPaymentLabels.get(method) ??
    restaurantPaymentMethods.find((paymentMethod) => paymentMethod.value === method)
      ?.label ??
    'Otro'
  )
}

function getDeliverySourceLabel(source: DeliveryOrderSource | undefined) {
  return (
    deliverySources.find((deliverySource) => deliverySource.value === source)?.label ??
    'Domicilio propio'
  )
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

function getOrderDiscountAmount(order: DeliveryOrder) {
  return typeof order.discountAmount === 'number' ? order.discountAmount : 0
}

function getOrderTipAmount(order: DeliveryOrder) {
  return typeof order.tipAmount === 'number' ? order.tipAmount : 0
}

function calculateDeliveryOrderTotal(order: DeliveryOrder) {
  return Math.max(
    calculateOrderSubtotal(order.items) +
      order.deliveryFee +
      getOrderTipAmount(order) -
      getOrderDiscountAmount(order),
    0,
  )
}

function getRelativeOrderTime(order: DeliveryOrder) {
  const timestamp = new Date(order.createdAt).getTime()

  if (!Number.isFinite(timestamp)) {
    return 'hace unos segundos'
  }

  const minutes = Math.max(Math.floor((Date.now() - timestamp) / 60000), 0)

  if (minutes < 1) {
    return 'hace unos segundos'
  }

  if (minutes < 60) {
    return `hace ${minutes} min`
  }

  const hours = Math.floor(minutes / 60)

  return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
}

function createDeliverySaleNotes(order: DeliveryOrder) {
  const itemLines = order.items
    .map((item) => `${item.quantity} x ${item.productName}`)
    .join('; ')
  const discountAmount = getOrderDiscountAmount(order)
  const tipAmount = getOrderTipAmount(order)

  return [
    `Origen: ${getDeliverySourceLabel(order.source)}`,
    `Domicilio: ${order.address}`,
    `Cliente: ${order.customerName}`,
    order.phone ? `Telefono: ${order.phone}` : null,
    order.deliveryFee > 0
      ? `Tarifa de domicilio: ${formatCurrency(order.deliveryFee)}`
      : null,
    discountAmount > 0 ? `Descuento: ${formatCurrency(discountAmount)}` : null,
    tipAmount > 0 ? `Propina: ${formatCurrency(tipAmount)}` : null,
    order.notes ? `Notas: ${order.notes}` : null,
    `Productos: ${itemLines}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function DeliveriesPage() {
  const currentUser = useAuthSessionStore((state) => state.user)
  const businessId = currentUser?.businessId
  const currentCashRegisterQuery = useCurrentCashRegisterQuery()
  const customersQuery = useCustomersQuery()
  const productsQuery = useProductsQuery()
  const categoriesQuery = useInventoryCategoriesQuery()
  const createSaleMutation = useCreateSaleMutation()

  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [hasLoadedOrders, setHasLoadedOrders] = useState(false)
  const [creationStep, setCreationStep] = useState<DeliveryCreationStep | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [deliverySource, setDeliverySource] =
    useState<DeliveryOrderSource>('WHATSAPP')
  const [deliveryFeeInput, setDeliveryFeeInput] = useState('4000')
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('CASH')
  const [discountPercentInput, setDiscountPercentInput] = useState('0')
  const [tipPercentInput, setTipPercentInput] = useState('0')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<RestaurantOrderItem[]>([])
  const [productSearchValue, setProductSearchValue] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState('ALL')
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data])
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )
  const currentCashRegisterSession = currentCashRegisterQuery.data ?? null
  const deliveryFee = parseMoneyInput(deliveryFeeInput)
  const subtotal = calculateOrderSubtotal(items)
  const discountPercent = parsePercentageInput(discountPercentInput)
  const discountAmount = Math.min(
    ((subtotal + deliveryFee) * discountPercent) / 100,
    subtotal + deliveryFee,
  )
  const tipPercent = parsePercentageInput(tipPercentInput)
  const tipBase = Math.max(subtotal + deliveryFee - discountAmount, 0)
  const tipAmount = (tipBase * tipPercent) / 100
  const total = Math.max(tipBase + tipAmount, 0)

  useEffect(() => {
    setOrders(readDeliveryOrders(businessId))
    setHasLoadedOrders(true)
  }, [businessId])

  useEffect(() => {
    if (!hasLoadedOrders) {
      return
    }

    saveDeliveryOrders(businessId, orders)
  }, [businessId, hasLoadedOrders, orders])

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
    const normalizedSearch = productSearchValue.trim().toLowerCase()

    return products
      .filter((product) => product.isActive && product.isVisibleInCatalog)
      .filter((product) =>
        activeCategoryId === 'ALL'
          ? true
          : (product.categoryId ?? 'UNCATEGORIZED') === activeCategoryId,
      )
      .filter((product) =>
        normalizedSearch
          ? product.name.toLowerCase().includes(normalizedSearch) ||
            product.sku?.toLowerCase().includes(normalizedSearch) ||
            product.barcode?.toLowerCase().includes(normalizedSearch)
          : true,
      )
      .sort((firstProduct, secondProduct) =>
        firstProduct.name.localeCompare(secondProduct.name),
      )
  }, [activeCategoryId, productSearchValue, products])

  const cartQuantitiesByProductId = useMemo(() => {
    const quantities = new Map<string, number>()

    for (const item of items) {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
    }

    return quantities
  }, [items])

  const canContinueToCustomer = items.length > 0
  const canCreateOrder =
    items.length > 0 &&
    deliverySource.length > 0 &&
    phone.trim().length > 0 &&
    customerName.trim().length > 0 &&
    address.trim().length > 0

  function handlePhoneChange(value: string) {
    setPhone(value)

    const normalizedPhone = normalizeDigits(value)
    const matchingCustomer = customers.find(
      (customer) => normalizeDigits(customer.phone ?? '') === normalizedPhone,
    )

    if (!matchingCustomer) {
      if (selectedCustomerId) {
        setSelectedCustomerId('')
      }
      return
    }

    setSelectedCustomerId(matchingCustomer.id)
    setCustomerName(matchingCustomer.name)
  }

  function handleAddProduct(product: Product) {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.productId === product.id && item.modifiers.length === 0,
      )

      if (!existingItem) {
        return [...currentItems, createRestaurantOrderItem(product)]
      }

      return currentItems.map((item) =>
        item.id === existingItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      )
    })
  }

  function handleItemQuantityChange(itemId: string, nextQuantity: number) {
    setItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(nextQuantity, 0) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  function handleRemoveItem(itemId: string) {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId))
  }

  function resetForm() {
    setSelectedCustomerId('')
    setCustomerName('')
    setPhone('')
    setAddress('')
    setDeliverySource('WHATSAPP')
    setDeliveryFeeInput('4000')
    setPaymentMethod('CASH')
    setDiscountPercentInput('0')
    setTipPercentInput('0')
    setNotes('')
    setItems([])
    setProductSearchValue('')
    setActiveCategoryId('ALL')
  }

  function handleStartNewDelivery() {
    resetForm()
    setFeedbackMessage(null)
    setCreationStep('catalog')
  }

  function handleCancelCreation() {
    resetForm()
    setCreationStep(null)
  }

  function handleContinueToCustomer() {
    if (!canContinueToCustomer) {
      setFeedbackMessage('Agrega al menos un producto al domicilio.')
      return
    }

    setFeedbackMessage(null)
    setCreationStep('customer')
  }

  function handleContinueToPayment() {
    if (!phone.trim() || !customerName.trim() || !address.trim()) {
      setFeedbackMessage('Completa telefono, cliente y direccion del domicilio.')
      return
    }

    setFeedbackMessage(null)
    setCreationStep('payment')
  }

  function handleCreateOrder() {
    if (!canCreateOrder) {
      setFeedbackMessage('Completa los datos del domicilio antes de confirmar.')
      return
    }

    const createdOrder = createDeliveryOrder({
      source: deliverySource,
      customerId: selectedCustomerId,
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      paymentMethod,
      deliveryFee,
      discountAmount,
      tipAmount,
      notes: notes.trim(),
      items,
    })
    const order = touchDeliveryOrder({ ...createdOrder, status: 'PREPARING' })

    setOrders((currentOrders) => [order, ...currentOrders])
    setFeedbackMessage('Creaste un nuevo domicilio. Los ingredientes se han descontado automaticamente de tu inventario')
    resetForm()
    setCreationStep(null)
  }

  function handleUpdateOrderStatus(orderId: string, status: DeliveryOrderStatus) {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? touchDeliveryOrder({ ...order, status }) : order,
      ),
    )
  }

  async function handleDeliverOrder(order: DeliveryOrder) {
    if (order.status === 'DELIVERED') {
      return
    }

    const orderDiscount = getOrderDiscountAmount(order)
    const orderTip = getOrderTipAmount(order)
    const orderTotal = calculateDeliveryOrderTotal(order)
    const extraAmount = order.deliveryFee + orderTip - orderDiscount

    try {
      const sale = await createSaleMutation.mutateAsync({
        items: buildSaleItemsFromOrderItems(order.items, extraAmount),
        customerId: normalizeOptionalText(order.customerId),
        cashRegisterId: currentCashRegisterSession?.id,
        notes: createDeliverySaleNotes(order),
        payments:
          orderTotal > 0
            ? [
                {
                  method: order.paymentMethod,
                  amount: orderTotal,
                  notes: 'Cierre de domicilio',
                },
              ]
            : [],
      })

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? touchDeliveryOrder({ ...currentOrder, status: 'DELIVERED' })
            : currentOrder,
        ),
      )
      setFeedbackMessage(`Domicilio archivado. Venta ${sale.saleNumber} registrada.`)
    } catch (error) {
      setFeedbackMessage(
        getErrorMessage(error, 'No se pudo registrar la venta del domicilio.'),
      )
    }
  }

  function renderOrderCard(order: DeliveryOrder) {
    const orderTotal = calculateDeliveryOrderTotal(order)

    return (
      <article className={styles.deliveryCard} key={order.id}>
        <div className={styles.deliveryCardHeader}>
          <span className={styles.orderAvatar}>C</span>
          <div>
            <strong>Origen: {getDeliverySourceLabel(order.source)}</strong>
            <span>{getRelativeOrderTime(order)}</span>
          </div>
        </div>

        <strong className={styles.orderTotal}>{formatCurrency(orderTotal)}</strong>
        <ul className={styles.itemSummary}>
          {order.items.slice(0, 3).map((item) => (
            <li key={item.id}>
              {item.quantity} {item.productName}
            </li>
          ))}
        </ul>
        {order.items.length > 3 ? (
          <button className={styles.inlineLink} type="button">
            {order.items.length - 3} producto
            {order.items.length - 3 === 1 ? '' : 's'} mas
          </button>
        ) : null}

        <div className={styles.cardActions}>
          {order.status === 'PREPARING' || order.status === 'NEW' ? (
            <button
              type="button"
              onClick={() => handleUpdateOrderStatus(order.id, 'ON_ROUTE')}
            >
              Mover a reparto
            </button>
          ) : null}
          {order.status === 'ON_ROUTE' ? (
            <button
              type="button"
              disabled={createSaleMutation.isPending}
              onClick={() => {
                void handleDeliverOrder(order)
              }}
            >
              Archivar orden
            </button>
          ) : null}
          {order.status !== 'DELIVERED' ? (
            <button
              className={styles.dangerTextButton}
              type="button"
              onClick={() => handleUpdateOrderStatus(order.id, 'CANCELLED')}
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </article>
    )
  }

  function renderCartList() {
    return (
      <div className={styles.cartList}>
        {items.map((item) => (
          <article className={styles.cartItem} key={item.id}>
            <button
              aria-label={`Quitar ${item.productName}`}
              className={styles.removeIconButton}
              type="button"
              onClick={() => handleRemoveItem(item.id)}
            >
              x
            </button>
            <div>
              <strong>{item.productName}</strong>
              <span>{formatCurrency(calculateOrderItemTotal(item))}</span>
            </div>
            <div className={styles.quantityControl}>
              <button
                type="button"
                onClick={() => handleItemQuantityChange(item.id, item.quantity - 1)}
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button
                type="button"
                onClick={() => handleItemQuantityChange(item.id, item.quantity + 1)}
              >
                +
              </button>
            </div>
          </article>
        ))}
      </div>
    )
  }

  if (creationStep) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.backButton} type="button" onClick={handleCancelCreation}>
            {'<-'} Nuevo domicilio
          </button>

          {creationStep === 'catalog' ? (
            <label className={styles.headerSearch} htmlFor="delivery-product-search">
              <span>Buscar productos</span>
              <input
                id="delivery-product-search"
                placeholder="Buscar productos..."
                type="search"
                value={productSearchValue}
                onChange={(event) => setProductSearchValue(event.target.value)}
              />
            </label>
          ) : null}
        </header>

        {feedbackMessage ? (
          <div className={styles.feedback} role="status">
            {feedbackMessage}
          </div>
        ) : null}

        {creationStep === 'catalog' ? (
          <main className={styles.creationWorkspace}>
            <section className={styles.catalogPanel}>
              <div className={styles.categoryTabs}>
                <button
                  className={joinClassNames(
                    styles.categoryChip,
                    activeCategoryId === 'ALL' && styles.categoryChipActive,
                  )}
                  type="button"
                  onClick={() => setActiveCategoryId('ALL')}
                >
                  Todos
                </button>
                {productCategories.map((category) => (
                  <button
                    className={joinClassNames(
                      styles.categoryChip,
                      activeCategoryId === category.id && styles.categoryChipActive,
                    )}
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategoryId(category.id)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              {productsQuery.isLoading ? (
                <div className={styles.loadingGrid}>
                  {Array.from({ length: 12 }, (_, index) => (
                    <span className={styles.loadingCard} key={index} />
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className={styles.productGrid}>
                  {filteredProducts.map((product) => {
                    const quantity = cartQuantitiesByProductId.get(product.id) ?? 0

                    return (
                      <button
                        className={joinClassNames(
                          styles.productCard,
                          quantity > 0 && styles.productCardSelected,
                        )}
                        key={product.id}
                        type="button"
                        onClick={() => handleAddProduct(product)}
                      >
                        {quantity > 0 ? (
                          <span className={styles.productQuantityBadge}>{quantity}</span>
                        ) : null}
                        <span className={styles.productVisual}>{getProductInitials(product)}</span>
                        <strong>{formatCurrency(product.price)}</strong>
                        <span>{product.name}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className={styles.emptyCatalog}>
                  <AppIcon name="products" />
                  <strong>Sin productos disponibles</strong>
                  <span>Revisa tu carta o intenta otra busqueda.</span>
                </div>
              )}
            </section>

            <aside className={styles.summaryPanel}>
              <h3>Productos</h3>
              {items.length > 0 ? (
                renderCartList()
              ) : (
                <div className={styles.emptyCart}>
                  <AppIcon name="deliveries" />
                  <span>Elige los platos o bebidas</span>
                </div>
              )}
              <button
                className={styles.stickyAction}
                type="button"
                disabled={!canContinueToCustomer}
                onClick={handleContinueToCustomer}
              >
                <span>{items.length}</span>
                Agregar
                <strong>{formatCurrency(subtotal)}</strong>
              </button>
            </aside>
          </main>
        ) : null}

        {creationStep === 'customer' ? (
          <main className={styles.creationWorkspace}>
            <section className={styles.selectedProductsPanel}>
              <h3>Productos</h3>
              {renderCartList()}
            </section>

            <aside className={styles.summaryPanel}>
              <button
                className={styles.panelBackButton}
                type="button"
                onClick={() => setCreationStep('catalog')}
              >
                {'<-'} Datos del cliente
              </button>

              <label className={styles.field}>
                <span>Origen del pedido*</span>
                <select
                  value={deliverySource}
                  onChange={(event) =>
                    setDeliverySource(event.target.value as DeliveryOrderSource)
                  }
                >
                  {deliverySources.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Telefono de contacto*</span>
                <input
                  inputMode="tel"
                  placeholder="Escribe un numero de contacto"
                  value={phone}
                  onChange={(event) => handlePhoneChange(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span>Nombre o razon social*</span>
                <input
                  placeholder="Nombre del usuario"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span>Direccion de entrega*</span>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span>Valor domicilio</span>
                <small>
                  Este es el valor definido en la configuracion, puedes editarlo
                  segun la distancia.
                </small>
                <input
                  inputMode="decimal"
                  value={deliveryFeeInput}
                  onChange={(event) => setDeliveryFeeInput(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span>Comentario</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>

              <button
                className={styles.stickyAction}
                type="button"
                disabled={!phone.trim() || !customerName.trim() || !address.trim()}
                onClick={handleContinueToPayment}
              >
                Siguiente
              </button>
            </aside>
          </main>
        ) : null}

        {creationStep === 'payment' ? (
          <main className={styles.creationWorkspace}>
            <section className={styles.selectedProductsPanel}>
              <h3>Productos</h3>
              {renderCartList()}
            </section>

            <aside className={styles.summaryPanel}>
              <button
                className={styles.panelBackButton}
                type="button"
                onClick={() => setCreationStep('customer')}
              >
                {'<-'} Pago
              </button>

              <div className={styles.paymentGrid} aria-label="Metodo de pago">
                {restaurantPaymentMethods.map((method) => (
                  <button
                    className={joinClassNames(
                      styles.paymentMethodButton,
                      paymentMethod === method.value && styles.paymentMethodButtonActive,
                    )}
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    {getPaymentLabel(method.value)}
                  </button>
                ))}
              </div>

              <label className={styles.field}>
                <span>Descuento</span>
                <div className={styles.rateRow}>
                  <input
                    inputMode="decimal"
                    value={`${discountPercentInput}`}
                    onChange={(event) => setDiscountPercentInput(event.target.value)}
                  />
                  <strong>=</strong>
                  <output>{formatCurrency(discountAmount)}</output>
                </div>
              </label>

              <label className={styles.field}>
                <span>Propina</span>
                <div className={styles.rateRow}>
                  <input
                    inputMode="decimal"
                    value={`${tipPercentInput}`}
                    onChange={(event) => setTipPercentInput(event.target.value)}
                  />
                  <strong>=</strong>
                  <output>{formatCurrency(tipAmount)}</output>
                </div>
              </label>

              <div className={styles.totals}>
                <span>Productos</span>
                <strong>{formatCurrency(subtotal)}</strong>
                <span>Domicilio</span>
                <strong>{formatCurrency(deliveryFee)}</strong>
                <span>Descuento</span>
                <strong>-{formatCurrency(discountAmount)}</strong>
                <span>Propina</span>
                <strong>{formatCurrency(tipAmount)}</strong>
                <span>Total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>

              <button
                className={styles.stickyAction}
                type="button"
                disabled={!canCreateOrder}
                onClick={handleCreateOrder}
              >
                <span>{items.length}</span>
                Confirmar
                <strong>{formatCurrency(total)}</strong>
              </button>
            </aside>
          </main>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2>Domicilios</h2>
        <button
          className={styles.createDeliveryButton}
          type="button"
          onClick={handleStartNewDelivery}
        >
          Crear nuevo domicilio
        </button>
      </header>

      {feedbackMessage ? (
        <div className={styles.feedback} role="status">
          {feedbackMessage}
        </div>
      ) : null}

      <main className={styles.board}>
        {boardColumns.map((column) => {
          const columnOrders = orders.filter((order) =>
            column.value === 'PREPARING'
              ? order.status === 'PREPARING' || order.status === 'NEW'
              : order.status === column.value,
          )

          return (
            <section className={styles.column} key={column.value}>
              <div className={styles.columnHeader}>
                <h3>{column.label}</h3>
                <strong>{columnOrders.length}</strong>
              </div>

              <div className={styles.orderList}>
                {columnOrders.length > 0 ? (
                  columnOrders.map((order) => renderOrderCard(order))
                ) : (
                  <div className={styles.emptyColumn}>
                    <AppIcon name="deliveries" />
                    <strong>{column.emptyTitle}</strong>
                    <span>{column.emptyDescription}</span>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </main>
    </div>
  )
}
