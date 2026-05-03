import { useDeferredValue, useEffect, useState } from 'react'
import { SupplierDetailPanel } from '@/modules/suppliers/components/SupplierDetailPanel'
import { SupplierMetricCard } from '@/modules/suppliers/components/SupplierMetricCard'
import { SupplierSupplyHistoryPanel } from '@/modules/suppliers/components/SupplierSupplyHistoryPanel'
import { SuppliersListPanel } from '@/modules/suppliers/components/SuppliersListPanel'
import {
  useSupplierDetailQuery,
  useSuppliersQuery,
} from '@/modules/suppliers/hooks/use-suppliers-query'
import { RetailPremiumBanner } from '@/shared/components/retail/RetailPremiumBanner'
import { RetailStatCard } from '@/shared/components/retail/RetailStatCard'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import listPageStyles from '@/shared/components/retail/RetailListPage.module.css'
import { useBusinessNavigationPreset } from '@/shared/hooks/use-business-navigation-preset'
import { matchesSupplierSearch } from '@/modules/suppliers/utils/matches-supplier-search'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './SuppliersPage.module.css'

export function SuppliersPage() {
  const navigationPreset = useBusinessNavigationPreset()
  const isRetailPreset = navigationPreset === 'retail'
  const [searchValue, setSearchValue] = useState('')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  )
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase())
  const suppliersQuery = useSuppliersQuery()
  const supplierRecords = suppliersQuery.data
  const suppliers = supplierRecords ?? []
  const visibleSuppliers = suppliers.filter((supplier) =>
    matchesSupplierSearch(supplier, deferredSearchValue),
  )
  const selectedSupplierSummary =
    suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null
  const supplierDetailQuery = useSupplierDetailQuery(selectedSupplierId)
  const selectedSupplier = supplierDetailQuery.data ?? null
  const activeSuppliers = suppliers.filter((supplier) => supplier.purchaseCount > 0).length
  const trackedRestocks = suppliers.reduce(
    (sum, supplier) => sum + supplier.purchaseCount,
    0,
  )
  const selectedProcurementTotal =
    selectedSupplier?.purchaseHistory.reduce(
      (sum, purchase) => sum + purchase.total,
      0,
    ) ?? 0

  useEffect(() => {
    const availableSuppliers = supplierRecords ?? []

    if (availableSuppliers.length === 0) {
      if (selectedSupplierId !== null) {
        setSelectedSupplierId(null)
      }

      return
    }

    const hasSelectedSupplier = availableSuppliers.some(
      (supplier) => supplier.id === selectedSupplierId,
    )

    if (!hasSelectedSupplier) {
      setSelectedSupplierId(availableSuppliers[0]?.id ?? null)
    }
  }, [supplierRecords, selectedSupplierId])

  if (isRetailPreset) {
    return (
      <div className={listPageStyles.page}>
        <div className={listPageStyles.headerRow}>
          <div />
          <button className={retailStyles.buttonDark} disabled type="button">
            Crear proveedor
          </button>
        </div>

        <RetailPremiumBanner
          title="¡Ups! Ya no puedes crear más proveedores."
          description="Desbloquea la función premium, accede a toda la información y sigue creciendo sin límites."
          linkLabel="Ver beneficios"
        />

        <div className={listPageStyles.searchRow}>
          <label className={`${retailStyles.searchField} ${listPageStyles.searchField}`}>
            <input
              className={retailStyles.input}
              placeholder="Busca un proveedor"
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>
        </div>

        <div className={listPageStyles.metricsGrid}>
          <RetailStatCard
            label="Total proveedores"
            value={suppliers.length.toString()}
          />
          <RetailStatCard
            label="Total por pagar"
            value={formatCurrency(selectedProcurementTotal)}
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
                  <th>Total por pagar</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleSuppliers.length > 0 ? (
                  visibleSuppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>{supplier.name}</td>
                      <td>{supplier.phone ?? 'Sin celular'}</td>
                      <td>{supplier.email ?? 'Sin documento'}</td>
                      <td className={listPageStyles.statusPositive}>
                        {formatCurrency(selectedSupplierId === supplier.id ? selectedProcurementTotal : 0)}
                      </td>
                      <td>
                        <button
                          className={listPageStyles.detailLink}
                          type="button"
                          onClick={() => setSelectedSupplierId(supplier.id)}
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
                          No encontramos proveedores con esa búsqueda.
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
          <p className={styles.eyebrow}>Procurement workspace</p>
          <h2 className={styles.title}>
            Keep supplier relationships and restock history in one calm view.
          </h2>
          <p className={styles.description}>
            Review supplier contacts, open procurement details and scan replenishment
            history from a clean SaaS-style workspace built for day-to-day operations.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button
            className={styles.heroButton}
            type="button"
            onClick={() => {
              void suppliersQuery.refetch()

              if (selectedSupplierId) {
                void supplierDetailQuery.refetch()
              }
            }}
          >
            Refresh suppliers
          </button>

          <button
            className={styles.heroGhostButton}
            type="button"
            onClick={() => setSearchValue('')}
          >
            Clear search
          </button>
        </div>
      </section>

      <div className={styles.metricsGrid}>
        <SupplierMetricCard
          label="Suppliers"
          value={suppliers.length.toString()}
          hint="Total procurement contacts currently available in the directory."
        />
        <SupplierMetricCard
          label="Active"
          value={activeSuppliers.toString()}
          hint={`Replenishment entries tracked across suppliers: ${trackedRestocks.toString()}.`}
          tone={activeSuppliers > 0 ? 'accent' : 'default'}
        />
        <SupplierMetricCard
          label="Selected volume"
          value={formatCurrency(selectedProcurementTotal)}
          hint="Accumulated procurement value for the supplier currently in focus."
          tone={selectedProcurementTotal > 0 ? 'alert' : 'default'}
        />
      </div>

      <div className={styles.workspace}>
        <SuppliersListPanel
          suppliers={visibleSuppliers}
          errorMessage={
            suppliersQuery.isError
              ? getErrorMessage(
                  suppliersQuery.error,
                  'Unable to load supplier records right now. Please try again.',
                )
              : null
          }
          isLoading={suppliersQuery.isLoading}
          isRefreshing={suppliersQuery.isFetching && !suppliersQuery.isLoading}
          searchValue={searchValue}
          selectedSupplierId={selectedSupplierId}
          totalCount={suppliers.length}
          onRetry={() => {
            void suppliersQuery.refetch()
          }}
          onSearchChange={setSearchValue}
          onSelectSupplier={setSelectedSupplierId}
        />

        <div className={styles.secondaryColumn}>
          <SupplierDetailPanel
            supplier={selectedSupplier}
            errorMessage={
              supplierDetailQuery.isError
                ? getErrorMessage(
                    supplierDetailQuery.error,
                    'Unable to load this supplier profile right now. Please try again.',
                  )
                : null
            }
            isLoading={supplierDetailQuery.isLoading}
            selectedSupplierName={selectedSupplierSummary?.name ?? null}
            onRetry={() => {
              void supplierDetailQuery.refetch()
            }}
          />

          <SupplierSupplyHistoryPanel
            supplierName={selectedSupplier?.name ?? selectedSupplierSummary?.name ?? null}
            isLoading={supplierDetailQuery.isLoading}
            purchaseHistory={selectedSupplier?.purchaseHistory ?? []}
          />
        </div>
      </div>
    </div>
  )
}
