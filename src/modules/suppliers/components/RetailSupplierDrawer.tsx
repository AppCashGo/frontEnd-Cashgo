import { type FormEvent, useEffect, useState } from 'react'
import { ImagePlus, Truck } from 'lucide-react'
import { DrawerActionFooter } from '@/shared/components/ui/DrawerActionFooter'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import type {
  SupplierMutationInput,
  SupplierSummary,
} from '@/modules/suppliers/types/supplier'
import { AvatarUploadField } from '@/shared/components/ui/AvatarUploadField'
import { AppButton } from '@/shared/components/ui/AppButton'
import { useImageUploadPreview } from '@/shared/hooks/use-image-upload-preview'
import styles from './RetailSupplierDrawer.module.css'

type RetailSupplierDrawerProps = {
  isOpen: boolean
  isSubmitting: boolean
  errorMessage: string | null
  supplier?: SupplierSummary | null
  onClose: () => void
  onSubmit: (
    input: SupplierMutationInput,
    avatarFile?: File | null,
  ) => Promise<void>
}

const initialForm = {
  name: '',
  phone: '',
  documentNumber: '',
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
        documentNumber: supplier?.documentNumber ?? '',
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
    const documentNumber = formValues.documentNumber.trim()

    if (name.length < 2) {
      setLocalError('Escribe el nombre del proveedor.')
      return
    }

    if (phone.length > 0 && phone.length < 7) {
      setLocalError('El celular debe tener al menos 7 caracteres.')
      return
    }

    if (
      documentNumber.length > 0 &&
      documentNumber.replace(/[^a-zA-Z0-9]/g, '').length < 4
    ) {
      setLocalError('El documento debe tener al menos 4 caracteres.')
      return
    }

    setLocalError(null)

    await onSubmit(
      {
        name,
        email: email.length > 0 ? email : null,
        phone: phone.length > 0 ? phone : null,
        documentNumber: documentNumber.length > 0 ? documentNumber : null,
      },
      avatarUpload.file,
    )
  }

  return (
    <SideDrawer
      bodyClassName={styles.drawerBody}
      confirmClose
      footer={
        <DrawerActionFooter className={styles.formFooter} layout="inline">
          <AppButton
            disabled={isSubmitting}
            form="supplier-profile-form"
            isLoading={isSubmitting}
            loadingLabel={supplier ? 'Guardando proveedor…' : 'Creando proveedor…'}
            startIcon={<Truck aria-hidden="true" size={17} />}
            type="submit"
          >
            {supplier ? 'Guardar cambios' : 'Crear proveedor'}
          </AppButton>
        </DrawerActionFooter>
      }
      isCloseDisabled={isSubmitting}
      isOpen={isOpen}
      title={supplier ? 'Editar proveedor' : 'Crear proveedor'}
      onClose={onClose}
    >
      <form className={styles.form} id="supplier-profile-form" onSubmit={handleSubmit}>
        <AvatarUploadField
          alt="Logo del proveedor"
          changeLabel="Cambiar foto o logo"
          uploadLabel="Agregar foto o logo"
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
          <span>Documento</span>
          <input
            className={styles.input}
            maxLength={80}
            placeholder="Ej: 900123456-7"
            type="text"
            value={formValues.documentNumber}
            onChange={(event) =>
              updateField('documentNumber', event.target.value)
            }
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

      </form>
    </SideDrawer>
  )
}
