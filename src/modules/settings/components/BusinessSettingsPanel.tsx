import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BusinessCategoryPickerModal } from '@/shared/components/business/BusinessCategoryPickerModal'
import {
  businessProfileFormSchema,
  type BusinessProfileFormValues,
} from '@/modules/settings/schemas/business-settings-form-schema'
import type {
  BusinessProfileInput,
  BusinessSettings,
} from '@/modules/settings/types/settings'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { useAppTranslation } from '@/shared/i18n/use-app-translation'
import { formatDate } from '@/shared/utils/format-date'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './BusinessSettingsPanel.module.css'

type BusinessSettingsPanelProps = {
  businessSettings: BusinessSettings | null
  errorMessage: string | null
  isLoading: boolean
  isSubmitting: boolean
  onRetry: () => void
  onSubmit: (input: BusinessProfileInput) => Promise<void>
}

function getDefaultValues(
  businessSettings: BusinessSettings | null,
): BusinessProfileFormValues {
  return {
    businessName: businessSettings?.businessName ?? '',
    businessCategory:
      (businessSettings?.businessCategory as BusinessProfileFormValues['businessCategory']) ??
      'corner_store',
    legalName: businessSettings?.legalName ?? '',
    taxId: businessSettings?.taxId ?? '',
    email: businessSettings?.email ?? '',
    phone: businessSettings?.phone ?? '',
    address: businessSettings?.address ?? '',
  }
}

function normalizeOptionalText(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : null
}

export function BusinessSettingsPanel({
  businessSettings,
  errorMessage,
  isLoading,
  isSubmitting,
  onRetry,
  onSubmit,
}: BusinessSettingsPanelProps) {
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false)
  const { dictionary } = useAppTranslation()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileFormSchema),
    defaultValues: getDefaultValues(businessSettings),
  })
  const selectedBusinessCategory = watch('businessCategory')

  useEffect(() => {
    reset(getDefaultValues(businessSettings))
  }, [businessSettings, reset])

  const submitBusinessProfile = handleSubmit(async (values) => {
    try {
      await onSubmit({
        businessName: values.businessName.trim(),
        businessCategory: values.businessCategory,
        legalName: normalizeOptionalText(values.legalName),
        taxId: normalizeOptionalText(values.taxId),
        email: normalizeOptionalText(values.email)?.toLowerCase() ?? null,
        phone: normalizeOptionalText(values.phone),
        address: normalizeOptionalText(values.address),
      })
    } catch (error) {
      setError('root', {
        message: getErrorMessage(
          error,
          'No pudimos guardar el perfil del negocio en este momento. Inténtalo nuevamente.',
        ),
      })
    }
  })

  const isDisabled = isLoading || isSubmitting || errorMessage !== null

  return (
    <>
      <SurfaceCard className={styles.card}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Perfil del negocio</p>
            <h3 className={styles.title}>
              Mantén actualizada la identidad comercial y operativa del negocio.
            </h3>
            <p className={styles.description}>
              Esta información alimenta la apariencia del espacio, los módulos
              visibles y la configuración estructural de toda la plataforma.
            </p>
          </div>

          <div className={styles.headerMeta}>
            <span className={styles.statusPill}>
              {businessSettings ? 'Configurado' : 'Pendiente'}
            </span>
            {businessSettings ? (
              <span className={styles.updatedAt}>
                Actualizado {formatDate(businessSettings.updatedAt)}
              </span>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <div className={styles.feedbackCard} role="alert">
            <p className={styles.feedbackTitle}>
              No pudimos cargar la configuración del negocio
            </p>
            <p className={styles.feedbackDescription}>{errorMessage}</p>
            <button className={styles.feedbackButton} type="button" onClick={onRetry}>
              Reintentar
            </button>
          </div>
        ) : null}

        <form className={styles.form} noValidate onSubmit={submitBusinessProfile}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="settings-business-name">
              Nombre del negocio
            </label>
            <input
              aria-describedby={
                errors.businessName ? 'settings-business-name-error' : undefined
              }
              aria-invalid={Boolean(errors.businessName)}
              className={styles.input}
              disabled={isDisabled}
              id="settings-business-name"
              placeholder="Cashgo Coffee House"
              type="text"
              {...register('businessName')}
            />
            {errors.businessName ? (
              <p className={styles.errorMessage} id="settings-business-name-error">
                {errors.businessName.message}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Categoría del negocio</span>
            <button
              className={styles.categoryButton}
              disabled={isDisabled}
              type="button"
              onClick={() => setCategoryModalOpen(true)}
            >
              {dictionary.categories[selectedBusinessCategory]}
            </button>
            {errors.businessCategory ? (
              <p className={styles.errorMessage}>{errors.businessCategory.message}</p>
            ) : null}
          </div>

          <div className={styles.inlineFields}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="settings-legal-name">
                Razón social
              </label>
              <input
                aria-describedby={
                  errors.legalName ? 'settings-legal-name-error' : undefined
                }
                aria-invalid={Boolean(errors.legalName)}
                className={styles.input}
                disabled={isDisabled}
                id="settings-legal-name"
                placeholder="Cashgo Coffee SAS"
                type="text"
                {...register('legalName')}
              />
              {errors.legalName ? (
                <p className={styles.errorMessage} id="settings-legal-name-error">
                  {errors.legalName.message}
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="settings-tax-id">
                NIT o ID fiscal
              </label>
              <input
                aria-describedby={errors.taxId ? 'settings-tax-id-error' : undefined}
                aria-invalid={Boolean(errors.taxId)}
                className={styles.input}
                disabled={isDisabled}
                id="settings-tax-id"
                placeholder="900123456"
                type="text"
                {...register('taxId')}
              />
              {errors.taxId ? (
                <p className={styles.errorMessage} id="settings-tax-id-error">
                  {errors.taxId.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className={styles.inlineFields}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="settings-email">
                Correo de contacto
              </label>
              <input
                aria-describedby={errors.email ? 'settings-email-error' : undefined}
                aria-invalid={Boolean(errors.email)}
                className={styles.input}
                disabled={isDisabled}
                id="settings-email"
                placeholder="admin@cashgo.com"
                type="email"
                {...register('email')}
              />
              {errors.email ? (
                <p className={styles.errorMessage} id="settings-email-error">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="settings-phone">
                Teléfono
              </label>
              <input
                aria-describedby={errors.phone ? 'settings-phone-error' : undefined}
                aria-invalid={Boolean(errors.phone)}
                className={styles.input}
                disabled={isDisabled}
                id="settings-phone"
                placeholder="+57 300 000 0000"
                type="text"
                {...register('phone')}
              />
              {errors.phone ? (
                <p className={styles.errorMessage} id="settings-phone-error">
                  {errors.phone.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="settings-address">
              Dirección
            </label>
            <textarea
              aria-describedby={errors.address ? 'settings-address-error' : undefined}
              aria-invalid={Boolean(errors.address)}
              className={styles.textarea}
              disabled={isDisabled}
              id="settings-address"
              placeholder="Calle, barrio y ciudad"
              rows={4}
              {...register('address')}
            />
            {errors.address ? (
              <p className={styles.errorMessage} id="settings-address-error">
                {errors.address.message}
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
              {!businessSettings
                ? 'Crear este perfil también deja preparada la base fiscal del negocio para empezar a operar.'
                : 'Los cambios se guardan sobre el perfil global del negocio y ajustan la experiencia visible del sistema.'}
            </p>

            <button className={styles.primaryButton} disabled={isDisabled} type="submit">
              {isSubmitting
                ? businessSettings
                  ? 'Guardando perfil...'
                  : 'Creando perfil...'
                : businessSettings
                  ? 'Guardar perfil del negocio'
                  : 'Crear perfil del negocio'}
            </button>
          </div>
        </form>
      </SurfaceCard>

      <BusinessCategoryPickerModal
        isOpen={isCategoryModalOpen}
        selectedCategory={selectedBusinessCategory}
        onClose={() => setCategoryModalOpen(false)}
        onSelectCategory={(category) => {
          setValue('businessCategory', category, {
            shouldValidate: true,
          })
          setCategoryModalOpen(false)
        }}
      />
    </>
  )
}
