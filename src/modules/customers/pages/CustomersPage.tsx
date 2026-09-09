import { useDeferredValue, useEffect, useState } from 'react'
import { Crown, Download, History, ReceiptText, TrendingUp, Users } from 'lucide-react'
import { CustomerDetailPanel } from '@/modules/customers/components/CustomerDetailPanel'
import { CustomerMetricCard } from '@/modules/customers/components/CustomerMetricCard'
import { CustomerPurchaseHistoryPanel } from '@/modules/customers/components/CustomerPurchaseHistoryPanel'
import { CustomersListPanel } from '@/modules/customers/components/CustomersListPanel'
import {
  RetailCustomerDrawer,
  type RetailCustomerDrawerMode,
} from '@/modules/customers/components/RetailCustomerDrawer'
import {
  useCustomerDetailQuery,
  useCreateCustomerCollectionActivityMutation,
  useCreateCustomerMutation,
  useCustomersQuery,
  useRegisterCustomerPaymentMutation,
  useUpdateCustomerMutation,
  useUpdateCustomerReceivableTermsMutation,
  useUploadCustomerAvatarMutation,
} from '@/modules/customers/hooks/use-customers-query'
import type {
  CustomerMutationInput,
  CustomerCollectionActivityInput,
  CustomerPaymentInput,
  CustomerReceivableTermsInput,
  CustomerSummary,
} from '@/modules/customers/types/customer'
import { useCurrentCashRegisterQuery } from '@/modules/cash-register/hooks/use-cash-register-query'
import { RetailStatCard } from '@/shared/components/retail/RetailStatCard'
import { RetailPageLayout } from '@/shared/components/retail/RetailPageLayout'
import { RetailTableShell } from '@/shared/components/retail/RetailTableShell'
import { TableStateRow } from '@/shared/components/retail/TableStateRow'
import { ModalShell } from '@/shared/components/ui/ModalShell'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import listPageStyles from '@/shared/components/retail/RetailListPage.module.css'
import { useBusinessNavigationPreset } from '@/shared/hooks/use-business-navigation-preset'
import { matchesCustomerSearch } from '@/modules/customers/utils/matches-customer-search'
import { exportCustomerAgingReport } from '@/modules/customers/services/customers-api'
import { formatCurrency } from '@/shared/utils/format-currency'
import { downloadBlobFile } from '@/shared/utils/download-blob-file'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './CustomersPage.module.css'

type CustomerPortfolioFilter =
  | 'ALL'
  | 'OVERDUE'
  | 'PENDING'
  | 'CURRENT'
  | 'DUE_SOON'
  | 'OVERDUE_1_30'
  | 'OVERDUE_31_60'
  | 'OVERDUE_OVER_60'
  | 'UNDATED'

const CUSTOMER_PORTFOLIO_FILTERS: Array<{
  value: CustomerPortfolioFilter
  label: string
}> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'OVERDUE', label: 'Vencidos' },
  { value: 'PENDING', label: 'Por cobrar' },
  { value: 'CURRENT', label: 'Al día' },
]

const AGING_BUCKETS = [
  { filter: 'DUE_SOON', label: 'Por vencer', field: 'currentBalance', tone: 'current' },
  { filter: 'OVERDUE_1_30', label: '1–30 días', field: 'overdue1To30Balance', tone: 'warning' },
  { filter: 'OVERDUE_31_60', label: '31–60 días', field: 'overdue31To60Balance', tone: 'danger' },
  { filter: 'OVERDUE_OVER_60', label: 'Más de 60 días', field: 'overdueOver60Balance', tone: 'critical' },
  { filter: 'UNDATED', label: 'Sin fecha', field: 'undatedBalance', tone: 'neutral' },
] as const

function formatPortfolioDate(value: string | null) {
  if (!value) {
    return 'Sin fecha'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function getCollectionPriority(customer: CustomerSummary) {
  if (customer.overdueOver60Balance > 0) {
    return { label: 'Crítica', className: styles.statusCritical }
  }

  if (customer.overdue31To60Balance > 0) {
    return { label: 'Alta', className: styles.statusOverdue }
  }

  if (customer.overdue1To30Balance > 0) {
    return { label: 'Media', className: styles.statusPending }
  }

  if (customer.balance > 0) {
    return { label: 'Baja', className: styles.statusLow }
  }

  return { label: 'Al día', className: styles.statusOk }
}

export function CustomersPage() {
  const navigationPreset = useBusinessNavigationPreset()
  const isRetailPreset = navigationPreset === 'retail'
  const [searchValue, setSearchValue] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  )
  const [retailDrawerMode, setRetailDrawerMode] =
    useState<RetailCustomerDrawerMode>('detail')
  const [isRetailDrawerOpen, setRetailDrawerOpen] = useState(false)
  const [isPremiumModalOpen, setPremiumModalOpen] = useState(false)
  const [portfolioFilter, setPortfolioFilter] =
    useState<CustomerPortfolioFilter>('ALL')
  const [isExporting, setIsExporting] = useState(false)
  const [exportFeedback, setExportFeedback] = useState<string | null>(null)
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase())
  const customersQuery = useCustomersQuery()
  const createCustomerMutation = useCreateCustomerMutation()
  const createCollectionActivityMutation =
    useCreateCustomerCollectionActivityMutation()
  const updateCustomerMutation = useUpdateCustomerMutation()
  const uploadCustomerAvatarMutation = useUploadCustomerAvatarMutation()
  const registerPaymentMutation = useRegisterCustomerPaymentMutation()
  const updateReceivableTermsMutation =
    useUpdateCustomerReceivableTermsMutation()
  const currentCashRegisterQuery = useCurrentCashRegisterQuery()
  const customerRecords = customersQuery.data
  const customers = customerRecords ?? []
  const visibleCustomers = customers.filter((customer) => {
    if (!matchesCustomerSearch(customer, deferredSearchValue)) {
      return false
    }

    if (portfolioFilter === 'OVERDUE') {
      return customer.overdueReceivablesCount > 0
    }

    if (portfolioFilter === 'PENDING') {
      return customer.balance > 0
    }

    if (portfolioFilter === 'CURRENT') {
      return customer.balance <= 0
    }

    const agingBucket = AGING_BUCKETS.find(
      (bucket) => bucket.filter === portfolioFilter,
    )

    if (agingBucket) {
      return customer[agingBucket.field] > 0
    }

    return true
  })
  const selectedCustomerSummary =
    customers.find((customer) => customer.id === selectedCustomerId) ?? null
  const customerDetailQuery = useCustomerDetailQuery(selectedCustomerId)
  const selectedCustomer = customerDetailQuery.data ?? null
  const totalBalance = customers.reduce(
    (sum, customer) => sum + customer.balance,
    0,
  )
  const customersWithBalance = customers.filter(
    (customer) => customer.balance > 0,
  ).length
  const overdueBalance = customers.reduce(
    (sum, customer) => sum + customer.overdueBalance,
    0,
  )
  const overdueCustomers = customers.filter(
    (customer) => customer.overdueReceivablesCount > 0,
  ).length
  const agingTotals = AGING_BUCKETS.map((bucket) => ({
    ...bucket,
    value: customers.reduce((sum, customer) => sum + customer[bucket.field], 0),
    customerCount: customers.filter((customer) => customer[bucket.field] > 0)
      .length,
  }))
  const totalPurchases = customers.reduce(
    (sum, customer) => sum + customer.purchaseCount,
    0,
  )
  useEffect(() => {
    const availableCustomers = customerRecords ?? []

    if (availableCustomers.length === 0) {
      if (selectedCustomerId !== null) {
        setSelectedCustomerId(null)
      }

      return
    }

    const hasSelectedCustomer = availableCustomers.some(
      (customer) => customer.id === selectedCustomerId,
    )

    if (!hasSelectedCustomer) {
      setSelectedCustomerId(availableCustomers[0]?.id ?? null)
    }
  }, [customerRecords, selectedCustomerId])

  function openCreateCustomer() {
    setSelectedCustomerId(null)
    setRetailDrawerMode('create')
    setRetailDrawerOpen(true)
  }

  function openCustomerDetail(customerId: string) {
    setSelectedCustomerId(customerId)
    setRetailDrawerMode('detail')
    setRetailDrawerOpen(true)
  }

  function openEditCustomer(customerId: string) {
    setSelectedCustomerId(customerId)
    setRetailDrawerMode('edit')
    setRetailDrawerOpen(true)
  }

  function closeRetailCustomerDrawer() {
    setRetailDrawerOpen(false)
  }

  async function handleExportAgingReport() {
    setIsExporting(true)
    setExportFeedback(null)

    try {
      const { blob, filename } = await exportCustomerAgingReport()

      downloadBlobFile(blob, filename ?? 'cartera-por-antiguedad.csv')
      setExportFeedback('Reporte de cartera descargado correctamente.')
    } catch (error) {
      setExportFeedback(
        getErrorMessage(error, 'No fue posible descargar el reporte de cartera.'),
      )
    } finally {
      setIsExporting(false)
    }
  }

  async function handleSubmitCustomer(
    input: CustomerMutationInput,
    avatarFile?: File | null,
  ) {
    if (retailDrawerMode === 'edit' && selectedCustomerId) {
      const updatedCustomer = await updateCustomerMutation.mutateAsync({
        customerId: selectedCustomerId,
        input,
      })

      if (avatarFile) {
        await uploadCustomerAvatarMutation.mutateAsync({
          customerId: updatedCustomer.id,
          file: avatarFile,
        })
      }

      setRetailDrawerMode('detail')
      return
    }

    const createdCustomer = await createCustomerMutation.mutateAsync(input)

    if (avatarFile) {
      await uploadCustomerAvatarMutation.mutateAsync({
        customerId: createdCustomer.id,
        file: avatarFile,
      })
    }

    setSelectedCustomerId(createdCustomer.id)
    setRetailDrawerMode('detail')
  }

  async function handleRegisterCustomerPayment(
    receivableId: string,
    input: CustomerPaymentInput,
  ) {
    await registerPaymentMutation.mutateAsync({
      receivableId,
      input,
    })

    await Promise.allSettled([
      customersQuery.refetch(),
      customerDetailQuery.refetch(),
    ])
  }

  async function handleUpdateCustomerReceivableTerms(
    receivableId: string,
    input: CustomerReceivableTermsInput,
  ) {
    await updateReceivableTermsMutation.mutateAsync({ receivableId, input })

    await Promise.allSettled([
      customersQuery.refetch(),
      customerDetailQuery.refetch(),
    ])
  }

  async function handleCreateCollectionActivity(
    receivableId: string,
    input: CustomerCollectionActivityInput,
  ) {
    await createCollectionActivityMutation.mutateAsync({ receivableId, input })

    await Promise.allSettled([
      customersQuery.refetch(),
      customerDetailQuery.refetch(),
    ])
  }

  if (isRetailPreset) {
    return (
      <>
        <RetailPageLayout
          accent="success"
          bodyVariant="flush"
          title="Clientes"
          actions={
            <div className={styles.pageActions}>
              <button
                className={retailStyles.buttonOutline}
                disabled={isExporting}
                type="button"
                onClick={() => void handleExportAgingReport()}
              >
                <Download aria-hidden="true" />
                {isExporting ? 'Exportando...' : 'Exportar cartera'}
              </button>
              <button
                className={retailStyles.buttonDark}
                type="button"
                onClick={openCreateCustomer}
              >
                Crear cliente
              </button>
            </div>
          }
        >
          <section className={styles.retailWorkspace}>
            <button
              className={styles.premiumCard}
              type="button"
              onClick={() => setPremiumModalOpen(true)}
            >
              <Crown aria-hidden="true" />
              <div>
                <strong>Clientes premium, control total en un solo lugar.</strong>
                <span>
                  Registra deudas, envia recordatorios y manten todo bajo control.
                </span>
              </div>
              <span>Ver beneficios</span>
            </button>

            <div className={styles.retailSearchRow}>
              <label
                className={`${retailStyles.searchField} ${listPageStyles.searchField}`}
              >
                <input
                  className={retailStyles.input}
                  placeholder="Buscar cliente"
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </label>
              <div className={styles.portfolioFilters} aria-label="Filtrar cartera">
                {CUSTOMER_PORTFOLIO_FILTERS.map((filter) => (
                  <button
                    aria-pressed={portfolioFilter === filter.value}
                    className={
                      portfolioFilter === filter.value
                        ? styles.portfolioFilterActive
                        : styles.portfolioFilter
                    }
                    key={filter.value}
                    type="button"
                    onClick={() => setPortfolioFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.retailMetricsGrid}>
              <RetailStatCard
                label="Total clientes"
                value={customers.length.toString()}
              />
              <RetailStatCard
                label="Total por cobrar"
                value={formatCurrency(totalBalance)}
              />
              <RetailStatCard
                label="Cartera vencida"
                value={formatCurrency(overdueBalance)}
              />
              <RetailStatCard
                label="Clientes vencidos"
                value={overdueCustomers.toString()}
              />
            </div>

            <section className={styles.agingSection} aria-labelledby="aging-title">
              <div className={styles.agingHeading}>
                <div>
                  <h2 id="aging-title">Antigüedad de cartera</h2>
                  <p>
                    Selecciona un rango para identificar los clientes que
                    requieren gestión.
                  </p>
                </div>
                {portfolioFilter !== 'ALL' ? (
                  <button type="button" onClick={() => setPortfolioFilter('ALL')}>
                    Limpiar filtro
                  </button>
                ) : null}
              </div>
              <div className={styles.agingGrid}>
                {agingTotals.map((bucket) => (
                  <button
                    aria-pressed={portfolioFilter === bucket.filter}
                    className={`${styles.agingCard} ${
                      styles[`agingCard_${bucket.tone}`]
                    } ${
                      portfolioFilter === bucket.filter
                        ? styles.agingCardActive
                        : ''
                    }`}
                    key={bucket.filter}
                    type="button"
                    onClick={() => setPortfolioFilter(bucket.filter)}
                  >
                    <span>{bucket.label}</span>
                    <strong>{formatCurrency(bucket.value)}</strong>
                    <small>
                      {bucket.customerCount} cliente
                      {bucket.customerCount === 1 ? '' : 's'}
                    </small>
                  </button>
                ))}
              </div>
            </section>

            {exportFeedback ? (
              <p className={styles.exportFeedback} role="status">
                {exportFeedback}
              </p>
            ) : null}

            <RetailTableShell
              isRefreshing={customersQuery.isFetching && !customersQuery.isLoading}
              title="Clientes registrados"
            >
              <table className={retailStyles.table}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Celular</th>
                    <th>Documento</th>
                    <th>Total por cobrar</th>
                    <th>Próximo vencimiento</th>
                    <th>Compras</th>
                    <th>Prioridad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {customersQuery.isLoading ? (
                    <TableStateRow
                      colSpan={8}
                      tone="feedback"
                      title="Cargando clientes..."
                    />
                  ) : null}

                  {customersQuery.isError ? (
                    <TableStateRow
                      action={
                        <button
                          className={retailStyles.tableAction}
                          type="button"
                          onClick={() => {
                            void customersQuery.refetch()
                          }}
                        >
                          Reintentar
                        </button>
                      }
                      colSpan={8}
                      description="Intenta nuevamente para consultar la lista de clientes."
                      tone="error"
                      title="No pudimos cargar los clientes."
                    />
                  ) : null}

                  {!customersQuery.isLoading &&
                  !customersQuery.isError &&
                  visibleCustomers.length > 0
                    ? visibleCustomers.map((customer) => (
                        <tr key={customer.id}>
                          <td>
                            <strong className={styles.customerName}>
                              {customer.name}
                            </strong>
                          </td>
                          <td>{customer.phone ?? 'Sin celular'}</td>
                          <td>
                            {customer.documentNumber
                              ? `${customer.documentType ?? 'Doc.'} ${customer.documentNumber}`
                              : 'Sin documento'}
                          </td>
                          <td
                            className={
                              customer.balance > 0
                                ? listPageStyles.statusNegative
                                : listPageStyles.statusPositive
                            }
                          >
                            {formatCurrency(customer.balance)}
                          </td>
                          <td>
                            {customer.overdueReceivablesCount > 0
                              ? `${customer.overdueReceivablesCount} vencida${customer.overdueReceivablesCount === 1 ? '' : 's'}`
                              : formatPortfolioDate(customer.nextDueDate)}
                          </td>
                          <td>{customer.purchaseCount.toString()}</td>
                          <td>
                            <span className={getCollectionPriority(customer).className}>
                              {getCollectionPriority(customer).label}
                            </span>
                          </td>
                          <td>
                            <div className={styles.rowActions}>
                              <button
                                className={listPageStyles.detailLink}
                                type="button"
                                onClick={() => openCustomerDetail(customer.id)}
                              >
                                Detalle
                              </button>
                              <button
                                className={listPageStyles.detailLink}
                                type="button"
                                onClick={() => openEditCustomer(customer.id)}
                              >
                                Editar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    : null}

                  {!customersQuery.isLoading &&
                  !customersQuery.isError &&
                  visibleCustomers.length === 0 ? (
                    <TableStateRow
                      colSpan={8}
                      description="Crea un cliente o limpia los filtros para ver más resultados."
                      title="No encontramos clientes con esa busqueda."
                    />
                  ) : null}
                </tbody>
              </table>
            </RetailTableShell>
          </section>
        </RetailPageLayout>

        <RetailCustomerDrawer
          currentCashRegisterId={currentCashRegisterQuery.data?.id ?? null}
          customer={selectedCustomer}
          errorMessage={
            customerDetailQuery.isError
              ? getErrorMessage(
                  customerDetailQuery.error,
                  'No pudimos cargar este cliente.',
                )
              : null
          }
          isLoading={customerDetailQuery.isLoading}
          isOpen={isRetailDrawerOpen}
          isPaymentSubmitting={registerPaymentMutation.isPending}
          isActivitySubmitting={createCollectionActivityMutation.isPending}
          isTermsSubmitting={updateReceivableTermsMutation.isPending}
          isSubmitting={
            createCustomerMutation.isPending ||
            updateCustomerMutation.isPending ||
            uploadCustomerAvatarMutation.isPending
          }
          mode={retailDrawerMode}
          submitError={
            createCustomerMutation.error ??
            updateCustomerMutation.error ??
            uploadCustomerAvatarMutation.error ??
            registerPaymentMutation.error ??
            updateReceivableTermsMutation.error
          }
          onClose={closeRetailCustomerDrawer}
          onModeChange={setRetailDrawerMode}
          onRefresh={() => {
            void customerDetailQuery.refetch()
          }}
          onRegisterPayment={handleRegisterCustomerPayment}
          onCreateCollectionActivity={handleCreateCollectionActivity}
          onUpdateReceivableTerms={handleUpdateCustomerReceivableTerms}
          onSubmitCustomer={handleSubmitCustomer}
        />

        {isPremiumModalOpen ? (
          <CustomerPremiumModal onClose={() => setPremiumModalOpen(false)} />
        ) : null}
      </>
    )
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>CRM del negocio</p>
          <h2 className={styles.title}>
            Mira todo el contexto del cliente sin salir de una sola pantalla.
          </h2>
          <p className={styles.description}>
            Revisa saldos pendientes, abre la ficha del cliente y mira su
            historial de compras en un flujo ligero para el dia a dia.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button
            className={styles.heroButton}
            type="button"
            onClick={() => {
              void customersQuery.refetch()

              if (selectedCustomerId) {
                void customerDetailQuery.refetch()
              }
            }}
          >
            Actualizar CRM
          </button>

          <button
            className={styles.heroGhostButton}
            type="button"
            onClick={() => setSearchValue('')}
          >
            Limpiar busqueda
          </button>
        </div>
      </section>

      <div className={styles.metricsGrid}>
        <CustomerMetricCard
          label="Clientes"
          value={customers.length.toString()}
          hint="Total de clientes disponibles actualmente en el CRM."
        />
        <CustomerMetricCard
          label="Saldo pendiente"
          value={formatCurrency(totalBalance)}
          hint="Saldo por cobrar consolidado entre todas las cuentas de cliente."
          tone={totalBalance > 0 ? 'accent' : 'default'}
        />
        <CustomerMetricCard
          label="Requieren seguimiento"
          value={customersWithBalance.toString()}
          hint={`Ventas registradas en historial: ${totalPurchases.toString()}.`}
          tone={customersWithBalance > 0 ? 'alert' : 'default'}
        />
      </div>

      <div className={styles.workspace}>
        <CustomersListPanel
          customers={visibleCustomers}
          errorMessage={
            customersQuery.isError
              ? getErrorMessage(
                  customersQuery.error,
                  'No pudimos cargar los clientes en este momento. Intenta otra vez.',
                )
              : null
          }
          isLoading={customersQuery.isLoading}
          isRefreshing={customersQuery.isFetching && !customersQuery.isLoading}
          searchValue={searchValue}
          selectedCustomerId={selectedCustomerId}
          totalCount={customers.length}
          onRetry={() => {
            void customersQuery.refetch()
          }}
          onSearchChange={setSearchValue}
          onSelectCustomer={setSelectedCustomerId}
        />

        <div className={styles.secondaryColumn}>
          <CustomerDetailPanel
            customer={selectedCustomer}
            errorMessage={
              customerDetailQuery.isError
                ? getErrorMessage(
                    customerDetailQuery.error,
                    'No pudimos cargar este perfil de cliente en este momento.',
                  )
                : null
            }
            isLoading={customerDetailQuery.isLoading}
            selectedCustomerName={selectedCustomerSummary?.name ?? null}
            onRetry={() => {
              void customerDetailQuery.refetch()
            }}
          />

          <CustomerPurchaseHistoryPanel
            customerName={selectedCustomer?.name ?? selectedCustomerSummary?.name ?? null}
            isLoading={customerDetailQuery.isLoading}
            purchaseHistory={selectedCustomer?.purchaseHistory ?? []}
          />
        </div>
      </div>
    </div>
  )
}

const CUSTOMER_PREMIUM_FEATURES = [
  {
    icon: Users,
    title: 'Lleva el control de lo que te deben',
    description:
      'Visualiza facilmente cuanto dinero tienes pendiente por cobrar y quienes te deben.',
  },
  {
    icon: History,
    title: 'Revisa el historial de cada cliente',
    description:
      'Consulta informacion de contacto, documentos, correos y direccion de cada cliente, todo desde un solo lugar.',
  },
  {
    icon: TrendingUp,
    title: 'Conoce el comportamiento de tus clientes',
    description:
      'Detecta patrones de pago y frecuencia de compras para tomar mejores decisiones de cobro.',
  },
  {
    icon: ReceiptText,
    title: 'Genera comprobantes de pago',
    description:
      'Comparte recibos con tus clientes y deja todo bien registrado.',
  },
]

function CustomerPremiumModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell
      ariaLabelledBy="customer-premium-title"
      className={styles.premiumBackdrop}
      closeButtonClassName={styles.premiumCloseButton}
      closeLabel="Cerrar beneficios de clientes"
      isOpen
      panelClassName={styles.premiumModal}
      onClose={onClose}
    >
      <div className={styles.premiumIntro}>
        <h2 id="customer-premium-title" className={styles.premiumTitle}>
          Clientes premium, <span>control total en un solo lugar.</span>
        </h2>
        <p className={styles.premiumLead}>
          Registra deudas, envia recordatorios y manten todo bajo control.
        </p>
      </div>

      <div className={styles.premiumFeatures}>
        {CUSTOMER_PREMIUM_FEATURES.map((feature) => {
          const FeatureIcon = feature.icon

          return (
            <article key={feature.title} className={styles.premiumFeature}>
              <span className={styles.premiumIcon}>
                <FeatureIcon aria-hidden="true" />
              </span>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </article>
          )
        })}
      </div>

      <button className={styles.premiumCta} type="button" onClick={onClose}>
        <Crown aria-hidden="true" />
        Quiero mi plan ya
      </button>
    </ModalShell>
  )
}
