import type { FormEvent, PointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CircleHelp,
  CircleDollarSign,
  Coins,
  Package,
  PackagePlus,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  Trophy,
  Users,
  TriangleAlert,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { BestSellingProductsPanel } from '@/modules/dashboard/components/BestSellingProductsPanel'
import { BusinessSetupChecklist } from '@/modules/dashboard/components/BusinessSetupChecklist'
import { DashboardProductPhoto } from '@/modules/dashboard/components/DashboardProductPhoto'
import { DashboardMetricCard } from '@/modules/dashboard/components/DashboardMetricCard'
import { InventoryAlertsPanel } from '@/modules/dashboard/components/InventoryAlertsPanel'
import { BakeryOperationsDashboard } from '@/modules/dashboard/components/BakeryOperationsDashboard'
import { useDashboardSummaryQuery } from '@/modules/dashboard/hooks/use-dashboard-summary-query'
import { useCurrentCashRegisterQuery } from '@/modules/cash-register/hooks/use-cash-register-query'
import { getModuleNavigationRoutes } from '@/routes/module-navigation-routes'
import { routePaths, routeSegments } from '@/routes/route-paths'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { PageLoadingState } from '@/shared/components/states/PageLoadingState'
import { useWorkspaceSound } from '@/shared/hooks/use-workspace-sound'
import { isTeamManagementRole } from '@/shared/constants/user-roles'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { BrandLogo } from '@/shared/components/brand/BrandLogo'
import { resolveApiAssetUrl } from '@/shared/services/api-client'
import {
  getActiveBusiness,
  getActiveBusinessCategory,
  getActiveBusinessRole,
} from '@/modules/auth/utils/get-active-business'
import styles from './DashboardPage.module.css'

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export function DashboardPage() {
  const navigate = useNavigate()
  const { soundEnabled, playSound, toggleSound } = useWorkspaceSound()
  const user = useAuthSessionStore((state) => state.user)
  const business = getActiveBusiness(user)
  const businessName =
    business?.businessName || user?.businessName || 'Mi negocio'
  const logoUrl = resolveApiAssetUrl(business?.logoUrl ?? user?.logoUrl)
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null)
  const businessCategory = getActiveBusinessCategory(user)
  const isBakery = businessCategory === 'bakery_pastry'
  const role = getActiveBusinessRole(user)
  const routes = getModuleNavigationRoutes('es', businessCategory, role)
  const canOpen = (segment: string) => routes.some((route) => route.segment === segment && route.isVisible)
  const canSell = canOpen(routeSegments.sales)
  const canSeeInventory = canOpen(routeSegments.inventory)
  const canSeeCustomers = canOpen(routeSegments.customers)
  const canSeeCash = canOpen(routeSegments.cashRegister)
  const canSetUpBusiness = isTeamManagementRole(role) && canSell && canSeeCash && canOpen(routeSegments.products)
  const cashQuery = useCurrentCashRegisterQuery(canSeeCash)
  const isCashOpen = Boolean(cashQuery.data)
  const canShowCashStatus = cashQuery.isSuccess && !cashQuery.isError
  const [globalSearch, setGlobalSearch] = useState('')
  const globalSearchRef = useRef<HTMLInputElement>(null)
  const dashboardSummaryQuery = useDashboardSummaryQuery()
  const summary = dashboardSummaryQuery.data
  const bestSellingProducts = summary?.bestSellingProducts ?? []
  const lowStockAlerts = summary?.lowStockAlerts ?? []
  const topSeller = bestSellingProducts[0]
  const salesToday = summary?.salesToday ?? 0
  const revenueToday = summary?.revenueToday ?? 0
  const collectionsToday = summary?.collectionsToday
  const overdue = summary?.overdueReceivables
  const lowStockCount = summary?.lowStockCount ?? lowStockAlerts.length
  const canReplenish = isTeamManagementRole(role)
  const replenishmentPath = canReplenish ? routePaths.inventoryPurchaseOrders : `${routePaths.inventory}?stock=low`
  const overduePath = `${routePaths.customers}?portfolio=overdue`
  const isRefreshing = dashboardSummaryQuery.isFetching || (canSeeCash && cashQuery.isFetching)

  function refreshDashboard() {
    void dashboardSummaryQuery.refetch()
    if (canSeeCash) void cashQuery.refetch()
  }
  const registeredCustomers = summary?.customersCount ?? 0
  const activeProducts = summary?.activeProductsCount ?? 0
  const featuredStock = topSeller
    ? lowStockAlerts.find((alert) => alert.productId === topSeller.productId)
        ?.stock
    : undefined

  useEffect(() => {
    if (!canSell) return

    function focusGlobalSearch(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k')
        return
      event.preventDefault()
      globalSearchRef.current?.focus()
    }

    window.addEventListener('keydown', focusGlobalSearch)
    return () => window.removeEventListener('keydown', focusGlobalSearch)
  }, [canSell])

  function handleGlobalSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = globalSearch.trim()
    navigate(
      query
        ? `${routePaths.salesNew}?search=${encodeURIComponent(query)}`
        : routePaths.salesNew,
    )
  }

  function moveHeroLight(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') return

    const hero = event.currentTarget
    const bounds = hero.getBoundingClientRect()
    hero.style.setProperty('--hero-light-x', `${event.clientX - bounds.left}px`)
    hero.style.setProperty('--hero-light-y', `${event.clientY - bounds.top}px`)
  }

  if (dashboardSummaryQuery.isLoading) {
    return <PageLoadingState brand="business" layout="workspace" title="Cargando Inicio…" />
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        {canSell ? (
          <form className={styles.searchBox} onSubmit={handleGlobalSearchSubmit}>
            <Search aria-hidden="true" className={styles.searchIcon} />
            <input
              aria-label="Buscar productos para vender"
              placeholder="Buscar productos para vender…"
              ref={globalSearchRef}
              type="search"
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
            />
            <kbd>CMD + K</kbd>
          </form>
        ) : null}
        <div className={styles.topbarActions}>
          <button
            aria-label="Actualizar inicio"
            aria-busy={isRefreshing}
            className={styles.iconButton}
            disabled={isRefreshing}
            type="button"
            onClick={() => {
              playSound()
              refreshDashboard()
            }}
          >
            <RefreshCw aria-hidden="true" />
          </button>
          <button aria-label="Sonido de la interfaz" aria-pressed={soundEnabled} className={styles.iconButton} title="Sonido de la interfaz" type="button" onClick={toggleSound}>
            {soundEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
          </button>
          <Link aria-label="Ayuda" className={styles.iconButton} to={routePaths.help}>
            <CircleHelp aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section aria-label="Resumen del negocio">
        <div className={styles.hero} onPointerMove={moveHeroLight}>
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
              {dateFormatter.format(summary?.businessDate ? new Date(`${summary.businessDate}T12:00:00Z`) : new Date())}
            </p>
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
      </section>

      {canSetUpBusiness ? <BusinessSetupChecklist progress={summary?.setupProgress} /> : null}

      <section
        aria-label="Ventas y cobros de hoy"
        aria-busy={dashboardSummaryQuery.isLoading}
        className={styles.financialGrid}
      >
        <DashboardMetricCard
          hint={summary ? `${salesToday} ${salesToday === 1 ? 'venta registrada' : 'ventas registradas'} · incluye ventas a crédito` : 'Incluye ventas a crédito'}
          icon={<ShoppingCart aria-hidden="true" />}
          label="Vendido hoy"
          value={summary ? formatCurrency(revenueToday) : '—'}
        />
        <DashboardMetricCard
          hint="Pagos y abonos menos reembolsos del día"
          icon={<Banknote aria-hidden="true" />}
          label="Cobrado hoy"
          tone="success"
          value={collectionsToday === undefined ? '—' : formatCurrency(collectionsToday)}
        />
      </section>

      <section aria-label="Estado del negocio" className={styles.metricsGrid}>
        {canSeeCash ? (
          <DashboardMetricCard
            action={{ label: 'Ir a Caja', to: routePaths.cashRegister }}
            hint={canShowCashStatus ? (isCashOpen ? 'Hay un turno en curso' : 'Sin turno abierto') : cashQuery.isError ? 'No se pudo consultar el turno' : 'Consultando el turno…'}
            icon={<Store aria-hidden="true" />}
            label="Estado de caja"
            tone={canShowCashStatus && isCashOpen ? 'success' : 'warning'}
            value={canShowCashStatus ? (isCashOpen ? 'Abierta' : 'Cerrada') : '—'}
          />
        ) : null}
        {canSeeInventory ? (
          <DashboardMetricCard
            hint={summary?.lowStockAlertsEnabled === false ? 'Alertas desactivadas en Configuraciones' : 'Productos en el mínimo o por debajo'}
            icon={<TriangleAlert aria-hidden="true" />}
            label="Stock bajo"
            tone={lowStockCount > 0 ? 'danger' : 'primary'}
            value={summary && summary.lowStockAlertsEnabled !== false ? String(lowStockCount) : '—'}
          />
        ) : null}
        {canSeeCustomers ? (
          <DashboardMetricCard
            hint={overdue ? `${overdue.count} ${overdue.count === 1 ? 'cuenta vencida' : 'cuentas vencidas'}` : 'Saldo pendiente después del vencimiento'}
            icon={<CircleDollarSign aria-hidden="true" />}
            label="Cartera vencida"
            tone={overdue && overdue.count > 0 ? 'danger' : 'primary'}
            value={overdue ? formatCurrency(overdue.balance) : '—'}
          />
        ) : null}
      </section>

      <nav aria-label="Accesos directos" className={styles.shortcuts}>
        {canSell ? (
          <Link className={`${styles.shortcut} ${styles.shortcutPrimary}`} to={routePaths.salesNew}>
            <span><ShoppingCart aria-hidden="true" /></span>
            Registrar venta
            <ArrowUpRight aria-hidden="true" />
          </Link>
        ) : null}
        {canSeeInventory ? (
          <Link className={styles.shortcut} to={replenishmentPath}>
            <span><PackagePlus aria-hidden="true" /></span>
            {canReplenish ? 'Reponer inventario' : 'Ver stock bajo'}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        ) : null}
        {canSeeCustomers ? (
          <Link className={styles.shortcut} to={overduePath}>
            <span><Coins aria-hidden="true" /></span>
            Cobrar pendientes
            <ArrowUpRight aria-hidden="true" />
          </Link>
        ) : null}
      </nav>

      {isBakery ? (
        <BakeryOperationsDashboard
          businessId={user?.businessId}
          lowStockCount={lowStockCount}
          revenueToday={revenueToday}
          salesToday={salesToday}
          userId={user?.id}
        />
      ) : null}

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
              refreshDashboard()
            }}
          >
            Reintentar
          </button>
        </SurfaceCard>
      ) : null}

      {!dashboardSummaryQuery.isError || summary ? (
        <div className={styles.panelsGrid}>
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
          <BestSellingProductsPanel
            isLoading={dashboardSummaryQuery.isLoading}
            products={bestSellingProducts}
          />
          {canSeeInventory && summary?.lowStockAlertsEnabled !== false ? (
            <InventoryAlertsPanel
              alerts={lowStockAlerts}
              isLoading={dashboardSummaryQuery.isLoading}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
