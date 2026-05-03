import type { CustomerDetail } from '@/modules/customers/types/customer'
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
        <div>
          <p className={styles.eyebrow}>Customer profile</p>
          <h3 className={styles.title}>
            {customer?.name ?? selectedCustomerName ?? 'Select a customer'}
          </h3>
        </div>

        {customer ? (
          <span
            className={
              customer.balance > 0 ? styles.balancePillAlert : styles.balancePill
            }
          >
            {customer.balance > 0 ? 'Outstanding' : 'Up to date'}
          </span>
        ) : null}
      </div>

      {errorMessage ? (
        <div className={styles.feedbackCard} role="alert">
          <p className={styles.feedbackTitle}>Unable to load the customer profile</p>
          <p className={styles.feedbackDescription}>{errorMessage}</p>
          <button className={styles.feedbackButton} type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className={styles.loadingState}>
          <p className={styles.loadingTitle}>Loading customer profile...</p>
          <p className={styles.loadingDescription}>
            Bringing in purchase history, contact details and balance data.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && !customer ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Choose a customer to inspect the record</p>
          <p className={styles.emptyDescription}>
            Select someone from the directory to reveal CRM context and recent
            purchase activity.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && customer ? (
        <>
          <div className={styles.balanceCard}>
            <span className={styles.balanceLabel}>Outstanding balance</span>
            <strong className={styles.balanceValue}>
              {formatCurrency(customer.balance)}
            </strong>
            <p className={styles.balanceHint}>
              {customer.balance > 0
                ? 'This customer currently has an unpaid balance to follow up on.'
                : 'This customer has no pending balance right now.'}
            </p>
          </div>

          <div className={styles.detailsGrid}>
            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Email</span>
              <strong className={styles.detailValue}>
                {customer.email ?? 'Not registered'}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Phone</span>
              <strong className={styles.detailValue}>
                {customer.phone ?? 'Not registered'}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Purchase count</span>
              <strong className={styles.detailValue}>
                {customer.purchaseCount.toString()}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Last purchase</span>
              <strong className={styles.detailValue}>
                {customer.lastPurchaseAt
                  ? formatDate(customer.lastPurchaseAt)
                  : 'No purchases yet'}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Created</span>
              <strong className={styles.detailValue}>
                {formatDate(customer.createdAt)}
              </strong>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Updated</span>
              <strong className={styles.detailValue}>
                {formatDate(customer.updatedAt)}
              </strong>
            </div>
          </div>
        </>
      ) : null}
    </SurfaceCard>
  )
}
