import type { CustomerSummary } from '@/modules/customers/types/customer'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDate } from '@/shared/utils/format-date'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './CustomersListPanel.module.css'

type CustomersListPanelProps = {
  customers: CustomerSummary[]
  selectedCustomerId: string | null
  searchValue: string
  totalCount: number
  isLoading: boolean
  isRefreshing: boolean
  errorMessage: string | null
  onRetry: () => void
  onSearchChange: (value: string) => void
  onSelectCustomer: (customerId: string) => void
}

export function CustomersListPanel({
  customers,
  selectedCustomerId,
  searchValue,
  totalCount,
  isLoading,
  isRefreshing,
  errorMessage,
  onRetry,
  onSearchChange,
  onSelectCustomer,
}: CustomersListPanelProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Customer directory</p>
          <h3 className={styles.title}>
            Keep balances, contact context and recent activity in one place.
          </h3>
        </div>

        <div className={styles.headerMeta}>
          {isRefreshing && !isLoading ? (
            <span className={styles.refreshingLabel}>Refreshing...</span>
          ) : null}
          <span className={styles.countPill}>
            {customers.length.toString()} visible / {totalCount.toString()} total
          </span>
        </div>
      </div>

      <label className={styles.searchField}>
        <span className={styles.searchLabel}>Search customers</span>
        <input
          className={styles.searchInput}
          type="search"
          name="customer-search"
          placeholder="Search by name, email or phone"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      {errorMessage ? (
        <div className={styles.feedbackCard} role="alert">
          <p className={styles.feedbackTitle}>Unable to load customers</p>
          <p className={styles.feedbackDescription}>{errorMessage}</p>
          <button className={styles.feedbackButton} type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className={styles.loadingState}>
          <p className={styles.loadingTitle}>Loading customer records...</p>
          <p className={styles.loadingDescription}>
            Pulling CRM data and account balances from the server.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && customers.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No customers match the current search</p>
          <p className={styles.emptyDescription}>
            Try another name, phone number or email to reveal more records.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && customers.length > 0 ? (
        <div className={styles.list}>
          {customers.map((customer) => (
            <button
              key={customer.id}
              className={joinClassNames(
                styles.customerButton,
                customer.id === selectedCustomerId && styles.customerButtonActive,
              )}
              type="button"
              onClick={() => onSelectCustomer(customer.id)}
            >
              <div className={styles.customerTopRow}>
                <div>
                  <p className={styles.customerName}>{customer.name}</p>
                  <p className={styles.customerMeta}>
                    {customer.email ?? customer.phone ?? 'No contact information yet'}
                  </p>
                </div>

                <span
                  className={joinClassNames(
                    styles.balancePill,
                    customer.balance > 0 && styles.balancePillAlert,
                  )}
                >
                  {formatCurrency(customer.balance)}
                </span>
              </div>

              <div className={styles.customerStats}>
                <span>
                  Purchases: <strong>{customer.purchaseCount.toString()}</strong>
                </span>
                <span>
                  Last purchase:{' '}
                  <strong>
                    {customer.lastPurchaseAt
                      ? formatDate(customer.lastPurchaseAt)
                      : 'No purchases yet'}
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
