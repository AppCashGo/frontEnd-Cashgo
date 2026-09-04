import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  employeeFormSchema,
  type EmployeeFormValues,
} from '@/modules/employees/schemas/employee-form-schema'
import type {
  Employee,
  EmployeeCreateInput,
  EmployeePermissionGroup,
  EmployeePermissionItem,
  EmployeePermissionPreset,
  EmployeeUpdateInput,
} from '@/modules/employees/types/employee'
import type { AssignableUserRole } from '@/shared/constants/user-roles'
import { AvatarUploadField } from '@/shared/components/ui/AvatarUploadField'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { ModalShell } from '@/shared/components/ui/ModalShell'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import { useImageUploadPreview } from '@/shared/hooks/use-image-upload-preview'
import { ApiError } from '@/shared/services/api-client'
import styles from './RetailEmployeeDrawer.module.css'

type RetailRoleOption = {
  role: AssignableUserRole
  label: string
  presetId: string
}

type RetailEmployeeDrawerProps = {
  employee: Employee | null
  isOpen: boolean
  isSubmitting: boolean
  presets: EmployeePermissionPreset[]
  roles: readonly AssignableUserRole[]
  onClose: () => void
  onSubmit: (
    input: EmployeeCreateInput | EmployeeUpdateInput,
    avatarFile?: File | null,
  ) => Promise<void>
}

type EmployeePermissionsModalProps = {
  preset: EmployeePermissionPreset
  roleLabel: string
  onClose: () => void
}

type PendingEmployeeConfirmation = {
  avatarFile: File | null
  normalizedPhone: string
  values: EmployeeFormValues
}

const primaryRetailRoleOptions: RetailRoleOption[] = [
  { role: 'ADMIN', label: 'Administrador', presetId: 'ADMINISTRATOR' },
  { role: 'SELLER', label: 'Mesero o vendedor', presetId: 'SELLER_OPERATOR' },
  { role: 'STAFF', label: 'Domiciliario', presetId: 'SELLER_OPERATOR' },
]

const fallbackRoleLabels: Partial<Record<AssignableUserRole, string>> = {
  ACCOUNTANT: 'Contador',
  CASHIER: 'Cajero',
  MANAGER: 'Gerente',
}

const permissionGroupLabels: Record<string, string> = {
  admin: 'Configuraciones',
  cash: 'Caja',
  catalog: 'Inventario',
  contacts: 'Clientes y proveedores',
  finance: 'Reportes',
  operations: 'Caja',
  sales: 'Ventas y gastos',
  tables: 'Mesas',
}

const permissionLabels: Record<string, string> = {
  'cash.close': 'Cerrar caja',
  'cash.manage': 'Abrir, cerrar y revisar caja',
  'cash.open': 'Abrir caja',
  'cash.summary': 'Ver resumen de caja',
  'customers.manage': 'Crear y editar clientes',
  'customers.view': 'Ver clientes y proveedores',
  'expenses.manage': 'Registrar, editar o eliminar gastos',
  'expenses.view': 'Visualizar gastos',
  'inventory.adjust': 'Ajustar cantidades de inventario',
  'inventory.view': 'Ver alertas de inventario',
  'products.manage': 'Crear y editar productos',
  'products.view': 'Visualizar productos',
  'receivables.manage': 'Gestionar cuentas por cobrar',
  'reports.export': 'Exportar reportes',
  'reports.view': 'Ver reportes',
  'sales.create': 'Registrar ventas y gastos',
  'sales.delete': 'Eliminar ventas y gastos',
  'sales.edit': 'Editar o eliminar ventas y gastos',
  'sales.view': 'Visualizar movimientos',
  'settings.manage': 'Modificar configuraciones',
  'suppliers.manage': 'Crear y editar proveedores',
  'suppliers.view': 'Ver proveedores',
  'tables.manage': 'Crear y administrar mesas',
  'tables.view': 'Ver mesas',
  'team.manage': 'Crear empleados y editar permisos',
}

function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'No pudimos guardar el empleado. Intenta otra vez.'
}

function getRetailRoleLabel(role: AssignableUserRole) {
  return (
    primaryRetailRoleOptions.find((option) => option.role === role)?.label ??
    fallbackRoleLabels[role] ??
    role
  )
}

function getRetailRolePresetId(role: AssignableUserRole) {
  return (
    primaryRetailRoleOptions.find((option) => option.role === role)?.presetId ??
    (role === 'ACCOUNTANT' ? 'ACCOUNTING_CONTROL' : 'SELLER_OPERATOR')
  )
}

function getRoleForForm(employee: Employee | null): AssignableUserRole {
  const role = employee?.role

  if (role === 'ADMIN' || role === 'SELLER' || role === 'STAFF') {
    return role
  }

  if (role === 'MANAGER') {
    return 'ADMIN'
  }

  return 'SELLER'
}

function getDefaultValues(employee: Employee | null): EmployeeFormValues {
  return {
    name: employee?.name ?? '',
    email: employee?.email.includes('@users.cashgo.local')
      ? ''
      : (employee?.email ?? ''),
    phone: employee?.phone?.replace(/^\+57/, '') ?? '',
    role: getRoleForForm(employee),
  }
}

function getAvailableRetailRoles(
  roles: readonly AssignableUserRole[],
  selectedRole: AssignableUserRole,
) {
  const allowedRoles = new Set(
    roles.length > 0
      ? roles
      : primaryRetailRoleOptions.map((option) => option.role),
  )
  const options = primaryRetailRoleOptions.filter((option) =>
    allowedRoles.has(option.role),
  )

  if (!options.some((option) => option.role === selectedRole)) {
    options.push({
      role: selectedRole,
      label: getRetailRoleLabel(selectedRole),
      presetId: getRetailRolePresetId(selectedRole),
    })
  }

  return options
}

function getPresetForRole(
  presets: EmployeePermissionPreset[],
  role: AssignableUserRole,
) {
  const presetId = getRetailRolePresetId(role)

  return (
    presets.find((preset) => preset.id === presetId) ??
    presets.find((preset) => preset.recommendedRoles.includes(role)) ??
    presets[0] ??
    null
  )
}

function normalizePhone(phone: string) {
  const trimmedPhone = phone.trim()

  if (trimmedPhone.startsWith('+')) {
    return trimmedPhone
  }

  return `+57${trimmedPhone.replace(/\D/g, '')}`
}

function formatConfirmationPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')

  if (digits.startsWith('57') && digits.length > 2) {
    return `+57 ${digits.slice(2)}`
  }

  return phone
}

function getPermissionLabel(permission: EmployeePermissionItem) {
  return permissionLabels[permission.key] ?? permission.label
}

function getGroupLabel(group: EmployeePermissionGroup) {
  return permissionGroupLabels[group.id] ?? group.label
}

function getInitialExpandedGroups(preset: EmployeePermissionPreset) {
  const firstGroupId = preset.permissionGroups[0]?.id

  return new Set(firstGroupId ? [firstGroupId] : [])
}

function EmployeePermissionsModal({
  preset,
  roleLabel,
  onClose,
}: EmployeePermissionsModalProps) {
  const allPermissionKeys = useMemo(
    () =>
      preset.permissionGroups.flatMap((group) =>
        group.permissions.map((permission) => permission.key),
      ),
    [preset],
  )
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    () => new Set(allPermissionKeys),
  )
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => getInitialExpandedGroups(preset),
  )

  useEffect(() => {
    setSelectedPermissions(new Set(allPermissionKeys))
    setExpandedGroups(getInitialExpandedGroups(preset))
  }, [allPermissionKeys, preset])

  function togglePermission(permissionKey: string) {
    setSelectedPermissions((currentPermissions) => {
      const nextPermissions = new Set(currentPermissions)

      if (nextPermissions.has(permissionKey)) {
        nextPermissions.delete(permissionKey)
      } else {
        nextPermissions.add(permissionKey)
      }

      return nextPermissions
    })
  }

  function toggleGroup(group: EmployeePermissionGroup) {
    const groupPermissionKeys = group.permissions.map((permission) => permission.key)
    const isGroupSelected = groupPermissionKeys.every((permissionKey) =>
      selectedPermissions.has(permissionKey),
    )

    setSelectedPermissions((currentPermissions) => {
      const nextPermissions = new Set(currentPermissions)

      for (const permissionKey of groupPermissionKeys) {
        if (isGroupSelected) {
          nextPermissions.delete(permissionKey)
        } else {
          nextPermissions.add(permissionKey)
        }
      }

      return nextPermissions
    })
  }

  function toggleExpandedGroup(groupId: string) {
    setExpandedGroups((currentGroups) => {
      const nextGroups = new Set(currentGroups)

      if (nextGroups.has(groupId)) {
        nextGroups.delete(groupId)
      } else {
        nextGroups.add(groupId)
      }

      return nextGroups
    })
  }

  return (
    <ModalShell
      ariaLabel={`Permisos de ${roleLabel.toLowerCase()}`}
      className={styles.modalBackdrop}
      closeButtonClassName={styles.modalClose}
      closeLabel="Cerrar permisos"
      isOpen
      panelClassName={styles.permissionsModal}
      onClose={onClose}
    >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            Permisos de {roleLabel.toLowerCase()}
          </h3>
          <p className={styles.modalDescription}>
            Elige que puede hacer esta persona dentro de tu tienda.
          </p>
        </div>

        <div className={styles.permissionsList}>
          {preset.permissionGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id)
            const groupPermissionKeys = group.permissions.map(
              (permission) => permission.key,
            )
            const isGroupSelected = groupPermissionKeys.every((permissionKey) =>
              selectedPermissions.has(permissionKey),
            )

            return (
              <article className={styles.permissionGroupCard} key={group.id}>
                <div className={styles.permissionGroupHeader}>
                  <button
                    aria-label={
                      isGroupSelected
                        ? `Quitar ${getGroupLabel(group)}`
                        : `Activar ${getGroupLabel(group)}`
                    }
                    className={
                      isGroupSelected
                        ? styles.permissionCheckActive
                        : styles.permissionCheck
                    }
                    type="button"
                    onClick={() => toggleGroup(group)}
                  >
                    {isGroupSelected ? <Check /> : null}
                  </button>
                  <button
                    className={styles.permissionGroupToggle}
                    type="button"
                    onClick={() => toggleExpandedGroup(group.id)}
                  >
                    <strong>{getGroupLabel(group)}</strong>
                    {isExpanded ? <ChevronUp /> : <ChevronDown />}
                  </button>
                </div>

                {isExpanded ? (
                  <div className={styles.permissionItems}>
                    {group.permissions.map((permission) => {
                      const isPermissionSelected = selectedPermissions.has(
                        permission.key,
                      )

                      return (
                        <button
                          className={styles.permissionItem}
                          key={permission.key}
                          type="button"
                          onClick={() => togglePermission(permission.key)}
                        >
                          <span
                            className={
                              isPermissionSelected
                                ? styles.permissionItemCheckActive
                                : styles.permissionItemCheck
                            }
                          >
                            {isPermissionSelected ? <Check /> : null}
                          </span>
                          <span>{getPermissionLabel(permission)}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>

        <button className={styles.modalPrimaryButton} type="button" onClick={onClose}>
          Modificar permisos
        </button>
    </ModalShell>
  )
}

export function RetailEmployeeDrawer({
  employee,
  isOpen,
  isSubmitting,
  presets,
  roles,
  onClose,
  onSubmit,
}: RetailEmployeeDrawerProps) {
  const isEditing = employee !== null
  const [isRoleMenuOpen, setRoleMenuOpen] = useState(false)
  const [permissionRole, setPermissionRole] = useState<AssignableUserRole | null>(
    null,
  )
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingEmployeeConfirmation | null>(null)
  const {
    clearErrors,
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    defaultValues: getDefaultValues(employee),
    resolver: zodResolver(employeeFormSchema),
  })
  const selectedRole = watch('role')
  const roleOptions = getAvailableRetailRoles(roles, selectedRole)
  const drawerTitle = isEditing ? 'Editar empleado' : 'Crear empleado'
  const formId = 'retail-employee-form'
  const permissionPreset = permissionRole
    ? getPresetForRole(presets, permissionRole)
    : null
  const avatarUpload = useImageUploadPreview({
    resetKey: `${isOpen ? 'open' : 'closed'}:${employee?.id ?? 'new'}`,
    storedImageUrl: employee?.avatarUrl,
  })
  const visibleAvatarUrl = avatarUpload.visibleImageUrl

  useEffect(() => {
    if (!isOpen) {
      return
    }

    reset(getDefaultValues(employee))
    setRoleMenuOpen(false)
    setPermissionRole(null)
    setPendingConfirmation(null)
  }, [employee, isOpen, reset])

  function selectRole(role: AssignableUserRole) {
    setValue('role', role, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function handleAvatarChange(file: File | null) {
    const validationError = avatarUpload.selectFile(file)

    if (validationError) {
      setError('root', {
        message: validationError,
      })
      return
    }

    clearErrors('root')
  }

  const submitEmployee = handleSubmit(async (values) => {
    try {
      const normalizedPhone = normalizePhone(values.phone)

      if (isEditing) {
        await onSubmit(
          {
            name: values.name.trim(),
            phone: normalizedPhone,
            role: values.role,
          },
          avatarUpload.file,
        )
      } else {
        setPendingConfirmation({
          avatarFile: avatarUpload.file,
          normalizedPhone,
          values: {
            ...values,
            name: values.name.trim(),
            phone: values.phone.trim(),
          },
        })
        setPermissionRole(null)
        setRoleMenuOpen(false)
        return
      }

      onClose()
    } catch (error) {
      setError('root', {
        message: getApiErrorMessage(error),
      })
    }
  })

  async function confirmCreateEmployee() {
    if (!pendingConfirmation) {
      return
    }

    try {
      await onSubmit(
        {
          name: pendingConfirmation.values.name.trim(),
          phone: pendingConfirmation.normalizedPhone,
          role: pendingConfirmation.values.role,
        },
        pendingConfirmation.avatarFile,
      )
      setPendingConfirmation(null)
      onClose()
    } catch (error) {
      setPendingConfirmation(null)
      setError('root', {
        message: getApiErrorMessage(error),
      })
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      <SideDrawer
        ariaLabel={drawerTitle}
        bodyClassName={styles.drawerBody}
        className={styles.drawerBackdrop}
        closeButtonClassName={styles.backButton}
        closeButtonPlacement="start"
        closeContent={<ArrowLeft />}
        closeLabel="Volver"
        footer={
          <button
            className={styles.submitButton}
            disabled={isSubmitting}
            form={formId}
            type="submit"
          >
            {isSubmitting
              ? isEditing
                ? 'Guardando...'
                : 'Creando...'
              : isEditing
                ? 'Guardar empleado'
                : 'Crear empleado'}
          </button>
        }
        footerClassName={styles.drawerFooter}
        isOpen={isOpen}
        panelClassName={styles.drawer}
        title={drawerTitle}
        onClose={onClose}
      >
        <form className={styles.form} id={formId} noValidate onSubmit={submitEmployee}>
          <AvatarUploadField
            alt="Avatar del empleado"
            disabled={isSubmitting}
            imageUrl={visibleAvatarUrl}
            onSelectFile={handleAvatarChange}
          />

          <label className={styles.field}>
            <span className={styles.label}>Nombre *</span>
            <input
              aria-invalid={Boolean(errors.name)}
              className={styles.input}
              placeholder="Martha"
              type="text"
              {...register('name')}
            />
            {errors.name ? (
              <span className={styles.errorText}>{errors.name.message}</span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Numero celular de tu empleado *</span>
            <span className={styles.phoneField}>
              <span className={styles.countrySelect}>
                <span className={styles.flagColombia} aria-hidden="true" />
                <ChevronDown />
              </span>
              <input
                aria-invalid={Boolean(errors.phone)}
                className={styles.phoneInput}
                inputMode="tel"
                placeholder="3176469300"
                type="tel"
                {...register('phone')}
              />
            </span>
            {errors.phone ? (
              <span className={styles.errorText}>{errors.phone.message}</span>
            ) : null}
          </label>

          <div className={styles.field}>
            <span className={styles.label}>Rol *</span>
            <div className={styles.roleSelectWrapper}>
              <button
                aria-expanded={isRoleMenuOpen}
                className={styles.roleSelectButton}
                type="button"
                onClick={() => setRoleMenuOpen((isOpenMenu) => !isOpenMenu)}
              >
                <span>
                  {selectedRole
                    ? getRetailRoleLabel(selectedRole)
                    : 'Selecciona un rol'}
                </span>
                {isRoleMenuOpen ? <ChevronUp /> : <ChevronDown />}
              </button>

              {isRoleMenuOpen ? (
                <div className={styles.roleMenu}>
                  {roleOptions.map((option) => (
                    <div className={styles.roleOption} key={option.role}>
                      <button
                        className={styles.roleChoiceButton}
                        type="button"
                        onClick={() => {
                          selectRole(option.role)
                          setRoleMenuOpen(false)
                        }}
                      >
                        {option.label}
                      </button>
                      <button
                        className={styles.permissionLink}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          selectRole(option.role)
                          setPermissionRole(option.role)
                          setRoleMenuOpen(false)
                        }}
                      >
                        Ver Permisos
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            {errors.role ? (
              <span className={styles.errorText}>{errors.role.message}</span>
            ) : null}
          </div>

          {errors.root?.message ? (
            <div className={styles.errorBanner} role="alert">
              {errors.root.message}
            </div>
          ) : null}
        </form>
      </SideDrawer>

      {permissionPreset && permissionRole ? (
        <EmployeePermissionsModal
          preset={permissionPreset}
          roleLabel={getRetailRoleLabel(permissionRole)}
          onClose={() => setPermissionRole(null)}
        />
      ) : null}

      {pendingConfirmation ? (
        <ConfirmDialog
          cancelLabel="Editar"
          confirmLabel="Confirmar"
          description="Recuerda que tu empleado deberá iniciar sesión con su número celular para asociarse a tu negocio."
          icon={<UserCheck />}
          isOpen={Boolean(pendingConfirmation)}
          isSubmitting={isSubmitting}
          submittingLabel="Creando..."
          title="Confirma los datos de tu empleado"
          tone="warning"
          onCancel={() => setPendingConfirmation(null)}
          onConfirm={() => {
            void confirmCreateEmployee()
          }}
        >
          <div className={styles.confirmationCard}>
            <div>
              <strong>{pendingConfirmation.values.name}</strong>
              <span>
                {formatConfirmationPhone(pendingConfirmation.normalizedPhone)}
              </span>
            </div>
            <span className={styles.confirmationRolePill}>
              {getRetailRoleLabel(pendingConfirmation.values.role)}
            </span>
          </div>
        </ConfirmDialog>
      ) : null}
    </>
  )
}
