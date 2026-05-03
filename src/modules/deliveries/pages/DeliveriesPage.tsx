import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { useCurrentCashRegisterQuery } from '@/modules/cash-register/hooks/use-cash-register-query'
import { useCustomersQuery } from '@/modules/customers/hooks/use-customers-query'
import { useProductsQuery } from '@/modules/products/hooks/use-products-query'
import type { Product } from '@/modules/products/types/product'
import type {
  DeliveryOrder,
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
import { routePaths } from '@/routes/route-paths'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './DeliveriesPage.module.css'

const deliveryStatuses: Array<{
  value: DeliveryOrderStatus
  label: string
  description: string
}> = [
  { value: 'NEW', label: 'Nuevo', description: 'Pedidos recibidos' },
  { value: 'PREPARING', label: 'Preparando', description: 'En cocina' },
  { value: 'ON_ROUTE', label: 'En camino', description: 'Despachados' },
  { value: 'DELIVERED', label: 'Entregado', description: 'Ventas registradas' },
  { value: 'CANCELLED', label: 'Cancelado', description: 'Pedidos anulados' },
]

function parseMoneyInput(value: string) {
  const parsedValue = Number(value.replace(/[^\d.]/g, ''))

  return Number.isFinite(parsedValue) ? Math.max(parsedValue, 0) : 0
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function createDeliverySaleNotes(order: DeliveryOrder) {
  const itemLines = order.items
    .map((item) => `${item.quantity} x ${item.productName}`)
    .join('; ')

  return [
    `Domicilio: ${order.address}`,
    `Cliente: ${order.customerName}`,
    order.phone ? `Telefono: ${order.phone}` : null,
    order.deliveryFee > 0
      ? `Tarifa de domicilio: ${formatCurrency(order.deliveryFee)}`
      : null,
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
  const createSaleMutation = useCreateSaleMutation()

  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [hasLoadedOrders, setHasLoadedOrders] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [deliveryFeeInput, setDeliveryFeeInput] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('CASH')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<RestaurantOrderItem[]>([])
  const [productSearchValue, setProductSearchValue] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data])
  const currentCashRegisterSession = currentCashRegisterQuery.data ?? null
  const deliveryFee = parseMoneyInput(deliveryFeeInput)
  const subtotal = calculateOrderSubtotal(items)
  const total = subtotal + deliveryFee

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

  const filteredProducts = useMemo(() => {
    const normalizedSearch = productSearchValue.trim().toLowerCase()

    return products
      .filter((product) => product.isActive && product.isVisibleInCatalog)
      .filter((product) =>
        normalizedSearch
          ? product.name.toLowerCase().includes(normalizedSearch)
          : true,
      )
      .sort((firstProduct, secondProduct) =>
        firstProduct.name.localeCompare(secondProduct.name),
      )
  }, [productSearchValue, products])

  function handleCustomerChange(customerId: string) {
    setSelectedCustomerId(customerId)

    const customer = customers.find((currentCustomer) => currentCustomer.id === customerId)

    if (!customer) {
      return
    }

    setCustomerName(customer.name)
    setPhone(customer.phone ?? '')
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
      currentItems.map((item) =>
        item.id === itemId ? { ...item, quantity: Math.max(nextQuantity, 1) } : item,
      ),
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
    setDeliveryFeeInput('0')
    setPaymentMethod('CASH')
    setNotes('')
    setItems([])
    setProductSearchValue('')
  }

  function handleCreateOrder() {
    if (!customerName.trim() || !address.trim()) {
      setFeedbackMessage('Completa cliente y direccion antes de crear el domicilio.')
      return
    }

    if (items.length === 0) {
      setFeedbackMessage('Agrega al menos un producto al domicilio.')
      return
    }

    const order = createDeliveryOrder({
      customerId: selectedCustomerId,
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      paymentMethod,
      deliveryFee,
      notes: notes.trim(),
      items,
    })

    setOrders((currentOrders) => [order, ...currentOrders])
    setFeedbackMessage(`Domicilio para ${order.customerName} creado.`)
    resetForm()
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

    const orderSubtotal = calculateOrderSubtotal(order.items)
    const orderTotal = orderSubtotal + order.deliveryFee

    try {
      const sale = await createSaleMutation.mutateAsync({
        items: buildSaleItemsFromOrderItems(order.items, order.deliveryFee),
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
      setFeedbackMessage(`Domicilio entregado. Venta ${sale.saleNumber} registrada.`)
    } catch (error) {
      setFeedbackMessage(
        getErrorMessage(error, 'No se pudo registrar la venta del domicilio.'),
      )
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Operacion restaurante</p>
          <h2>Domicilios</h2>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.cashRegisterPill} to={routePaths.movements}>
            {currentCashRegisterSession ? 'Caja abierta' : 'Abrir caja'}
          </Link>
          <Link className={styles.successButton} to={routePaths.sales}>
            Mesas
          </Link>
          <Link className={styles.dangerButton} to={routePaths.expenses}>
            Nuevo gasto
          </Link>
        </div>
      </header>

      {feedbackMessage ? (
        <div className={styles.feedback} role="status">
          {feedbackMessage}
        </div>
      ) : null}

      <main className={styles.workspace}>
        <section className={styles.board}>
          {deliveryStatuses.map((status) => {
            const statusOrders = orders.filter((order) => order.status === status.value)

            return (
              <div className={styles.column} key={status.value}>
                <div className={styles.columnHeader}>
                  <div>
                    <h3>{status.label}</h3>
                    <span>{status.description}</span>
                  </div>
                  <strong>{statusOrders.length}</strong>
                </div>

                <div className={styles.orderList}>
                  {statusOrders.map((order) => {
                    const orderSubtotal = calculateOrderSubtotal(order.items)
                    const orderTotal = orderSubtotal + order.deliveryFee

                    return (
                      <article className={styles.deliveryCard} key={order.id}>
                        <div className={styles.deliveryCardHeader}>
                          <div>
                            <strong>{order.customerName}</strong>
                            <span>{order.address}</span>
                          </div>
                          <strong>{formatCurrency(orderTotal)}</strong>
                        </div>

                        <div className={styles.deliveryMeta}>
                          <span>{order.phone || 'Sin telefono'}</span>
                          <span>{order.items.length} productos</span>
                          <span>
                            {
                              restaurantPaymentMethods.find(
                                (method) => method.value === order.paymentMethod,
                              )?.label
                            }
                          </span>
                        </div>

                        <ul className={styles.itemSummary}>
                          {order.items.map((item) => (
                            <li key={item.id}>
                              {item.quantity} x {item.productName}
                            </li>
                          ))}
                        </ul>

                        <div className={styles.cardActions}>
                          {order.status === 'NEW' ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateOrderStatus(order.id, 'PREPARING')
                              }
                            >
                              Preparar
                            </button>
                          ) : null}
                          {order.status === 'PREPARING' ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateOrderStatus(order.id, 'ON_ROUTE')
                              }
                            >
                              Despachar
                            </button>
                          ) : null}
                          {order.status === 'ON_ROUTE' ? (
                            <button
                              type="button"
                              onClick={() => {
                                void handleDeliverOrder(order)
                              }}
                            >
                              Entregar
                            </button>
                          ) : null}
                          {order.status !== 'DELIVERED' ? (
                            <button
                              className={styles.dangerTextButton}
                              type="button"
                              onClick={() =>
                                handleUpdateOrderStatus(order.id, 'CANCELLED')
                              }
                            >
                              Cancelar
                            </button>
                          ) : null}
                        </div>
                      </article>
                    )
                  })}

                  {statusOrders.length === 0 ? (
                    <div className={styles.emptyColumn}>Sin pedidos.</div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </section>

        <aside className={styles.formPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Nuevo pedido</p>
              <h3>Crear domicilio</h3>
            </div>
          </div>

          <label className={styles.field}>
            <span>Cliente</span>
            <select
              value={selectedCustomerId}
              onChange={(event) => handleCustomerChange(event.target.value)}
            >
              <option value="">Cliente nuevo o venta sin cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Nombre</span>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Telefono</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>

          <label className={styles.field}>
            <span>Direccion</span>
            <textarea
              rows={3}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </label>

          <div className={styles.twoColumns}>
            <label className={styles.field}>
              <span>Tarifa domicilio</span>
              <input
                inputMode="decimal"
                value={deliveryFeeInput}
                onChange={(event) => setDeliveryFeeInput(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>Pago</span>
              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as SalePaymentMethod)
                }
              >
                {restaurantPaymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span>Notas</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

          <div className={styles.productPicker}>
            <input
              placeholder="Buscar producto"
              value={productSearchValue}
              onChange={(event) => setProductSearchValue(event.target.value)}
            />
            <div className={styles.productList}>
              {filteredProducts.slice(0, 8).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleAddProduct(product)}
                >
                  <span>{product.name}</span>
                  <strong>{formatCurrency(product.price)}</strong>
                </button>
              ))}
              {productsQuery.isLoading ? <span>Cargando carta...</span> : null}
            </div>
          </div>

          <div className={styles.cartList}>
            {items.map((item) => (
              <article className={styles.cartItem} key={item.id}>
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
                <button
                  className={styles.dangerTextButton}
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  Quitar
                </button>
              </article>
            ))}
          </div>

          <div className={styles.totals}>
            <span>Productos</span>
            <strong>{formatCurrency(subtotal)}</strong>
            <span>Domicilio</span>
            <strong>{formatCurrency(deliveryFee)}</strong>
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>

          <button className={styles.primaryAction} type="button" onClick={handleCreateOrder}>
            Crear domicilio
          </button>
        </aside>
      </main>
    </div>
  )
}
