import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  CalendarCheck2,
  ChefHat,
  CircleDollarSign,
  CloudOff,
  PackagePlus,
  PackageSearch,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Wheat,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  useBakeryCostAnalysisQuery,
  useBakeryDailySummaryQuery,
  useProductionPlanQuery,
} from '@/modules/inventory/hooks/use-inventory-query'
import { useOfflineSales } from '@/modules/sales/hooks/use-offline-sales'
import { useSalesHistoryQuery } from '@/modules/sales/hooks/use-sales-history-query'
import { routePaths } from '@/routes/route-paths'
import { formatCurrency } from '@/shared/utils/format-currency'
import styles from './BakeryOperationsDashboard.module.css'

type BakeryOperationsDashboardProps = {
  businessId?: string
  userId?: string
  salesToday: number
  revenueToday: number
  lowStockCount: number
}

function getBusinessDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function inventoryAction(tab: string) {
  return `${routePaths.inventory}?bakeryTab=${tab}`
}

export function BakeryOperationsDashboard({
  businessId,
  userId,
  salesToday,
  revenueToday,
  lowStockCount,
}: BakeryOperationsDashboardProps) {
  const today = getBusinessDate()
  const dailySummaryQuery = useBakeryDailySummaryQuery(today)
  const productionPlanQuery = useProductionPlanQuery(1)
  const costAnalysisQuery = useBakeryCostAnalysisQuery(7)
  const salesHistoryQuery = useSalesHistoryQuery({
    from: today,
    to: today,
    status: 'ALL',
    page: 1,
    pageSize: 5,
  })
  const offlineSales = useOfflineSales(businessId, userId)
  const daily = dailySummaryQuery.data
  const plan = productionPlanQuery.data
  const costs = costAnalysisQuery.data
  const salesSummary = salesHistoryQuery.data?.summary
  const pendingOfflineSales = offlineSales.records.filter(
    (record) => record.status === 'PENDING' || record.status === 'SYNCING',
  )
  const pendingOfflineTotal = pendingOfflineSales.reduce(
    (total, record) => total + record.total,
    0,
  )
  const suggestedProducts = plan?.products.filter(
    (product) => product.suggestedProduction > 0,
  ) ?? []
  const suggestedUnits = suggestedProducts.reduce(
    (total, product) => total + product.suggestedProduction,
    0,
  )
  const marginRisks = costs?.products.filter(
    (product) =>
      product.price > 0 &&
      (product.status === 'BELOW_COST' || product.status === 'LOW_MARGIN'),
  ) ?? []
  const costByProduct = new Map(
    costs?.products.map((product) => [product.productId, product]) ?? [],
  )
  const estimatedTodayGrossProfit = daily?.products.reduce((total, product) => {
    const cost = costByProduct.get(product.productId)
    return total + product.sold * (cost?.marginValue ?? 0)
  }, 0) ?? 0
  const wasteCostToday = daily?.products.reduce((total, product) => {
    const cost = costByProduct.get(product.productId)
    return total + product.waste * (cost?.unitCost ?? 0)
  }, 0) ?? 0
  const soldProducts = [...(daily?.products ?? [])]
    .filter((product) => product.sold > 0)
    .sort((firstProduct, secondProduct) => secondProduct.sold - firstProduct.sold)
    .slice(0, 5)
  const highestSoldQuantity = soldProducts[0]?.sold ?? 0
  const hasOperationalAlert =
    pendingOfflineSales.length > 0 ||
    suggestedProducts.length > 0 ||
    marginRisks.length > 0 ||
    lowStockCount > 0 ||
    (daily?.totals.waste ?? 0) > 0

  return (
    <section className={styles.workspace} aria-label="Operación diaria de panadería">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Centro operativo de hoy</p>
          <h2>La panadería, de un vistazo</h2>
          <p>
            Decide qué producir, revisa lo vendido y atiende primero lo que puede
            afectar el margen o el inventario.
          </p>
        </div>
        <Link className={styles.primaryAction} to={routePaths.salesNew}>
          <ShoppingCart aria-hidden="true" />
          Registrar venta
        </Link>
      </div>

      <div className={styles.metrics}>
        <article>
          <span className={styles.metricIcon}><ShoppingCart /></span>
          <div><small>Ventas de hoy</small><strong>{salesToday}</strong></div>
          <em>{formatCurrency(revenueToday)} vendidos</em>
        </article>
        <article>
          <span className={styles.metricIcon}><Banknote /></span>
          <div><small>Dinero recibido</small><strong>{formatCurrency(salesSummary?.collectedTotal ?? revenueToday)}</strong></div>
          <em>Pagos registrados durante el día</em>
        </article>
        <article className={(salesSummary?.outstandingTotal ?? 0) > 0 ? styles.metricPending : undefined}>
          <span className={styles.metricIcon}><CircleDollarSign /></span>
          <div><small>Por cobrar</small><strong>{formatCurrency(salesSummary?.outstandingTotal ?? 0)}</strong></div>
          <em>Saldo pendiente de las ventas de hoy</em>
        </article>
        <article>
          <span className={styles.metricIcon}><ChefHat /></span>
          <div><small>Producción</small><strong>{daily?.totals.produced ?? 0}</strong></div>
          <em>{daily?.totals.sold ?? 0} unidades vendidas</em>
        </article>
        <article>
          <span className={styles.metricIcon}><CircleDollarSign /></span>
          <div><small>Utilidad bruta estimada</small><strong>{formatCurrency(estimatedTodayGrossProfit)}</strong></div>
          <em>Antes de gastos fijos e impuestos</em>
        </article>
        <article className={(daily?.totals.waste ?? 0) > 0 ? styles.metricWarning : undefined}>
          <span className={styles.metricIcon}><AlertTriangle /></span>
          <div><small>Merma de hoy</small><strong>{daily?.totals.waste ?? 0}</strong></div>
          <em>{formatCurrency(wasteCostToday)} de costo estimado</em>
        </article>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.priorityPanel}>
          <div className={styles.sectionHeading}>
            <div>
              <p>Prioridades</p>
              <h3>{hasOperationalAlert ? 'Acciones recomendadas' : 'Todo está bajo control'}</h3>
            </div>
            <Sparkles aria-hidden="true" />
          </div>

          <div className={styles.priorityList}>
            {pendingOfflineSales.length > 0 ? (
              <Link to={routePaths.salesNew}>
                <span className={styles.priorityIconPurple}><CloudOff /></span>
                <span><strong>{pendingOfflineSales.length} ventas por sincronizar</strong><small>{formatCurrency(pendingOfflineTotal)} guardados en este dispositivo.</small></span>
                <ArrowRight />
              </Link>
            ) : null}
            {suggestedProducts.length > 0 ? (
              <Link to={inventoryAction('PLAN')}>
                <span className={styles.priorityIconBlue}><Boxes /></span>
                <span><strong>Producir {suggestedUnits} unidades</strong><small>{suggestedProducts.length} productos tienen demanda estimada.</small></span>
                <ArrowRight />
              </Link>
            ) : null}
            {marginRisks.length > 0 ? (
              <Link to={inventoryAction('COSTS')}>
                <span className={styles.priorityIconAmber}><TrendingUp /></span>
                <span><strong>{marginRisks.length} productos con margen en riesgo</strong><small>Revisa costos y precios antes de seguir produciendo.</small></span>
                <ArrowRight />
              </Link>
            ) : null}
            {lowStockCount > 0 ? (
              <Link to={routePaths.inventory}>
                <span className={styles.priorityIconRed}><PackageSearch /></span>
                <span><strong>{lowStockCount} alertas de inventario</strong><small>Hay productos o insumos que necesitan reposición.</small></span>
                <ArrowRight />
              </Link>
            ) : null}
            {(daily?.totals.waste ?? 0) > 0 ? (
              <Link to={inventoryAction('CLOSE')}>
                <span className={styles.priorityIconRed}><AlertTriangle /></span>
                <span><strong>Revisar merma del día</strong><small>{daily?.totals.wasteRate ?? 0}% de las salidas corresponde a merma.</small></span>
                <ArrowRight />
              </Link>
            ) : null}
            {!hasOperationalAlert ? (
              <div className={styles.readyState}>
                <span className={styles.priorityIconGreen}><Wheat /></span>
                <span><strong>Operación saludable</strong><small>No hay acciones urgentes para este momento.</small></span>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.actionsPanel}>
          <div className={styles.sectionHeading}>
            <div><p>Accesos rápidos</p><h3>Continúa la operación</h3></div>
          </div>
          <div className={styles.actionGrid}>
            <Link to={inventoryAction('PRODUCTION')}><ChefHat /><span><strong>Producir</strong><small>Registrar lote del día</small></span></Link>
            <Link to={`${routePaths.inventory}?mode=purchase`}><PackagePlus /><span><strong>Comprar</strong><small>Registrar insumos recibidos</small></span></Link>
            <Link to={inventoryAction('WASTE')}><AlertTriangle /><span><strong>Merma</strong><small>Reportar pérdidas</small></span></Link>
            <Link to={inventoryAction('PLAN')}><Boxes /><span><strong>Plan sugerido</strong><small>Qué preparar hoy</small></span></Link>
            <Link to={inventoryAction('CLOSE')}><CalendarCheck2 /><span><strong>Cierre diario</strong><small>Comparar resultados</small></span></Link>
            <Link to={inventoryAction('COSTS')}><CircleDollarSign /><span><strong>Rentabilidad</strong><small>Revisar costos y margen</small></span></Link>
          </div>
        </div>
      </div>

      <div className={styles.soldPanel}>
        <div className={styles.sectionHeading}>
          <div>
            <p>Salida de productos</p>
            <h3>Lo que se ha vendido hoy</h3>
          </div>
          <Link to={routePaths.sales}>Ver ventas <ArrowRight aria-hidden="true" /></Link>
        </div>
        {soldProducts.length > 0 ? (
          <div className={styles.soldProducts}>
            {soldProducts.map((product) => (
              <article key={product.productId}>
                <div>
                  <strong>{product.name}</strong>
                  <small>{product.stock} disponibles ahora</small>
                </div>
                <span className={styles.soldTrack}>
                  <span style={{ width: `${Math.max(8, (product.sold / highestSoldQuantity) * 100)}%` }} />
                </span>
                <b>{product.sold} vendidas</b>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptySales}>
            <ShoppingCart aria-hidden="true" />
            <span><strong>Aún no hay productos vendidos hoy</strong><small>Cuando registres la primera venta aparecerá aquí.</small></span>
            <Link to={routePaths.salesNew}>Registrar venta</Link>
          </div>
        )}
      </div>
    </section>
  )
}
