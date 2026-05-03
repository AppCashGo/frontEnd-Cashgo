import { Link } from 'react-router-dom'
import { startTransition, useDeferredValue, useState } from 'react'
import { useCurrentCashRegisterQuery } from '@/modules/cash-register/hooks/use-cash-register-query'
import { useCustomersQuery } from '@/modules/customers/hooks/use-customers-query'
import { useProductsQuery } from '@/modules/products/hooks/use-products-query'
import type { Product } from '@/modules/products/types/product'
import { matchesProductSearch } from '@/modules/products/utils/matches-product-search'
import { RecentSalesPanel } from '@/modules/sales/components/RecentSalesPanel'
import { RetailSalesWorkspace } from '@/modules/sales/components/RetailSalesWorkspace'
import { RestaurantTablesWorkspace } from '@/modules/sales/components/RestaurantTablesWorkspace'
import { SaleCartPanel } from '@/modules/sales/components/SaleCartPanel'
import { SaleProductBrowser } from '@/modules/sales/components/SaleProductBrowser'
import {
  useCreateSaleMutation,
  useSalesQuery,
} from '@/modules/sales/hooks/use-create-sale-mutation'
import { useSaleCart } from '@/modules/sales/hooks/use-sale-cart'
import type { SalePaymentMethod } from '@/modules/sales/types/sale'
import { routePaths } from '@/routes/route-paths'
import { useBusinessNavigationPreset } from '@/shared/hooks/use-business-navigation-preset'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './SalesPage.module.css'

type InventoryFilter = 'ALL' | 'READY' | 'LOW' | 'OUT'
type PaymentMode = 'FULL' | 'PARTIAL'

function sortProductsForPos(firstProduct: Product, secondProduct: Product) {
  const stockPriority =
    Number(secondProduct.stock > 0) - Number(firstProduct.stock > 0)

  if (stockPriority !== 0) {
    return stockPriority
  }

  return firstProduct.name.localeCompare(secondProduct.name)
}

function filterProductsByInventoryState(
  products: Product[],
  activeFilter: InventoryFilter,
) {
  return products.filter((product) => {
    const threshold = Math.max(product.minStock, 5)

    if (activeFilter === 'READY') {
      return product.stock > threshold
    }

    if (activeFilter === 'LOW') {
      return product.stock > 0 && product.stock <= threshold
    }

    if (activeFilter === 'OUT') {
      return product.stock === 0
    }

    return true
  })
}

function parseAmountInput(value: string) {
  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) ? Math.max(parsedValue, 0) : 0
}

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.min(Math.max(value, minValue), maxValue)
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function getTodayDateInput() {
  return new Date().toISOString().slice(0, 10)
}

function StandardSalesPage() {
  const [searchValue, setSearchValue] = useState('')
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('ALL')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('FULL')
  const [paymentMethod, setPaymentMethod] =
    useState<SalePaymentMethod>('CASH')
  const [paidAmountInput, setPaidAmountInput] = useState('')
  const [discountInput, setDiscountInput] = useState('0')
  const [taxInput, setTaxInput] = useState('0')
  const [paymentReference, setPaymentReference] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState(getTodayDateInput)
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase())

  const productsQuery = useProductsQuery()
  const customersQuery = useCustomersQuery()
  const salesQuery = useSalesQuery()
  const currentCashRegisterQuery = useCurrentCashRegisterQuery()
  const createSaleMutation = useCreateSaleMutation()
  const products = [...(productsQuery.data ?? [])].sort(sortProductsForPos)
  const {
    cartItems,
    cartQuantitiesByProductId,
    checkoutErrorMessage,
    completedSale,
    totalItems,
    totalAmount: subtotalAmount,
    addProduct,
    clearCart,
    clearCheckoutFeedback,
    completeSale,
    decreaseProductQuantity,
    increaseProductQuantity,
    markCheckoutError,
    removeProduct,
  } = useSaleCart(products)

  const filteredProducts = filterProductsByInventoryState(
    products.filter((product) =>
      matchesProductSearch(product, deferredSearchValue),
    ),
    inventoryFilter,
  )

  const discountTotal = parseAmountInput(discountInput)
  const taxTotal = parseAmountInput(taxInput)
  const totalAmount = Math.max(subtotalAmount + taxTotal - discountTotal, 0)
  const paidAmount =
    paymentMode === 'FULL'
      ? totalAmount
      : clamp(parseAmountInput(paidAmountInput), 0, totalAmount)
  const pendingBalance = Math.max(totalAmount - paidAmount, 0)
  const currentCashRegisterSession = currentCashRegisterQuery.data ?? null

  function handleSearchChange(value: string) {
    startTransition(() => {
      setSearchValue(value)
    })
  }

  function resetCheckoutControls() {
    setSelectedCustomerId('')
    setPaymentMode('FULL')
    setPaymentMethod('CASH')
    setPaidAmountInput('')
    setDiscountInput('0')
    setTaxInput('0')
    setPaymentReference('')
    setNotes('')
    setDueDate(getTodayDateInput())
  }

  async function handleFinalizeSale() {
    if (cartItems.length === 0) {
      return
    }

    clearCheckoutFeedback()

    const stockMismatchItem = cartItems.find(
      (item) => item.quantity > item.product.stock,
    )

    if (stockMismatchItem) {
      markCheckoutError(
        `${stockMismatchItem.product.name} no longer has enough stock for this sale.`,
      )
      return
    }

    if (pendingBalance > 0 && selectedCustomerId.trim().length === 0) {
      markCheckoutError(
        'Select a customer before saving a sale with a pending balance.',
      )
      return
    }

    try {
      const sale = await createSaleMutation.mutateAsync({
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        customerId: normalizeOptionalText(selectedCustomerId),
        cashRegisterId: currentCashRegisterSession?.id,
        discountTotal,
        taxTotal,
        notes: normalizeOptionalText(notes),
        dueDate: pendingBalance > 0 ? dueDate : undefined,
        payments:
          paidAmount > 0
            ? [
                {
                  method: paymentMethod,
                  amount: paidAmount,
                  reference: normalizeOptionalText(paymentReference),
                },
              ]
            : [],
      })

      completeSale(sale)
      resetCheckoutControls()
    } catch (error) {
      markCheckoutError(
        getErrorMessage(
          error,
          'Unable to finalize the sale right now. Please try again.',
        ),
      )
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>New sale</p>
          <h2 className={styles.title}>
            Register each sale with a faster, sharper and more complete POS flow.
          </h2>
          <p className={styles.description}>
            Search products, add them in seconds, choose how much the customer
            pays now and keep the balance, customer and cash register under
            control from one responsive workspace.
          </p>

          <div className={styles.heroActions}>
            <Link className={styles.primaryLink} to={routePaths.movements}>
              {currentCashRegisterSession ? 'Cash register open' : 'Open cash register'}
            </Link>
            <Link className={styles.ghostLink} to={routePaths.expenses}>
              New expense
            </Link>
            <Link className={styles.ghostLink} to={routePaths.products}>
              Create product
            </Link>
          </div>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatLabel}>Matching products</span>
            <strong className={styles.heroStatValue}>
              {filteredProducts.length.toString()}
            </strong>
          </div>

          <div className={styles.heroStat}>
            <span className={styles.heroStatLabel}>Items in cart</span>
            <strong className={styles.heroStatValue}>
              {totalItems.toString()}
            </strong>
          </div>

          <div className={styles.heroStat}>
            <span className={styles.heroStatLabel}>Total due</span>
            <strong className={styles.heroStatValue}>
              {formatCurrency(totalAmount)}
            </strong>
          </div>

          <div className={styles.heroStat}>
            <span className={styles.heroStatLabel}>Pending balance</span>
            <strong className={styles.heroStatValue}>
              {formatCurrency(pendingBalance)}
            </strong>
          </div>
        </div>
      </section>

      <div className={styles.workspace}>
        <div className={styles.primaryColumn}>
          <SaleProductBrowser
            activeFilter={inventoryFilter}
            cartQuantitiesByProductId={cartQuantitiesByProductId}
            errorMessage={
              productsQuery.isError
                ? getErrorMessage(
                    productsQuery.error,
                    'Unable to load the current catalog. Please try again.',
                  )
                : null
            }
            isLoading={productsQuery.isLoading}
            products={filteredProducts}
            searchValue={searchValue}
            totalProductsCount={products.length}
            onAddProduct={addProduct}
            onFilterChange={setInventoryFilter}
            onRetry={() => {
              void productsQuery.refetch()
            }}
            onSearchChange={handleSearchChange}
          />

          <RecentSalesPanel
            errorMessage={
              salesQuery.isError
                ? getErrorMessage(
                    salesQuery.error,
                    'Unable to load recent sales right now.',
                  )
                : null
            }
            isLoading={salesQuery.isLoading}
            sales={salesQuery.data ?? []}
            onRetry={() => {
              void salesQuery.refetch()
            }}
          />
        </div>

        <SaleCartPanel
          cartItems={cartItems}
          completedSale={completedSale}
          currentCashRegisterSession={currentCashRegisterSession}
          customers={customersQuery.data ?? []}
          discountInput={discountInput}
          discountTotal={discountTotal}
          dueDate={dueDate}
          errorMessage={checkoutErrorMessage}
          isSubmitting={createSaleMutation.isPending}
          notes={notes}
          paidAmount={paidAmount}
          paidAmountInput={paidAmountInput}
          paymentMethod={paymentMethod}
          paymentMode={paymentMode}
          paymentReference={paymentReference}
          pendingBalance={pendingBalance}
          selectedCustomerId={selectedCustomerId}
          subtotalAmount={subtotalAmount}
          taxInput={taxInput}
          taxTotal={taxTotal}
          totalAmount={totalAmount}
          totalItems={totalItems}
          onClearCart={clearCart}
          onCustomerChange={setSelectedCustomerId}
          onDecreaseQuantity={decreaseProductQuantity}
          onDiscountInputChange={setDiscountInput}
          onDueDateChange={setDueDate}
          onFinalizeSale={handleFinalizeSale}
          onIncreaseQuantity={increaseProductQuantity}
          onNotesChange={setNotes}
          onPaidAmountInputChange={setPaidAmountInput}
          onPaymentMethodChange={setPaymentMethod}
          onPaymentModeChange={setPaymentMode}
          onPaymentReferenceChange={setPaymentReference}
          onRemoveProduct={removeProduct}
          onTaxInputChange={setTaxInput}
        />
      </div>
    </div>
  )
}

export function SalesPage() {
  const navigationPreset = useBusinessNavigationPreset()

  if (navigationPreset === 'retail') {
    return <RetailSalesWorkspace />
  }

  if (navigationPreset === 'restaurant') {
    return <RestaurantTablesWorkspace />
  }

  return <StandardSalesPage />
}
