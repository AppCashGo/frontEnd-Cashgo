import { useMemo, useState } from 'react'
import {
  useRegisterInventoryProductionMutation,
  useRegisterInventoryWasteMutation,
} from '@/modules/inventory/hooks/use-inventory-query'
import type { InventoryMovement } from '@/modules/inventory/types/inventory'
import type { Product } from '@/modules/products/types/product'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './BakeryDailyOperationsPanel.module.css'

type Operation = 'PRODUCTION' | 'WASTE'

type Props = {
  movements: InventoryMovement[]
  products: Product[]
}

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString()
}

export function BakeryDailyOperationsPanel({ movements, products }: Props) {
  const [operation, setOperation] = useState<Operation>('PRODUCTION')
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const productionMutation = useRegisterInventoryProductionMutation()
  const wasteMutation = useRegisterInventoryWasteMutation()
  const isProduction = operation === 'PRODUCTION'
  const eligibleProducts = products.filter((product) =>
    isProduction
      ? product.inventoryBehavior === 'PRODUCED'
      : product.inventoryBehavior !== 'MADE_TO_ORDER',
  )
  const todayMovements = movements.filter((movement) => isToday(movement.createdAt))
  const summary = useMemo(() => ({
    produced: todayMovements
      .filter((movement) => movement.type === 'PRODUCTION_IN')
      .reduce((total, movement) => total + Math.abs(movement.quantity), 0),
    sold: todayMovements
      .filter((movement) => movement.type === 'SALE_OUT')
      .reduce((total, movement) => total + Math.abs(movement.quantity), 0),
    waste: todayMovements
      .filter((movement) => movement.type === 'WASTE_OUT' || movement.type === 'DAMAGED_OUT')
      .reduce((total, movement) => total + Math.abs(movement.quantity), 0),
  }), [todayMovements])
  const isSubmitting = productionMutation.isPending || wasteMutation.isPending

  async function submit() {
    setFeedback(null)
    const items = eligibleProducts.flatMap((product) => {
      const quantity = Number(quantities[product.id] ?? 0)
      return Number.isInteger(quantity) && quantity > 0
        ? [{ productId: product.id, quantity }]
        : []
    })
    if (items.length === 0) {
      setFeedback('Ingresa al menos una cantidad mayor que cero.')
      return
    }
    try {
      const input = { items, reason: reason.trim() || undefined }
      const result = isProduction
        ? await productionMutation.mutateAsync(input)
        : await wasteMutation.mutateAsync(input)
      setQuantities({})
      setReason('')
      setFeedback(
        isProduction
          ? `Producción registrada: ${result.totalUnits} unidades en ${result.affectedProducts} productos.`
          : `Merma registrada: ${result.totalUnits} unidades en ${result.affectedProducts} productos.`,
      )
    } catch (error) {
      setFeedback(getErrorMessage(error, 'No fue posible registrar la operación.'))
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Operación de hoy</p>
          <h3>Producción y merma</h3>
          <p>Registra cantidades terminadas sin crear compras ficticias.</p>
        </div>
        <div className={styles.summary}>
          <span><strong>{summary.produced}</strong> producidas</span>
          <span><strong>{summary.sold}</strong> vendidas</span>
          <span><strong>{summary.waste}</strong> de merma</span>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={isProduction ? styles.activeTab : undefined} type="button" onClick={() => { setOperation('PRODUCTION'); setFeedback(null) }}>
          Registrar producción
        </button>
        <button className={!isProduction ? styles.activeTab : undefined} type="button" onClick={() => { setOperation('WASTE'); setFeedback(null) }}>
          Registrar merma
        </button>
      </div>

      {eligibleProducts.length === 0 ? (
        <p className={styles.empty}>
          {isProduction
            ? 'Crea productos con la opción “Lo producimos por cantidades” para registrarlos aquí.'
            : 'No hay productos con control de existencias disponibles.'}
        </p>
      ) : (
        <div className={styles.productList}>
          {eligibleProducts.map((product) => (
            <label className={styles.productRow} key={product.id}>
              <span><strong>{product.name}</strong><small>Disponible: {product.stock}</small></span>
              <input
                aria-label={`${isProduction ? 'Cantidad producida' : 'Cantidad de merma'} de ${product.name}`}
                inputMode="numeric"
                min="0"
                placeholder="0"
                type="number"
                value={quantities[product.id] ?? ''}
                onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: event.target.value }))}
              />
            </label>
          ))}
        </div>
      )}

      <label className={styles.reason}>
        <span>Nota opcional</span>
        <input
          maxLength={255}
          placeholder={isProduction ? 'Ej. Primera horneada' : 'Ej. Sobrante del día'}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
      <button className={styles.submit} disabled={isSubmitting || eligibleProducts.length === 0} type="button" onClick={() => void submit()}>
        {isSubmitting ? 'Guardando...' : isProduction ? 'Guardar producción' : 'Guardar merma'}
      </button>
    </section>
  )
}
