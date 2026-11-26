import type { SupplierDetail } from '@/modules/suppliers/types/supplier'
import { CalendarClock, ChevronDown, ContactRound, Hash, Mail, Pencil, Phone, RefreshCw, Wallet } from 'lucide-react'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { AppButton } from '@/shared/components/ui/AppButton'
import { SalesCustomerAvatar } from '@/modules/sales/components/SalesVisuals'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDate } from '@/shared/utils/format-date'
import styles from './SupplierDetailPanel.module.css'

type SupplierDetailPanelProps = {
  compact?: boolean
  supplier: SupplierDetail | null
  isLoading: boolean
  errorMessage: string | null
  selectedSupplierName: string | null
  onEdit?: (supplier: SupplierDetail) => void
  onRetry: () => void
}

export function SupplierDetailPanel({
  compact = false,
  supplier,
  isLoading,
  errorMessage,
  selectedSupplierName,
  onEdit,
  onRetry,
}: SupplierDetailPanelProps) {
  const procurementTotal =
    supplier?.purchaseHistory.reduce((sum, purchase) => sum + purchase.total, 0) ?? 0
  const averageRestock =
    supplier && supplier.purchaseHistory.length > 0
      ? procurementTotal / supplier.purchaseHistory.length
      : 0
  const supplierName = supplier?.name ?? selectedSupplierName

  return (
    <SurfaceCard className={compact ? `${styles.card} ${styles.compactCard}` : styles.card}>
      <div className={styles.header}>
        <div className={styles.profileHeading}>
          <span className={styles.profileAvatar}>
            <SalesCustomerAvatar name={supplierName ?? 'Proveedor'} avatarUrl={supplier?.avatarUrl} />
          </span>
          <div>
            {!compact ? <p className={styles.eyebrow}>Perfil del proveedor</p> : null}
            <h3 className={styles.title}>
              {supplier?.name ?? selectedSupplierName ?? 'Selecciona un proveedor'}
            </h3>
          </div>
        </div>

        {supplier ? (
          <div className={styles.headerActions}>
            <span
              className={
                compact
                  ? supplier.outstandingBalance > 0 ? styles.balanceDue : styles.statusPillActive
                  : supplier.purchaseCount > 0 ? styles.statusPillActive : styles.statusPill
              }
            >
              {compact
                ? supplier.outstandingBalance > 0
                  ? `${formatCurrency(supplier.outstandingBalance)} por pagar`
                  : 'Al día'
                : supplier.purchaseCount > 0 ? 'Abastecimiento activo' : 'Sin historial'}
            </span>
            {onEdit ? (
              <AppButton
                size="sm"
                startIcon={<Pencil aria-hidden="true" size={16} />}
                type="button"
                variant="secondary"
                onClick={() => onEdit(supplier)}
              >
                Editar
              </AppButton>
            ) : null}
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <div className={styles.feedbackCard} role="alert">
          <p className={styles.feedbackTitle}>No pudimos cargar el proveedor</p>
          <p className={styles.feedbackDescription}>{errorMessage}</p>
          <AppButton
            size="sm"
            startIcon={<RefreshCw aria-hidden="true" size={16} />}
            type="button"
            variant="danger"
            onClick={onRetry}
          >
            Reintentar
          </AppButton>
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

      {!isLoading && !errorMessage && supplier && compact ? (
        <details className={styles.contactDetails}>
          <summary><ContactRound aria-hidden="true" /> Datos del proveedor <ChevronDown aria-hidden="true" /></summary>
          <div className={styles.detailsGrid}>
            {[
              { label: 'Correo', value: supplier.email, Icon: Mail },
              { label: 'Celular', value: supplier.phone, Icon: Phone },
              { label: 'Documento', value: supplier.documentNumber, Icon: Hash },
              { label: 'Última compra', value: supplier.lastPurchaseAt ? formatDate(supplier.lastPurchaseAt, 'es-CO') : null, Icon: CalendarClock },
              { label: 'Total comprado', value: formatCurrency(procurementTotal), Icon: Wallet },
            ].map(({ label, value, Icon }) => (
              <div className={styles.detailBlock} key={label}>
                <span className={styles.contactLabel}><Icon aria-hidden="true" /> {label}</span>
                <strong className={styles.detailValue}>{value ?? 'Sin registrar'}</strong>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {!isLoading && !errorMessage && supplier && !compact ? (
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
              <span className={styles.summaryLabel}>Reposición promedio</span>
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
              <span className={styles.detailLabel}>Teléfono</span>
              <strong className={styles.detailValue}>
                {supplier.phone ?? 'No registrado'}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Número de reposiciones</span>
              <strong className={styles.detailValue}>
                {supplier.purchaseCount.toString()}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Último abastecimiento</span>
              <strong className={styles.detailValue}>
                {supplier.lastPurchaseAt
                  ? formatDate(supplier.lastPurchaseAt, 'es-CO')
                  : 'Sin historial'}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Creado</span>
              <strong className={styles.detailValue}>
                {formatDate(supplier.createdAt, 'es-CO')}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Actualizado</span>
              <strong className={styles.detailValue}>
                {formatDate(supplier.updatedAt, 'es-CO')}
              </strong>
            </div>
          </div>
        </>
      ) : null}
    </SurfaceCard>
  )
}
