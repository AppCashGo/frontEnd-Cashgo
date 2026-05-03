import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  inventoryAdjustmentSchema,
  type InventoryAdjustmentFormValues,
} from '@/modules/inventory/schemas/inventory-adjustment-schema'
import type {
  InventoryAdjustmentInput,
  InventoryMovementType,
} from '@/modules/inventory/types/inventory'
import type { Product } from '@/modules/products/types/product'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './InventoryAdjustmentPanel.module.css'

type InventoryAdjustmentPanelProps = {
  products: Product[]
  isSubmitting: boolean
  submitErrorMessage: string | null
  onSubmit: (input: InventoryAdjustmentInput) => Promise<void>
}

const defaultValues: InventoryAdjustmentFormValues = {
  productId: '',
  type: 'IN',
  quantity: 1,
  reason: '',
}

function getQuantityLabel(movementType: InventoryMovementType) {
  return movementType === 'ADJUSTMENT' ? 'Target stock' : 'Units'
}

function getHelperText(
  movementType: InventoryMovementType,
  product: Product | null,
) {
  if (movementType === 'IN') {
    return product
      ? `Adds units on top of the current stock of ${product.stock.toString()}.`
      : 'Adds units to the selected product stock.'
  }

  if (movementType === 'OUT') {
    return product
      ? `Removes units from the current stock of ${product.stock.toString()}.`
      : 'Removes units from the selected product stock.'
  }

  return product
    ? `Sets the product stock to the exact value you enter instead of adding or subtracting from ${product.stock.toString()}.`
    : 'Sets the product stock to the exact value you enter.'
}

function normalizeReason(value: string | undefined) {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : undefined
}

export function InventoryAdjustmentPanel({
  products,
  isSubmitting,
  submitErrorMessage,
  onSubmit,
}: InventoryAdjustmentPanelProps) {
  const sortedProducts = [...products].sort((firstProduct, secondProduct) =>
    firstProduct.name.localeCompare(secondProduct.name),
  )
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<InventoryAdjustmentFormValues>({
    resolver: zodResolver(inventoryAdjustmentSchema),
    defaultValues,
  })
  const movementType = watch('type')
  const selectedProductId = watch('productId')
  const selectedProduct =
    sortedProducts.find((product) => product.id === selectedProductId) ?? null
  const quantityLabel = getQuantityLabel(movementType)
  const helperText = getHelperText(movementType, selectedProduct)
  const isDisabled = isSubmitting || sortedProducts.length === 0

  const submitAdjustment = handleSubmit(async (values) => {
    try {
      await onSubmit({
        productId: values.productId,
        type: values.type,
        quantity: values.quantity,
        reason: normalizeReason(values.reason),
      })

      reset(defaultValues)
    } catch (error) {
      setError('root', {
        message: getErrorMessage(
          error,
          'Unable to save the inventory movement right now. Please try again.',
        ),
      })
    }
  })

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Manual adjustment</p>
          <h3 className={styles.title}>Record a movement and sync stock instantly.</h3>
          <p className={styles.description}>
            Use this panel for replenishment, shrinkage, counts and manual stock
            corrections without leaving the inventory workspace.
          </p>
        </div>
      </div>

      {selectedProduct ? (
        <div className={styles.stockHighlight}>
          <span className={styles.stockLabel}>Current stock</span>
          <strong className={styles.stockValue}>
            {selectedProduct.stock.toString()}
          </strong>
          <span className={styles.stockProduct}>{selectedProduct.name}</span>
        </div>
      ) : null}

      <form className={styles.form} noValidate onSubmit={submitAdjustment}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="inventory-product">
            Product
          </label>
          <select
            aria-describedby={
              errors.productId ? 'inventory-product-error' : undefined
            }
            aria-invalid={Boolean(errors.productId)}
            className={styles.select}
            disabled={isDisabled}
            id="inventory-product"
            {...register('productId')}
          >
            <option value="">Select a product</option>
            {sortedProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - Current stock {product.stock.toString()}
              </option>
            ))}
          </select>
          {errors.productId ? (
            <p className={styles.errorMessage} id="inventory-product-error">
              {errors.productId.message}
            </p>
          ) : null}
        </div>

        <div className={styles.inlineFields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="inventory-type">
              Movement type
            </label>
            <select
              aria-describedby={errors.type ? 'inventory-type-error' : undefined}
              aria-invalid={Boolean(errors.type)}
              className={styles.select}
              disabled={isDisabled}
              id="inventory-type"
              {...register('type')}
            >
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
            </select>
            {errors.type ? (
              <p className={styles.errorMessage} id="inventory-type-error">
                {errors.type.message}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="inventory-quantity">
              {quantityLabel}
            </label>
            <input
              aria-describedby={
                errors.quantity ? 'inventory-quantity-error' : undefined
              }
              aria-invalid={Boolean(errors.quantity)}
              className={styles.input}
              disabled={isDisabled}
              id="inventory-quantity"
              inputMode="numeric"
              min="0"
              step="1"
              type="number"
              {...register('quantity')}
            />
            {errors.quantity ? (
              <p className={styles.errorMessage} id="inventory-quantity-error">
                {errors.quantity.message}
              </p>
            ) : null}
          </div>
        </div>

        <p className={styles.helperText}>{helperText}</p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="inventory-reason">
            Reason
          </label>
          <textarea
            aria-describedby={errors.reason ? 'inventory-reason-error' : undefined}
            aria-invalid={Boolean(errors.reason)}
            className={styles.textarea}
            disabled={isDisabled}
            id="inventory-reason"
            placeholder="Cycle count, damaged units, supplier restock..."
            rows={4}
            {...register('reason')}
          />
          {errors.reason ? (
            <p className={styles.errorMessage} id="inventory-reason-error">
              {errors.reason.message}
            </p>
          ) : null}
        </div>

        {submitErrorMessage || errors.root?.message ? (
          <div className={styles.errorBanner} role="alert">
            {errors.root?.message ?? submitErrorMessage}
          </div>
        ) : null}

        <button
          className={styles.primaryButton}
          disabled={isDisabled}
          type="submit"
        >
          {isSubmitting ? 'Saving movement...' : 'Save movement'}
        </button>
      </form>
    </SurfaceCard>
  )
}
