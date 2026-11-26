import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CircleHelp,
  Coins,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Ticket,
  Trophy,
  Users,
  TriangleAlert,
} from 'lucide-react'
import { BestSellingProductsPanel } from '@/modules/dashboard/components/BestSellingProductsPanel'
import { BusinessSetupChecklist } from '@/modules/dashboard/components/BusinessSetupChecklist'
import { DashboardProductPhoto } from '@/modules/dashboard/components/DashboardProductPhoto'
import { DashboardMetricCard } from '@/modules/dashboard/components/DashboardMetricCard'
import { InventoryAlertsPanel } from '@/modules/dashboard/components/InventoryAlertsPanel'
import { BakeryOperationsDashboard } from '@/modules/dashboard/components/BakeryOperationsDashboard'
import { useDashboardSummaryQuery } from '@/modules/dashboard/hooks/use-dashboard-summary-query'
import { routePaths } from '@/routes/route-paths'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { BrandLogo } from '@/shared/components/brand/BrandLogo'
import { resolveApiAssetUrl } from '@/shared/services/api-client'
import {
  getActiveBusiness,
  getActiveBusinessCategory,
} from '@/modules/auth/utils/get-active-business'
import styles from './DashboardPage.module.css'

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthSessionStore((state) => state.user)
  const business = getActiveBusiness(user)
  const businessName =
    business?.businessName || user?.businessName || 'Mi negocio'
  const logoUrl = resolveApiAssetUrl(business?.logoUrl ?? user?.logoUrl)
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null)
  const isBakery = getActiveBusinessCategory(user) === 'bakery_pastry'
  const [globalSearch, setGlobalSearch] = useState('')
  const globalSearchRef = useRef<HTMLInputElement>(null)
  const dashboardSummaryQuery = useDashboardSummaryQuery()
  const summary = dashboardSummaryQuery.data
  const bestSellingProducts = summary?.bestSellingProducts ?? []
  const lowStockAlerts = summary?.lowStockAlerts ?? []
  const topSeller = bestSellingProducts[0]
  const salesToday = summary?.salesToday ?? 0
  const revenueToday = summary?.revenueToday ?? 0
  const averageSale = salesToday > 0 ? revenueToday / salesToday : 0
  const registeredCustomers = summary?.customersCount ?? 0
  const activeProducts = summary?.activeProductsCount ?? 0
  const featuredStock = topSeller
    ? lowStockAlerts.find((alert) => alert.productId === topSeller.productId)
        ?.stock
    : undefined

  useEffect(() => {
    function focusGlobalSearch(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k')
        return
      event.preventDefault()
      globalSearchRef.current?.focus()
    }

    window.addEventListener('keydown', focusGlobalSearch)
    return () => window.removeEventListener('keydown', focusGlobalSearch)
  }, [])

  function handleGlobalSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = globalSearch.trim()
    navigate(
      query
        ? `${routePaths.salesNew}?search=${encodeURIComponent(query)}`
        : routePaths.salesNew,
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <form className={styles.searchBox} onSubmit={handleGlobalSearchSubmit}>
          <Search aria-hidden="true" className={styles.searchIcon} />
          <input
            aria-label="Buscar productos y ventas"
            placeholder="Buscar productos, ventas..."
            ref={globalSearchRef}
            type="search"
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
          />
          <kbd>CMD + K</kbd>
        </form>

        <div className={styles.topbarActions}>
          <Link
            aria-label="Alertas de inventario"
            className={styles.iconButton}
            to={routePaths.inventory}
          >
            <Bell aria-hidden="true" />
          </Link>
          <Link
            aria-label="Ayuda"
            className={styles.iconButton}
            to={routePaths.help}
          >
            <CircleHelp aria-hidden="true" />
          </Link>
          <Link className={styles.saleButton} to={routePaths.salesNew}>
            <Plus aria-hidden="true" />
            Nueva venta
          </Link>
        </div>
      </header>

      <BusinessSetupChecklist
        businessCategory={business?.businessCategory ?? user?.businessCategory}
        businessName={business?.businessName ?? user?.businessName}
        summary={summary}
      />

      {isBakery ? (
        <BakeryOperationsDashboard
          businessId={user?.businessId}
          lowStockCount={lowStockAlerts.length}
          revenueToday={revenueToday}
          salesToday={salesToday}
          userId={user?.id}
        />
      ) : null}

      <section className={styles.heroGrid} aria-label="Resumen del negocio">
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.businessIdentity}>
              {logoUrl && logoUrl !== failedLogoUrl ? (
                <img
                  alt=""
                  className={styles.businessLogo}
                  src={logoUrl}
                  onError={() => setFailedLogoUrl(logoUrl)}
                />
              ) : (
                <BrandLogo
                  className={styles.brandFallback}
                  size="sm"
                  variant="mark"
                />
              )}
              <span>{businessName}</span>
            </div>
            <h1 className={styles.title}>Tu negocio hoy</h1>
            <p className={styles.heroDate}>
              <CalendarDays aria-hidden="true" />{' '}
              {dateFormatter.format(new Date())}
            </p>

            <div className={styles.heroActions}>
              <Link className={styles.secondaryAction} to={routePaths.products}>
                <Package aria-hidden="true" /> Ver catálogo
              </Link>
              <button
                className={styles.primaryAction}
                disabled={dashboardSummaryQuery.isFetching}
                type="button"
                onClick={() => void dashboardSummaryQuery.refetch()}
              >
                <RefreshCw aria-hidden="true" />
                {dashboardSummaryQuery.isFetching
                  ? 'Actualizando…'
                  : 'Actualizar resumen'}
              </button>
            </div>
          </div>

          <dl className={styles.heroStats}>
            <div>
              <Users aria-hidden="true" />
              <dt>Clientes registrados</dt>
              <dd>{summary ? registeredCustomers : '—'}</dd>
            </div>
            <div>
              <Package aria-hidden="true" />
              <dt>Productos activos</dt>
              <dd>{summary ? activeProducts : '—'}</dd>
            </div>
          </dl>
        </div>

        <aside
          className={styles.spotlightCard}
          aria-labelledby="dashboard-featured"
        >
          <h2 className={styles.spotlightLabel} id="dashboard-featured">
            <span>
              <Trophy aria-hidden="true" />
            </span>{' '}
            Más vendido hoy
          </h2>
          <DashboardProductPhoto imageUrl={topSeller?.imageUrl} featured />
          {topSeller ? (
            <Link
              className={styles.spotlightProduct}
              to={`${routePaths.products}?productId=${encodeURIComponent(topSeller.productId)}`}
            >
              <div>
                <h3>{topSeller.name}</h3>
                <p>
                  {topSeller.quantitySold}{' '}
                  {topSeller.quantitySold === 1
                    ? 'unidad vendida'
                    : 'unidades vendidas'}
                </p>
                {featuredStock !== undefined ? (
                  <p className={styles.spotlightStock}>
                    {featuredStock === 0
                      ? 'Sin stock'
                      : `${featuredStock} en existencias`}
                  </p>
                ) : null}
              </div>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ) : (
            <p className={styles.spotlightEmpty}>
              {dashboardSummaryQuery.isLoading
                ? 'Cargando ventas…'
                : dashboardSummaryQuery.isError
                  ? 'No pudimos consultar el producto más vendido.'
                  : 'Todavía no hay ventas de productos hoy.'}
            </p>
          )}
        </aside>
      </section>

      <div
        className={styles.metricsGrid}
        aria-busy={dashboardSummaryQuery.isLoading}
      >
        <DashboardMetricCard
          icon={<ShoppingCart aria-hidden="true" />}
          label="Ventas de hoy"
          tone="primary"
          value={summary ? String(salesToday) : '—'}
        />
        <DashboardMetricCard
          hint="Incluye ventas a crédito"
          icon={<Coins aria-hidden="true" />}
          label="Valor vendido hoy"
          tone="secondary"
          value={summary ? formatCurrency(revenueToday) : '—'}
        />
        <DashboardMetricCard
          icon={<Ticket aria-hidden="true" />}
          label="Ticket promedio"
          tone="warning"
          value={summary ? formatCurrency(averageSale) : '—'}
        />
        <DashboardMetricCard
          icon={<TriangleAlert aria-hidden="true" />}
          label="Alertas de stock"
          tone={lowStockAlerts.length > 0 ? 'danger' : 'success'}
          value={summary ? String(lowStockAlerts.length) : '—'}
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

      {!dashboardSummaryQuery.isError || summary ? (
        <div className={styles.panelsGrid}>
          <BestSellingProductsPanel
            isLoading={dashboardSummaryQuery.isLoading}
            products={bestSellingProducts}
          />
          <InventoryAlertsPanel
            alerts={lowStockAlerts}
            isLoading={dashboardSummaryQuery.isLoading}
          />
        </div>
      ) : null}
    </div>
  )
}
