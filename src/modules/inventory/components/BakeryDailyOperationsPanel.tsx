import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Boxes,
  ChefHat,
  ClipboardList,
  PackageCheck,
  Sparkles,
  TrendingUp,
  Wheat,
} from 'lucide-react'
import { BakeryRecipeDrawer } from '@/modules/inventory/components/BakeryRecipeDrawer'
import {
  useProductRecipesQuery,
  useProductionPlanQuery,
  useRegisterInventoryProductionMutation,
  useRegisterInventoryWasteMutation,
} from '@/modules/inventory/hooks/use-inventory-query'
import type { InventoryMovement } from '@/modules/inventory/types/inventory'
import type { Product } from '@/modules/products/types/product'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './BakeryDailyOperationsPanel.module.css'

type Operation = 'PLAN' | 'PRODUCTION' | 'WASTE' | 'RECIPES'

type Props = {
  movements: InventoryMovement[]
  products: Product[]
}

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString()
}

export function BakeryDailyOperationsPanel({ movements, products }: Props) {
  const [operation, setOperation] = useState<Operation>('PLAN')
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [recipeProductId, setRecipeProductId] = useState<string | null>(null)
  const productionMutation = useRegisterInventoryProductionMutation()
  const wasteMutation = useRegisterInventoryWasteMutation()
  const recipesQuery = useProductRecipesQuery()
  const planQuery = useProductionPlanQuery(1)
  const producedProducts = products.filter((product) => product.inventoryBehavior === 'PRODUCED')
  const recipes = recipesQuery.data ?? []
  const recipeProduct = producedProducts.find((product) => product.id === recipeProductId) ?? null
  const recipe = recipes.find((item) => item.productId === recipeProductId) ?? null
  const isProduction = operation === 'PRODUCTION'
  const eligibleProducts = products.filter((product) =>
    isProduction ? product.inventoryBehavior === 'PRODUCED' : product.inventoryBehavior !== 'MADE_TO_ORDER',
  )
  const todayMovements = movements.filter((movement) => isToday(movement.createdAt))
  const summary = useMemo(() => ({
    produced: todayMovements.filter((movement) => movement.type === 'PRODUCTION_IN').reduce((total, movement) => total + Math.abs(movement.quantity), 0),
    sold: todayMovements.filter((movement) => movement.type === 'SALE_OUT').reduce((total, movement) => total + Math.abs(movement.quantity), 0),
    waste: todayMovements.filter((movement) => movement.type === 'WASTE_OUT' || movement.type === 'DAMAGED_OUT').reduce((total, movement) => total + Math.abs(movement.quantity), 0),
  }), [todayMovements])
  const isSubmitting = productionMutation.isPending || wasteMutation.isPending
  const plan = planQuery.data
  const suggestedProducts = plan?.products.filter((product) => product.suggestedProduction > 0) ?? []

  function selectOperation(nextOperation: Operation) {
    setOperation(nextOperation)
    setFeedback(null)
  }

  function usePlanSuggestions() {
    if (!plan) return
    setQuantities(Object.fromEntries(
      plan.products
        .filter((product) => product.suggestedProduction > 0)
        .map((product) => [product.productId, String(product.suggestedProduction)]),
    ))
    selectOperation('PRODUCTION')
  }

  async function submit() {
    setFeedback(null)
    const items = eligibleProducts.flatMap((product) => {
      const quantity = Number(quantities[product.id] ?? 0)
      return Number.isInteger(quantity) && quantity > 0 ? [{ productId: product.id, quantity }] : []
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
          ? `Producción registrada: ${result.totalUnits} ${result.totalUnits === 1 ? 'unidad' : 'unidades'}. ${result.ingredientsConsumed ? `Se descontaron ${result.ingredientUnitsConsumed} unidades de ${result.ingredientsConsumed} ${result.ingredientsConsumed === 1 ? 'insumo' : 'insumos'}.` : 'Los productos sin receta no descontaron insumos.'}`
          : `Merma registrada: ${result.totalUnits} ${result.totalUnits === 1 ? 'unidad' : 'unidades'} en ${result.affectedProducts} ${result.affectedProducts === 1 ? 'producto' : 'productos'}.`,
      )
    } catch (error) {
      setFeedback(getErrorMessage(error, 'No fue posible registrar la operación.'))
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <div className={styles.headingCopy}>
          <span className={styles.headingIcon}><ChefHat aria-hidden="true" /></span>
          <div>
            <p className={styles.eyebrow}>Control de panadería</p>
            <h3>Producción, recetas e insumos</h3>
            <p>Calcula qué producir y descuenta ingredientes sin registrar compras ficticias.</p>
          </div>
        </div>
        <div className={styles.summary}>
          <span><PackageCheck aria-hidden="true" /><strong>{summary.produced}</strong><small>producidas hoy</small></span>
          <span><TrendingUp aria-hidden="true" /><strong>{summary.sold}</strong><small>vendidas hoy</small></span>
          <span><AlertTriangle aria-hidden="true" /><strong>{summary.waste}</strong><small>de merma</small></span>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Operación de panadería">
        <button className={operation === 'PLAN' ? styles.activeTab : undefined} type="button" onClick={() => selectOperation('PLAN')}><Sparkles aria-hidden="true" /> Plan sugerido</button>
        <button className={operation === 'PRODUCTION' ? styles.activeTab : undefined} type="button" onClick={() => selectOperation('PRODUCTION')}><Boxes aria-hidden="true" /> Producción</button>
        <button className={operation === 'WASTE' ? styles.activeTab : undefined} type="button" onClick={() => selectOperation('WASTE')}><AlertTriangle aria-hidden="true" /> Merma</button>
        <button className={operation === 'RECIPES' ? styles.activeTab : undefined} type="button" onClick={() => selectOperation('RECIPES')}><ClipboardList aria-hidden="true" /> Recetas</button>
      </div>

      {operation === 'PLAN' ? (
        <div className={styles.planWorkspace}>
          <div className={styles.sectionIntro}>
            <div><strong>Necesidad estimada para hoy</strong><span>Promedio calculado con las ventas de los últimos {plan?.historyDays ?? 7} días y el inventario actual.</span></div>
            <button disabled={!suggestedProducts.length} type="button" onClick={usePlanSuggestions}>Usar cantidades sugeridas</button>
          </div>
          {planQuery.isLoading ? <p className={styles.empty}>Calculando el plan de producción…</p> : null}
          {planQuery.isError ? <p className={styles.feedback}>No pudimos calcular el plan. Intenta actualizar la página.</p> : null}
          {plan && suggestedProducts.length === 0 ? (
            <div className={styles.readyState}><PackageCheck aria-hidden="true" /><div><strong>Inventario suficiente</strong><span>Con las ventas recientes no hace falta producir más unidades por ahora.</span></div></div>
          ) : null}
          <div className={styles.planGrid}>
            {suggestedProducts.map((product) => (
              <article className={styles.planCard} key={product.productId}>
                <div className={styles.planCardTop}><span>{product.hasRecipe ? <Wheat aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}</span><small>{product.hasRecipe ? 'Receta configurada' : 'Sin receta'}</small></div>
                <strong>{product.name}</strong>
                <div className={styles.planNumbers}>
                  <span><small>Stock</small><b>{product.stock}</b></span>
                  <span><small>Venta diaria</small><b>{product.averageDailySales}</b></span>
                  <span className={styles.suggestion}><small>Producir</small><b>{product.suggestedProduction}</b></span>
                </div>
              </article>
            ))}
          </div>
          {plan?.ingredients.length ? (
            <div className={styles.ingredientSummary}>
              <div className={styles.sectionIntro}><div><strong>Insumos para el plan</strong><span>Cantidades totales necesarias para las recetas configuradas.</span></div></div>
              <div className={styles.ingredientList}>
                {plan.ingredients.map((ingredient) => (
                  <div className={ingredient.missing > 0 ? styles.missingIngredient : undefined} key={ingredient.productId}>
                    <span><strong>{ingredient.name}</strong><small>Disponible: {ingredient.stock} {ingredient.unit.toLowerCase()}</small></span>
                    <span><b>{ingredient.required}</b> requeridos{ingredient.missing > 0 ? <em>Faltan {ingredient.missing}</em> : <em>Completo</em>}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {operation === 'RECIPES' ? (
        <div className={styles.recipeWorkspace}>
          <div className={styles.sectionIntro}><div><strong>Recetas de productos elaborados</strong><span>Relaciona cada producto terminado con los insumos que consume.</span></div></div>
          {producedProducts.length === 0 ? <p className={styles.empty}>Primero crea productos marcados como “Lo producimos por cantidades”.</p> : (
            <div className={styles.recipeList}>
              {producedProducts.map((product) => {
                const currentRecipe = recipes.find((item) => item.productId === product.id)
                return (
                  <button key={product.id} type="button" onClick={() => setRecipeProductId(product.id)}>
                    <span className={currentRecipe ? styles.recipeReadyIcon : styles.recipePendingIcon}>{currentRecipe ? <Wheat aria-hidden="true" /> : <ChefHat aria-hidden="true" />}</span>
                    <span><strong>{product.name}</strong><small>{currentRecipe ? `${currentRecipe.ingredients.length} insumos · produce ${currentRecipe.yieldQuantity}` : 'Pendiente de configurar'}</small></span>
                    <b>{currentRecipe ? 'Editar' : 'Crear receta'}</b>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {operation === 'PRODUCTION' || operation === 'WASTE' ? (
        <div className={styles.operationWorkspace}>
          <div className={styles.sectionIntro}><div><strong>{isProduction ? 'Cantidades terminadas' : 'Productos desperdiciados o dañados'}</strong><span>{isProduction ? 'Al guardar, las recetas configuradas descontarán sus insumos.' : 'La merma reduce las existencias del producto seleccionado.'}</span></div></div>
          {eligibleProducts.length === 0 ? <p className={styles.empty}>{isProduction ? 'Crea productos con la opción “Lo producimos por cantidades”.' : 'No hay productos con control de existencias.'}</p> : (
            <div className={styles.productList}>
              {eligibleProducts.map((product) => (
                <label className={styles.productRow} key={product.id}>
                  <span><strong>{product.name}</strong><small>Disponible: {product.stock}{isProduction && recipes.some((item) => item.productId === product.id) ? ' · receta activa' : ''}</small></span>
                  <input aria-label={`${isProduction ? 'Cantidad producida' : 'Cantidad de merma'} de ${product.name}`} inputMode="numeric" min="0" placeholder="0" type="number" value={quantities[product.id] ?? ''} onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: event.target.value }))} />
                </label>
              ))}
            </div>
          )}
          <label className={styles.reason}><span>Nota opcional</span><input maxLength={255} placeholder={isProduction ? 'Ej. Primera horneada' : 'Ej. Sobrante del día'} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
          <button className={styles.submit} disabled={isSubmitting || eligibleProducts.length === 0} type="button" onClick={() => void submit()}>{isSubmitting ? 'Guardando…' : isProduction ? 'Guardar producción y descontar insumos' : 'Guardar merma'}</button>
        </div>
      ) : null}

      <BakeryRecipeDrawer isOpen={Boolean(recipeProduct)} product={recipeProduct} products={products} recipe={recipe} onClose={() => setRecipeProductId(null)} />
    </section>
  )
}
