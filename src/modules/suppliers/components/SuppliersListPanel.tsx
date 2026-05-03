import type { SupplierSummary } from '@/modules/suppliers/types/supplier'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatDate } from '@/shared/utils/format-date'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './SuppliersListPanel.module.css'

type SuppliersListPanelProps = {
  suppliers: SupplierSummary[]
  selectedSupplierId: string | null
  searchValue: string
  totalCount: number
  isLoading: boolean
  isRefreshing: boolean
  errorMessage: string | null
  onRetry: () => void
  onSearchChange: (value: string) => void
  onSelectSupplier: (supplierId: string) => void
}

export function SuppliersListPanel({
  suppliers,
  selectedSupplierId,
  searchValue,
  totalCount,
  isLoading,
  isRefreshing,
  errorMessage,
  onRetry,
  onSearchChange,
  onSelectSupplier,
}: SuppliersListPanelProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Directorio de proveedores</p>
          <h3 className={styles.title}>
            Manten visibles los contactos y el historial de abastecimiento.
          </h3>
        </div>

        <div className={styles.headerMeta}>
          {isRefreshing && !isLoading ? (
            <span className={styles.refreshingLabel}>Actualizando...</span>
          ) : null}
          <span className={styles.countPill}>
            {suppliers.length.toString()} visibles / {totalCount.toString()} total
          </span>
        </div>
      </div>

      <label className={styles.searchField}>
        <span className={styles.searchLabel}>Buscar proveedores</span>
        <input
          className={styles.searchInput}
          type="search"
          name="supplier-search"
          placeholder="Busca por nombre, correo o telefono"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      {errorMessage ? (
        <div className={styles.feedbackCard} role="alert">
          <p className={styles.feedbackTitle}>No pudimos cargar los proveedores</p>
          <p className={styles.feedbackDescription}>{errorMessage}</p>
          <button className={styles.feedbackButton} type="button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className={styles.loadingState}>
          <p className={styles.loadingTitle}>Cargando proveedores...</p>
          <p className={styles.loadingDescription}>
            Trayendo contactos y señales de abastecimiento desde el servidor.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && suppliers.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No hay proveedores con esa busqueda</p>
          <p className={styles.emptyDescription}>
            Prueba otro nombre, telefono o correo para ver mas registros.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && suppliers.length > 0 ? (
        <div className={styles.list}>
          {suppliers.map((supplier) => (
            <button
              key={supplier.id}
              className={joinClassNames(
                styles.supplierButton,
                supplier.id === selectedSupplierId && styles.supplierButtonActive,
              )}
              type="button"
              onClick={() => onSelectSupplier(supplier.id)}
            >
              <div className={styles.supplierTopRow}>
                <div>
                  <p className={styles.supplierName}>{supplier.name}</p>
                  <p className={styles.supplierMeta}>
                    {supplier.email ?? supplier.phone ?? 'Sin informacion de contacto'}
                  </p>
                </div>

                <span
                  className={joinClassNames(
                    styles.statusPill,
                    supplier.purchaseCount > 0 && styles.statusPillActive,
                  )}
                >
                  {supplier.purchaseCount > 0
                    ? `${supplier.purchaseCount.toString()} reposiciones`
                    : 'Proveedor nuevo'}
                </span>
              </div>

              <div className={styles.supplierStats}>
                <span>
                  Ultimo abastecimiento:{' '}
                  <strong>
                    {supplier.lastPurchaseAt
                      ? formatDate(supplier.lastPurchaseAt)
                      : 'Sin historial'}
                  </strong>
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </SurfaceCard>
  )
}
