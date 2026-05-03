import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  operationalSettingsFormSchema,
  type OperationalSettingsFormValues,
} from '@/modules/settings/schemas/business-settings-form-schema'
import type {
  BusinessOperationalSettingsInput,
  BusinessSettings,
} from '@/modules/settings/types/settings'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './OperationalSettingsPanel.module.css'

type OperationalSettingsPanelProps = {
  businessSettings: BusinessSettings | null
  errorMessage: string | null
  isLoading: boolean
  isSubmitting: boolean
  onRetry: () => void
  onSubmit: (input: BusinessOperationalSettingsInput) => Promise<void>
}

function getDefaultValues(
  businessSettings: BusinessSettings | null,
): OperationalSettingsFormValues {
  return {
    allowSaleWithoutStock: businessSettings?.allowSaleWithoutStock ?? false,
    lowStockAlertsEnabled: businessSettings?.lowStockAlertsEnabled ?? true,
    defaultLowStockThreshold: businessSettings?.defaultLowStockThreshold ?? 5,
    useWeightedAverageCost: businessSettings?.useWeightedAverageCost ?? true,
  }
}

type ToggleFieldProps = {
  checked: boolean
  description: string
  disabled: boolean
  label: string
  onChange: (checked: boolean) => void
}

function ToggleField({
  checked,
  description,
  disabled,
  label,
  onChange,
}: ToggleFieldProps) {
  return (
    <label className={styles.toggleField}>
      <div className={styles.toggleCopy}>
        <span className={styles.toggleLabel}>{label}</span>
        <span className={styles.toggleDescription}>{description}</span>
      </div>

      <span className={styles.toggleShell}>
        <input
          checked={checked}
          className={styles.toggleInput}
          disabled={disabled}
          type="checkbox"
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className={styles.toggleTrack} />
      </span>
    </label>
  )
}

export function OperationalSettingsPanel({
  businessSettings,
  errorMessage,
  isLoading,
  isSubmitting,
  onRetry,
  onSubmit,
}: OperationalSettingsPanelProps) {
  const {
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    register,
    formState: { errors },
  } = useForm<OperationalSettingsFormValues>({
    resolver: zodResolver(operationalSettingsFormSchema),
    defaultValues: getDefaultValues(businessSettings),
  })

  useEffect(() => {
    reset(getDefaultValues(businessSettings))
  }, [businessSettings, reset])

  const allowSaleWithoutStock = watch('allowSaleWithoutStock')
  const lowStockAlertsEnabled = watch('lowStockAlertsEnabled')
  const useWeightedAverageCost = watch('useWeightedAverageCost')
  const isDisabled =
    isLoading || isSubmitting || errorMessage !== null || businessSettings === null

  const submitOperationalSettings = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (error) {
      setError('root', {
        message: getErrorMessage(
          error,
          'No pudimos guardar la configuración operativa en este momento. Inténtalo nuevamente.',
        ),
      })
    }
  })

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Operación del negocio</p>
          <h3 className={styles.title}>
            Controla cómo responde el sistema frente al stock y al costo.
          </h3>
          <p className={styles.description}>
            Estos parámetros aterrizan reglas clave del negocio para ventas,
            alertas e inventario, y afectan el comportamiento operativo real.
          </p>
        </div>

        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Configuración activa</p>
          <p className={styles.summaryValue}>
            {businessSettings
              ? `${businessSettings.defaultLowStockThreshold.toString()} unidades base`
              : 'Pendiente'}
          </p>
          <p className={styles.summaryHint}>
            {businessSettings
              ? businessSettings.allowSaleWithoutStock
                ? 'El POS puede vender aunque el stock llegue a cero.'
                : 'El POS bloquea ventas cuando no hay stock disponible.'
              : 'Primero crea el perfil del negocio para editar estas reglas.'}
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className={styles.feedbackCard} role="alert">
          <p className={styles.feedbackTitle}>
            No pudimos cargar la configuración operativa
          </p>
          <p className={styles.feedbackDescription}>{errorMessage}</p>
          <button className={styles.feedbackButton} type="button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      ) : null}

      {!errorMessage && businessSettings === null ? (
        <div className={styles.noticeCard}>
          <p className={styles.noticeTitle}>Perfil del negocio requerido</p>
          <p className={styles.noticeDescription}>
            Crea primero el perfil base del negocio. Luego podrás controlar stock,
            alertas y cálculo de costo desde aquí.
          </p>
        </div>
      ) : null}

      <form className={styles.form} noValidate onSubmit={submitOperationalSettings}>
        <ToggleField
          checked={allowSaleWithoutStock}
          description="Si lo activas, el sistema permitirá registrar ventas aunque el inventario quede en cero o negativo."
          disabled={isDisabled}
          label="Permitir venta sin stock"
          onChange={(checked) =>
            setValue('allowSaleWithoutStock', checked, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />

        <ToggleField
          checked={lowStockAlertsEnabled}
          description="Cuando esté activo, dashboard e inventario mostrarán alertas para productos cercanos al mínimo."
          disabled={isDisabled}
          label="Activar alertas de stock bajo"
          onChange={(checked) =>
            setValue('lowStockAlertsEnabled', checked, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="settings-low-stock-threshold">
            Umbral base de stock bajo
          </label>
          <input
            aria-describedby={
              errors.defaultLowStockThreshold
                ? 'settings-low-stock-threshold-error'
                : undefined
            }
            aria-invalid={Boolean(errors.defaultLowStockThreshold)}
            className={styles.input}
            disabled={isDisabled || !lowStockAlertsEnabled}
            id="settings-low-stock-threshold"
            inputMode="numeric"
            min="0"
            step="1"
            type="number"
            {...register('defaultLowStockThreshold')}
          />
          <p className={styles.helper}>
            Si un producto no define mínimo propio, el sistema usará este umbral
            para alertas y reportes.
          </p>
          {errors.defaultLowStockThreshold ? (
            <p
              className={styles.errorMessage}
              id="settings-low-stock-threshold-error"
            >
              {errors.defaultLowStockThreshold.message}
            </p>
          ) : null}
        </div>

        <ToggleField
          checked={useWeightedAverageCost}
          description="Al registrar compras, el costo del producto se recalculará con promedio ponderado en lugar de reemplazarse directamente."
          disabled={isDisabled}
          label="Usar costo ponderado"
          onChange={(checked) =>
            setValue('useWeightedAverageCost', checked, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />

        {errors.root?.message ? (
          <div className={styles.errorBanner} role="alert">
            {errors.root.message}
          </div>
        ) : null}

        <div className={styles.footer}>
          <p className={styles.helperText}>
            Estas reglas se aplican en ventas, compras, alertas de inventario y
            tarjetas operativas del dashboard.
          </p>

          <button className={styles.primaryButton} disabled={isDisabled} type="submit">
            {isSubmitting ? 'Guardando reglas...' : 'Guardar configuración'}
          </button>
        </div>
      </form>
    </SurfaceCard>
  )
}
