import {
  BarChart3,
  CalendarDays,
  Eye,
  Plus,
  ReceiptText,
  Search,
  WalletCards,
} from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { getActiveBusiness } from '@/modules/auth/utils/get-active-business'
import {
  SalesBusinessMark,
  SalesCustomerAvatar,
  SalesPaymentIcon,
} from '@/modules/sales/components/SalesVisuals'
import { SaleDetailDrawer } from '@/modules/sales/components/SaleDetailDrawer'
import { CashRegisterFlowDrawer } from '@/modules/cash-register/components/CashRegisterFlowDrawer'
import { useCurrentCashRegisterQuery } from '@/modules/cash-register/hooks/use-cash-register-query'
import { useSalesHistoryQuery } from '@/modules/sales/hooks/use-sales-history-query'
import type {
  SalePaymentMethod,
  SalesHistoryStatus,
} from '@/modules/sales/types/sale'
import { routePaths } from '@/routes/route-paths'
import { RetailEmptyState } from '@/shared/components/retail/RetailEmptyState'
import { RetailPageLayout } from '@/shared/components/retail/RetailPageLayout'
import { RetailTableShell } from '@/shared/components/retail/RetailTableShell'
import { MetricCard } from '@/shared/components/ui/MetricCard'
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect'
import {
  COLLECTED_PAYMENT_METHOD_OPTIONS,
  getSharedPaymentMethodLabel,
} from '@/shared/payments/payment-methods'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './SalesOverviewPage.module.css'

type PeriodPreset = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'

function dateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function periodRange(preset: Exclude<PeriodPreset, 'CUSTOM'>) {
  const today = new Date()
  if (preset === 'TODAY') {
    const value = dateInputValue(today)
    return { from: value, to: value }
  }
  if (preset === 'WEEK') {
    const start = new Date(today)
    const weekday = today.getDay()
    start.setDate(today.getDate() - (weekday === 0 ? 6 : weekday - 1))
    return { from: dateInputValue(start), to: dateInputValue(today) }
  }
  return {
    from: dateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: dateInputValue(today),
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

const statusLabels: Record<SalesHistoryStatus, string> = {
  PAID: 'Pagada',
  PARTIAL: 'Parcial',
  PENDING: 'Pendiente',
  OVERDUE: 'Vencida',
  CANCELLED: 'Anulada',
}

export function SalesOverviewPage() {
  const navigate = useNavigate()
  const user = useAuthSessionStore((state) => state.user)
  const business = getActiveBusiness(user)
  const businessName = business?.businessName ?? user?.businessName
  const logoUrl = business?.logoUrl ?? user?.logoUrl
  const { saleId } = useParams<{ saleId?: string }>()
  const initialRange = useMemo(() => periodRange('TODAY'), [])
  const [preset, setPreset] = useState<PeriodPreset>('TODAY')
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)
  const [search, setSearch] = useState('')
  const [sellerUserId, setSellerUserId] = useState('')
  const [status, setStatus] = useState<'ALL' | SalesHistoryStatus>('ALL')
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod | ''>('')
  const [page, setPage] = useState(1)
  const [isCashRegisterOpen, setCashRegisterOpen] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<
    'NEW_SALE' | string | null
  >(null)
  const currentCashRegisterQuery = useCurrentCashRegisterQuery()
  const deferredSearch = useDeferredValue(search.trim())
  const historyQuery = useSalesHistoryQuery({
    from,
    to,
    search: deferredSearch || undefined,
    sellerUserId: sellerUserId || undefined,
    status,
    paymentMethod,
    page,
    pageSize: 20,
  })
  const data = historyQuery.data

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, sellerUserId, status, paymentMethod, from, to])

  function selectPreset(nextPreset: Exclude<PeriodPreset, 'CUSTOM'>) {
    const range = periodRange(nextPreset)
    setPreset(nextPreset)
    setFrom(range.from)
    setTo(range.to)
  }

  const methodTotals = new Map(
    (data?.summary.paymentMethods ?? []).map((item) => [
      item.method,
      item.amount,
    ]),
  )

  async function handleRegisterSale() {
    const session = await currentCashRegisterQuery.refetch()
    if (session.data) {
      navigate(routePaths.salesNew)
      return
    }

    setPendingNavigation('NEW_SALE')
    setCashRegisterOpen(true)
  }

  function resumePendingNavigation() {
    const destination = pendingNavigation
    setPendingNavigation(null)
    if (destination === 'NEW_SALE') {
      navigate(routePaths.salesNew)
    } else if (destination) {
      navigate(`${routePaths.sales}/${destination}`)
    }
  }

  return (
    <RetailPageLayout
      headerClassName={styles.hero}
      actions={
        <div className={styles.headerActions}>
          <Link
            className={styles.statisticsLink}
            to={`${routePaths.reports}?tab=sales`}
          >
            <BarChart3 /> Ver estadísticas
          </Link>
          <button
            className={styles.primaryLink}
            type="button"
            onClick={() => void handleRegisterSale()}
          >
            <Plus /> Registrar venta
          </button>
        </div>
      }
      bodyClassName={styles.body}
      meta={businessName}
      title={
        <span className={styles.brandTitle}>
          <SalesBusinessMark logoUrl={logoUrl} /> Ventas
        </span>
      }
    >
      <section className={styles.periodBar} aria-label="Período de ventas">
        <span className={styles.periodLabel}>
          <CalendarDays aria-hidden="true" /> Período
        </span>
        <div className={styles.presetButtons}>
          {(
            [
              ['TODAY', 'Hoy'],
              ['WEEK', 'Esta semana'],
              ['MONTH', 'Este mes'],
            ] as const
          ).map(([value, label]) => (
            <button
              aria-pressed={preset === value}
              className={styles.preset}
              key={value}
              type="button"
              onClick={() => selectPreset(value)}
            >
              {label}
            </button>
          ))}
          <button
            aria-pressed={preset === 'CUSTOM'}
            className={styles.preset}
            type="button"
            onClick={() => setPreset('CUSTOM')}
          >
            Personalizado
          </button>
        </div>
        {preset === 'CUSTOM' ? (
          <div className={styles.customDates}>
            <label>
              <span>Desde</span>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label>
              <span>Hasta</span>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          </div>
        ) : null}
      </section>

      <div className={styles.metricsGrid}>
        <MetricCard
          label="Ventas totales"
          value={data ? formatCurrency(data.summary.salesTotal) : '—'}
          hint="Valor neto vendido en el período."
          tone="accent"
        />
        <MetricCard
          label="Ganancias totales"
          value={data ? formatCurrency(data.summary.grossProfit) : '—'}
          hint="Utilidad bruta de las ventas del período."
          tone="success"
        />
        <MetricCard
          label="N.º de ventas"
          value={data ? String(data.summary.salesCount) : '—'}
          hint="Ventas activas registradas."
        />
        <MetricCard
          label="Cobrado"
          value={data ? formatCurrency(data.summary.collectedTotal) : '—'}
          hint="Pagado sobre las ventas del período."
        />
        <MetricCard
          label="Por cobrar"
          value={data ? formatCurrency(data.summary.outstandingTotal) : '—'}
          hint="Saldo actual de esas ventas."
          tone={(data?.summary.outstandingTotal ?? 0) > 0 ? 'alert' : 'default'}
        />
      </div>

      <section className={styles.paymentCard}>
        <div className={styles.sectionHeading}>
          <WalletCards aria-hidden="true" />
          <h2>Medios de pago</h2>
        </div>
        <dl className={styles.paymentGrid}>
          {COLLECTED_PAYMENT_METHOD_OPTIONS.map(({ value, label }) => (
            <div key={value}>
              <SalesPaymentIcon method={value} />
              <dt>{label}</dt>
              <dd>
                {data ? formatCurrency(methodTotals.get(value) ?? 0) : '—'}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.historySection}>
        <div className={styles.sectionHeading}>
          <ReceiptText aria-hidden="true" />
          <h2>Historial de ventas</h2>
        </div>
        <div className={styles.filters}>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Buscar</span>
            <span className={styles.searchField}>
              <Search />
              <input
                placeholder="Venta, cliente o vendedor…"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </span>
          </label>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Vendedor</span>
            <SearchableSelect
              className={styles.filterSelect}
              value={sellerUserId}
              onChange={(event) => setSellerUserId(event.target.value)}
            >
              <option value="">Todos los vendedores</option>
              {(data?.facets.sellers ?? []).map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </SearchableSelect>
          </label>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Estado</span>
            <SearchableSelect
              className={styles.filterSelect}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as 'ALL' | SalesHistoryStatus)
              }
            >
              <option value="ALL">Todos los estados</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SearchableSelect>
          </label>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Medio de pago</span>
            <SearchableSelect
              className={styles.filterSelect}
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as SalePaymentMethod | '')
              }
            >
              <option value="">Todos los medios</option>
              <option value="CREDIT">Crédito</option>
              {COLLECTED_PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SearchableSelect>
          </label>
        </div>

        {historyQuery.isError ? (
          <div className={styles.error}>
            <strong>No pudimos cargar las ventas.</strong>
            <span>
              {getErrorMessage(historyQuery.error, 'Intenta nuevamente.')}
            </span>
            <button type="button" onClick={() => void historyQuery.refetch()}>
              Reintentar
            </button>
          </div>
        ) : null}

        <RetailTableShell
          isRefreshing={historyQuery.isFetching}
          title={
            data
              ? `${data.pagination.totalItems} ${data.pagination.totalItems === 1 ? 'venta' : 'ventas'}`
              : undefined
          }
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Venta</th>
                <th>Cliente</th>
                <th>Productos</th>
                <th>Vendedor</th>
                <th>Total</th>
                <th>Medio de pago</th>
                <th>Fecha y hora</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((sale) => (
                <tr key={sale.id}>
                  <td data-label="Venta">
                    <strong>{sale.saleNumber}</strong>
                    {sale.invoice ? (
                      <small>{sale.invoice.documentNumber}</small>
                    ) : null}
                  </td>
                  <td data-label="Cliente">
                    <span className={styles.customerCell}>
                      {sale.customer ? (
                          <SalesCustomerAvatar name={sale.customer.name} avatarUrl={sale.customer.avatarUrl} />
                      ) : null}
                      <strong>
                        {sale.customer?.name ?? 'Venta de mostrador'}
                      </strong>
                    </span>
                  </td>
                  <td data-label="Productos">
                    {sale.itemCount}{' '}
                    {sale.itemCount === 1 ? 'producto' : 'productos'}
                  </td>
                  <td data-label="Vendedor">
                    {sale.seller?.name ?? 'Sin asignar'}
                  </td>
                  <td data-label="Total">
                    <strong>{formatCurrency(sale.total)}</strong>
                    {sale.balance > 0 ? (
                      <small>Saldo {formatCurrency(sale.balance)}</small>
                    ) : null}
                  </td>
                  <td data-label="Medio de pago">
                    <span className={styles.methodCell}>
                      {sale.paymentMethods.map((method) => (
                        <span key={method}>
                          <SalesPaymentIcon method={method} />{' '}
                          {getSharedPaymentMethodLabel(method)}
                        </span>
                      ))}
                      {!sale.paymentMethods.length ? 'Sin pago' : null}
                    </span>
                  </td>
                  <td data-label="Fecha y hora">
                    {formatDateTime(sale.saleDate)}
                  </td>
                  <td data-label="Estado">
                    <span
                      className={`${styles.status} ${styles[`status${sale.status}`]}`}
                    >
                      {statusLabels[sale.status]}
                    </span>
                  </td>
                  <td data-label="Acciones">
                    <button
                      className={styles.viewButton}
                      type="button"
                      onClick={() => navigate(`${routePaths.sales}/${sale.id}`)}
                    >
                      <Eye /> Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
              {!historyQuery.isLoading &&
              !historyQuery.isError &&
              (data?.items.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <RetailEmptyState
                      title="No hay ventas para mostrar"
                      description="Cambia el período o los filtros para consultar otros registros."
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </RetailTableShell>

        {(data?.pagination.totalPages ?? 0) > 1 ? (
          <div className={styles.pagination}>
            <button
              disabled={page <= 1}
              type="button"
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} de {data?.pagination.totalPages}
            </span>
            <button
              disabled={page >= (data?.pagination.totalPages ?? 1)}
              type="button"
              onClick={() => setPage((current) => current + 1)}
            >
              Siguiente
            </button>
          </div>
        ) : null}
      </section>

      <SaleDetailDrawer
        saleId={saleId ?? null}
        onCashSessionRequired={() => {
          if (!saleId) return
          setPendingNavigation(saleId)
          navigate(routePaths.sales)
          setCashRegisterOpen(true)
        }}
        onClose={() => navigate(routePaths.sales)}
      />
      <CashRegisterFlowDrawer
        isOpen={isCashRegisterOpen}
        onClose={() => setCashRegisterOpen(false)}
        onOpened={resumePendingNavigation}
      />
    </RetailPageLayout>
  )
}
