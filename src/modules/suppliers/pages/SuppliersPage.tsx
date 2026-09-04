import { useDeferredValue, useEffect, useState } from 'react'
import { SupplierDetailPanel } from '@/modules/suppliers/components/SupplierDetailPanel'
import { SupplierMetricCard } from '@/modules/suppliers/components/SupplierMetricCard'
import { RetailSupplierDrawer } from '@/modules/suppliers/components/RetailSupplierDrawer'
import { SupplierSupplyHistoryPanel } from '@/modules/suppliers/components/SupplierSupplyHistoryPanel'
import { SuppliersListPanel } from '@/modules/suppliers/components/SuppliersListPanel'
import {
  useCreateSupplierMutation,
  useCancelSupplierPurchaseMutation,
  useRegisterSupplierPurchasePaymentMutation,
  useSupplierDetailQuery,
  useSuppliersQuery,
  useUpdateSupplierMutation,
  useUploadSupplierAvatarMutation,
} from '@/modules/suppliers/hooks/use-suppliers-query'
import { downloadSupplierPurchaseReceipt } from '@/modules/suppliers/services/suppliers-api'
import type {
  SupplierMutationInput,
  SupplierPurchasePaymentInput,
} from '@/modules/suppliers/types/supplier'
import { RetailPremiumBanner } from '@/shared/components/retail/RetailPremiumBanner'
import { RetailPageLayout } from '@/shared/components/retail/RetailPageLayout'
import { RetailStatCard } from '@/shared/components/retail/RetailStatCard'
import { RetailTableShell } from '@/shared/components/retail/RetailTableShell'
import { TableStateRow } from '@/shared/components/retail/TableStateRow'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import listPageStyles from '@/shared/components/retail/RetailListPage.module.css'
import { useBusinessNavigationPreset } from '@/shared/hooks/use-business-navigation-preset'
import { matchesSupplierSearch } from '@/modules/suppliers/utils/matches-supplier-search'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { downloadBlobFile } from '@/shared/utils/download-blob-file'
import styles from './SuppliersPage.module.css'

export function SuppliersPage() {
  const navigationPreset = useBusinessNavigationPreset()
  const isRetailPreset = navigationPreset === 'retail'
  const [searchValue, setSearchValue] = useState('')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  )
  const [isCreateSupplierOpen, setCreateSupplierOpen] = useState(false)
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null)
  const [purchaseActionError, setPurchaseActionError] = useState<string | null>(null)
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase())
  const suppliersQuery = useSuppliersQuery()
  const createSupplierMutation = useCreateSupplierMutation()
  const updateSupplierMutation = useUpdateSupplierMutation()
  const uploadSupplierAvatarMutation = useUploadSupplierAvatarMutation()
  const registerPurchasePaymentMutation = useRegisterSupplierPurchasePaymentMutation()
  const cancelPurchaseMutation = useCancelSupplierPurchaseMutation()
  const supplierRecords = suppliersQuery.data
  const suppliers = supplierRecords ?? []
  const visibleSuppliers = suppliers.filter((supplier) =>
    matchesSupplierSearch(supplier, deferredSearchValue),
  )
  const selectedSupplierSummary =
    suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null
  const supplierDetailQuery = useSupplierDetailQuery(selectedSupplierId)
  const selectedSupplier = supplierDetailQuery.data ?? null
  const editingSupplier =
    suppliers.find((supplier) => supplier.id === editingSupplierId) ??
    (selectedSupplier?.id === editingSupplierId ? selectedSupplier : null)
  const activeSuppliers = suppliers.filter(
    (supplier) => supplier.purchaseCount > 0,
  ).length
  const trackedRestocks = suppliers.reduce(
    (sum, supplier) => sum + supplier.purchaseCount,
    0,
  )
  const totalOutstandingBalance = suppliers.reduce(
    (sum, supplier) => sum + supplier.outstandingBalance,
    0,
  )
  const selectedProcurementTotal =
    selectedSupplier?.purchaseHistory.reduce(
      (sum, purchase) => sum + purchase.total,
      0,
    ) ?? 0
  const isSubmittingSupplier =
    createSupplierMutation.isPending ||
    updateSupplierMutation.isPending ||
    uploadSupplierAvatarMutation.isPending
  const createSupplierError =
    createSupplierMutation.isError ||
    updateSupplierMutation.isError ||
    uploadSupplierAvatarMutation.isError
      ? getErrorMessage(
          createSupplierMutation.error ??
            updateSupplierMutation.error ??
            uploadSupplierAvatarMutation.error,
          editingSupplier
            ? 'No pudimos guardar el proveedor. Intenta nuevamente.'
            : 'No pudimos crear el proveedor. Intenta nuevamente.',
        )
      : null

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

  async function handleCreateSupplier(
    input: SupplierMutationInput,
    avatarFile?: File | null,
  ) {
    if (editingSupplier) {
      const updatedSupplier = await updateSupplierMutation.mutateAsync({
        supplierId: editingSupplier.id,
        input,
      })

      if (avatarFile) {
        await uploadSupplierAvatarMutation.mutateAsync({
          supplierId: updatedSupplier.id,
          file: avatarFile,
        })
      }

      setSelectedSupplierId(updatedSupplier.id)
      setEditingSupplierId(null)
      setCreateSupplierOpen(false)
      return
    }

    const createdSupplier = await createSupplierMutation.mutateAsync(input)

    if (avatarFile) {
      await uploadSupplierAvatarMutation.mutateAsync({
        supplierId: createdSupplier.id,
        file: avatarFile,
      })
    }

    setSelectedSupplierId(createdSupplier.id)
    setCreateSupplierOpen(false)
  }

  function handleStartCreateSupplier() {
    setEditingSupplierId(null)
    setCreateSupplierOpen(true)
  }

  function handleStartEditSupplier(supplierId: string) {
    setEditingSupplierId(supplierId)
    setSelectedSupplierId(supplierId)
    setCreateSupplierOpen(true)
  }

  async function handleRegisterPurchasePayment(
    purchaseId: string,
    input: SupplierPurchasePaymentInput,
  ) {
    if (!selectedSupplierId) {
      return
    }

    setPurchaseActionError(null)
    try {
      await registerPurchasePaymentMutation.mutateAsync({
        supplierId: selectedSupplierId,
        purchaseId,
        input,
      })
    } catch (error) {
      setPurchaseActionError(
        getErrorMessage(error, 'No pudimos registrar el abono.'),
      )
    }
  }

  async function handleDownloadPurchaseReceipt(purchaseId: string) {
    if (!selectedSupplierId) {
      return
    }

    setPurchaseActionError(null)
    try {
      const { blob, filename } = await downloadSupplierPurchaseReceipt(
        selectedSupplierId,
        purchaseId,
      )
      downloadBlobFile(blob, filename ?? `compra-${purchaseId}.html`)
    } catch (error) {
      setPurchaseActionError(
        getErrorMessage(error, 'No pudimos descargar el comprobante.'),
      )
    }
  }

  async function handleCancelPurchase(purchaseId: string, reason: string) {
    if (!selectedSupplierId) {
      return
    }

    setPurchaseActionError(null)
    try {
      await cancelPurchaseMutation.mutateAsync({
        supplierId: selectedSupplierId,
        purchaseId,
        input: { reason },
      })
    } catch (error) {
      setPurchaseActionError(
        getErrorMessage(error, 'No pudimos anular la compra.'),
      )
    }
  }

  function handleCloseSupplierDrawer() {
    setCreateSupplierOpen(false)
    setEditingSupplierId(null)
  }

  if (isRetailPreset) {
    return (
      <>
        <RetailPageLayout
          accent="success"
          bodyVariant="flush"
          title="Proveedores"
          actions={
            <button
              className={retailStyles.buttonDark}
              type="button"
              onClick={handleStartCreateSupplier}
            >
              Crear proveedor
            </button>
          }
        >
          <section className={styles.retailWorkspace}>
            <RetailPremiumBanner
              title="Proveedores premium, toda tu red de abastecimiento en un solo lugar."
              description="Registra contactos, agrega su avatar y consulta rapidamente su historial de compras."
              linkLabel="Ver beneficios"
            />

            <div className={listPageStyles.searchRow}>
              <label
                className={`${retailStyles.searchField} ${listPageStyles.searchField}`}
              >
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
                value={formatCurrency(totalOutstandingBalance)}
              />
            </div>

            <RetailTableShell
              isRefreshing={suppliersQuery.isFetching && !suppliersQuery.isLoading}
              title="Proveedores registrados"
            >
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
                  {suppliersQuery.isLoading ? (
                    <TableStateRow
                      colSpan={5}
                      tone="feedback"
                      title="Cargando proveedores..."
                    />
                  ) : null}

                  {suppliersQuery.isError ? (
                    <TableStateRow
                      action={
                        <button
                          className={retailStyles.tableAction}
                          type="button"
                          onClick={() => {
                            void suppliersQuery.refetch()
                          }}
                        >
                          Reintentar
                        </button>
                      }
                      colSpan={5}
                      description="Intenta nuevamente para consultar la lista de proveedores."
                      tone="error"
                      title="No pudimos cargar los proveedores."
                    />
                  ) : null}

                  {!suppliersQuery.isLoading &&
                  !suppliersQuery.isError &&
                  visibleSuppliers.length > 0
                    ? visibleSuppliers.map((supplier) => (
                      <tr key={supplier.id}>
                        <td>{supplier.name}</td>
                        <td>{supplier.phone ?? 'Sin celular'}</td>
                        <td>{supplier.email ?? 'Sin documento'}</td>
                        <td className={listPageStyles.statusPositive}>
                          {formatCurrency(supplier.outstandingBalance)}
                        </td>
                        <td>
                          <div className={listPageStyles.actionGroup}>
                            <button
                              className={listPageStyles.detailLink}
                              type="button"
                              onClick={() => setSelectedSupplierId(supplier.id)}
                            >
                              Detalle
                            </button>
                            <button
                              className={listPageStyles.detailLink}
                              type="button"
                              onClick={() => handleStartEditSupplier(supplier.id)}
                            >
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                    : null}

                  {!suppliersQuery.isLoading &&
                  !suppliersQuery.isError &&
                  visibleSuppliers.length === 0 ? (
                    <TableStateRow
                      colSpan={5}
                      description="Crea un proveedor o limpia los filtros para ver más resultados."
                      title="No encontramos proveedores con esa búsqueda."
                    />
                  ) : null}
                </tbody>
              </table>
            </RetailTableShell>

            {selectedSupplierId ? (
              <div className={styles.retailDetailGrid}>
                <SupplierDetailPanel
                  supplier={selectedSupplier}
                  errorMessage={
                    supplierDetailQuery.isError
                      ? getErrorMessage(
                          supplierDetailQuery.error,
                          'No pudimos cargar el proveedor seleccionado.',
                        )
                      : null
                  }
                  isLoading={supplierDetailQuery.isLoading}
                  selectedSupplierName={selectedSupplierSummary?.name ?? null}
                  onEdit={(supplier) => handleStartEditSupplier(supplier.id)}
                  onRetry={() => {
                    void supplierDetailQuery.refetch()
                  }}
                />
                <SupplierSupplyHistoryPanel
                  supplierName={
                    selectedSupplier?.name ?? selectedSupplierSummary?.name ?? null
                  }
                  cancellingPurchaseId={
                    cancelPurchaseMutation.isPending
                      ? cancelPurchaseMutation.variables?.purchaseId ?? null
                      : null
                  }
                  isLoading={supplierDetailQuery.isLoading}
                  payingPurchaseId={
                    registerPurchasePaymentMutation.isPending
                      ? registerPurchasePaymentMutation.variables?.purchaseId ?? null
                      : null
                  }
                  paymentError={purchaseActionError}
                  purchaseHistory={selectedSupplier?.purchaseHistory ?? []}
                  onCancelPurchase={(purchaseId, reason) => {
                    void handleCancelPurchase(purchaseId, reason)
                  }}
                  onDownloadReceipt={(purchaseId) => {
                    void handleDownloadPurchaseReceipt(purchaseId)
                  }}
                  onRegisterPayment={(purchaseId, input) => {
                    void handleRegisterPurchasePayment(purchaseId, input)
                  }}
                />
              </div>
            ) : null}
          </section>
        </RetailPageLayout>

        <RetailSupplierDrawer
          errorMessage={createSupplierError}
          isOpen={isCreateSupplierOpen}
          isSubmitting={isSubmittingSupplier}
          supplier={editingSupplier}
          onClose={handleCloseSupplierDrawer}
          onSubmit={handleCreateSupplier}
        />
      </>
    )
  }

  return (
    <>
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
            onClick={handleStartCreateSupplier}
          >
            Create supplier
          </button>

          <button
            className={styles.heroGhostButton}
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
            onEdit={(supplier) => handleStartEditSupplier(supplier.id)}
            onRetry={() => {
              void supplierDetailQuery.refetch()
            }}
          />

          <SupplierSupplyHistoryPanel
            supplierName={
              selectedSupplier?.name ?? selectedSupplierSummary?.name ?? null
            }
            isLoading={supplierDetailQuery.isLoading}
            cancellingPurchaseId={
              cancelPurchaseMutation.isPending
                ? cancelPurchaseMutation.variables?.purchaseId ?? null
                : null
            }
            payingPurchaseId={
              registerPurchasePaymentMutation.isPending
                ? registerPurchasePaymentMutation.variables?.purchaseId ?? null
                : null
            }
            paymentError={purchaseActionError}
            purchaseHistory={selectedSupplier?.purchaseHistory ?? []}
            onCancelPurchase={(purchaseId, reason) => {
              void handleCancelPurchase(purchaseId, reason)
            }}
            onDownloadReceipt={(purchaseId) => {
              void handleDownloadPurchaseReceipt(purchaseId)
            }}
            onRegisterPayment={(purchaseId, input) => {
              void handleRegisterPurchasePayment(purchaseId, input)
            }}
          />
        </div>
      </div>
      </div>

      <RetailSupplierDrawer
        errorMessage={createSupplierError}
        isOpen={isCreateSupplierOpen}
        isSubmitting={isSubmittingSupplier}
        supplier={editingSupplier}
        onClose={handleCloseSupplierDrawer}
        onSubmit={handleCreateSupplier}
      />
    </>
  )
}
