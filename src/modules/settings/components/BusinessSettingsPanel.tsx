import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronUp, Upload } from 'lucide-react'
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
import { businessCategoryOptions } from '@/shared/constants/business-categories'
import { useAppTranslation } from '@/shared/i18n/use-app-translation'
import { formatDate } from '@/shared/utils/format-date'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './BusinessSettingsPanel.module.css'

type BusinessSettingsPanelProps = {
  businessSettings: BusinessSettings | null
  errorMessage: string | null
  isLoading: boolean
  isSubmitting: boolean
  variant?: 'default' | 'retail'
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
    city: businessSettings?.city ?? '',
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
  variant = 'default',
  onRetry,
  onSubmit,
}: BusinessSettingsPanelProps) {
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const { dictionary } = useAppTranslation()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileFormSchema),
    defaultValues: getDefaultValues(businessSettings),
    mode: 'onChange',
  })
  const selectedBusinessCategory = watch('businessCategory')

  useEffect(() => {
    reset(getDefaultValues(businessSettings))
  }, [businessSettings, reset])

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl)
      }
    }
  }, [logoPreviewUrl])

  const submitBusinessProfile = handleSubmit(async (values) => {
    try {
      await onSubmit({
        businessName: values.businessName.trim(),
        businessCategory: values.businessCategory,
        legalName: normalizeOptionalText(values.legalName),
        taxId: normalizeOptionalText(values.taxId),
        city: normalizeOptionalText(values.city),
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
  const isSubmitDisabled = isDisabled || (variant === 'retail' && !isDirty)

  function handleLogoChange(file: File | null) {
    if (!file) {
      return
    }

    setLogoPreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl)
      }

      return URL.createObjectURL(file)
    })
  }

  if (variant === 'retail') {
    return (
      <details className={styles.retailAccordion} open>
        <summary className={styles.retailAccordionSummary}>
          <h3 className={styles.retailAccordionTitle}>Datos del negocio</h3>
          <ChevronUp aria-hidden="true" className={styles.retailAccordionIcon} />
        </summary>

        <div className={styles.retailAccordionBody}>
          {errorMessage ? (
            <div className={styles.feedbackCard} role="alert">
              <p className={styles.feedbackTitle}>
                No pudimos cargar la configuración del negocio
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

          <form
            className={styles.retailForm}
            noValidate
            onSubmit={submitBusinessProfile}
          >
            <label className={styles.logoUploader}>
              <input
                accept="image/png,image/jpeg,image/webp"
                className={styles.logoInput}
                disabled={isDisabled}
                type="file"
                onChange={(event) => {
                  handleLogoChange(event.target.files?.[0] ?? null)
                }}
              />
              {logoPreviewUrl ? (
                <img
                  alt="Logo del negocio"
                  className={styles.logoPreview}
                  src={logoPreviewUrl}
                />
              ) : (
                <>
                  <Upload aria-hidden="true" className={styles.logoIcon} />
                  <span>Cargar logo</span>
                </>
              )}
            </label>

            <div className={styles.retailGrid}>
              <label className={styles.retailField}>
                <span className={styles.retailLabel}>Tipo de negocio*</span>
                <span className={styles.selectWrap}>
                  <select
                    aria-invalid={Boolean(errors.businessCategory)}
                    className={styles.retailInput}
                    disabled={isDisabled}
                    {...register('businessCategory')}
                  >
                    {businessCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {dictionary.categories[category]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown aria-hidden="true" className={styles.selectIcon} />
                </span>
                {errors.businessCategory ? (
                  <span className={styles.errorMessage}>
                    {errors.businessCategory.message}
                  </span>
                ) : null}
              </label>

              <label className={styles.retailField}>
                <span className={styles.retailLabel}>Nombre del negocio*</span>
                <input
                  aria-invalid={Boolean(errors.businessName)}
                  className={styles.retailInput}
                  disabled={isDisabled}
                  placeholder="Escribe el nombre"
                  type="text"
                  {...register('businessName')}
                />
                {errors.businessName ? (
                  <span className={styles.errorMessage}>
                    {errors.businessName.message}
                  </span>
                ) : null}
              </label>

              <label className={styles.retailField}>
                <span className={styles.retailLabel}>Dirección del negocio</span>
                <input
                  aria-invalid={Boolean(errors.address)}
                  className={styles.retailInput}
                  disabled={isDisabled}
                  placeholder="Escribe la dirección"
                  type="text"
                  {...register('address')}
                />
                {errors.address ? (
                  <span className={styles.errorMessage}>
                    {errors.address.message}
                  </span>
                ) : null}
              </label>

              <label className={styles.retailField}>
                <span className={styles.retailLabel}>
                  Ciudad donde se ubica el negocio
                </span>
                <input
                  aria-invalid={Boolean(errors.city)}
                  className={styles.retailInput}
                  disabled={isDisabled}
                  placeholder="Escribe la ciudad"
                  type="text"
                  {...register('city')}
                />
                {errors.city ? (
                  <span className={styles.errorMessage}>{errors.city.message}</span>
                ) : null}
              </label>

              <label className={styles.retailField}>
                <span className={styles.retailLabel}>Número de celular</span>
                <span className={styles.phoneField}>
                  <span className={styles.countrySelect} aria-hidden="true">
                    <span className={styles.flagColombia} />
                  </span>
                  <input
                    aria-invalid={Boolean(errors.phone)}
                    className={styles.phoneInput}
                    disabled={isDisabled}
                    inputMode="tel"
                    placeholder="Escribe el número"
                    type="tel"
                    {...register('phone')}
                  />
                </span>
                {errors.phone ? (
                  <span className={styles.errorMessage}>{errors.phone.message}</span>
                ) : null}
              </label>

              <label className={styles.retailField}>
                <span className={styles.retailLabel}>Correo electrónico</span>
                <input
                  aria-invalid={Boolean(errors.email)}
                  className={styles.retailInput}
                  disabled={isDisabled}
                  placeholder="Escribe el correo"
                  type="email"
                  {...register('email')}
                />
                {errors.email ? (
                  <span className={styles.errorMessage}>{errors.email.message}</span>
                ) : null}
              </label>

              <label className={styles.retailField}>
                <span className={styles.retailLabel}>Número de documento</span>
                <input
                  aria-invalid={Boolean(errors.taxId)}
                  className={styles.retailInput}
                  disabled={isDisabled}
                  placeholder="Escribe el número de documento"
                  type="text"
                  {...register('taxId')}
                />
                {errors.taxId ? (
                  <span className={styles.errorMessage}>{errors.taxId.message}</span>
                ) : null}
              </label>

              <div className={styles.retailButtonField}>
                <button
                  className={styles.retailSubmitButton}
                  disabled={isSubmitDisabled}
                  type="submit"
                >
                  {isSubmitting ? 'Guardando cambios...' : 'Guardar cambios'}
                </button>
              </div>
            </div>

            {errors.root?.message ? (
              <div className={styles.errorBanner} role="alert">
                {errors.root.message}
              </div>
            ) : null}
          </form>
        </div>
      </details>
    )
  }

  return (
    <>
      <SurfaceCard className={joinClassNames(styles.card)}>
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
