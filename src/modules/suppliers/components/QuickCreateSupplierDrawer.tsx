import { useEffect, useMemo, useState } from 'react'
import { Truck } from 'lucide-react'
import { useCreateSupplierMutation } from '@/modules/suppliers/hooks/use-suppliers-query'
import type { SupplierSummary } from '@/modules/suppliers/types/supplier'
import { DrawerActionFooter } from '@/shared/components/ui/DrawerActionFooter'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './QuickCreateSupplierDrawer.module.css'

type QuickCreateSupplierDrawerProps = {
  suppliers: SupplierSummary[]
  isOpen: boolean
  description?: string
  onClose: () => void
  onCreated: (supplier: SupplierSummary) => void
}

const initialForm = {
  name: '',
  phone: '',
  documentNumber: '',
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length === 12 && digits.startsWith('57')
    ? digits.slice(2)
    : digits
}

function normalizeDocument(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function optionalValue(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export function QuickCreateSupplierDrawer({
  suppliers,
  isOpen,
  description = 'Regístralo sin salir del movimiento y quedará seleccionado automáticamente.',
  onClose,
  onCreated,
}: QuickCreateSupplierDrawerProps) {
  const createSupplierMutation = useCreateSupplierMutation()
  const resetMutation = createSupplierMutation.reset
  const [form, setForm] = useState(initialForm)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setForm(initialForm)
    setValidationError(null)
    resetMutation()
  }, [isOpen, resetMutation])

  const duplicateError = useMemo(() => {
    const name = normalizeText(form.name)
    const phone = normalizePhone(form.phone)
    const documentNumber = normalizeDocument(form.documentNumber)

    if (
      name &&
      suppliers.some((supplier) => normalizeText(supplier.name) === name)
    ) {
      return 'Ya existe un proveedor registrado con este nombre.'
    }

    if (
      phone &&
      suppliers.some(
        (supplier) =>
          supplier.phone && normalizePhone(supplier.phone) === phone,
      )
    ) {
      return 'Ya existe un proveedor registrado con este celular.'
    }

    if (
      documentNumber &&
      suppliers.some(
        (supplier) =>
          supplier.documentNumber &&
          normalizeDocument(supplier.documentNumber) === documentNumber,
      )
    ) {
      return 'Ya existe un proveedor registrado con este documento.'
    }

    return null
  }, [form.documentNumber, form.name, form.phone, suppliers])

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setValidationError(null)
    resetMutation()
  }

  const handleSubmit = async () => {
    const name = form.name.trim().replace(/\s+/g, ' ')
    const phone = optionalValue(form.phone)
    const documentNumber = optionalValue(form.documentNumber)

    if (name.length < 2) {
      setValidationError('Escribe un nombre de al menos 2 caracteres.')
      return
    }

    if (phone && normalizePhone(phone).length < 7) {
      setValidationError('Escribe un número de celular válido.')
      return
    }

    if (documentNumber && normalizeDocument(documentNumber).length < 4) {
      setValidationError('Escribe un documento válido.')
      return
    }

    if (duplicateError) {
      setValidationError(duplicateError)
      return
    }

    try {
      const supplier = await createSupplierMutation.mutateAsync({
        name,
        phone,
        documentNumber,
        email: null,
      })
      onCreated(supplier)
    } catch {
      // The mutation error is displayed below the form.
    }
  }

  const errorMessage =
    validationError ??
    (createSupplierMutation.error
      ? getErrorMessage(
          createSupplierMutation.error,
          'No fue posible crear el proveedor. Intenta nuevamente.',
        )
      : null)

  return (
    <SideDrawer
      className={styles.drawerLayer}
      closeLabel="Cerrar creación de proveedor"
      description={description}
      isCloseDisabled={createSupplierMutation.isPending}
      isOpen={isOpen}
      title="Crear proveedor"
      titleAccessory={
        <span className={styles.iconBadge}>
          <Truck aria-hidden="true" size={21} strokeWidth={2.2} />
        </span>
      }
      footer={
        <DrawerActionFooter>
          <button
            className={styles.secondaryButton}
            disabled={createSupplierMutation.isPending}
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className={styles.primaryButton}
            disabled={
              createSupplierMutation.isPending || form.name.trim().length < 2
            }
            form="quick-create-supplier-form"
            type="submit"
          >
            {createSupplierMutation.isPending
              ? 'Creando…'
              : 'Crear y seleccionar'}
          </button>
        </DrawerActionFooter>
      }
      onClose={onClose}
    >
      <form
        className={styles.form}
        id="quick-create-supplier-form"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
      >
        <div className={styles.notice}>
          <strong>Evita proveedores duplicados</strong>
          <span>CashGo validará nombre, celular y documento.</span>
        </div>

        <label className={styles.field}>
          <span>Nombre del proveedor *</span>
          <input
            autoFocus
            autoComplete="organization"
            maxLength={120}
            placeholder="Ej. Distribuidora Central"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Celular</span>
          <input
            autoComplete="tel"
            inputMode="tel"
            maxLength={30}
            placeholder="Ej. 320 123 4567"
            type="tel"
            value={form.phone}
            onChange={(event) => updateField('phone', event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Documento o NIT</span>
          <input
            maxLength={80}
            placeholder="Ej. 900123456-7"
            value={form.documentNumber}
            onChange={(event) =>
              updateField('documentNumber', event.target.value)
            }
          />
        </label>

        {duplicateError || errorMessage ? (
          <p className={styles.errorMessage} role="alert">
            {errorMessage ?? duplicateError}
          </p>
        ) : null}
      </form>
    </SideDrawer>
  )
}
