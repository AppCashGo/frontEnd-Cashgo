import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  productFormSchema,
  type ProductFormValues,
} from '@/modules/products/schemas/product-form-schema'
import type {
  Product,
  ProductMutationInput,
} from '@/modules/products/types/product'
import {
  getProductUnitLabel,
  productUnitOptions,
} from '@/modules/products/utils/product-unit-options'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { ApiError } from '@/shared/services/api-client'
import styles from './ProductFormPanel.module.css'

type ProductFormPanelProps = {
  product: Product | null
  isSubmitting: boolean
  onStartCreate: () => void
  onSubmit: (input: ProductMutationInput) => Promise<void>
}

function getDefaultValues(product: Product | null): ProductFormValues {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    cost: product?.cost ?? 0,
    price: product?.price ?? 0,
    stock: product?.stock ?? 0,
    minStock: product?.minStock ?? 0,
    unit: product?.unit ?? 'UNIT',
    isActive: product?.isActive ?? true,
  }
}

function normalizeOptionalText(value: string | undefined) {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : undefined
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Unable to save the product right now. Please try again.'
}

export function ProductFormPanel({
  product,
  isSubmitting,
  onStartCreate,
  onSubmit,
}: ProductFormPanelProps) {
  const isEditing = product !== null
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: getDefaultValues(product),
  })

  useEffect(() => {
    reset(getDefaultValues(product))
  }, [product, reset])

  const submitProduct = handleSubmit(async (values) => {
    try {
      await onSubmit({
        name: values.name.trim(),
        description: normalizeOptionalText(values.description),
        sku: normalizeOptionalText(values.sku),
        barcode: normalizeOptionalText(values.barcode),
        cost: values.cost,
        price: values.price,
        stock: values.stock,
        minStock: values.minStock,
        unit: values.unit,
        isActive: values.isActive,
      })

      if (!isEditing) {
        reset(getDefaultValues(null))
      }
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error),
      })
    }
  })

  function handleReset() {
    if (isEditing) {
      onStartCreate()
      return
    }

    reset(getDefaultValues(null))
  }

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {isEditing ? 'Edit product' : 'Create product'}
          </p>
          <h2 className={styles.title}>
            {isEditing ? product.name : 'Add a new product to your catalog'}
          </h2>
          <p className={styles.description}>
            {isEditing
              ? `Update pricing, stock thresholds and SKU details for ${getProductUnitLabel(product.unit).toLowerCase()} sales.`
              : 'Use a compact form to keep your catalog, stock thresholds and selling units ready for daily operations.'}
          </p>
        </div>

        <button
          className={styles.secondaryButton}
          type="button"
          onClick={handleReset}
        >
          {isEditing ? 'Switch to create' : 'Clear form'}
        </button>
      </div>

      <form className={styles.form} noValidate onSubmit={submitProduct}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="product-name">
            Product name
          </label>
          <input
            aria-describedby={errors.name ? 'product-name-error' : undefined}
            aria-invalid={Boolean(errors.name)}
            className={styles.input}
            id="product-name"
            placeholder="Colombian roast coffee"
            type="text"
            {...register('name')}
          />
          {errors.name ? (
            <p className={styles.errorMessage} id="product-name-error">
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="product-description">
            Description
          </label>
          <textarea
            aria-describedby={
              errors.description ? 'product-description-error' : undefined
            }
            aria-invalid={Boolean(errors.description)}
            className={styles.textarea}
            id="product-description"
            placeholder="Notes for the sales team, ingredients or packaging details."
            rows={4}
            {...register('description')}
          />
          {errors.description ? (
            <p className={styles.errorMessage} id="product-description-error">
              {errors.description.message}
            </p>
          ) : null}
        </div>

        <div className={styles.inlineFields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="product-sku">
              SKU
            </label>
            <input
              aria-describedby={errors.sku ? 'product-sku-error' : undefined}
              aria-invalid={Boolean(errors.sku)}
              className={styles.input}
              id="product-sku"
              placeholder="NB-A5-001"
              type="text"
              {...register('sku')}
            />
            {errors.sku ? (
              <p className={styles.errorMessage} id="product-sku-error">
                {errors.sku.message}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="product-barcode">
              Barcode
            </label>
            <input
              aria-describedby={
                errors.barcode ? 'product-barcode-error' : undefined
              }
              aria-invalid={Boolean(errors.barcode)}
              className={styles.input}
              id="product-barcode"
              placeholder="770000000001"
              type="text"
              {...register('barcode')}
            />
            {errors.barcode ? (
              <p className={styles.errorMessage} id="product-barcode-error">
                {errors.barcode.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.inlineFields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="product-cost">
              Cost
            </label>
            <input
              aria-describedby={errors.cost ? 'product-cost-error' : undefined}
              aria-invalid={Boolean(errors.cost)}
              className={styles.input}
              id="product-cost"
              inputMode="decimal"
              min="0"
              placeholder="8.50"
              step="0.01"
              type="number"
              {...register('cost')}
            />
            {errors.cost ? (
              <p className={styles.errorMessage} id="product-cost-error">
                {errors.cost.message}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="product-price">
              Price
            </label>
            <input
              aria-describedby={errors.price ? 'product-price-error' : undefined}
              aria-invalid={Boolean(errors.price)}
              className={styles.input}
              id="product-price"
              inputMode="decimal"
              min="0"
              placeholder="24.90"
              step="0.01"
              type="number"
              {...register('price')}
            />
            {errors.price ? (
              <p className={styles.errorMessage} id="product-price-error">
                {errors.price.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.inlineFields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="product-stock">
              Stock
            </label>
            <input
              aria-describedby={errors.stock ? 'product-stock-error' : undefined}
              aria-invalid={Boolean(errors.stock)}
              className={styles.input}
              id="product-stock"
              inputMode="numeric"
              min="0"
              placeholder="18"
              step="1"
              type="number"
              {...register('stock')}
            />
            {errors.stock ? (
              <p className={styles.errorMessage} id="product-stock-error">
                {errors.stock.message}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="product-min-stock">
              Minimum stock
            </label>
            <input
              aria-describedby={
                errors.minStock ? 'product-min-stock-error' : undefined
              }
              aria-invalid={Boolean(errors.minStock)}
              className={styles.input}
              id="product-min-stock"
              inputMode="numeric"
              min="0"
              placeholder="4"
              step="1"
              type="number"
              {...register('minStock')}
            />
            {errors.minStock ? (
              <p className={styles.errorMessage} id="product-min-stock-error">
                {errors.minStock.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.inlineFields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="product-unit">
              Selling unit
            </label>
            <select
              aria-describedby={errors.unit ? 'product-unit-error' : undefined}
              aria-invalid={Boolean(errors.unit)}
              className={styles.input}
              id="product-unit"
              {...register('unit')}
            >
              {productUnitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.unit ? (
              <p className={styles.errorMessage} id="product-unit-error">
                {errors.unit.message}
              </p>
            ) : null}
          </div>

          <label className={styles.checkboxField}>
            <input className={styles.checkbox} type="checkbox" {...register('isActive')} />
            <span className={styles.checkboxCopy}>
              Keep this product active and visible in the selling catalog
            </span>
          </label>
        </div>

        {errors.root?.message ? (
          <div className={styles.errorBanner} role="alert">
            {errors.root.message}
          </div>
        ) : null}

        <div className={styles.footer}>
          <p className={styles.helperText}>
            {isEditing
              ? 'Changes are saved directly to the active catalog item.'
              : 'New products will appear immediately in the table after saving.'}
          </p>

          <button
            className={styles.primaryButton}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? isEditing
                ? 'Saving changes...'
                : 'Creating product...'
              : isEditing
                ? 'Save changes'
                : 'Create product'}
          </button>
        </div>
      </form>
    </SurfaceCard>
  )
}
