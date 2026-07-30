import { type FormEvent, useEffect, useMemo, useState } from 'react'
import type { BusinessSettings } from '@/modules/settings/types/settings'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { formatCurrency } from '@/shared/utils/format-currency'
import styles from './PrintSettingsPanel.module.css'

type PrintTicketWidth = '58mm' | '80mm'

type PrintSettings = {
  ticketWidth: PrintTicketWidth
  showLogo: boolean
  showTaxDetail: boolean
  footerMessage: string
}

type PrintSettingsPanelProps = {
  businessSettings: BusinessSettings | null
}

const defaultPrintSettings: PrintSettings = {
  ticketWidth: '80mm',
  showLogo: true,
  showTaxDetail: true,
  footerMessage: 'Gracias por tu compra.',
}

function getStorageKey(businessId: string | null | undefined) {
  return `cashgo-print-settings:${businessId ?? 'default'}`
}

function readStoredSettings(storageKey: string): PrintSettings {
  if (typeof window === 'undefined') {
    return defaultPrintSettings
  }

  const storedValue = window.localStorage.getItem(storageKey)

  if (!storedValue) {
    return defaultPrintSettings
  }

  try {
    return {
      ...defaultPrintSettings,
      ...(JSON.parse(storedValue) as Partial<PrintSettings>),
    }
  } catch {
    return defaultPrintSettings
  }
}

export function PrintSettingsPanel({
  businessSettings,
}: PrintSettingsPanelProps) {
  const storageKey = useMemo(
    () => getStorageKey(businessSettings?.id),
    [businessSettings?.id],
  )
  const [settings, setSettings] = useState<PrintSettings>(() =>
    readStoredSettings(storageKey),
  )
  const [feedback, setFeedback] = useState<string | null>(null)
  const sampleSubtotal = 42000
  const sampleTax =
    businessSettings && businessSettings.taxRate > 0
      ? sampleSubtotal * (businessSettings.taxRate / 100)
      : 0
  const sampleTotal = sampleSubtotal + sampleTax

  useEffect(() => {
    setSettings(readStoredSettings(storageKey))
    setFeedback(null)
  }, [storageKey])

  function updateSetting<TField extends keyof PrintSettings>(
    field: TField,
    value: PrintSettings[TField],
  ) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }))
    setFeedback(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    window.localStorage.setItem(storageKey, JSON.stringify(settings))
    setFeedback('Configuracion de impresion guardada para este equipo.')
  }

  function handlePrintTest() {
    window.localStorage.setItem(storageKey, JSON.stringify(settings))
    setFeedback('Ticket de prueba listo para imprimir.')
    window.print()
  }

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Impresion POS</p>
          <h2 className={styles.title}>Formato de tickets y comprobantes</h2>
          <p className={styles.description}>
            Ajusta el ticket que se imprime desde caja, ventas y documentos.
          </p>
        </div>
      </div>

      <form className={styles.workspace} onSubmit={handleSubmit}>
        <div className={styles.controls}>
          <label className={styles.field}>
            <span>Ancho del ticket</span>
            <select
              className={styles.input}
              value={settings.ticketWidth}
              onChange={(event) =>
                updateSetting(
                  'ticketWidth',
                  event.target.value === '58mm' ? '58mm' : '80mm',
                )
              }
            >
              <option value="80mm">80 mm</option>
              <option value="58mm">58 mm</option>
            </select>
          </label>

          <label className={styles.checkField}>
            <input
              checked={settings.showLogo}
              type="checkbox"
              onChange={(event) =>
                updateSetting('showLogo', event.target.checked)
              }
            />
            <span>Mostrar logo o nombre destacado</span>
          </label>

          <label className={styles.checkField}>
            <input
              checked={settings.showTaxDetail}
              type="checkbox"
              onChange={(event) =>
                updateSetting('showTaxDetail', event.target.checked)
              }
            />
            <span>Mostrar detalle de impuestos</span>
          </label>

          <label className={styles.field}>
            <span>Mensaje al pie</span>
            <textarea
              className={styles.textarea}
              maxLength={140}
              value={settings.footerMessage}
              onChange={(event) =>
                updateSetting('footerMessage', event.target.value)
              }
            />
          </label>

          {feedback ? (
            <p className={styles.feedback} role="status">
              {feedback}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button className={styles.secondaryButton} type="button" onClick={handlePrintTest}>
              Imprimir prueba
            </button>
            <button className={styles.primaryButton} type="submit">
              Guardar formato
            </button>
          </div>
        </div>

        <div
          className={
            settings.ticketWidth === '58mm' ? styles.previewNarrow : styles.preview
          }
        >
          {settings.showLogo ? (
            <div className={styles.logoMark}>
              {(businessSettings?.businessName ?? 'C').charAt(0).toUpperCase()}
            </div>
          ) : null}
          <h3>{businessSettings?.businessName ?? 'Nombre del negocio'}</h3>
          <p>{businessSettings?.taxId ?? 'NIT o documento sin configurar'}</p>
          <p>{businessSettings?.address ?? 'Direccion del negocio'}</p>

          <div className={styles.ticketDivider} />

          <div className={styles.ticketRow}>
            <span>Venta POS</span>
            <strong>#000128</strong>
          </div>
          <div className={styles.ticketRow}>
            <span>Producto ejemplo</span>
            <strong>{formatCurrency(sampleSubtotal)}</strong>
          </div>
          {settings.showTaxDetail ? (
            <div className={styles.ticketRow}>
              <span>{businessSettings?.taxLabel ?? 'Impuesto'}</span>
              <strong>{formatCurrency(sampleTax)}</strong>
            </div>
          ) : null}
          <div className={styles.ticketTotal}>
            <span>Total</span>
            <strong>{formatCurrency(sampleTotal)}</strong>
          </div>

          <div className={styles.ticketDivider} />
          <p>{settings.footerMessage || 'Gracias por tu compra.'}</p>
        </div>
      </form>
    </SurfaceCard>
  )
}
