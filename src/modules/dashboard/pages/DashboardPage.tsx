import { Link } from 'react-router-dom'
import {
  Bell,
  CircleHelp,
  Coins,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'
import { BestSellingProductsPanel } from '@/modules/dashboard/components/BestSellingProductsPanel'
import { DashboardMetricCard } from '@/modules/dashboard/components/DashboardMetricCard'
import { InventoryAlertsPanel } from '@/modules/dashboard/components/InventoryAlertsPanel'
import { useDashboardSummaryQuery } from '@/modules/dashboard/hooks/use-dashboard-summary-query'
import { routePaths } from '@/routes/route-paths'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const dashboardSummaryQuery = useDashboardSummaryQuery()
  const summary = dashboardSummaryQuery.data
  const bestSellingProducts = summary?.bestSellingProducts ?? []
  const lowStockAlerts = summary?.lowStockAlerts ?? []
  const topSeller = bestSellingProducts[0]
  const salesToday = summary?.salesToday ?? 0
  const totalRevenue = summary?.totalRevenue ?? 0
  const averageSale = salesToday > 0 ? totalRevenue / salesToday : 0
  const registeredCustomers = summary?.qaEvidence?.counts.customers ?? 0
  const activeProducts = summary?.qaEvidence?.counts.products ?? 0
  const totalBestSellerUnits = bestSellingProducts.reduce(
    (total, product) => total + product.quantitySold,
    0,
  )
  const topSellerShare =
    topSeller && totalBestSellerUnits > 0
      ? Math.round((topSeller.quantitySold / totalBestSellerUnits) * 100)
      : 0
  const featuredStock = topSeller
    ? lowStockAlerts.find((alert) => alert.productId === topSeller.productId)
        ?.stock
    : undefined
  const inventoryHealth = Math.max(18, Math.min(94, 94 - lowStockAlerts.length * 12))
  const demandTrackClass =
    topSellerShare >= 70
      ? styles.demandTrackHigh
      : topSellerShare >= 40
        ? styles.demandTrackMedium
        : styles.demandTrackLow

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <label className={styles.searchBox}>
          <Search aria-hidden="true" className={styles.searchIcon} />
          <input
            aria-label="Buscar productos y ventas"
            placeholder="Buscar productos, ventas..."
            readOnly
            type="search"
          />
          <kbd>CMD + K</kbd>
        </label>

        <div className={styles.topbarActions}>
          <button aria-label="Notificaciones" className={styles.iconButton} type="button">
            <Bell aria-hidden="true" />
          </button>
          <button aria-label="Ayuda" className={styles.iconButton} type="button">
            <CircleHelp aria-hidden="true" />
          </button>
          <Link className={styles.saleButton} to={routePaths.sales}>
            <Plus aria-hidden="true" />
            Nueva Venta
          </Link>
        </div>
      </header>

      <section className={styles.heroGrid}>
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Resumen del negocio</p>
            <h2 className={styles.title}>
              Una lectura clara del negocio para{' '}
              <span>empezar el día con contexto.</span>
            </h2>
            <p className={styles.description}>
              Mira qué se está vendiendo, cuánto dinero entra y qué productos
              necesitan atención antes de quedarse sin stock.
            </p>

            <div className={styles.heroActions}>
              <button
                className={styles.primaryAction}
                disabled={dashboardSummaryQuery.isFetching}
                type="button"
                onClick={() => {
                  void dashboardSummaryQuery.refetch()
                }}
              >
                <RefreshCw aria-hidden="true" />
                {dashboardSummaryQuery.isFetching
                  ? 'Actualizando resumen...'
                  : 'Actualizar resumen'}
              </button>

              <Link className={styles.secondaryAction} to={routePaths.sales}>
                Nueva venta
              </Link>

              <Link className={styles.linkAction} to={routePaths.products}>
                Ver productos
              </Link>
            </div>
          </div>

          <div className={styles.heroStats}>
            <div>
              <span>Promedio venta</span>
              <strong>{formatCurrency(averageSale)}</strong>
            </div>
            <div>
              <span>Clientes registrados</span>
              <strong>+{registeredCustomers}</strong>
            </div>
            <div>
              <span>Productos activos</span>
              <strong className={styles.heroHighlight}>{activeProducts}</strong>
            </div>
          </div>
        </div>

        <aside className={styles.spotlightCard}>
          <div className={styles.spotlightHeader}>
            <p className={styles.spotlightLabel}>Producto destacado</p>
            {topSeller ? <span>Hot sell</span> : null}
          </div>

          <div className={styles.productMedia}>
            <PackageCheck aria-hidden="true" />
          </div>

          <h3 className={styles.spotlightValue}>
            {topSeller ? topSeller.name : 'Esperando ventas'}
          </h3>
          <p className={styles.spotlightHint}>
            {topSeller
              ? `${topSeller.quantitySold} unidad${topSeller.quantitySold === 1 ? '' : 'es'} vendida${topSeller.quantitySold === 1 ? '' : 's'} hasta ahora. ${
                  typeof featuredStock === 'number'
                    ? `Quedan ${featuredStock} en stock.`
                    : 'Sin alerta de stock activa.'
                }`
              : 'Cuando empiecen a entrar ventas, aquí verás el producto más fuerte del momento.'}
          </p>

          <div className={styles.demandBlock}>
            <div className={styles.demandHeader}>
              <span>Participación hoy</span>
              <strong>{topSeller ? `${topSellerShare}%` : '0%'}</strong>
            </div>
            <span className={styles.demandTrack}>
              <span className={topSeller ? demandTrackClass : undefined} />
            </span>
          </div>
        </aside>
      </section>

      <div className={styles.metricsGrid}>
        <DashboardMetricCard
          hint="Ventas registradas desde que comenzó el día."
          icon={<ShoppingCart aria-hidden="true" />}
          label="Ventas de hoy"
          meta="Hoy"
          tone="primary"
          value={salesToday.toString()}
        />
        <DashboardMetricCard
          hint="Ingresos acumulados registrados por el sistema."
          icon={<Coins aria-hidden="true" />}
          label="Ingresos totales"
          meta="Total acumulado"
          tone="secondary"
          value={formatCurrency(totalRevenue)}
        />
        <DashboardMetricCard
          hint={
            topSeller
              ? `${topSeller.name} lidera por cantidad vendida hoy.`
              : 'Todavía no se han vendido productos.'
          }
          icon={<TrendingUp aria-hidden="true" />}
          label="Más vendido"
          meta="Ranking #1"
          tone="warning"
          value={topSeller ? topSeller.name : 'Sin datos'}
        />
        <DashboardMetricCard
          hint={
            lowStockAlerts.length > 0
              ? `${lowStockAlerts.length} producto${lowStockAlerts.length === 1 ? '' : 's'} necesita${lowStockAlerts.length === 1 ? '' : 'n'} atención inmediata.`
              : 'Las alertas de inventario están bajo control.'
          }
          icon={<TriangleAlert aria-hidden="true" />}
          label="Alertas de stock"
          meta={lowStockAlerts.length > 0 ? 'Prioritario' : 'En orden'}
          tone={lowStockAlerts.length > 0 ? 'danger' : 'success'}
          value={lowStockAlerts.length.toString()}
        />
      </div>

      {dashboardSummaryQuery.isError ? (
        <SurfaceCard className={styles.feedbackCard}>
          <p className={styles.feedbackTitle}>No pudimos cargar el resumen</p>
          <p className={styles.feedbackDescription}>
            {getErrorMessage(
              dashboardSummaryQuery.error,
              'No pudimos cargar el resumen del negocio en este momento. Intenta otra vez.',
            )}
          </p>
          <button
            className={styles.feedbackButton}
            type="button"
            onClick={() => {
              void dashboardSummaryQuery.refetch()
            }}
          >
            Reintentar
          </button>
        </SurfaceCard>
      ) : null}

      <div className={styles.panelsGrid}>
        <BestSellingProductsPanel
          isLoading={dashboardSummaryQuery.isLoading}
          products={bestSellingProducts}
        />
        <InventoryAlertsPanel
          alerts={lowStockAlerts}
          inventoryHealth={inventoryHealth}
          isLoading={dashboardSummaryQuery.isLoading}
        />
      </div>

      <Link aria-label="Crear nueva venta" className={styles.floatingAction} to={routePaths.sales}>
        <Plus aria-hidden="true" />
      </Link>
    </div>
  )
}
