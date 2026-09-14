import { useEffect, useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useCreateCustomerMutation } from '@/modules/customers/hooks/use-customers-query'
import type { CustomerSummary } from '@/modules/customers/types/customer'
import { DrawerActionFooter } from '@/shared/components/ui/DrawerActionFooter'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './QuickCreateCustomerDrawer.module.css'

type QuickCreateCustomerDrawerProps = {
  customers: CustomerSummary[]
  isOpen: boolean
  onClose: () => void
  onCreated: (customer: CustomerSummary) => void
}

type FormState = {
  name: string
  phone: string
  email: string
  documentType: string
  documentNumber: string
  address: string
}

const initialForm: FormState = {
  name: '',
  phone: '',
  email: '',
  documentType: 'CC',
  documentNumber: '',
  address: '',
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
  return digits.length === 12 && digits.startsWith('57') ? digits.slice(2) : digits
}

function normalizeDocument(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function normalizeOptionalValue(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export function QuickCreateCustomerDrawer({
  customers,
  isOpen,
  onClose,
  onCreated,
}: QuickCreateCustomerDrawerProps) {
  const createCustomerMutation = useCreateCustomerMutation()
  const resetCreateCustomerMutation = createCustomerMutation.reset
  const [form, setForm] = useState<FormState>(initialForm)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setForm(initialForm)
    setValidationError(null)
    resetCreateCustomerMutation()
  }, [isOpen, resetCreateCustomerMutation])

  const duplicateError = useMemo(() => {
    const name = normalizeText(form.name)
    const phone = normalizePhone(form.phone)
    const email = form.email.trim().toLowerCase()
    const documentNumber = normalizeDocument(form.documentNumber)

    if (name && customers.some((customer) => normalizeText(customer.name) === name)) {
      return 'Ya existe un cliente registrado con este nombre.'
    }

    if (
      phone &&
      customers.some(
        (customer) => customer.phone && normalizePhone(customer.phone) === phone,
      )
    ) {
      return 'Ya existe un cliente registrado con este celular.'
    }

    if (
      documentNumber &&
      customers.some(
        (customer) =>
          customer.documentNumber &&
          normalizeDocument(customer.documentNumber) === documentNumber,
      )
    ) {
      return 'Ya existe un cliente registrado con esta cédula o documento.'
    }

    if (
      email &&
      customers.some((customer) => customer.email?.trim().toLowerCase() === email)
    ) {
      return 'Ya existe un cliente registrado con este correo.'
    }

    return null
  }, [customers, form.documentNumber, form.email, form.name, form.phone])

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setValidationError(null)
    resetCreateCustomerMutation()
  }

  const handleSubmit = async () => {
    const name = form.name.trim().replace(/\s+/g, ' ')
    const phone = normalizeOptionalValue(form.phone)
    const documentNumber = normalizeOptionalValue(form.documentNumber)

    if (name.length < 2) {
      setValidationError('Escribe un nombre de al menos 2 caracteres.')
      return
    }

    if (phone && normalizePhone(phone).length < 7) {
      setValidationError('Escribe un número de celular válido.')
      return
    }

    if (documentNumber && normalizeDocument(documentNumber).length < 4) {
      setValidationError('Escribe una cédula o documento válido.')
      return
    }

    if (duplicateError) {
      setValidationError(duplicateError)
      return
    }

    try {
      const customer = await createCustomerMutation.mutateAsync({
        name,
        phone,
        email: normalizeOptionalValue(form.email)?.toLowerCase() ?? null,
        documentType: documentNumber ? form.documentType : null,
        documentNumber,
        address: normalizeOptionalValue(form.address),
        balance: 0,
      })

      onCreated(customer)
    } catch {
      // The mutation exposes the server error below the form.
    }
  }

  const errorMessage =
    validationError ??
    (createCustomerMutation.error
      ? getErrorMessage(
          createCustomerMutation.error,
          'No fue posible crear el cliente. Intenta nuevamente.',
        )
      : null)

  return (
    <SideDrawer
      closeLabel="Cerrar creación de cliente"
      description="Regístralo sin salir de la venta y quedará seleccionado automáticamente."
      isCloseDisabled={createCustomerMutation.isPending}
      isOpen={isOpen}
      title="Crear cliente"
      titleAccessory={
        <span className={styles.iconBadge}>
          <UserPlus aria-hidden="true" size={21} strokeWidth={2.2} />
        </span>
      }
      footer={
        <DrawerActionFooter>
          <button
            className={styles.secondaryButton}
            disabled={createCustomerMutation.isPending}
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className={styles.primaryButton}
            disabled={createCustomerMutation.isPending || form.name.trim().length < 2}
            form="quick-create-customer-form"
            type="submit"
          >
            {createCustomerMutation.isPending ? 'Creando…' : 'Crear y seleccionar'}
          </button>
        </DrawerActionFooter>
      }
      onClose={onClose}
    >
      <form
        className={styles.form}
        id="quick-create-customer-form"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
      >
        <div className={styles.notice}>
          <strong>Evita registros duplicados</strong>
          <span>CashGo validará nombre, celular, documento y correo.</span>
        </div>

        <label className={styles.field}>
          <span>Nombre completo *</span>
          <input
            autoFocus
            autoComplete="name"
            maxLength={120}
            placeholder="Ej. María Torres"
            type="text"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Celular</span>
          <input
            autoComplete="tel"
            inputMode="tel"
            maxLength={24}
            placeholder="Ej. 320 123 4567"
            type="tel"
            value={form.phone}
            onChange={(event) => updateField('phone', event.target.value)}
          />
        </label>

        <div className={styles.documentGrid}>
          <label className={styles.field}>
            <span>Tipo</span>
            <select
              value={form.documentType}
              onChange={(event) => updateField('documentType', event.target.value)}
            >
              <option value="CC">Cédula</option>
              <option value="CE">Cédula extranjería</option>
              <option value="NIT">NIT</option>
              <option value="PASSPORT">Pasaporte</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Número de documento</span>
            <input
              inputMode="numeric"
              maxLength={32}
              placeholder="Ej. 1001234567"
              type="text"
              value={form.documentNumber}
              onChange={(event) => updateField('documentNumber', event.target.value)}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span>Correo electrónico</span>
          <input
            autoComplete="email"
            maxLength={160}
            placeholder="cliente@correo.com"
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Dirección</span>
          <input
            autoComplete="street-address"
            maxLength={180}
            placeholder="Dirección del cliente"
            type="text"
            value={form.address}
            onChange={(event) => updateField('address', event.target.value)}
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
