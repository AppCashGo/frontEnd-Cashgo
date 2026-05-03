import type { CashRegisterSession } from '@/modules/cash-register/types/cash-register'
import { getPaymentMethodLabel } from '@/modules/cash-register/utils/format-cash-register'
import type { CustomerSummary } from '@/modules/customers/types/customer'
import type {
  SaleCartItem,
  SalePaymentMethod,
  SaleReceipt,
} from '@/modules/sales/types/sale'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDate } from '@/shared/utils/format-date'
import styles from './SaleCartPanel.module.css'

type PaymentMode = 'FULL' | 'PARTIAL'

type SaleCartPanelProps = {
  cartItems: SaleCartItem[]
  totalItems: number
  subtotalAmount: number
  totalAmount: number
  discountTotal: number
  taxTotal: number
  paidAmount: number
  pendingBalance: number
  isSubmitting: boolean
  errorMessage: string | null
  completedSale: SaleReceipt | null
  currentCashRegisterSession: CashRegisterSession | null
  customers: CustomerSummary[]
  selectedCustomerId: string
  paymentMethod: SalePaymentMethod
  paymentMode: PaymentMode
  paymentReference: string
  paidAmountInput: string
  discountInput: string
  taxInput: string
  notes: string
  dueDate: string
  onIncreaseQuantity: (productId: string) => void
  onDecreaseQuantity: (productId: string) => void
  onRemoveProduct: (productId: string) => void
  onClearCart: () => void
  onFinalizeSale: () => void
  onCustomerChange: (value: string) => void
  onPaymentMethodChange: (value: SalePaymentMethod) => void
  onPaymentModeChange: (value: PaymentMode) => void
  onPaymentReferenceChange: (value: string) => void
  onPaidAmountInputChange: (value: string) => void
  onDiscountInputChange: (value: string) => void
  onTaxInputChange: (value: string) => void
  onNotesChange: (value: string) => void
  onDueDateChange: (value: string) => void
}

const paymentMethodOptions: SalePaymentMethod[] = [
  'CASH',
  'CARD',
  'TRANSFER',
  'DIGITAL_WALLET',
  'BANK_DEPOSIT',
  'CREDIT',
  'OTHER',
]

export function SaleCartPanel({
  cartItems,
  totalItems,
  subtotalAmount,
  totalAmount,
  discountTotal,
  taxTotal,
  paidAmount,
  pendingBalance,
  isSubmitting,
  errorMessage,
  completedSale,
  currentCashRegisterSession,
  customers,
  selectedCustomerId,
  paymentMethod,
  paymentMode,
  paymentReference,
  paidAmountInput,
  discountInput,
  taxInput,
  notes,
  dueDate,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemoveProduct,
  onClearCart,
  onFinalizeSale,
  onCustomerChange,
  onPaymentMethodChange,
  onPaymentModeChange,
  onPaymentReferenceChange,
  onPaidAmountInputChange,
  onDiscountInputChange,
  onTaxInputChange,
  onNotesChange,
  onDueDateChange,
}: SaleCartPanelProps) {
  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) ?? null
  const requiresCustomer = pendingBalance > 0
  const usingCashWithoutOpenRegister =
    paymentMethod === 'CASH' && currentCashRegisterSession === null

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Checkout</p>
          <h2 className={styles.title}>Review and register the sale</h2>
          <p className={styles.description}>
            Choose who is buying, define how much is paid now and keep the
            remaining balance under control.
          </p>
        </div>

        <button
          className={styles.secondaryButton}
          disabled={cartItems.length === 0 || isSubmitting}
          type="button"
          onClick={onClearCart}
        >
          Clear cart
        </button>
      </div>

      <div className={styles.statusRow}>
        <div className={styles.statusCard}>
          <span className={styles.statusLabel}>Cash register</span>
          <strong className={styles.statusValue}>
            {currentCashRegisterSession
              ? `Open · ${currentCashRegisterSession.responsibleUserName ?? 'Team'}`
              : 'Closed'}
          </strong>
        </div>

        <div className={styles.statusCard}>
          <span className={styles.statusLabel}>Collected now</span>
          <strong className={styles.statusValue}>{formatCurrency(paidAmount)}</strong>
        </div>
      </div>

      {completedSale ? (
        <div className={styles.successBanner} role="status">
          <p className={styles.successTitle}>Sale completed successfully</p>
          <p className={styles.successDescription}>
            {completedSale.saleNumber} was created on{' '}
            {formatDate(completedSale.createdAt)} for{' '}
            {formatCurrency(completedSale.total)}.
          </p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className={styles.errorBanner} role="alert">
          {errorMessage}
        </div>
      ) : null}

      {cartItems.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>The cart is waiting for products</p>
          <p className={styles.emptyDescription}>
            Add items from the catalog and this panel will turn into your
            checkout and payment workspace.
          </p>
        </div>
      ) : (
        <>
          <ul className={styles.cartList}>
            {cartItems.map((item) => {
              const canIncreaseQuantity = item.quantity < item.product.stock

              return (
                <li className={styles.cartItem} key={item.product.id}>
                  <div className={styles.cartItemCopy}>
                    <div className={styles.cartItemHeading}>
                      <h3 className={styles.cartItemName}>{item.product.name}</h3>
                      <button
                        className={styles.removeButton}
                        type="button"
                        onClick={() => onRemoveProduct(item.product.id)}
                      >
                        Remove
                      </button>
                    </div>

                    <p className={styles.cartItemMeta}>
                      {formatCurrency(item.product.price)} each
                    </p>
                  </div>

                  <div className={styles.cartItemFooter}>
                    <div className={styles.quantityControls}>
                      <button
                        className={styles.quantityButton}
                        type="button"
                        onClick={() => onDecreaseQuantity(item.product.id)}
                      >
                        -
                      </button>
                      <span className={styles.quantityValue}>{item.quantity}</span>
                      <button
                        className={styles.quantityButton}
                        disabled={!canIncreaseQuantity}
                        type="button"
                        onClick={() => onIncreaseQuantity(item.product.id)}
                      >
                        +
                      </button>
                    </div>

                    <strong className={styles.lineTotal}>
                      {formatCurrency(item.lineTotal)}
                    </strong>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className={styles.checkoutGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="sale-customer">
                Customer
              </label>
              <select
                className={styles.input}
                id="sale-customer"
                value={selectedCustomerId}
                onChange={(event) => onCustomerChange(event.target.value)}
              >
                <option value="">Walk-in sale</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.balance > 0
                      ? ` · balance ${formatCurrency(customer.balance)}`
                      : ''}
                  </option>
                ))}
              </select>
              {selectedCustomer ? (
                <p className={styles.helperText}>
                  {selectedCustomer.phone ?? selectedCustomer.email ?? 'No contact info'} ·
                  current balance {formatCurrency(selectedCustomer.balance)}
                </p>
              ) : null}
            </div>

            <div className={styles.paymentModeRow}>
              <button
                className={
                  paymentMode === 'FULL'
                    ? styles.paymentModeButtonActive
                    : styles.paymentModeButton
                }
                type="button"
                onClick={() => onPaymentModeChange('FULL')}
              >
                Full payment
              </button>
              <button
                className={
                  paymentMode === 'PARTIAL'
                    ? styles.paymentModeButtonActive
                    : styles.paymentModeButton
                }
                type="button"
                onClick={() => onPaymentModeChange('PARTIAL')}
              >
                Partial / credit
              </button>
            </div>

            <div className={styles.inlineFields}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="sale-payment-method">
                  Payment method
                </label>
                <select
                  className={styles.input}
                  id="sale-payment-method"
                  value={paymentMethod}
                  onChange={(event) =>
                    onPaymentMethodChange(event.target.value as SalePaymentMethod)
                  }
                >
                  {paymentMethodOptions.map((method) => (
                    <option key={method} value={method}>
                      {getPaymentMethodLabel(method)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="sale-paid-amount">
                  {paymentMode === 'FULL' ? 'Collected now' : 'Amount collected'}
                </label>
                <input
                  className={styles.input}
                  id="sale-paid-amount"
                  inputMode="decimal"
                  min="0"
                  placeholder={paymentMode === 'FULL' ? totalAmount.toString() : '0'}
                  step="0.01"
                  type="number"
                  value={paymentMode === 'FULL' ? totalAmount.toString() : paidAmountInput}
                  onChange={(event) => onPaidAmountInputChange(event.target.value)}
                  disabled={paymentMode === 'FULL'}
                />
              </div>
            </div>

            <div className={styles.inlineFields}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="sale-discount">
                  Discount
                </label>
                <input
                  className={styles.input}
                  id="sale-discount"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  type="number"
                  value={discountInput}
                  onChange={(event) => onDiscountInputChange(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="sale-tax">
                  Tax
                </label>
                <input
                  className={styles.input}
                  id="sale-tax"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  type="number"
                  value={taxInput}
                  onChange={(event) => onTaxInputChange(event.target.value)}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="sale-reference">
                Payment reference
              </label>
              <input
                className={styles.input}
                id="sale-reference"
                placeholder="Transfer code, terminal or note"
                type="text"
                value={paymentReference}
                onChange={(event) => onPaymentReferenceChange(event.target.value)}
              />
            </div>

            {pendingBalance > 0 ? (
              <div className={styles.inlineFields}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="sale-due-date">
                    Due date
                  </label>
                  <input
                    className={styles.input}
                    id="sale-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(event) => onDueDateChange(event.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <span className={styles.label}>Pending balance</span>
                  <div className={styles.balanceBox}>{formatCurrency(pendingBalance)}</div>
                </div>
              </div>
            ) : null}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="sale-notes">
                Notes
              </label>
              <textarea
                className={styles.textarea}
                id="sale-notes"
                placeholder="Add a note for the team or the customer."
                rows={3}
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
              />
            </div>

            {usingCashWithoutOpenRegister ? (
              <div className={styles.warningBanner}>
                You are collecting cash without an open register. The sale can
                still be created, but it will not be reconciled in today&apos;s
                cash session.
              </div>
            ) : null}

            {requiresCustomer && !selectedCustomer ? (
              <div className={styles.warningBanner}>
                A customer is required when the sale leaves a pending balance.
              </div>
            ) : null}
          </div>

          <div className={styles.footer} id="sale-cart">
            <div className={styles.summaryGrid}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Items in cart</span>
                <strong className={styles.summaryValue}>
                  {totalItems.toString()}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Subtotal</span>
                <strong className={styles.summaryValue}>
                  {formatCurrency(subtotalAmount)}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Discount</span>
                <strong className={styles.summaryValue}>
                  {formatCurrency(discountTotal)}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Tax</span>
                <strong className={styles.summaryValue}>
                  {formatCurrency(taxTotal)}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Total due</span>
                <strong className={styles.totalValue}>
                  {formatCurrency(totalAmount)}
                </strong>
              </div>
            </div>

            <button
              className={styles.primaryButton}
              disabled={
                cartItems.length === 0 ||
                isSubmitting ||
                (requiresCustomer && !selectedCustomer)
              }
              type="button"
              onClick={onFinalizeSale}
            >
              {isSubmitting ? 'Registering sale...' : 'Register sale'}
            </button>
          </div>
        </>
      )}
    </SurfaceCard>
  )
}
