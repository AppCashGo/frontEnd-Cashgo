import { useDeferredValue, useEffect, useState } from 'react'
import { Crown, History, ReceiptText, TrendingUp, Users, X } from 'lucide-react'
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
  useCreateCustomerMutation,
  useCustomersQuery,
  useRegisterCustomerPaymentMutation,
  useUpdateCustomerMutation,
} from '@/modules/customers/hooks/use-customers-query'
import type {
  CustomerMutationInput,
  CustomerPaymentInput,
} from '@/modules/customers/types/customer'
import { useCurrentCashRegisterQuery } from '@/modules/cash-register/hooks/use-cash-register-query'
import { RetailStatCard } from '@/shared/components/retail/RetailStatCard'
import { RetailPageLayout } from '@/shared/components/retail/RetailPageLayout'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import listPageStyles from '@/shared/components/retail/RetailListPage.module.css'
import { useBusinessNavigationPreset } from '@/shared/hooks/use-business-navigation-preset'
import { matchesCustomerSearch } from '@/modules/customers/utils/matches-customer-search'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './CustomersPage.module.css'

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
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase())
  const customersQuery = useCustomersQuery()
  const createCustomerMutation = useCreateCustomerMutation()
  const updateCustomerMutation = useUpdateCustomerMutation()
  const registerPaymentMutation = useRegisterCustomerPaymentMutation()
  const currentCashRegisterQuery = useCurrentCashRegisterQuery()
  const customerRecords = customersQuery.data
  const customers = customerRecords ?? []
  const visibleCustomers = customers.filter((customer) =>
    matchesCustomerSearch(customer, deferredSearchValue),
  )
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
  const totalPurchases = customers.reduce(
    (sum, customer) => sum + customer.purchaseCount,
    0,
  )
  const averagePurchases =
    customers.length > 0 ? Math.round(totalPurchases / customers.length) : 0

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

  async function handleSubmitCustomer(input: CustomerMutationInput) {
    if (retailDrawerMode === 'edit' && selectedCustomerId) {
      await updateCustomerMutation.mutateAsync({
        customerId: selectedCustomerId,
        input,
      })
      setRetailDrawerMode('detail')
      return
    }

    const createdCustomer = await createCustomerMutation.mutateAsync(input)

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

  if (isRetailPreset) {
    return (
      <>
        <RetailPageLayout
          accent="success"
          bodyVariant="flush"
          title="Clientes"
          actions={
            <button
              className={retailStyles.buttonDark}
              type="button"
              onClick={openCreateCustomer}
            >
              Crear cliente
            </button>
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
                label="Clientes con deuda"
                value={customersWithBalance.toString()}
              />
              <RetailStatCard
                label="Compras promedio"
                value={averagePurchases.toString()}
              />
            </div>

            <section className={retailStyles.tableCard}>
              <div className={retailStyles.tableHeader}>
                <h3 className={retailStyles.tableTitle}>Clientes registrados</h3>
                {customersQuery.isFetching && !customersQuery.isLoading ? (
                  <span className={styles.refreshingLabel}>Actualizando...</span>
                ) : null}
              </div>

              <div className={retailStyles.tableScroller}>
                <table className={retailStyles.table}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Celular</th>
                      <th>Documento</th>
                      <th>Total por cobrar</th>
                      <th>Compras</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customersQuery.isLoading ? (
                      <tr>
                        <td colSpan={7}>
                          <div className={styles.retailFeedback}>
                            Cargando clientes...
                          </div>
                        </td>
                      </tr>
                    ) : null}

                    {customersQuery.isError ? (
                      <tr>
                        <td colSpan={7}>
                          <div className={styles.retailFeedback} role="alert">
                            No pudimos cargar los clientes.
                            <button
                              className={styles.inlineButton}
                              type="button"
                              onClick={() => {
                                void customersQuery.refetch()
                              }}
                            >
                              Reintentar
                            </button>
                          </div>
                        </td>
                      </tr>
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
                            <td>{customer.purchaseCount.toString()}</td>
                            <td>
                              <span
                                className={
                                  customer.balance > 0
                                    ? styles.statusPending
                                    : styles.statusOk
                                }
                              >
                                {customer.balance > 0 ? 'Por cobrar' : 'Al dia'}
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
                      <tr>
                        <td colSpan={7}>
                          <div className={retailStyles.emptyState}>
                            <div className={retailStyles.emptyIcon} />
                            <p className={retailStyles.emptyTitle}>
                              No encontramos clientes con esa busqueda.
                            </p>
                            <p className={retailStyles.emptyDescription}>
                              Crea un cliente o limpia los filtros para ver más
                              resultados.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
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
          isSubmitting={
            createCustomerMutation.isPending || updateCustomerMutation.isPending
          }
          mode={retailDrawerMode}
          submitError={
            createCustomerMutation.error ??
            updateCustomerMutation.error ??
            registerPaymentMutation.error
          }
          onClose={closeRetailCustomerDrawer}
          onModeChange={setRetailDrawerMode}
          onRefresh={() => {
            void customerDetailQuery.refetch()
          }}
          onRegisterPayment={handleRegisterCustomerPayment}
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
    <div
      className={styles.premiumBackdrop}
      role="presentation"
      onClick={onClose}
    >
      <section
        aria-labelledby="customer-premium-title"
        aria-modal="true"
        className={styles.premiumModal}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Cerrar beneficios de clientes"
          className={styles.premiumCloseButton}
          type="button"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>

        <div className={styles.premiumIntro}>
          <h2 id="customer-premium-title" className={styles.premiumTitle}>
            Clientes premium,{' '}
            <span>control total en un solo lugar.</span>
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
      </section>
    </div>
  )
}
