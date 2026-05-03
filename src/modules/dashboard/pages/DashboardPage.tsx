import { Link } from 'react-router-dom'
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
  const qaEvidence = summary?.qaEvidence
  const qaEvidenceItems = qaEvidence
    ? [
        ['Usuarios', qaEvidence.counts.users],
        ['Clientes', qaEvidence.counts.customers],
        ['Proveedores', qaEvidence.counts.suppliers],
        ['Productos', qaEvidence.counts.products],
        ['Mov. inventario', qaEvidence.counts.inventoryMovements],
        ['Mov. caja', qaEvidence.counts.cashRegisterMovements],
        ['Ventas', qaEvidence.counts.sales],
        ['Pagos venta', qaEvidence.counts.salePayments],
        ['Cuentas por cobrar', qaEvidence.counts.accountReceivables],
        ['Abonos', qaEvidence.counts.accountReceivablePayments],
        ['Gastos', qaEvidence.counts.expenses],
        ['Cotizaciones', qaEvidence.counts.quotations],
        ['Recibos', qaEvidence.counts.invoices],
      ].filter(([, count]) => Number(count) > 0)
    : []

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Resumen del negocio</p>
          <h2 className={styles.title}>
            Una lectura clara del negocio para empezar el dia con contexto.
          </h2>
          <p className={styles.description}>
            Mira que se esta vendiendo, cuanto dinero entra y que productos
            necesitan atencion antes de quedarte sin stock.
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

        <div className={styles.spotlightCard}>
          <p className={styles.spotlightLabel}>Producto destacado</p>
          <p className={styles.spotlightValue}>
            {topSeller ? topSeller.name : 'Esperando ventas'}
          </p>
          <p className={styles.spotlightHint}>
            {topSeller
              ? `${topSeller.quantitySold} unidad${topSeller.quantitySold === 1 ? '' : 'es'} vendida${topSeller.quantitySold === 1 ? '' : 's'} hasta ahora.`
              : 'Cuando empiecen a entrar ventas, aqui veras el producto mas fuerte del momento.'}
          </p>
        </div>
      </section>

      <div className={styles.metricsGrid}>
        <DashboardMetricCard
          hint="Cantidad de ventas registradas desde que comenzo el dia."
          label="Ventas de hoy"
          value={salesToday.toString()}
        />
        <DashboardMetricCard
          hint="Ingresos acumulados registrados por el sistema."
          label="Ingresos totales"
          tone="accent"
          value={formatCurrency(totalRevenue)}
        />
        <DashboardMetricCard
          hint={
            topSeller
              ? `${topSeller.name} lidera por cantidad vendida.`
              : 'Todavia no se han vendido productos.'
          }
          label="Mas vendido"
          value={topSeller ? topSeller.name : 'Sin datos'}
        />
        <DashboardMetricCard
          hint={
            lowStockAlerts.length > 0
              ? `${lowStockAlerts.length} producto${lowStockAlerts.length === 1 ? '' : 's'} necesita${lowStockAlerts.length === 1 ? '' : 'n'} atencion de inventario.`
              : 'Las alertas de inventario estan bajo control.'
          }
          label="Alertas de stock"
          tone={lowStockAlerts.length > 0 ? 'alert' : 'default'}
          value={lowStockAlerts.length.toString()}
        />
      </div>

      {qaEvidence && qaEvidence.totalRecords > 0 ? (
        <SurfaceCard className={styles.qaEvidenceCard}>
          <div className={styles.qaEvidenceHeader}>
            <div>
              <p className={styles.qaEvidenceEyebrow}>Evidencia QA</p>
              <h3 className={styles.qaEvidenceTitle}>
                Datos de prueba guardados en la plataforma
              </h3>
            </div>
            <div className={styles.qaEvidenceTotal}>
              <span>{qaEvidence.totalRecords.toString()}</span>
              <small>registros QA</small>
            </div>
          </div>

          <p className={styles.qaEvidenceHint}>
            {qaEvidence.latestRunLabel
              ? `Ultima corrida detectada: ${qaEvidence.latestRunLabel}.`
              : 'Hay datos QA guardados, pero no se detecto un codigo de corrida reciente.'}
          </p>

          <div className={styles.qaEvidenceGrid}>
            {qaEvidenceItems.map(([label, count]) => (
              <div className={styles.qaEvidenceItem} key={label}>
                <span>{label}</span>
                <strong>{count.toString()}</strong>
              </div>
            ))}
          </div>
        </SurfaceCard>
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
          isLoading={dashboardSummaryQuery.isLoading}
        />
      </div>
    </div>
  )
}
