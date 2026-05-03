import { useDeferredValue, useEffect, useState } from 'react'
import { CustomerDetailPanel } from '@/modules/customers/components/CustomerDetailPanel'
import { CustomerMetricCard } from '@/modules/customers/components/CustomerMetricCard'
import { CustomerPurchaseHistoryPanel } from '@/modules/customers/components/CustomerPurchaseHistoryPanel'
import { CustomersListPanel } from '@/modules/customers/components/CustomersListPanel'
import {
  useCustomerDetailQuery,
  useCustomersQuery,
} from '@/modules/customers/hooks/use-customers-query'
import { RetailPremiumBanner } from '@/shared/components/retail/RetailPremiumBanner'
import { RetailStatCard } from '@/shared/components/retail/RetailStatCard'
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
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase())
  const customersQuery = useCustomersQuery()
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

  if (isRetailPreset) {
    return (
      <div className={listPageStyles.page}>
        <div className={listPageStyles.headerRow}>
          <div />
          <button className={retailStyles.buttonDark} disabled type="button">
            Crear cliente
          </button>
        </div>

        <RetailPremiumBanner
          title="¡Ups! Ya no puedes crear más clientes."
          description="Desbloquea la función premium, accede a toda la información y sigue creciendo sin límites."
          linkLabel="Ver beneficios"
        />

        <div className={listPageStyles.searchRow}>
          <label className={`${retailStyles.searchField} ${listPageStyles.searchField}`}>
            <input
              className={retailStyles.input}
              placeholder="Busca un cliente"
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>
        </div>

        <div className={listPageStyles.metricsGrid}>
          <RetailStatCard
            label="Total clientes"
            value={customers.length.toString()}
          />
          <RetailStatCard
            label="Total por cobrar"
            value={formatCurrency(totalBalance)}
          />
        </div>

        <section className={retailStyles.tableCard}>
          <div className={retailStyles.tableScroller}>
            <table className={retailStyles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Celular</th>
                  <th>Documento</th>
                  <th>Total por cobrar</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleCustomers.length > 0 ? (
                  visibleCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.name}</td>
                      <td>{customer.phone ?? 'Sin celular'}</td>
                      <td>{customer.email ?? 'Sin documento'}</td>
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
                        <button
                          className={listPageStyles.detailLink}
                          type="button"
                          onClick={() => setSelectedCustomerId(customer.id)}
                        >
                          Detalle
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <div className={retailStyles.emptyState}>
                        <div className={retailStyles.emptyIcon} />
                        <p className={retailStyles.emptyTitle}>
                          No encontramos clientes con esa búsqueda.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
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
