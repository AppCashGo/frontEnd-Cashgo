import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './TaxSettingsPanel.module.css'

type TaxSettingsPanelProps = {
  businessSettings: BusinessSettings | null
  errorMessage: string | null
  isLoading: boolean
  isSubmitting: boolean
  onRetry: () => void
  onSubmit: (input: BusinessTaxSettingsInput) => Promise<void>
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

export function TaxSettingsPanel({
  businessSettings,
  errorMessage,
  isLoading,
  isSubmitting,
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
