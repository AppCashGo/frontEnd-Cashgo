import { useDeferredValue, useEffect, useState } from 'react'
import {
  Eye,
  Mail,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Truck,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { SupplierDetailPanel } from '@/modules/suppliers/components/SupplierDetailPanel'
import { SupplierMetricCard } from '@/modules/suppliers/components/SupplierMetricCard'
import { RetailSupplierDrawer } from '@/modules/suppliers/components/RetailSupplierDrawer'
import { SupplierSupplyHistoryPanel } from '@/modules/suppliers/components/SupplierSupplyHistoryPanel'
import { SuppliersListPanel } from '@/modules/suppliers/components/SuppliersListPanel'
import {
  useCreateSupplierMutation,
  useCancelSupplierPurchaseMutation,
  useCreateSupplierPurchaseReturnMutation,
  useRegisterSupplierPurchasePaymentMutation,
  useSupplierDetailQuery,
  useSuppliersQuery,
  useUpdateSupplierMutation,
  useUpdateSupplierPurchaseMutation,
  useUploadSupplierAvatarMutation,
} from '@/modules/suppliers/hooks/use-suppliers-query'
import {
  downloadSupplierPurchaseReceipt,
  downloadSupplierPurchaseReturnCreditNote,
} from '@/modules/suppliers/services/suppliers-api'
import type {
  SupplierMutationInput,
  SupplierPurchasePaymentInput,
  SupplierPurchaseReturnInput,
  SupplierPurchaseUpdateInput,
} from '@/modules/suppliers/types/supplier'
import { SalesCustomerAvatar } from '@/modules/sales/components/SalesVisuals'
import { WorkspaceBusinessTitle } from '@/shared/components/retail/WorkspaceBusinessTitle'
import workspaceVisual from '@/shared/components/retail/WorkspaceVisual.module.css'
import { AppButton } from '@/shared/components/ui/AppButton'
import { DrawerActionFooter } from '@/shared/components/ui/DrawerActionFooter'
import { RetailPageLayout } from '@/shared/components/retail/RetailPageLayout'
import { RetailStatCard } from '@/shared/components/retail/RetailStatCard'
import { RetailTableShell } from '@/shared/components/retail/RetailTableShell'
import { TableStateRow } from '@/shared/components/retail/TableStateRow'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import listPageStyles from '@/shared/components/retail/RetailListPage.module.css'
import { useBusinessNavigationPreset } from '@/shared/hooks/use-business-navigation-preset'
import { matchesSupplierSearch } from '@/modules/suppliers/utils/matches-supplier-search'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { downloadBlobFile } from '@/shared/utils/download-blob-file'
import styles from './SuppliersPage.module.css'

type RetailSupplierFilter = 'all' | 'outstanding' | 'active' | 'withoutPurchases'

export function SuppliersPage() {
  const navigationPreset = useBusinessNavigationPreset()
  const isRetailPreset = navigationPreset === 'retail'
  const [searchValue, setSearchValue] = useState('')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  )
  const [isCreateSupplierOpen, setCreateSupplierOpen] = useState(false)
  const [isRetailDetailOpen, setRetailDetailOpen] = useState(false)
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null)
  const [retailFilter, setRetailFilter] = useState<RetailSupplierFilter>('all')
  const [purchaseActionError, setPurchaseActionError] = useState<string | null>(null)
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase())
  const suppliersQuery = useSuppliersQuery()
  const createSupplierMutation = useCreateSupplierMutation()
  const updateSupplierMutation = useUpdateSupplierMutation()
  const uploadSupplierAvatarMutation = useUploadSupplierAvatarMutation()
  const registerPurchasePaymentMutation = useRegisterSupplierPurchasePaymentMutation()
  const cancelPurchaseMutation = useCancelSupplierPurchaseMutation()
  const updatePurchaseMutation = useUpdateSupplierPurchaseMutation()
  const createPurchaseReturnMutation = useCreateSupplierPurchaseReturnMutation()
  const supplierRecords = suppliersQuery.data
  const suppliers = supplierRecords ?? []
  const visibleSuppliers = suppliers.filter((supplier) => {
    if (!matchesSupplierSearch(supplier, deferredSearchValue)) {
      return false
    }

    if (retailFilter === 'outstanding') {
      return supplier.outstandingBalance > 0
    }

    if (retailFilter === 'active') {
      return supplier.purchaseCount > 0
    }

    if (retailFilter === 'withoutPurchases') {
      return supplier.purchaseCount === 0
    }

    return true
  })
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
  const suppliersWithOutstandingBalance = suppliers.filter(
    (supplier) => supplier.outstandingBalance > 0,
  ).length
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

    if (!hasSelectedSupplier && !isRetailPreset) {
      setSelectedSupplierId(availableSuppliers[0]?.id ?? null)
    }
  }, [isRetailPreset, supplierRecords, selectedSupplierId])

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
    setRetailDetailOpen(false)
    setCreateSupplierOpen(true)
  }

  function handleOpenSupplierDetail(supplierId: string) {
    setPurchaseActionError(null)
    setSelectedSupplierId(supplierId)
    setRetailDetailOpen(true)
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
      throw error
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
      throw error
    }
  }

  async function handleUpdatePurchase(
    purchaseId: string,
    input: SupplierPurchaseUpdateInput,
  ) {
    if (!selectedSupplierId) {
      return
    }

    setPurchaseActionError(null)
    try {
      await updatePurchaseMutation.mutateAsync({
        supplierId: selectedSupplierId,
        purchaseId,
        input,
      })
    } catch (error) {
      setPurchaseActionError(
        getErrorMessage(error, 'No pudimos corregir la compra.'),
      )
      throw error
    }
  }

  async function handleCreatePurchaseReturn(
    purchaseId: string,
    input: SupplierPurchaseReturnInput,
  ) {
    if (!selectedSupplierId) {
      return
    }

    setPurchaseActionError(null)
    try {
      await createPurchaseReturnMutation.mutateAsync({
        supplierId: selectedSupplierId,
        purchaseId,
        input,
      })
    } catch (error) {
      setPurchaseActionError(
        getErrorMessage(error, 'No pudimos registrar la devolución.'),
      )
      throw error
    }
  }

  async function handleDownloadCreditNote(
    purchaseId: string,
    returnId: string,
  ) {
    if (!selectedSupplierId) {
      return
    }

    setPurchaseActionError(null)
    try {
      const { blob, filename } =
        await downloadSupplierPurchaseReturnCreditNote(
          selectedSupplierId,
          purchaseId,
          returnId,
        )
      downloadBlobFile(blob, filename ?? `nota-credito-${returnId}.html`)
    } catch (error) {
      setPurchaseActionError(
        getErrorMessage(error, 'No pudimos descargar la nota crédito.'),
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
          headerClassName={`${workspaceVisual.hero} ${workspaceVisual.catalogHeader} ${styles.suppliersHeader}`}
          title={<WorkspaceBusinessTitle>Proveedores</WorkspaceBusinessTitle>}
          meta="Consulta compras, pagos y contactos de abastecimiento."
          actions={
            <>
              <button
                className={`${retailStyles.buttonOutline} ${workspaceVisual.catalogAction}`}
                disabled={suppliersQuery.isFetching}
                type="button"
                onClick={() => void suppliersQuery.refetch()}
              >
                <RefreshCw aria-hidden="true" size={18} />
                {suppliersQuery.isFetching ? 'Actualizando...' : 'Actualizar'}
              </button>
              <button
                className={`${retailStyles.buttonDark} ${workspaceVisual.catalogAction} ${workspaceVisual.catalogPrimary}`}
                type="button"
                onClick={handleStartCreateSupplier}
              >
                <Plus aria-hidden="true" size={19} />
                Crear proveedor
              </button>
            </>
          }
        >
          <section className={styles.retailWorkspace}>
            <section className={styles.retailMetricsGrid} aria-label="Resumen de abastecimiento">
              {([
                { icon: UsersRound, label: 'Proveedores', value: suppliers.length.toString(), tone: 'team' },
                { icon: Truck, label: 'Con compras', value: activeSuppliers.toString(), tone: 'partners' },
                { icon: PackageCheck, label: 'Compras registradas', value: trackedRestocks.toString(), tone: 'purchases' },
                { icon: Wallet, label: 'Total por pagar', value: formatCurrency(totalOutstandingBalance), tone: 'balance' },
              ] as const).map(({ icon: Icon, label, value, tone }) => (
                <div className={styles.supplierMetric} data-tone={tone} key={label}>
                  <RetailStatCard
                    icon={<Icon aria-hidden="true" />}
                    label={label}
                    value={value}
                    hint={tone === 'balance' ? `${suppliersWithOutstandingBalance} con saldo pendiente` : undefined}
                  />
                </div>
              ))}
            </section>

            <div className={styles.controlsCard}>
              <label className={styles.searchField}>
                <Search aria-hidden="true" size={20} />
                <input
                  aria-label="Buscar proveedores"
                  placeholder="Nombre, celular o correo"
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </label>

              <div aria-label="Filtrar proveedores" className={styles.filterGroup}>
                {([
                  ['all', 'Todos'],
                  ['outstanding', 'Con saldo'],
                  ['active', 'Con compras'],
                  ['withoutPurchases', 'Sin compras'],
                ] as const).map(([filter, label]) => (
                  <button
                    key={filter}
                    aria-pressed={retailFilter === filter}
                    className={
                      retailFilter === filter
                        ? styles.filterButtonActive
                        : styles.filterButton
                    }
                    type="button"
                    onClick={() => setRetailFilter(filter)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <RetailTableShell
              isRefreshing={suppliersQuery.isFetching && !suppliersQuery.isLoading}
              title={`Proveedores registrados · ${visibleSuppliers.length}`}
            >
              <table className={retailStyles.table}>
                <thead>
                  <tr>
                    <th>Proveedor</th>
                    <th>Contacto</th>
                    <th>Compras</th>
                    <th>Última compra</th>
                    <th>Total por pagar</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliersQuery.isLoading ? (
                    <TableStateRow
                      colSpan={7}
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
                      colSpan={7}
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
                        <td>
                          <button
                            className={styles.supplierIdentity}
                            type="button"
                            onClick={() => handleOpenSupplierDetail(supplier.id)}
                          >
                            <span className={styles.supplierAvatar}><SalesCustomerAvatar name={supplier.name} avatarUrl={supplier.avatarUrl} /></span>
                            <span>
                              <strong>{supplier.name}</strong>
                              <small>{supplier.email ?? 'Sin correo registrado'}</small>
                            </span>
                          </button>
                        </td>
                        <td>
                          <span className={styles.contactValue}>
                            <Phone aria-hidden="true" size={16} />
                            {supplier.phone ?? 'Sin celular'}
                          </span>
                        </td>
                        <td>{supplier.purchaseCount.toString()}</td>
                        <td>
                          {supplier.lastPurchaseAt
                            ? new Intl.DateTimeFormat('es-CO', {
                                dateStyle: 'medium',
                              }).format(new Date(supplier.lastPurchaseAt))
                            : 'Sin compras'}
                        </td>
                        <td className={supplier.outstandingBalance > 0 ? styles.balanceDue : styles.balanceClear}>
                          {formatCurrency(supplier.outstandingBalance)}
                        </td>
                        <td>
                          <span className={supplier.outstandingBalance > 0 ? styles.statusDue : styles.statusClear}>
                            {supplier.outstandingBalance > 0 ? 'Por pagar' : 'Al día'}
                          </span>
                        </td>
                        <td>
                          <div className={listPageStyles.actionGroup}>
                            <button
                              className={styles.rowAction}
                              type="button"
                              onClick={() => handleOpenSupplierDetail(supplier.id)}
                            >
                              <Eye aria-hidden="true" size={16} /> Detalle
                            </button>
                            <button
                              aria-label={`Editar ${supplier.name}`}
                              className={styles.iconAction}
                              type="button"
                              onClick={() => handleStartEditSupplier(supplier.id)}
                            >
                              <Pencil aria-hidden="true" size={17} />
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
                      colSpan={7}
                      description="Crea un proveedor o limpia los filtros para ver más resultados."
                      title="No encontramos proveedores con esa búsqueda."
                    />
                  ) : null}
                </tbody>
              </table>
            </RetailTableShell>

            {!suppliersQuery.isLoading && !suppliersQuery.isError ? (
              <div className={styles.mobileSupplierList}>
                {visibleSuppliers.map((supplier) => (
                  <article key={supplier.id} className={styles.mobileSupplierCard}>
                    <div className={styles.mobileSupplierHeader}>
                      <span className={styles.supplierAvatar}><SalesCustomerAvatar name={supplier.name} avatarUrl={supplier.avatarUrl} /></span>
                      <div>
                        <h3>{supplier.name}</h3>
                        <span className={supplier.outstandingBalance > 0 ? styles.statusDue : styles.statusClear}>
                          {supplier.outstandingBalance > 0 ? 'Por pagar' : 'Al día'}
                        </span>
                      </div>
                    </div>

                    <div className={styles.mobileContactList}>
                      <span><Phone aria-hidden="true" size={16} />{supplier.phone ?? 'Sin celular'}</span>
                      <span><Mail aria-hidden="true" size={16} />{supplier.email ?? 'Sin correo'}</span>
                      <span><PackageCheck aria-hidden="true" size={16} />{supplier.purchaseCount} compras</span>
                    </div>

                    <div className={styles.mobileBalance}>
                      <span>Saldo por pagar</span>
                      <strong>{formatCurrency(supplier.outstandingBalance)}</strong>
                    </div>

                    <div className={styles.mobileActions}>
                      <button type="button" onClick={() => handleOpenSupplierDetail(supplier.id)}><Eye aria-hidden="true" size={16} /> Detalle</button>
                      <button type="button" onClick={() => handleStartEditSupplier(supplier.id)}><Pencil aria-hidden="true" size={16} /> Editar</button>
                    </div>
                  </article>
                ))}
                {visibleSuppliers.length === 0 ? (
                  <div className={styles.mobileEmptyState}>
                    <strong>No encontramos proveedores</strong>
                    <span>Crea uno nuevo o cambia la búsqueda y los filtros.</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </RetailPageLayout>

        <SideDrawer
          bodyClassName={styles.detailDrawerBody}
          description="Compras, pagos y saldo del proveedor."
          footer={selectedSupplier ? (
            <DrawerActionFooter className={styles.detailFooter} layout="inline">
              <AppButton
                size="sm"
                startIcon={<Pencil aria-hidden="true" size={16} />}
                type="button"
                variant="secondary"
                onClick={() => handleStartEditSupplier(selectedSupplier.id)}
              >
                Editar proveedor
              </AppButton>
              <AppButton size="sm" type="button" onClick={() => setRetailDetailOpen(false)}>
                Listo
              </AppButton>
            </DrawerActionFooter>
          ) : null}
          isOpen={isRetailDetailOpen}
          panelClassName={styles.detailDrawer}
          title="Detalle del proveedor"
          onClose={() => setRetailDetailOpen(false)}
        >
          <div className={styles.drawerContent}>
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
              compact
              onRetry={() => void supplierDetailQuery.refetch()}
            />
            <SupplierSupplyHistoryPanel
              supplierName={selectedSupplier?.name ?? selectedSupplierSummary?.name ?? null}
              cancellingPurchaseId={cancelPurchaseMutation.isPending ? cancelPurchaseMutation.variables?.purchaseId ?? null : null}
              editingPurchaseId={updatePurchaseMutation.isPending ? updatePurchaseMutation.variables?.purchaseId ?? null : null}
              isLoading={supplierDetailQuery.isLoading}
              payingPurchaseId={registerPurchasePaymentMutation.isPending ? registerPurchasePaymentMutation.variables?.purchaseId ?? null : null}
              returningPurchaseId={createPurchaseReturnMutation.isPending ? createPurchaseReturnMutation.variables?.purchaseId ?? null : null}
              paymentError={purchaseActionError}
              purchaseHistory={selectedSupplier?.purchaseHistory ?? []}
              onCancelPurchase={handleCancelPurchase}
              onUpdatePurchase={handleUpdatePurchase}
              onDownloadReceipt={(purchaseId) => void handleDownloadPurchaseReceipt(purchaseId)}
              onDownloadCreditNote={(purchaseId, returnId) => void handleDownloadCreditNote(purchaseId, returnId)}
              onCreateReturn={handleCreatePurchaseReturn}
              onRegisterPayment={handleRegisterPurchasePayment}
            />
          </div>
        </SideDrawer>

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
            editingPurchaseId={
              updatePurchaseMutation.isPending
                ? updatePurchaseMutation.variables?.purchaseId ?? null
                : null
            }
            payingPurchaseId={
              registerPurchasePaymentMutation.isPending
                ? registerPurchasePaymentMutation.variables?.purchaseId ?? null
                : null
            }
            returningPurchaseId={
              createPurchaseReturnMutation.isPending
                ? createPurchaseReturnMutation.variables?.purchaseId ?? null
                : null
            }
            paymentError={purchaseActionError}
            purchaseHistory={selectedSupplier?.purchaseHistory ?? []}
            onCancelPurchase={handleCancelPurchase}
            onUpdatePurchase={handleUpdatePurchase}
            onDownloadReceipt={(purchaseId) => {
              void handleDownloadPurchaseReceipt(purchaseId)
            }}
            onDownloadCreditNote={(purchaseId, returnId) => {
              void handleDownloadCreditNote(purchaseId, returnId)
            }}
            onCreateReturn={handleCreatePurchaseReturn}
            onRegisterPayment={handleRegisterPurchasePayment}
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
