import { useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ClipboardPlus,
  PackageCheck,
  PackageOpen,
  Plus,
  Send,
  ShieldCheck,
  ShoppingBasket,
  TrendingUp,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react'
import {
  useCancelPurchaseOrderMutation,
  useCreatePurchaseOrderMutation,
  usePurchaseOrdersQuery,
  useRegisterInventoryPurchaseMutation,
  useReplenishmentSuggestionsQuery,
  useSendPurchaseOrderMutation,
} from '@/modules/inventory/hooks/use-inventory-query'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/modules/inventory/types/inventory'
import type { Product } from '@/modules/products/types/product'
import type { SupplierSummary } from '@/modules/suppliers/types/supplier'
import { AppDrawer } from '@/shared/components/ui/AppDrawer'
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './PurchaseOrdersPanel.module.css'

type DraftItem = { key: string; productId: string; quantity: string; unitCost: string }

const statusLabels: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Borrador',
  ORDERED: 'Enviada',
  PARTIALLY_RECEIVED: 'Recepción parcial',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
}

const reasonLabels = {
  LOW_STOCK: 'Stock por debajo del mínimo',
  PRODUCTION_PLAN: 'Necesario para producir',
  SALES_VELOCITY: 'Consumo más rápido de lo habitual',
} as const

const urgencyLabels = {
  CRITICAL: 'Crítico',
  HIGH: 'Alta prioridad',
  MEDIUM: 'Planificar',
} as const

function createItem(productId = '', quantity = '', unitCost = ''): DraftItem {
  return { key: crypto.randomUUID(), productId, quantity, unitCost }
}

type Props = { products: Product[]; suppliers: SupplierSummary[] }

export function PurchaseOrdersPanel({ products, suppliers }: Props) {
  const ordersQuery = usePurchaseOrdersQuery()
  const suggestionsQuery = useReplenishmentSuggestionsQuery()
  const createMutation = useCreatePurchaseOrderMutation()
  const sendMutation = useSendPurchaseOrderMutation()
  const cancelMutation = useCancelPurchaseOrderMutation()
  const receiveMutation = useRegisterInventoryPurchaseMutation()
  const [createOpen, setCreateOpen] = useState(false)
  const [receiveOrderId, setReceiveOrderId] = useState<string | null>(null)
  const [supplierId, setSupplierId] = useState('')
  const [reference, setReference] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [items, setItems] = useState<DraftItem[]>([createItem()])
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const orders = ordersQuery.data ?? []
  const suggestions = suggestionsQuery.data ?? []
  const actionableSuggestions = suggestions.filter((suggestion) => suggestion.suggestedQuantity > 0)
  const purchasableProducts = useMemo(
    () => products.filter((product) => product.isActive && product.inventoryBehavior === 'PURCHASED' && product.productType !== 'VARIANT_PARENT'),
    [products],
  )
  const receiveOrder = orders.find((order) => order.id === receiveOrderId) ?? null
  const activeOrders = orders.filter((order) => !['RECEIVED', 'CANCELLED'].includes(order.status))
  const suggestedInvestment = actionableSuggestions.reduce((total, suggestion) => total + suggestion.estimatedCost, 0)

  function openCreate(useSuggestions = false) {
    setSupplierId('')
    setReference('')
    setExpectedDate('')
    setItems(
      useSuggestions && actionableSuggestions.length
        ? actionableSuggestions.map((suggestion) => createItem(suggestion.productId, String(suggestion.suggestedQuantity), String(suggestion.unitCost)))
        : [createItem()],
    )
    setFeedback(null)
    setCreateOpen(true)
  }

  async function createOrder() {
    const normalizedItems = items.flatMap((item) => {
      const quantity = Number(item.quantity)
      const unitCost = Number(item.unitCost)
      return item.productId && Number.isInteger(quantity) && quantity > 0 && Number.isFinite(unitCost) && unitCost >= 0
        ? [{ productId: item.productId, quantity, unitCost }]
        : []
    })
    if (!supplierId) return setFeedback('Selecciona el proveedor de la orden.')
    if (!normalizedItems.length || normalizedItems.length !== items.length) return setFeedback('Completa producto, cantidad y costo de cada línea.')
    if (new Set(normalizedItems.map((item) => item.productId)).size !== normalizedItems.length) return setFeedback('Cada producto solo puede aparecer una vez.')
    try {
      await createMutation.mutateAsync({
        supplierId,
        reference: reference.trim() || undefined,
        expectedDate: expectedDate || undefined,
        items: normalizedItems,
      })
      setCreateOpen(false)
    } catch (error) {
      setFeedback(getErrorMessage(error, 'No fue posible crear la orden de compra.'))
    }
  }

  function openReceive(order: PurchaseOrder) {
    setReceiveOrderId(order.id)
    setReceiveQuantities(Object.fromEntries(order.items.map((item) => [item.productId, String(item.orderedQuantity - item.receivedQuantity)])))
    setFeedback(null)
  }

  async function receiveOrderItems() {
    if (!receiveOrder) return
    const receivedItems = receiveOrder.items.flatMap((item) => {
      const remaining = item.orderedQuantity - item.receivedQuantity
      const quantity = Number(receiveQuantities[item.productId] ?? 0)
      return Number.isInteger(quantity) && quantity > 0 && quantity <= remaining
        ? [{ productId: item.productId, quantity, unitCost: item.unitCost }]
        : []
    })
    if (!receivedItems.length) return setFeedback('Ingresa al menos una cantidad válida para recibir.')
    try {
      await receiveMutation.mutateAsync({
        purchaseOrderId: receiveOrder.id,
        supplierId: receiveOrder.supplierId,
        items: receivedItems,
        reference: receiveOrder.reference ?? `OC-${receiveOrder.id}`,
        paymentMethod: 'OTHER',
        status: 'PENDING',
        amountPaid: 0,
        reason: `Recepción de orden de compra #${receiveOrder.id}`,
      })
      setReceiveOrderId(null)
    } catch (error) {
      setFeedback(getErrorMessage(error, 'No fue posible registrar la recepción.'))
    }
  }

  const orderTotal = (order: PurchaseOrder) => order.items.reduce((total, item) => total + item.orderedQuantity * item.unitCost, 0)

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <div className={styles.headingLead}><span><Truck aria-hidden="true" /></span><div><p>Abastecimiento</p><h3>Órdenes de compra</h3><small>Planifica pedidos y recibe mercancía sin duplicar el registro de compras.</small></div></div>
        <button type="button" onClick={() => openCreate(false)}><Plus aria-hidden="true" /> Nueva orden</button>
      </div>

      <div className={styles.metrics}>
        <span><ShoppingBasket aria-hidden="true" /><b>{activeOrders.length}</b><small>órdenes activas</small></span>
        <span><PackageOpen aria-hidden="true" /><b>{orders.filter((order) => order.status === 'PARTIALLY_RECEIVED').length}</b><small>recepciones parciales</small></span>
        <span><CalendarClock aria-hidden="true" /><b>{actionableSuggestions.length}</b><small>productos por reponer</small></span>
      </div>

      {suggestions.length ? (
        <div className={styles.replenishmentPlan}>
          <div className={styles.suggestionBanner}>
            <div><ClipboardPlus aria-hidden="true" /><span><strong>{actionableSuggestions.length ? `Compra sugerida para los próximos ${suggestions[0]?.coverageDays ?? 7} días` : 'La reposición ya está cubierta'}</strong><small>{actionableSuggestions.length ? `${actionableSuggestions.length} productos · inversión estimada ${formatCurrency(suggestedInvestment)} · cantidades editables antes de crear la orden.` : 'Los productos con stock bajo ya tienen unidades suficientes en órdenes activas.'}</small></span></div>
            {actionableSuggestions.length ? <button type="button" onClick={() => openCreate(true)}>Crear orden sugerida <ArrowRight aria-hidden="true" /></button> : null}
          </div>
          <div className={styles.suggestionGrid}>
            {suggestions.map((suggestion) => (
              <article className={styles.suggestionCard} key={suggestion.productId}>
                <div className={styles.suggestionCardTop}>
                  <span className={suggestion.coverageStatus === 'COVERED_BY_ORDER' ? styles.covered : styles[suggestion.urgency.toLowerCase()]}>{suggestion.coverageStatus === 'COVERED_BY_ORDER' ? 'Ya pedido' : urgencyLabels[suggestion.urgency]}</span>
                  <small>{reasonLabels[suggestion.reason]}</small>
                </div>
                <strong>{suggestion.name}</strong>
                <div className={styles.suggestionNumbers}>
                  <span><small>Stock</small><b>{suggestion.stock}</b></span>
                  <span><small>Uso diario</small><b>{suggestion.averageDailyUsage}</b></span>
                  <span><small>Cobertura</small><b>{suggestion.daysOfStock === null ? 'Sin consumo' : `${suggestion.daysOfStock} días`}</b></span>
                  <span className={styles.buyQuantity}><small>{suggestion.coverageStatus === 'COVERED_BY_ORDER' ? 'Compra adicional' : 'Comprar'}</small><b>{suggestion.suggestedQuantity}</b></span>
                </div>
                <div className={styles.suggestionDetail}>
                  <span><TrendingUp aria-hidden="true" /> Meta de stock <b>{suggestion.targetStock}</b></span>
                  <span><ShieldCheck aria-hidden="true" /> Seguridad <b>{suggestion.safetyStock}</b></span>
                  <span><Clock3 aria-hidden="true" /> Ya pedido <b>{suggestion.pendingPurchaseQuantity}</b></span>
                </div>
                <footer><span>Costo estimado</span><strong>{formatCurrency(suggestion.estimatedCost)}</strong></footer>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles.orderList}>
        {ordersQuery.isLoading ? <p className={styles.empty}>Cargando órdenes de compra…</p> : null}
        {!ordersQuery.isLoading && orders.length === 0 ? <p className={styles.empty}>Aún no hay órdenes. Puedes crear una manualmente o desde las sugerencias de reposición.</p> : null}
        {orders.slice(0, 6).map((order) => {
          const ordered = order.items.reduce((total, item) => total + item.orderedQuantity, 0)
          const received = order.items.reduce((total, item) => total + item.receivedQuantity, 0)
          return (
            <article key={order.id}>
              <div className={styles.orderIcon}>{order.status === 'RECEIVED' ? <CheckCircle2 aria-hidden="true" /> : <ShoppingBasket aria-hidden="true" />}</div>
              <div className={styles.orderMain}><span><strong>{order.reference || `Orden #${order.id}`}</strong><em className={styles[order.status.toLowerCase()]}>{statusLabels[order.status]}</em></span><small>{order.supplier.name} · {order.items.length} productos · {received}/{ordered} unidades recibidas</small></div>
              <strong className={styles.total}>{formatCurrency(orderTotal(order))}</strong>
              <div className={styles.actions}>
                {order.status === 'DRAFT' ? <button type="button" onClick={() => void sendMutation.mutateAsync(order.id)}><Send aria-hidden="true" /> Enviar</button> : null}
                {order.status === 'ORDERED' || order.status === 'PARTIALLY_RECEIVED' ? <button type="button" onClick={() => openReceive(order)}><PackageCheck aria-hidden="true" /> Recibir</button> : null}
                {order.status !== 'RECEIVED' && order.status !== 'CANCELLED' ? <button className={styles.cancelAction} aria-label={`Cancelar orden ${order.reference || order.id}`} type="button" onClick={() => void cancelMutation.mutateAsync(order.id)}><XCircle aria-hidden="true" /></button> : null}
              </div>
            </article>
          )
        })}
      </div>

      <AppDrawer description="Define proveedor, fecha esperada y productos. La orden no afecta inventario hasta recibirla." isOpen={createOpen} size="lg" title="Nueva orden de compra" titleAccessory={<span className={styles.drawerIcon}><ClipboardPlus aria-hidden="true" /></span>} footer={<button className={styles.primaryButton} disabled={createMutation.isPending} type="button" onClick={() => void createOrder()}>{createMutation.isPending ? 'Creando…' : 'Crear borrador de orden'}</button>} onClose={() => setCreateOpen(false)}>
        <div className={styles.formGrid}>
          <label><span>Proveedor</span><SearchableSelect value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">Selecciona un proveedor</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</SearchableSelect></label>
          <label><span>Fecha esperada</span><input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} /></label>
          <label className={styles.fullField}><span>Referencia opcional</span><input placeholder="Ej. OC-2026-001" value={reference} onChange={(event) => setReference(event.target.value)} /></label>
        </div>
        <div className={styles.linesHeading}><div><strong>Productos solicitados</strong><small>{items.length} líneas</small></div><button type="button" onClick={() => setItems((current) => [...current, createItem()])}><Plus aria-hidden="true" /> Agregar</button></div>
        <div className={styles.lineList}>{items.map((item, index) => <div className={styles.line} key={item.key}><b>{index + 1}</b><label><span>Producto</span><SearchableSelect value={item.productId} onChange={(event) => { const product = purchasableProducts.find((candidate) => candidate.id === event.target.value); setItems((current) => current.map((line) => line.key === item.key ? { ...line, productId: event.target.value, unitCost: product ? String(product.cost) : line.unitCost } : line)) }}><option value="">Selecciona</option>{purchasableProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · stock {product.stock}</option>)}</SearchableSelect></label><label><span>Cantidad</span><input min="1" type="number" value={item.quantity} onChange={(event) => setItems((current) => current.map((line) => line.key === item.key ? { ...line, quantity: event.target.value } : line))} /></label><label><span>Costo unitario</span><input min="0" type="number" value={item.unitCost} onChange={(event) => setItems((current) => current.map((line) => line.key === item.key ? { ...line, unitCost: event.target.value } : line))} /></label><button aria-label={`Quitar línea ${index + 1}`} disabled={items.length === 1} type="button" onClick={() => setItems((current) => current.filter((line) => line.key !== item.key))}><Trash2 aria-hidden="true" /></button></div>)}</div>
        {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
      </AppDrawer>

      <AppDrawer description="Puedes recibir una parte ahora y completar la orden más adelante." isOpen={Boolean(receiveOrder)} size="md" title={receiveOrder ? `Recibir ${receiveOrder.reference || `orden #${receiveOrder.id}`}` : 'Recibir orden'} titleAccessory={<span className={styles.drawerIcon}><PackageCheck aria-hidden="true" /></span>} footer={<button className={styles.primaryButton} disabled={receiveMutation.isPending} type="button" onClick={() => void receiveOrderItems()}>{receiveMutation.isPending ? 'Registrando…' : 'Registrar recepción como compra pendiente'}</button>} onClose={() => setReceiveOrderId(null)}>
        <div className={styles.receiveList}>{receiveOrder?.items.map((item) => { const remaining = item.orderedQuantity - item.receivedQuantity; return <label key={item.id}><span><strong>{item.product.name}</strong><small>Pedido {item.orderedQuantity} · recibido {item.receivedQuantity} · pendiente {remaining}</small></span><input aria-label={`Cantidad recibida de ${item.product.name}`} max={remaining} min="0" type="number" value={receiveQuantities[item.productId] ?? ''} onChange={(event) => setReceiveQuantities((current) => ({ ...current, [item.productId]: event.target.value }))} /></label> })}</div>
        <div className={styles.receiveNotice}><PackageOpen aria-hidden="true" /><span>La recepción incrementará inventario, actualizará el costo y creará una cuenta por pagar al proveedor.</span></div>
        {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
      </AppDrawer>
    </section>
  )
}
