import { useMemo, useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  ClipboardPlus,
  PackageCheck,
  PackageOpen,
  Plus,
  Send,
  ShoppingBasket,
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
import { ReplenishmentSuggestions } from '@/modules/inventory/components/ReplenishmentSuggestions'
import type { PurchaseOrder, PurchaseOrderStatus, ReplenishmentSuggestion } from '@/modules/inventory/types/inventory'
import type { Product } from '@/modules/products/types/product'
import type { SupplierSummary } from '@/modules/suppliers/types/supplier'
import { AppDrawer } from '@/shared/components/ui/AppDrawer'
import { AppButton } from '@/shared/components/ui/AppButton'
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
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set())
  const [draftSuggestionIds, setDraftSuggestionIds] = useState<ReadonlySet<string>>(() => new Set())
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
  const normalizedItems = items.flatMap((item) => {
    const quantity = Number(item.quantity)
    const unitCost = Number(item.unitCost)
    return item.productId && Number.isInteger(quantity) && quantity > 0 && Number.isFinite(unitCost) && unitCost >= 0
      ? [{ productId: item.productId, quantity, unitCost }]
      : []
  })
  const estimatedOrderTotal = normalizedItems.reduce(
    (total, item) => total + item.quantity * item.unitCost,
    0,
  )

  function toggleSuggestion(productId: string) {
    setSelectedProductIds((current) => {
      const next = new Set(current)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  function openCreate(selection: ReplenishmentSuggestion[] = []) {
    if (createMutation.isPending) return
    setSupplierId('')
    setReference('')
    setExpectedDate('')
    setDraftSuggestionIds(new Set(selection.map(({ productId }) => productId)))
    setItems(selection.length
      ? selection.map((suggestion) => createItem(
          suggestion.productId,
          String(suggestion.suggestedQuantity),
          String(suggestion.unitCost),
        ))
      : [createItem()],
    )
    setFeedback(null)
    setCreateOpen(true)
  }

  async function createOrder() {
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
      const submittedSuggestions = new Set(
        normalizedItems.filter(({ productId }) => draftSuggestionIds.has(productId))
          .map(({ productId }) => productId),
      )
      if (submittedSuggestions.size > 0) {
        setSelectedProductIds((current) => new Set(
          [...current].filter((productId) => !submittedSuggestions.has(productId)),
        ))
      }
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
        <div className={styles.headingLead}>
          <span><Truck aria-hidden="true" /></span>
          <h3>Órdenes de compra</h3>
        </div>
        <AppButton disabled={createMutation.isPending} startIcon={<Plus aria-hidden="true" />} onClick={() => openCreate()}>Nueva orden</AppButton>
      </div>

      <div className={styles.metrics}>
        <span><ShoppingBasket aria-hidden="true" /><b>{activeOrders.length}</b><small>órdenes activas</small></span>
        <span><PackageOpen aria-hidden="true" /><b>{orders.filter((order) => order.status === 'PARTIALLY_RECEIVED').length}</b><small>recepciones parciales</small></span>
        <span><CalendarClock aria-hidden="true" /><b>{actionableSuggestions.length}</b><small>productos por reponer</small></span>
      </div>

      {suggestionsQuery.isLoading ? <p className={styles.empty}>Cargando sugerencias de reposición…</p> : null}
      {suggestionsQuery.isError && !suggestions.length ? (
        <div className={styles.suggestionsError} role="alert">
          <span>No pudimos cargar las sugerencias de reposición.</span>
          <AppButton size="sm" variant="secondary" onClick={() => void suggestionsQuery.refetch()}>Reintentar</AppButton>
        </div>
      ) : null}
      {suggestions.length ? (
        <ReplenishmentSuggestions
          suggestions={suggestions}
          selectedProductIds={selectedProductIds}
          onToggle={toggleSuggestion}
          onClear={() => setSelectedProductIds(new Set())}
          onReview={openCreate}
        />
      ) : null}

      <div className={styles.orderList}>
        {ordersQuery.isLoading ? <p className={styles.empty}>Cargando órdenes de compra…</p> : null}
        {!ordersQuery.isLoading && orders.length === 0 ? <p className={styles.empty}>Aún no hay órdenes. Puedes crear una manualmente o desde las sugerencias de reposición.</p> : null}
        {orders.slice(0, 6).map((order) => {
          const ordered = order.items.reduce((total, item) => total + item.orderedQuantity, 0)
          const received = order.items.reduce((total, item) => total + item.receivedQuantity, 0)
          const auditActor = order.status === 'CANCELLED'
            ? order.cancelledByUser
            : order.orderedByUser ?? order.createdByUser
          const auditAction = order.status === 'CANCELLED'
            ? 'Cancelada por'
            : order.orderedByUser
              ? 'Enviada por'
              : 'Creada por'
          return (
            <article key={order.id}>
              <div className={styles.orderIcon}>{order.status === 'RECEIVED' ? <CheckCircle2 aria-hidden="true" /> : <ShoppingBasket aria-hidden="true" />}</div>
              <div className={styles.orderMain}><span><strong>{order.reference || `Orden #${order.id}`}</strong><em className={styles[order.status.toLowerCase()]}>{statusLabels[order.status]}</em></span><small>{order.supplier.name} · {order.items.length} productos · {received}/{ordered} unidades recibidas</small><small className={styles.orderAudit}>{auditAction} {auditActor?.name ?? 'usuario no registrado'}</small></div>
              <strong className={styles.total}>{formatCurrency(orderTotal(order))}</strong>
              <div className={styles.actions}>
                {order.status === 'DRAFT' ? <AppButton size="sm" startIcon={<Send aria-hidden="true" />} variant="secondary" onClick={() => void sendMutation.mutateAsync(order.id)}>Enviar</AppButton> : null}
                {order.status === 'ORDERED' || order.status === 'PARTIALLY_RECEIVED' ? <AppButton size="sm" startIcon={<PackageCheck aria-hidden="true" />} variant="success" onClick={() => openReceive(order)}>Recibir</AppButton> : null}
                {order.status !== 'RECEIVED' && order.status !== 'CANCELLED' ? <AppButton aria-label={`Cancelar orden ${order.reference || order.id}`} className={styles.cancelAction} iconOnly size="sm" startIcon={<XCircle aria-hidden="true" />} variant="ghost" onClick={() => void cancelMutation.mutateAsync(order.id)} /> : null}
              </div>
            </article>
          )
        })}
      </div>

      <AppDrawer
        description="Define proveedor, fecha esperada y productos. La orden no afecta inventario hasta recibirla."
        isOpen={createOpen}
        size="lg"
        title="Nueva orden de compra"
        titleAccessory={<span className={styles.drawerIcon}><ClipboardPlus aria-hidden="true" /></span>}
        footer={(
          <div className={styles.draftFooter}>
            <span aria-live="polite">Costo estimado <strong>{formatCurrency(estimatedOrderTotal)}</strong></span>
            <AppButton
              isLoading={createMutation.isPending}
              loadingLabel="Creando orden…"
              startIcon={<ClipboardPlus aria-hidden="true" />}
              onClick={() => void createOrder()}
            >
              Crear borrador de orden
            </AppButton>
          </div>
        )}
        onClose={() => setCreateOpen(false)}
      >
        <div className={styles.formGrid}>
          <label>
            <span>Proveedor</span>
            <SearchableSelect
              aria-label="Proveedor"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
            >
              <option value="">Selecciona un proveedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </SearchableSelect>
          </label>
          <label><span>Fecha esperada</span><input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} /></label>
          <label className={styles.fullField}><span>Referencia opcional</span><input placeholder="Ej. OC-2026-001" value={reference} onChange={(event) => setReference(event.target.value)} /></label>
        </div>
        <div className={styles.linesHeading}><div><strong>Productos solicitados</strong><small>{items.length} {items.length === 1 ? 'línea' : 'líneas'}</small></div><AppButton size="sm" startIcon={<Plus aria-hidden="true" />} variant="secondary" onClick={() => setItems((current) => [...current, createItem()])}>Agregar</AppButton></div>
        <div className={styles.lineList}>{items.map((item, index) => <div className={styles.line} key={item.key}><b>{index + 1}</b><label><span>Producto</span><SearchableSelect value={item.productId} onChange={(event) => { const product = purchasableProducts.find((candidate) => candidate.id === event.target.value); setItems((current) => current.map((line) => line.key === item.key ? { ...line, productId: event.target.value, unitCost: product ? String(product.cost) : line.unitCost } : line)) }}><option value="">Selecciona</option>{purchasableProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · stock {product.stock}</option>)}</SearchableSelect></label><label><span>Cantidad</span><input min="1" type="number" value={item.quantity} onChange={(event) => setItems((current) => current.map((line) => line.key === item.key ? { ...line, quantity: event.target.value } : line))} /></label><label><span>Costo unitario</span><input min="0" step="0.01" type="number" value={item.unitCost} onChange={(event) => setItems((current) => current.map((line) => line.key === item.key ? { ...line, unitCost: event.target.value } : line))} /></label><button aria-label={`Quitar línea ${index + 1}`} disabled={items.length === 1} type="button" onClick={() => setItems((current) => current.filter((line) => line.key !== item.key))}><Trash2 aria-hidden="true" /></button></div>)}</div>
        {feedback ? <p className={styles.feedback} role="alert">{feedback}</p> : null}
      </AppDrawer>

      <AppDrawer description="Puedes recibir una parte ahora y completar la orden más adelante." isOpen={Boolean(receiveOrder)} size="md" title={receiveOrder ? `Recibir ${receiveOrder.reference || `orden #${receiveOrder.id}`}` : 'Recibir orden'} titleAccessory={<span className={styles.drawerIcon}><PackageCheck aria-hidden="true" /></span>} footer={<AppButton isLoading={receiveMutation.isPending} loadingLabel="Registrando recepción…" startIcon={<PackageCheck aria-hidden="true" />} variant="success" onClick={() => void receiveOrderItems()}>Registrar recepción como compra pendiente</AppButton>} onClose={() => setReceiveOrderId(null)}>
        <div className={styles.receiveList}>{receiveOrder?.items.map((item) => { const remaining = item.orderedQuantity - item.receivedQuantity; return <label key={item.id}><span><strong>{item.product.name}</strong><small>Pedido {item.orderedQuantity} · recibido {item.receivedQuantity} · pendiente {remaining}</small></span><input aria-label={`Cantidad recibida de ${item.product.name}`} max={remaining} min="0" type="number" value={receiveQuantities[item.productId] ?? ''} onChange={(event) => setReceiveQuantities((current) => ({ ...current, [item.productId]: event.target.value }))} /></label> })}</div>
        <div className={styles.receiveNotice}><PackageOpen aria-hidden="true" /><span>La recepción incrementará inventario, actualizará el costo y creará una cuenta por pagar al proveedor.</span></div>
        {feedback ? <p className={styles.feedback} role="alert">{feedback}</p> : null}
      </AppDrawer>
    </section>
  )
}
