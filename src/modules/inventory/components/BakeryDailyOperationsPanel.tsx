import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Boxes,
  CalendarCheck2,
  ChefHat,
  CircleDollarSign,
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
  useBakeryDailySummaryQuery,
  useBakeryCostAnalysisQuery,
  useRegisterInventoryProductionMutation,
  useRegisterInventoryWasteMutation,
} from '@/modules/inventory/hooks/use-inventory-query'
import type { BakeryCostStatus, BakeryDailyProductStatus, InventoryMovement } from '@/modules/inventory/types/inventory'
import type { Product } from '@/modules/products/types/product'
import { getProductAvailabilityLabel } from '@/modules/products/utils/product-sale-availability'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { formatCurrency } from '@/shared/utils/format-currency'
import styles from './BakeryDailyOperationsPanel.module.css'

type Operation = 'PLAN' | 'PRODUCTION' | 'WASTE' | 'RECIPES' | 'CLOSE' | 'COSTS'

const operations = new Set<Operation>([
  'PLAN',
  'PRODUCTION',
  'WASTE',
  'RECIPES',
  'CLOSE',
  'COSTS',
])

function getOperationFromSearch(value: string | null): Operation {
  return value && operations.has(value as Operation) ? (value as Operation) : 'PLAN'
}

type Props = {
  movements: InventoryMovement[]
  products: Product[]
}

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString()
}

function getBusinessDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getCloseStatus(status: BakeryDailyProductStatus) {
  const statuses = {
    NO_ACTIVITY: { label: 'Sin movimiento', detail: 'No registró producción, ventas ni merma.', className: styles.statusNeutral },
    BALANCED: { label: 'En equilibrio', detail: 'La producción y las salidas están dentro de un rango saludable.', className: styles.statusBalanced },
    SELLING_WELL: { label: 'Buena salida', detail: 'Se vendió la mayor parte de lo producido.', className: styles.statusGood },
    OVERPRODUCTION: { label: 'Revisar producción', detail: 'Quedó más producto del esperado frente a las ventas.', className: styles.statusWarning },
    WASTE_ALERT: { label: 'Merma alta', detail: 'Conviene revisar cantidades o manipulación del producto.', className: styles.statusDanger },
    SOLD_FROM_STOCK: { label: 'Venta de inventario previo', detail: 'Hubo ventas sin producción registrada hoy.', className: styles.statusInfo },
  }
  return statuses[status]
}

function getCostStatus(status: BakeryCostStatus) {
  const statuses = {
    NO_RECIPE: { label: 'Sin receta', detail: 'Configura la receta para calcular el costo real.', className: styles.statusWarning },
    NO_COST: { label: 'Sin costo', detail: 'Registra un costo para medir la rentabilidad.', className: styles.statusNeutral },
    BELOW_COST: { label: 'Genera pérdida', detail: 'El precio no alcanza a cubrir el costo estimado.', className: styles.statusDanger },
    LOW_MARGIN: { label: 'Margen bajo', detail: 'El margen es menor al 30%. Revisa precio o costos.', className: styles.statusWarning },
    HEALTHY: { label: 'Margen saludable', detail: 'El precio cubre el costo con un margen adecuado.', className: styles.statusGood },
  }
  return statuses[status]
}

export function BakeryDailyOperationsPanel({ movements, products }: Props) {
  const [searchParams] = useSearchParams()
  const requestedOperation = getOperationFromSearch(searchParams.get('bakeryTab'))
  const [operation, setOperation] = useState<Operation>(requestedOperation)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [recipeProductId, setRecipeProductId] = useState<string | null>(null)
  const [closeDate, setCloseDate] = useState(getBusinessDate)
  const [costHistoryDays, setCostHistoryDays] = useState(7)
  const productionMutation = useRegisterInventoryProductionMutation()
  const wasteMutation = useRegisterInventoryWasteMutation()
  const recipesQuery = useProductRecipesQuery()
  const planQuery = useProductionPlanQuery(1)
  const dailySummaryQuery = useBakeryDailySummaryQuery(closeDate)
  const costAnalysisQuery = useBakeryCostAnalysisQuery(costHistoryDays)
  const recipeProducts = products.filter((product) => ['PRODUCED', 'MADE_TO_ORDER'].includes(product.inventoryBehavior))
  const recipes = recipesQuery.data ?? []
  const recipeProduct = recipeProducts.find((product) => product.id === recipeProductId) ?? null
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

  useEffect(() => {
    setOperation(requestedOperation)
  }, [requestedOperation])

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
        <button className={operation === 'CLOSE' ? styles.activeTab : undefined} type="button" onClick={() => selectOperation('CLOSE')}><CalendarCheck2 aria-hidden="true" /> Cierre diario</button>
        <button className={operation === 'COSTS' ? styles.activeTab : undefined} type="button" onClick={() => selectOperation('COSTS')}><CircleDollarSign aria-hidden="true" /> Rentabilidad</button>
      </div>

      {operation === 'PLAN' ? (
        <div className={styles.planWorkspace}>
          <div className={styles.sectionIntro}>
            <div><strong>Necesidad estimada para hoy</strong><span>Pronóstico inteligente con {plan?.historyDays ?? 28} días de historia, días de semana comparables, merma, pedidos pendientes y stock de seguridad.</span></div>
            <button disabled={!suggestedProducts.length} type="button" onClick={usePlanSuggestions}>Usar cantidades sugeridas</button>
          </div>
          {planQuery.isLoading ? <p className={styles.empty}>Calculando el plan de producción…</p> : null}
          {planQuery.isError ? <p className={styles.feedback}>No pudimos calcular el plan. Intenta actualizar la página.</p> : null}
          {plan && suggestedProducts.length === 0 ? (
            <div className={styles.readyState}><PackageCheck aria-hidden="true" /><div><strong>Inventario suficiente</strong><span>Con las ventas recientes no hace falta producir más unidades por ahora.</span></div></div>
          ) : null}
          <div className={styles.planGrid}>
            {(plan?.products ?? []).map((product) => (
              <article className={styles.planCard} key={product.productId}>
                <div className={styles.planCardTop}><span>{product.hasRecipe ? <Wheat aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}</span><small>{product.confidence === 'HIGH' ? 'Confianza alta' : product.confidence === 'MEDIUM' ? 'Confianza media' : 'Poca historia'}</small></div>
                <strong>{product.name}</strong>
                <div className={styles.planNumbers}>
                  <span><small>Stock</small><b>{product.stock}</b></span>
                  <span><small>Demanda prevista</small><b>{product.forecastDemand}</b></span>
                  <span className={styles.suggestion}><small>Producir</small><b>{product.suggestedProduction}</b></span>
                </div>
                <div className={styles.planBreakdown}>
                  <span><small>Mismo día</small><b>{product.weekdayAverageDailySales}</b></span>
                  <span><small>Seguridad</small><b>+{product.safetyStock}</b></span>
                  <span><small>Merma</small><b>+{product.wasteBuffer}</b></span>
                  <span><small>Pedidos</small><b>+{product.pendingDemand}</b></span>
                </div>
                <p className={styles.planExplanation}>{product.comparableDays} días comparables · promedio general {product.generalAverageDailySales}/día{product.hasRecipe ? '' : ' · configura la receta para descontar insumos'}</p>
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
          <div className={styles.sectionIntro}><div><strong>Recetas y consumos automáticos</strong><span>Los productos por cantidades descuentan ingredientes al producir; los preparados al momento los descuentan al vender.</span></div></div>
          {recipeProducts.length === 0 ? <p className={styles.empty}>Primero crea un producto elaborado o preparado al momento.</p> : (
            <div className={styles.recipeList}>
              {recipeProducts.map((product) => {
                const currentRecipe = recipes.find((item) => item.productId === product.id)
                return (
                  <button key={product.id} type="button" onClick={() => setRecipeProductId(product.id)}>
                    <span className={currentRecipe ? styles.recipeReadyIcon : styles.recipePendingIcon}>{currentRecipe ? <Wheat aria-hidden="true" /> : <ChefHat aria-hidden="true" />}</span>
                    <span><strong>{product.name}</strong><small>{currentRecipe ? `${currentRecipe.ingredients.length} insumos · ${product.inventoryBehavior === 'MADE_TO_ORDER' ? getProductAvailabilityLabel(product) : `produce ${currentRecipe.yieldQuantity}`}` : `Pendiente · ${product.inventoryBehavior === 'MADE_TO_ORDER' ? 'preparado al momento' : 'producción por cantidades'}`}</small></span>
                    <b>{currentRecipe ? 'Editar' : 'Crear receta'}</b>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {operation === 'CLOSE' ? (
        <div className={styles.closeWorkspace}>
          <div className={styles.closeToolbar}>
            <div><strong>Cierre operativo</strong><span>Compara lo producido, vendido y desperdiciado para ajustar el siguiente día.</span></div>
            <label><span>Fecha</span><input aria-label="Fecha del cierre diario" max={getBusinessDate()} type="date" value={closeDate} onChange={(event) => setCloseDate(event.target.value)} /></label>
          </div>
          {dailySummaryQuery.isLoading ? <p className={styles.empty}>Preparando el cierre del día…</p> : null}
          {dailySummaryQuery.isError ? <p className={styles.feedback}>No pudimos preparar el cierre. Intenta actualizar la página.</p> : null}
          {dailySummaryQuery.data ? (
            <>
              <div className={styles.closeMetrics}>
                <article><PackageCheck aria-hidden="true" /><span><small>Producido</small><strong>{dailySummaryQuery.data.totals.produced}</strong></span></article>
                <article><TrendingUp aria-hidden="true" /><span><small>Vendido</small><strong>{dailySummaryQuery.data.totals.sold}</strong></span></article>
                <article><AlertTriangle aria-hidden="true" /><span><small>Merma</small><strong>{dailySummaryQuery.data.totals.waste}</strong></span></article>
                <article><Boxes aria-hidden="true" /><span><small>Balance del día</small><strong>{dailySummaryQuery.data.totals.netDailyFlow > 0 ? '+' : ''}{dailySummaryQuery.data.totals.netDailyFlow}</strong></span></article>
              </div>
              {dailySummaryQuery.data.products.some((product) => product.produced || product.sold || product.waste) ? (
                <div className={styles.closeProductList}>
                  {dailySummaryQuery.data.products.filter((product) => product.produced || product.sold || product.waste).map((product) => {
                    const status = getCloseStatus(product.status)
                    return (
                      <article key={product.productId}>
                        <div className={styles.closeProductHeading}><span><strong>{product.name}</strong><small>Existencia final: {product.stock}</small></span><em className={status.className}>{status.label}</em></div>
                        <div className={styles.closeProductNumbers}><span><small>Producido</small><b>{product.produced}</b></span><span><small>Vendido</small><b>{product.sold}</b></span><span><small>Merma</small><b>{product.waste}</b></span><span><small>Balance</small><b>{product.netDailyFlow > 0 ? '+' : ''}{product.netDailyFlow}</b></span></div>
                        <p>{status.detail}</p>
                      </article>
                    )
                  })}
                </div>
              ) : <div className={styles.readyState}><CalendarCheck2 aria-hidden="true" /><div><strong>Aún no hay actividad para cerrar</strong><span>Cuando registres producción, ventas o merma aparecerá aquí el resumen del día.</span></div></div>}
              {closeDate === getBusinessDate() ? (
                <div className={styles.tomorrowCard}>
                  <span><Sparkles aria-hidden="true" /></span>
                  <div><strong>Preparación para mañana</strong><p>{suggestedProducts.length ? `${suggestedProducts.length} ${suggestedProducts.length === 1 ? 'producto necesita' : 'productos necesitan'} producción según ventas e inventario. Revisa el Plan sugerido antes de iniciar.` : 'El inventario actual cubre la demanda estimada. No hace falta programar producción adicional por ahora.'}</p></div>
                  <button type="button" onClick={() => selectOperation('PLAN')}>Ver plan</button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {operation === 'COSTS' ? (
        <div className={styles.costWorkspace}>
          <div className={styles.costToolbar}>
            <div><strong>Costos y margen estimado</strong><span>Usa el costo de la receta cuando existe; para los demás productos toma el costo registrado.</span></div>
            <div className={styles.periodButtons} aria-label="Periodo de rentabilidad"><button className={costHistoryDays === 7 ? styles.activePeriod : undefined} type="button" onClick={() => setCostHistoryDays(7)}>7 días</button><button className={costHistoryDays === 30 ? styles.activePeriod : undefined} type="button" onClick={() => setCostHistoryDays(30)}>30 días</button></div>
          </div>
          {costAnalysisQuery.isLoading ? <p className={styles.empty}>Calculando costos y márgenes…</p> : null}
          {costAnalysisQuery.isError ? <p className={styles.feedback}>No pudimos calcular la rentabilidad. Intenta actualizar la página.</p> : null}
          {costAnalysisQuery.data ? (
            <>
              <div className={styles.costMetrics}>
                <article><span><small>Ventas estimadas</small><strong>{formatCurrency(costAnalysisQuery.data.totals.estimatedRevenue)}</strong></span></article>
                <article><span><small>Utilidad bruta estimada</small><strong>{formatCurrency(costAnalysisQuery.data.totals.estimatedGrossProfit)}</strong></span></article>
                <article><span><small>Margen promedio</small><strong>{costAnalysisQuery.data.totals.averageMarginPercent}%</strong></span></article>
                <article><span><small>Costo de merma</small><strong>{formatCurrency(costAnalysisQuery.data.totals.estimatedWasteCost)}</strong></span></article>
              </div>
              <div className={styles.costProductList}>
                {costAnalysisQuery.data.products.filter((product) => product.price > 0).map((product) => {
                  const status = getCostStatus(product.status)
                  return (
                    <article key={product.productId}>
                      <div className={styles.costProductHeading}><span><strong>{product.name}</strong><small>{product.recipeUnitCost !== null ? 'Costo calculado desde receta' : 'Costo registrado en el producto'}</small></span><em className={status.className}>{status.label}</em></div>
                      <div className={styles.costNumbers}><span><small>Precio</small><b>{formatCurrency(product.price)}</b></span><span><small>Costo unitario</small><b>{formatCurrency(product.unitCost)}</b></span><span><small>Margen</small><b>{product.marginPercent}%</b></span></div>
                      <div className={styles.costActivity}><span>{product.soldUnits} vendidos</span><span>{formatCurrency(product.estimatedGrossProfit)} de utilidad estimada</span>{product.wasteUnits > 0 ? <span>{formatCurrency(product.estimatedWasteCost)} en merma</span> : null}</div>
                      <p>{status.detail}</p>
                      {product.status === 'NO_RECIPE' ? <button type="button" onClick={() => setRecipeProductId(product.productId)}>Configurar receta</button> : null}
                    </article>
                  )
                })}
              </div>
              <p className={styles.costDisclaimer}>Valores estimados antes de gastos fijos, impuestos y descuentos. Sirven para comparar productos y tomar decisiones de precio.</p>
            </>
          ) : null}
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
