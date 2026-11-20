import { Link } from 'react-router-dom'
import { startTransition, useDeferredValue, useState } from 'react'
import { useCurrentCashRegisterQuery } from '@/modules/cash-register/hooks/use-cash-register-query'
import { CashRegisterFlowDrawer } from '@/modules/cash-register/components/CashRegisterFlowDrawer'
import { isCashSessionRequiredError } from '@/modules/cash-register/utils/is-cash-session-required-error'
import { useCustomersQuery } from '@/modules/customers/hooks/use-customers-query'
import { useProductsQuery } from '@/modules/products/hooks/use-products-query'
import type { Product } from '@/modules/products/types/product'
import { matchesProductSearch } from '@/modules/products/utils/matches-product-search'
import { RecentSalesPanel } from '@/modules/sales/components/RecentSalesPanel'
import { OfflineSalesQueuePanel } from '@/modules/sales/components/OfflineSalesQueuePanel'
import { SalesHistoryDrawer } from '@/modules/sales/components/SalesHistoryDrawer'
import { RetailSalesWorkspace } from '@/modules/sales/components/RetailSalesWorkspace'
import { RestaurantTablesWorkspace } from '@/modules/sales/components/RestaurantTablesWorkspace'
import { SaleCartPanel } from '@/modules/sales/components/SaleCartPanel'
import { SaleProductBrowser } from '@/modules/sales/components/SaleProductBrowser'
import {
  useCreateSaleMutation,
  useSalesQuery,
} from '@/modules/sales/hooks/use-create-sale-mutation'
import { useSaleCart } from '@/modules/sales/hooks/use-sale-cart'
import { useNetworkStatus } from '@/modules/sales/hooks/use-network-status'
import { useOfflineSales } from '@/modules/sales/hooks/use-offline-sales'
import type { SalePaymentMethod } from '@/modules/sales/types/sale'
import type { CreateSaleInput } from '@/modules/sales/types/sale'
import { createSaleIdempotencyKey } from '@/modules/sales/services/sales-api'
import { queueOfflineSale } from '@/modules/sales/services/offline-sales-queue'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { ApiError } from '@/shared/services/api-client'
import { routePaths } from '@/routes/route-paths'
import { useBusinessNavigationPreset } from '@/shared/hooks/use-business-navigation-preset'
import {
  getTodayDateInput,
  toDateOnlyRequestDate,
  toOperationDateTime,
} from '@/shared/utils/date-input'
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

function StandardSalesPage() {
  const user = useAuthSessionStore((state) => state.user)
  const isOnline = useNetworkStatus()
  const offlineSales = useOfflineSales(user?.businessId, user?.id)
  const [isHistoryOpen, setHistoryOpen] = useState(false)
  const [isCashRegisterFlowOpen, setCashRegisterFlowOpen] = useState(false)
  const [resumeHistoryAfterOpen, setResumeHistoryAfterOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('ALL')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('FULL')
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('CASH')
  const [paidAmountInput, setPaidAmountInput] = useState('')
  const [discountInput, setDiscountInput] = useState('0')
  const [taxInput, setTaxInput] = useState('0')
  const [paymentReference, setPaymentReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saleDate, setSaleDate] = useState(getTodayDateInput)
  const [dueDate, setDueDate] = useState('')
  const [offlineConfirmation, setOfflineConfirmation] = useState<string | null>(null)
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
    setProductQuantity,
  } = useSaleCart(products, {
    persistenceKey: user?.businessId
      ? `cashgo-sale-cart:${user.businessId}:standard`
      : undefined,
  })

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
    setSaleDate(getTodayDateInput())
    setDueDate('')
  }

  async function handleFinalizeSale() {
    if (cartItems.length === 0) {
      return
    }

    clearCheckoutFeedback()
    setOfflineConfirmation(null)

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

    let cashRegisterId = currentCashRegisterSession?.id
    if (isOnline) {
      try {
        const refreshedSession = await currentCashRegisterQuery.refetch()
        cashRegisterId = refreshedSession.data?.id
      } catch {
        // The network error is handled by the offline queue below.
      }
    }

    if (!cashRegisterId) {
      markCheckoutError('Debes abrir caja para registrar la venta.')
      setCashRegisterFlowOpen(true)
      return
    }

    if (!user?.businessId || !user.id) {
      markCheckoutError('No pudimos identificar el negocio activo para guardar la venta.')
      return
    }
    const businessId = user.businessId
    const userId = user.id

    const saleInput: CreateSaleInput & { idempotencyKey: string } = {
      idempotencyKey: createSaleIdempotencyKey(),
      items: cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      customerId: normalizeOptionalText(selectedCustomerId),
      cashRegisterId,
      discountTotal,
      taxTotal,
      notes: normalizeOptionalText(notes),
      saleDate: toOperationDateTime(saleDate),
      dueDate:
        pendingBalance > 0 && dueDate
          ? toDateOnlyRequestDate(dueDate)
          : undefined,
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
    }

    async function saveInOfflineQueue() {
      await queueOfflineSale({
        businessId,
        userId,
        input: saleInput,
        total: totalAmount,
        itemCount: totalItems,
      })
      clearCart()
      resetCheckoutControls()
      setOfflineConfirmation(
        `La venta por ${formatCurrency(totalAmount)} quedó pendiente y se sincronizará automáticamente al recuperar internet.`,
      )
    }

    if (!isOnline) {
      try {
        await saveInOfflineQueue()
      } catch (error) {
        markCheckoutError(
          getErrorMessage(error, 'No pudimos guardar la venta en este dispositivo.'),
        )
      }
      return
    }

    try {
      const sale = await createSaleMutation.mutateAsync(saleInput)

      completeSale(sale)
      resetCheckoutControls()
    } catch (error) {
      if (error instanceof ApiError && error.isNetworkError) {
        try {
          await saveInOfflineQueue()
        } catch (storageError) {
          markCheckoutError(
            getErrorMessage(
              storageError,
              'Se perdió la conexión y no pudimos guardar la venta localmente.',
            ),
          )
        }
        return
      }
      if (isCashSessionRequiredError(error)) {
        markCheckoutError(
          'La caja se cerró antes de confirmar. Ábrela y confirma nuevamente.',
        )
        setCashRegisterFlowOpen(true)
        return
      }
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
          <p className={styles.eyebrow}>Nueva venta</p>
          <h2 className={styles.title}>
            Registra cada venta con un flujo POS más rápido y completo.
          </h2>
          <p className={styles.description}>
            Busca productos, agrégalos en segundos, elige cuánto paga el cliente
            ahora y controla saldo, cliente y caja desde una sola vista.
          </p>

          <div className={styles.heroActions}>
            <Link className={styles.primaryLink} to={routePaths.movements}>
              {currentCashRegisterSession ? 'Caja abierta' : 'Abrir caja'}
            </Link>
            <Link className={styles.ghostLink} to={routePaths.expenses}>
              Nuevo gasto
            </Link>
            <Link className={styles.ghostLink} to={routePaths.products}>
              Crear producto
            </Link>
          </div>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatLabel}>Productos encontrados</span>
            <strong className={styles.heroStatValue}>
              {filteredProducts.length.toString()}
            </strong>
          </div>

          <div className={styles.heroStat}>
            <span className={styles.heroStatLabel}>Ítems en carrito</span>
            <strong className={styles.heroStatValue}>
              {totalItems.toString()}
            </strong>
          </div>

          <div className={styles.heroStat}>
            <span className={styles.heroStatLabel}>Total a pagar</span>
            <strong className={styles.heroStatValue}>
              {formatCurrency(totalAmount)}
            </strong>
          </div>

          <div className={styles.heroStat}>
            <span className={styles.heroStatLabel}>Saldo pendiente</span>
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
                    'No pudimos cargar el catálogo actual. Intenta otra vez.',
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
                    'No pudimos cargar las ventas recientes en este momento.',
                  )
                : null
            }
            isLoading={salesQuery.isLoading}
            sales={salesQuery.data ?? []}
            onRetry={() => {
              void salesQuery.refetch()
            }}
            onManage={() => setHistoryOpen(true)}
          />
        </div>

        <SaleCartPanel
          cartItems={cartItems}
          completedSale={completedSale}
          offlineConfirmation={offlineConfirmation}
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
          onQuantityChange={setProductQuantity}
          onNotesChange={setNotes}
          onPaidAmountInputChange={setPaidAmountInput}
          onPaymentMethodChange={setPaymentMethod}
          onPaymentModeChange={setPaymentMode}
          onPaymentReferenceChange={setPaymentReference}
          onRemoveProduct={removeProduct}
          onTaxInputChange={setTaxInput}
        />
      </div>
      <OfflineSalesQueuePanel
        isOnline={isOnline}
        isSyncing={offlineSales.isSyncing}
        records={offlineSales.records}
        onRetry={(id) => void offlineSales.retry(id)}
        onSynchronize={() => void offlineSales.synchronize()}
      />
      <SalesHistoryDrawer
        isOpen={isHistoryOpen && !isCashRegisterFlowOpen}
        sales={salesQuery.data ?? []}
        onClose={() => setHistoryOpen(false)}
        onCashSessionRequired={() => {
          setResumeHistoryAfterOpen(true)
          setCashRegisterFlowOpen(true)
        }}
      />
      <CashRegisterFlowDrawer
        isOpen={isCashRegisterFlowOpen}
        onClose={() => setCashRegisterFlowOpen(false)}
        onOpened={() => {
          setCashRegisterFlowOpen(false)
          if (resumeHistoryAfterOpen) {
            setResumeHistoryAfterOpen(false)
            setHistoryOpen(true)
          }
        }}
      />
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
