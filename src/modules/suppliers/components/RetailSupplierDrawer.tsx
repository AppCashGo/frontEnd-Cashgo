import { type FormEvent, useEffect, useState } from 'react'
import { ImagePlus, Truck } from 'lucide-react'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import type {
  SupplierMutationInput,
  SupplierSummary,
} from '@/modules/suppliers/types/supplier'
import { AvatarUploadField } from '@/shared/components/ui/AvatarUploadField'
import { useImageUploadPreview } from '@/shared/hooks/use-image-upload-preview'
import styles from './RetailSupplierDrawer.module.css'

type RetailSupplierDrawerProps = {
  isOpen: boolean
  isSubmitting: boolean
  errorMessage: string | null
  supplier?: SupplierSummary | null
  onClose: () => void
  onSubmit: (input: SupplierMutationInput, avatarFile?: File | null) => Promise<void>
}

const initialForm = {
  name: '',
  phone: '',
  email: '',
}

export function RetailSupplierDrawer({
  isOpen,
  isSubmitting,
  errorMessage,
  supplier = null,
  onClose,
  onSubmit,
}: RetailSupplierDrawerProps) {
  const [formValues, setFormValues] = useState(initialForm)
  const [localError, setLocalError] = useState<string | null>(null)
  const avatarUpload = useImageUploadPreview({
    resetKey: `${isOpen ? 'open' : 'closed'}:${supplier?.id ?? 'new'}`,
    storedImageUrl: supplier?.avatarUrl,
  })

  useEffect(() => {
    if (isOpen) {
      setFormValues({
        name: supplier?.name ?? '',
        phone: supplier?.phone ?? '',
        email: supplier?.email ?? '',
      })
      setLocalError(null)
    }
  }, [isOpen, supplier])

  function updateField(field: keyof typeof initialForm, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
  }

  function handleAvatarChange(file: File | null) {
    const validationError = avatarUpload.selectFile(file)

    if (validationError) {
      setLocalError(validationError)
      return
    }

    setLocalError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = formValues.name.trim()
    const email = formValues.email.trim()
    const phone = formValues.phone.trim()

    if (name.length < 2) {
      setLocalError('Escribe el nombre del proveedor.')
      return
    }

    if (phone.length > 0 && phone.length < 7) {
      setLocalError('El celular debe tener al menos 7 caracteres.')
      return
    }

    setLocalError(null)

    await onSubmit(
      {
        name,
        email: email.length > 0 ? email : null,
        phone: phone.length > 0 ? phone : null,
      },
      avatarUpload.file,
    )
  }

  return (
    <SideDrawer
      bodyClassName={styles.drawerBody}
      isOpen={isOpen}
      title={supplier ? 'Editar proveedor' : 'Crear proveedor'}
      onClose={onClose}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <AvatarUploadField
          alt="Avatar del proveedor"
          disabled={isSubmitting}
          hint="PNG, JPG o WebP hasta 2MB."
          imageUrl={avatarUpload.visibleImageUrl}
          placeholderIcon={<Truck size={26} />}
          trailingIcon={<ImagePlus size={20} />}
          variant="card"
          onSelectFile={handleAvatarChange}
        />

        <label className={styles.field}>
          <span>Nombre del proveedor *</span>
          <input
            required
            className={styles.input}
            maxLength={120}
            placeholder="Ej: Distribuidora principal"
            type="text"
            value={formValues.name}
            onChange={(event) => updateField('name', event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Número celular</span>
          <input
            className={styles.input}
            maxLength={30}
            placeholder="Ej: 3001234567"
            type="tel"
            value={formValues.phone}
            onChange={(event) => updateField('phone', event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Correo electrónico</span>
          <input
            className={styles.input}
            maxLength={191}
            placeholder="proveedor@correo.com"
            type="email"
            value={formValues.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
        </label>

        {localError || errorMessage ? (
          <p className={styles.errorText} role="alert">
            {localError ?? errorMessage}
          </p>
        ) : null}

        <button
          className={styles.primaryButton}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? supplier
              ? 'Guardando proveedor...'
              : 'Creando proveedor...'
            : supplier
              ? 'Guardar cambios'
              : 'Crear proveedor'}
        </button>
      </form>
    </SideDrawer>
  )
}
