import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
  X,
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
  ) => Promise<void>
}

type EmployeePermissionsModalProps = {
  preset: EmployeePermissionPreset
  roleLabel: string
  onClose: () => void
}

type EmployeeConfirmationModalProps = {
  employeeName: string
  isSubmitting: boolean
  phone: string
  roleLabel: string
  onClose: () => void
  onConfirm: () => void
  onEdit: () => void
}

type PendingEmployeeConfirmation = {
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
    password: '',
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

function createTemporaryPassword(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const suffix = digits.slice(-4).padStart(4, '0')

  return `Cashgo${suffix}!`
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
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <section
        aria-label={`Permisos de ${roleLabel.toLowerCase()}`}
        aria-modal="true"
        className={styles.permissionsModal}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Cerrar permisos"
          className={styles.modalClose}
          type="button"
          onClick={onClose}
        >
          <X />
        </button>

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
      </section>
    </div>
  )
}

function EmployeeConfirmationModal({
  employeeName,
  isSubmitting,
  phone,
  roleLabel,
  onClose,
  onConfirm,
  onEdit,
}: EmployeeConfirmationModalProps) {
  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <section
        aria-label="Confirmar datos del empleado"
        aria-modal="true"
        className={styles.confirmationModal}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Cerrar confirmacion"
          className={styles.modalClose}
          type="button"
          onClick={onClose}
        >
          <X />
        </button>

        <div className={styles.confirmationHeader}>
          <div className={styles.confirmationIllustration} aria-hidden="true">
            <UserCheck />
          </div>
          <h3 className={styles.confirmationTitle}>
            Confirma los datos de tu empleado
          </h3>
          <p className={styles.confirmationDescription}>
            Recuerda que tu empleado deberá iniciar sesión con su número celular
            para asociarse a tu negocio.
          </p>
        </div>

        <div className={styles.confirmationCard}>
          <div>
            <strong>{employeeName}</strong>
            <span>{formatConfirmationPhone(phone)}</span>
          </div>
          <span className={styles.confirmationRolePill}>{roleLabel}</span>
        </div>

        <div className={styles.confirmationActions}>
          <button
            className={styles.confirmationSecondaryButton}
            disabled={isSubmitting}
            type="button"
            onClick={onEdit}
          >
            Editar
          </button>
          <button
            className={styles.confirmationPrimaryButton}
            disabled={isSubmitting}
            type="button"
            onClick={onConfirm}
          >
            {isSubmitting ? 'Creando...' : 'Confirmar'}
          </button>
        </div>
      </section>
    </div>
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
  const permissionPreset = permissionRole
    ? getPresetForRole(presets, permissionRole)
    : null

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

  const submitEmployee = handleSubmit(async (values) => {
    try {
      const normalizedPhone = normalizePhone(values.phone)

      if (isEditing) {
        await onSubmit({
          name: values.name.trim(),
          phone: normalizedPhone,
          role: values.role,
        })
      } else {
        setPendingConfirmation({
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
      await onSubmit({
        name: pendingConfirmation.values.name.trim(),
        password: createTemporaryPassword(pendingConfirmation.normalizedPhone),
        phone: pendingConfirmation.normalizedPhone,
        role: pendingConfirmation.values.role,
      })
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
      <div className={styles.drawerBackdrop} role="presentation" onClick={onClose}>
        <aside
          aria-label={isEditing ? 'Editar empleado' : 'Crear empleado'}
          aria-modal="true"
          className={styles.drawer}
          role="dialog"
          onClick={(event) => event.stopPropagation()}
        >
          <header className={styles.drawerHeader}>
            <button
              aria-label="Volver"
              className={styles.backButton}
              type="button"
              onClick={onClose}
            >
              <ArrowLeft />
            </button>
            <h2 className={styles.drawerTitle}>
              {isEditing ? 'Editar empleado' : 'Crear empleado'}
            </h2>
          </header>

          <form className={styles.form} noValidate onSubmit={submitEmployee}>
            <div className={styles.formBody}>
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
            </div>

            <footer className={styles.drawerFooter}>
              <button
                className={styles.submitButton}
                disabled={isSubmitting}
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
            </footer>
          </form>
        </aside>
      </div>

      {permissionPreset && permissionRole ? (
        <EmployeePermissionsModal
          preset={permissionPreset}
          roleLabel={getRetailRoleLabel(permissionRole)}
          onClose={() => setPermissionRole(null)}
        />
      ) : null}

      {pendingConfirmation ? (
        <EmployeeConfirmationModal
          employeeName={pendingConfirmation.values.name}
          isSubmitting={isSubmitting}
          phone={pendingConfirmation.normalizedPhone}
          roleLabel={getRetailRoleLabel(pendingConfirmation.values.role)}
          onClose={() => setPendingConfirmation(null)}
          onConfirm={() => {
            void confirmCreateEmployee()
          }}
          onEdit={() => setPendingConfirmation(null)}
        />
      ) : null}
    </>
  )
}
