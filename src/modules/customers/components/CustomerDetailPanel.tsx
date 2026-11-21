import type { CustomerDetail } from '@/modules/customers/types/customer'
import { RefreshCw, UserRound } from 'lucide-react'
import { AppButton } from '@/shared/components/ui/AppButton'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDate } from '@/shared/utils/format-date'
import styles from './CustomerDetailPanel.module.css'

type CustomerDetailPanelProps = {
  customer: CustomerDetail | null
  isLoading: boolean
  errorMessage: string | null
  selectedCustomerName: string | null
  onRetry: () => void
}

export function CustomerDetailPanel({
  customer,
  isLoading,
  errorMessage,
  selectedCustomerName,
  onRetry,
}: CustomerDetailPanelProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headingGroup}>
          <span className={styles.headerIcon} aria-hidden="true">
            <UserRound size={20} />
          </span>
          <div>
            <p className={styles.eyebrow}>Perfil del cliente</p>
            <h3 className={styles.title}>
              {customer?.name ?? selectedCustomerName ?? 'Selecciona un cliente'}
            </h3>
          </div>
        </div>

        {customer ? (
          <span
            className={
              customer.balance > 0 ? styles.balancePillAlert : styles.balancePill
            }
          >
            {customer.balance > 0 ? 'Saldo pendiente' : 'Al día'}
          </span>
        ) : null}
      </div>

      {errorMessage ? (
        <div className={styles.feedbackCard} role="alert">
          <p className={styles.feedbackTitle}>No pudimos cargar el cliente</p>
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
          <p className={styles.loadingTitle}>Cargando cliente...</p>
          <p className={styles.loadingDescription}>
            Consultando compras, datos de contacto y saldo pendiente.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && !customer ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Elige un cliente para ver el detalle</p>
          <p className={styles.emptyDescription}>
            Selecciona una persona del directorio para consultar su contacto,
            cartera y actividad de compra reciente.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && customer ? (
        <>
          <div className={styles.balanceCard}>
            <span className={styles.balanceLabel}>Saldo pendiente</span>
            <strong className={styles.balanceValue}>
              {formatCurrency(customer.balance)}
            </strong>
            <p className={styles.balanceHint}>
              {customer.balance > 0
                ? 'Este cliente tiene un saldo pendiente que requiere seguimiento.'
                : 'Este cliente no tiene cuentas pendientes actualmente.'}
            </p>
          </div>

          <div className={styles.detailsGrid}>
            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Correo electrónico</span>
              <strong className={styles.detailValue}>
                {customer.email ?? 'No registrado'}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Teléfono</span>
              <strong className={styles.detailValue}>
                {customer.phone ?? 'No registrado'}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Número de compras</span>
              <strong className={styles.detailValue}>
                {customer.purchaseCount.toString()}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Última compra</span>
              <strong className={styles.detailValue}>
                {customer.lastPurchaseAt
                  ? formatDate(customer.lastPurchaseAt, 'es-CO')
                  : 'Sin compras registradas'}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Creado</span>
              <strong className={styles.detailValue}>
                {formatDate(customer.createdAt, 'es-CO')}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Actualizado</span>
              <strong className={styles.detailValue}>
                {formatDate(customer.updatedAt, 'es-CO')}
              </strong>
            </div>
          </div>
        </>
      ) : null}
    </SurfaceCard>
  )
}
