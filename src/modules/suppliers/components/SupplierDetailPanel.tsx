import type { SupplierDetail } from '@/modules/suppliers/types/supplier'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDate } from '@/shared/utils/format-date'
import styles from './SupplierDetailPanel.module.css'

type SupplierDetailPanelProps = {
  supplier: SupplierDetail | null
  isLoading: boolean
  errorMessage: string | null
  selectedSupplierName: string | null
  onRetry: () => void
}

export function SupplierDetailPanel({
  supplier,
  isLoading,
  errorMessage,
  selectedSupplierName,
  onRetry,
}: SupplierDetailPanelProps) {
  const procurementTotal =
    supplier?.purchaseHistory.reduce((sum, purchase) => sum + purchase.total, 0) ?? 0
  const averageRestock =
    supplier && supplier.purchaseHistory.length > 0
      ? procurementTotal / supplier.purchaseHistory.length
      : 0

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Perfil del proveedor</p>
          <h3 className={styles.title}>
            {supplier?.name ?? selectedSupplierName ?? 'Selecciona un proveedor'}
          </h3>
        </div>

        {supplier ? (
          <span
            className={
              supplier.purchaseCount > 0 ? styles.statusPillActive : styles.statusPill
            }
          >
            {supplier.purchaseCount > 0 ? 'Abastecimiento activo' : 'Sin historial'}
          </span>
        ) : null}
      </div>

      {errorMessage ? (
        <div className={styles.feedbackCard} role="alert">
          <p className={styles.feedbackTitle}>No pudimos cargar el proveedor</p>
          <p className={styles.feedbackDescription}>{errorMessage}</p>
          <button className={styles.feedbackButton} type="button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className={styles.loadingState}>
          <p className={styles.loadingTitle}>Cargando proveedor...</p>
          <p className={styles.loadingDescription}>
            Trayendo historial de abastecimiento, contacto y contexto de compras.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && !supplier ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Elige un proveedor para ver el detalle</p>
          <p className={styles.emptyDescription}>
            Selecciona un proveedor del directorio para ver el contacto y su
            contexto de abastecimiento.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && supplier ? (
        <>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Volumen comprado</span>
              <strong className={styles.summaryValue}>
                {formatCurrency(procurementTotal)}
              </strong>
              <p className={styles.summaryHint}>
                Valor total de abastecimiento registrado para este proveedor.
              </p>
            </div>

            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Reposicion promedio</span>
              <strong className={styles.summaryValue}>
                {formatCurrency(averageRestock)}
              </strong>
              <p className={styles.summaryHint}>
                Ticket promedio de compra en el historial del proveedor.
              </p>
            </div>
          </div>

          <div className={styles.detailsGrid}>
            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Email</span>
              <strong className={styles.detailValue}>
                {supplier.email ?? 'No registrado'}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Telefono</span>
              <strong className={styles.detailValue}>
                {supplier.phone ?? 'No registrado'}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Numero de reposiciones</span>
              <strong className={styles.detailValue}>
                {supplier.purchaseCount.toString()}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Ultimo abastecimiento</span>
              <strong className={styles.detailValue}>
                {supplier.lastPurchaseAt
                  ? formatDate(supplier.lastPurchaseAt)
                  : 'Sin historial'}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Creado</span>
              <strong className={styles.detailValue}>
                {formatDate(supplier.createdAt)}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Actualizado</span>
              <strong className={styles.detailValue}>
                {formatDate(supplier.updatedAt)}
              </strong>
            </div>
          </div>
        </>
      ) : null}
    </SurfaceCard>
  )
}
