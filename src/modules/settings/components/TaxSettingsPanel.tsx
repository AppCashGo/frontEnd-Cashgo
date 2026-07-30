import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Box,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  PackageCheck,
  Search,
  SlidersVertical,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { inventoryTaxOptions } from '@/modules/inventory/constants/inventory-tax-options'
import {
  useInventoryCategoriesQuery,
  useUpdateInventoryProductTaxesMutation,
} from '@/modules/inventory/hooks/use-inventory-query'
import { useProductsQuery } from '@/modules/products/hooks/use-products-query'
import type { Product } from '@/modules/products/types/product'
import { matchesProductSearch } from '@/modules/products/utils/matches-product-search'
import { resolveProductImageUrl } from '@/modules/products/utils/resolve-product-image-url'
import {
  taxSettingsFormSchema,
  type TaxSettingsFormValues,
} from '@/modules/settings/schemas/business-settings-form-schema'
import type {
  BusinessSettings,
  BusinessTaxSettingsInput,
} from '@/modules/settings/types/settings'
import { supportedCurrencies } from '@/modules/settings/types/settings'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './TaxSettingsPanel.module.css'

type TaxOptionId = (typeof inventoryTaxOptions)[number]['id']

type TaxSettingsPanelProps = {
  businessSettings: BusinessSettings | null
  errorMessage: string | null
  isLoading: boolean
  isSubmitting: boolean
  variant?: 'default' | 'retail'
  onRetry: () => void
  onSubmit: (input: BusinessTaxSettingsInput) => Promise<void>
}

type TaxFeedbackMessage = {
  tone: 'success' | 'error'
  text: string
}

function getDefaultValues(
  businessSettings: BusinessSettings | null,
): TaxSettingsFormValues {
  return {
    currency: businessSettings?.currency ?? 'COP',
    taxRate: businessSettings?.taxRate ?? 0,
    taxLabel: businessSettings?.taxLabel ?? 'IVA',
  }
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : null
}

function formatTaxOptionLabel(option: (typeof inventoryTaxOptions)[number]) {
  return option.rate > 0
    ? `${option.label} (${option.rate.toString()}%)`
    : option.label
}

function findTaxOptionBySettings(businessSettings: BusinessSettings | null) {
  if (!businessSettings) {
    return null
  }

  return (
    inventoryTaxOptions.find(
      (option) =>
        option.rate === businessSettings.taxRate &&
        (option.rate === 0 || option.label === businessSettings.taxLabel),
    ) ??
    inventoryTaxOptions.find((option) => option.rate === businessSettings.taxRate) ??
    null
  )
}

function formatProductTax(product: Product) {
  if (!product.taxLabel || product.taxRate <= 0) {
    return 'Selecciona una opción'
  }

  return `${product.taxLabel} (${product.taxRate.toString()}%)`
}

function ProductThumb({ product }: { product: Product }) {
  const imageUrl = resolveProductImageUrl(product.imageUrls)

  if (imageUrl) {
    return <img alt="" className={styles.productImage} src={imageUrl} />
  }

  return <span className={styles.productFallback}>t.</span>
}

function SelectAllProductsCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean
  indeterminate: boolean
  onChange: () => void
}) {
  const checkboxRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <input
      ref={checkboxRef}
      aria-label="Seleccionar todos los productos visibles"
      checked={checked}
      type="checkbox"
      onChange={onChange}
    />
  )
}

function RetailTaxSettingsPanel({
  businessSettings,
  errorMessage,
  isLoading,
  isSubmitting,
  onRetry,
  onSubmit,
}: Omit<TaxSettingsPanelProps, 'variant'>) {
  const productsQuery = useProductsQuery()
  const categoriesQuery = useInventoryCategoriesQuery()
  const updateProductTaxesMutation = useUpdateInventoryProductTaxesMutation()
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )
  const [isAccordionOpen, setAccordionOpen] = useState(true)
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const [isProductSelectorOpen, setProductSelectorOpen] = useState(false)
  const [selectedTaxOptionId, setSelectedTaxOptionId] = useState<TaxOptionId | ''>(
    '',
  )
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [baseTaxOptionId, setBaseTaxOptionId] = useState<TaxOptionId | ''>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] =
    useState<TaxFeedbackMessage | null>(null)

  const selectedTaxOption = inventoryTaxOptions.find(
    (option) => option.id === selectedTaxOptionId,
  )
  const hasSelectedProducts = selectedProductIds.length > 0
  const canSaveProductTaxes =
    hasSelectedProducts &&
    Boolean(selectedTaxOption) &&
    !updateProductTaxesMutation.isPending

  useEffect(() => {
    setBaseTaxOptionId(findTaxOptionBySettings(businessSettings)?.id ?? '')
  }, [businessSettings])

  const filteredProducts = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase()

    return products
      .filter((product) => matchesProductSearch(product, normalizedSearchTerm))
      .filter((product) => (categoryId ? product.categoryId === categoryId : true))
      .sort((firstProduct, secondProduct) =>
        firstProduct.name.localeCompare(secondProduct.name),
      )
  }, [categoryId, products, searchTerm])

  const selectedProductsLabel = hasSelectedProducts
    ? `${selectedProductIds.length.toString()} ${
        selectedProductIds.length === 1
          ? 'producto seleccionado'
          : 'productos seleccionados'
      }`
    : 'Seleccionar productos'

  const areAllFilteredProductsSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((product) => selectedProductIds.includes(product.id))
  const areSomeFilteredProductsSelected =
    filteredProducts.some((product) => selectedProductIds.includes(product.id)) &&
    !areAllFilteredProductsSelected

  async function handleBaseTaxChange(nextOptionId: TaxOptionId | '') {
    setBaseTaxOptionId(nextOptionId)
    setFeedbackMessage(null)

    const nextOption = inventoryTaxOptions.find(
      (option) => option.id === nextOptionId,
    )

    if (!businessSettings || !nextOption) {
      return
    }

    try {
      await onSubmit({
        currency: businessSettings.currency,
        taxLabel: nextOption.rate > 0 ? nextOption.label : null,
        taxRate: nextOption.rate,
      })
      setFeedbackMessage({
        tone: 'success',
        text: 'Impuesto base actualizado.',
      })
    } catch (error) {
      setBaseTaxOptionId(findTaxOptionBySettings(businessSettings)?.id ?? '')
      setFeedbackMessage({
        tone: 'error',
        text: getErrorMessage(error, 'No fue posible guardar el impuesto base.'),
      })
    }
  }

  function handleOpenDrawer() {
    setDrawerOpen(true)
    setFeedbackMessage(null)
  }

  function handleCloseDrawer() {
    setDrawerOpen(false)
    setProductSelectorOpen(false)
  }

  function handleClearSelection() {
    setSelectedProductIds([])
    setSearchTerm('')
    setCategoryId(null)
  }

  function handleToggleProduct(productId: string) {
    setSelectedProductIds((currentProductIds) =>
      currentProductIds.includes(productId)
        ? currentProductIds.filter((currentProductId) => currentProductId !== productId)
        : [...currentProductIds, productId],
    )
  }

  function handleToggleAllFilteredProducts() {
    setSelectedProductIds((currentProductIds) => {
      if (areAllFilteredProductsSelected) {
        return currentProductIds.filter(
          (productId) =>
            !filteredProducts.some((product) => product.id === productId),
        )
      }

      return Array.from(
        new Set([
          ...currentProductIds,
          ...filteredProducts.map((product) => product.id),
        ]),
      )
    })
  }

  async function handleSaveProductTaxes() {
    if (!selectedTaxOption || selectedProductIds.length === 0) {
      return
    }

    try {
      await updateProductTaxesMutation.mutateAsync({
        productIds: selectedProductIds,
        taxLabel: selectedTaxOption.rate > 0 ? selectedTaxOption.label : undefined,
        taxRate: selectedTaxOption.rate,
      })
      setFeedbackMessage({
        tone: 'success',
        text: 'Impuestos actualizados.',
      })
      setDrawerOpen(false)
      setProductSelectorOpen(false)
      setSelectedTaxOptionId('')
      setSelectedProductIds([])
      setSearchTerm('')
      setCategoryId(null)
    } catch (error) {
      setFeedbackMessage({
        tone: 'error',
        text: getErrorMessage(error, 'No fue posible actualizar los impuestos.'),
      })
    }
  }

  return (
    <>
      <details
        className={styles.retailAccordion}
        open={isAccordionOpen}
        onToggle={(event) => setAccordionOpen(event.currentTarget.open)}
      >
        <summary className={styles.retailAccordionSummary}>
          <h3 className={styles.retailAccordionTitle}>Impuestos</h3>
          {isAccordionOpen ? (
            <ChevronUp aria-hidden="true" className={styles.accordionIcon} />
          ) : (
            <ChevronDown aria-hidden="true" className={styles.accordionIcon} />
          )}
        </summary>

        <div className={styles.retailBody}>
          {errorMessage ? (
            <div className={styles.feedbackCard} role="alert">
              <p className={styles.feedbackTitle}>
                No pudimos cargar los impuestos
              </p>
              <p className={styles.feedbackDescription}>{errorMessage}</p>
              <button
                className={styles.feedbackButton}
                type="button"
                onClick={onRetry}
              >
                Reintentar
              </button>
            </div>
          ) : null}

          {feedbackMessage ? (
            <div
              className={
                feedbackMessage.tone === 'error'
                  ? styles.feedbackError
                  : styles.feedbackSuccess
              }
              role={feedbackMessage.tone === 'error' ? 'alert' : 'status'}
            >
              {feedbackMessage.text}
            </div>
          ) : null}

          <div className={styles.retailTaxGrid}>
            <span className={styles.retailLabel}>Impuesto base</span>
            <label className={styles.selectWrapper}>
              <select
                className={styles.retailSelect}
                disabled={isLoading || isSubmitting || businessSettings === null}
                value={baseTaxOptionId}
                onChange={(event) => {
                  void handleBaseTaxChange(event.target.value as TaxOptionId | '')
                }}
              >
                <option value="">Selecciona una opción</option>
                {inventoryTaxOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {formatTaxOptionLabel(option)}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" className={styles.selectIcon} />
            </label>

            <span className={styles.retailLabel}>Impuesto por producto</span>
            <button
              className={styles.selectProductsButton}
              disabled={isLoading || businessSettings === null}
              type="button"
              onClick={handleOpenDrawer}
            >
              Seleccionar productos
            </button>
          </div>
        </div>
      </details>

      {isDrawerOpen ? (
        <div
          className={styles.drawerBackdrop}
          role="presentation"
          onClick={handleCloseDrawer}
        >
          <aside
            aria-label="Modificar impuestos"
            aria-modal="true"
            className={styles.taxDrawer}
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.drawerHeader}>
              <h3 className={styles.drawerTitle}>Modificar impuestos</h3>
              <button
                aria-label="Cerrar"
                className={styles.drawerCloseButton}
                type="button"
                onClick={handleCloseDrawer}
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <div className={styles.drawerContent}>
              <div className={styles.drawerSectionHeader}>
                <span className={styles.drawerLabel}>
                  Selecciona los productos a modificar
                </span>
                {hasSelectedProducts ? (
                  <button
                    className={styles.clearButton}
                    type="button"
                    onClick={handleClearSelection}
                  >
                    Limpiar
                  </button>
                ) : null}
              </div>

              <button
                className={styles.drawerSelectionButton}
                type="button"
                onClick={() => setProductSelectorOpen(true)}
              >
                <PackageCheck aria-hidden="true" className={styles.selectionIcon} />
                <span>{selectedProductsLabel}</span>
                <ChevronRight aria-hidden="true" className={styles.chevronIcon} />
              </button>

              <div className={styles.drawerDivider} />

              <div className={styles.drawerFieldset}>
                <p className={styles.drawerSectionTitle}>
                  Selecciona los impuestos aplicables
                </p>
                <label className={styles.drawerField}>
                  <span className={styles.drawerLabel}>Impuesto base</span>
                  <span className={styles.selectWrapper}>
                    <select
                      className={styles.drawerSelect}
                      value={selectedTaxOptionId}
                      onChange={(event) =>
                        setSelectedTaxOptionId(event.target.value as TaxOptionId | '')
                      }
                    >
                      <option value="">Selecciona una opción</option>
                      {inventoryTaxOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {formatTaxOptionLabel(option)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown aria-hidden="true" className={styles.selectIcon} />
                  </span>
                </label>
              </div>
            </div>

            <footer className={styles.drawerFooter}>
              <button
                className={styles.drawerPrimaryButton}
                disabled={!canSaveProductTaxes}
                type="button"
                onClick={() => {
                  void handleSaveProductTaxes()
                }}
              >
                {updateProductTaxesMutation.isPending
                  ? 'Guardando cambios...'
                  : 'Guardar cambios'}
              </button>
              <button
                className={styles.drawerCancelButton}
                type="button"
                onClick={handleCloseDrawer}
              >
                Cancelar
              </button>
            </footer>
          </aside>
        </div>
      ) : null}

      {isProductSelectorOpen ? (
        <div
          aria-label="Seleccionar productos a modificar"
          aria-modal="true"
          className={styles.productSelectorView}
          role="dialog"
        >
          <header className={styles.selectorTopbar}>
            <button
              className={styles.selectorBackButton}
              type="button"
              onClick={() => setProductSelectorOpen(false)}
            >
              <ArrowLeft aria-hidden="true" />
              <span>Seleccionar productos a modificar</span>
            </button>
          </header>

          <section className={styles.selectorFilters}>
            <button
              aria-label="Ordenar productos"
              className={styles.sortButton}
              type="button"
            >
              <SlidersVertical aria-hidden="true" />
            </button>
            <label className={styles.selectorSearch}>
              <Search aria-hidden="true" className={styles.searchIcon} />
              <input
                placeholder="Buscar producto"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <button
              className={categoryId === null ? styles.chipActive : styles.chip}
              type="button"
              onClick={() => setCategoryId(null)}
            >
              Ver todos
            </button>
            {categories.map((category) => (
              <button
                className={
                  categoryId === category.id ? styles.chipActive : styles.chip
                }
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
              >
                {category.name}
              </button>
            ))}
          </section>

          <div className={styles.selectorTableWrap}>
            <table className={styles.selectorTable}>
              <thead>
                <tr>
                  <th>
                    <SelectAllProductsCheckbox
                      checked={areAllFilteredProductsSelected}
                      indeterminate={areSomeFilteredProductsSelected}
                      onChange={handleToggleAllFilteredProducts}
                    />
                  </th>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Costo</th>
                  <th>Impuesto</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <input
                        aria-label={`Seleccionar ${product.name}`}
                        checked={selectedProductIds.includes(product.id)}
                        type="checkbox"
                        onChange={() => handleToggleProduct(product.id)}
                      />
                    </td>
                    <td>
                      <div className={styles.productCell}>
                        <ProductThumb product={product} />
                        <span>{product.name}</span>
                      </div>
                    </td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>{formatCurrency(product.cost)}</td>
                    <td>{formatProductTax(product)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProducts.length === 0 ? (
              <div className={styles.selectorEmpty}>
                <Box aria-hidden="true" />
                <p>No encontramos productos con estos filtros.</p>
              </div>
            ) : null}
          </div>

          {selectedProductIds.length > 0 ? (
            <div className={styles.selectorFooter}>
              <button
                className={styles.continueButton}
                type="button"
                onClick={() => setProductSelectorOpen(false)}
              >
                Continuar
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

export function TaxSettingsPanel({
  businessSettings,
  errorMessage,
  isLoading,
  isSubmitting,
  variant = 'default',
  onRetry,
  onSubmit,
}: TaxSettingsPanelProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TaxSettingsFormValues>({
    resolver: zodResolver(taxSettingsFormSchema),
    defaultValues: getDefaultValues(businessSettings),
  })

  useEffect(() => {
    reset(getDefaultValues(businessSettings))
  }, [businessSettings, reset])

  if (variant === 'retail') {
    return (
      <RetailTaxSettingsPanel
        businessSettings={businessSettings}
        errorMessage={errorMessage}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        onRetry={onRetry}
        onSubmit={onSubmit}
      />
    )
  }

  const submitTaxSettings = handleSubmit(async (values) => {
    try {
      await onSubmit({
        currency: values.currency,
        taxRate: values.taxRate,
        taxLabel: normalizeOptionalText(values.taxLabel),
      })
    } catch (error) {
      setError('root', {
        message: getErrorMessage(
          error,
          'Unable to save the tax configuration right now. Please try again.',
        ),
      })
    }
  })

  const isDisabled =
    isLoading || isSubmitting || errorMessage !== null || businessSettings === null

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Taxes and currency</p>
          <h3 className={styles.title}>
            Keep operational taxes and currency aligned with the business setup.
          </h3>
          <p className={styles.description}>
            Use one compact form to update the tax label, percentage and base
            currency used throughout the platform.
          </p>
        </div>

        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Current setup</p>
          <p className={styles.summaryValue}>
            {businessSettings
              ? `${businessSettings.taxLabel ?? 'Tax'} ${businessSettings.taxRate.toFixed(2)}%`
              : 'Create business profile first'}
          </p>
          <p className={styles.summaryHint}>
            {businessSettings
              ? `Transactions are currently expressed in ${businessSettings.currency}.`
              : 'Taxes become editable right after the business profile is created.'}
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className={styles.feedbackCard} role="alert">
          <p className={styles.feedbackTitle}>Unable to load tax settings</p>
          <p className={styles.feedbackDescription}>{errorMessage}</p>
          <button className={styles.feedbackButton} type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {!errorMessage && businessSettings === null ? (
        <div className={styles.noticeCard}>
          <p className={styles.noticeTitle}>Business profile required</p>
          <p className={styles.noticeDescription}>
            Complete the business profile first. Once that base record exists,
            taxes and currency can be adjusted independently here.
          </p>
        </div>
      ) : null}

      <form className={styles.form} noValidate onSubmit={submitTaxSettings}>
        <div className={styles.inlineFields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="settings-currency">
              Currency
            </label>
            <select
              aria-describedby={
                errors.currency ? 'settings-currency-error' : undefined
              }
              aria-invalid={Boolean(errors.currency)}
              className={styles.select}
              disabled={isDisabled}
              id="settings-currency"
              {...register('currency')}
            >
              {supportedCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            {errors.currency ? (
              <p className={styles.errorMessage} id="settings-currency-error">
                {errors.currency.message}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="settings-tax-rate">
              Tax rate
            </label>
            <input
              aria-describedby={
                errors.taxRate ? 'settings-tax-rate-error' : undefined
              }
              aria-invalid={Boolean(errors.taxRate)}
              className={styles.input}
              disabled={isDisabled}
              id="settings-tax-rate"
              inputMode="decimal"
              min="0"
              step="0.01"
              type="number"
              {...register('taxRate')}
            />
            {errors.taxRate ? (
              <p className={styles.errorMessage} id="settings-tax-rate-error">
                {errors.taxRate.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="settings-tax-label">
            Tax label
          </label>
          <input
            aria-describedby={
              errors.taxLabel ? 'settings-tax-label-error' : undefined
            }
            aria-invalid={Boolean(errors.taxLabel)}
            className={styles.input}
            disabled={isDisabled}
            id="settings-tax-label"
            placeholder="IVA"
            type="text"
            {...register('taxLabel')}
          />
          {errors.taxLabel ? (
            <p className={styles.errorMessage} id="settings-tax-label-error">
              {errors.taxLabel.message}
            </p>
          ) : null}
        </div>

        {errors.root?.message ? (
          <div className={styles.errorBanner} role="alert">
            {errors.root.message}
          </div>
        ) : null}

        <div className={styles.footer}>
          <p className={styles.helperText}>
            This configuration controls how totals and tax labels are presented
            across the operational workspace.
          </p>

          <button className={styles.primaryButton} disabled={isDisabled} type="submit">
            {isSubmitting ? 'Saving taxes...' : 'Save tax settings'}
          </button>
        </div>
      </form>
    </SurfaceCard>
  )
}
