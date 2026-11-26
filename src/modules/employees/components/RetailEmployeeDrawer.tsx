import { EmployeeAccessInvitation } from "./EmployeeAccessInvitation"
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  BarChart3,
  Camera,
  Check,
  CircleCheck,
  Clock3,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Mail,
  PackageCheck,
  ReceiptText,
  Phone,
  Save,
  Settings2,
  ShieldCheck,
  UserCheck,
  UserRound,
  UsersRound,
  UtensilsCrossed,
  UserPlus,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
import { assignableUserRoles, type AssignableUserRole } from '@/shared/constants/user-roles'
import { AvatarUploadField } from '@/shared/components/ui/AvatarUploadField'
import { AppButton } from '@/shared/components/ui/AppButton'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { ModalShell } from '@/shared/components/ui/ModalShell'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import { useImageUploadPreview } from '@/shared/hooks/use-image-upload-preview'
import { ApiError } from '@/shared/services/api-client'
import styles from './RetailEmployeeDrawer.module.css'

type RetailRoleOption = {
  role: AssignableUserRole
  label: string
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
  { role: 'ADMIN', label: 'Administrador' },
  { role: 'SELLER', label: 'Mesero o vendedor' },
  { role: 'STAFF', label: 'Domiciliario' },
]

const fallbackRoleLabels: Partial<Record<AssignableUserRole, string>> = {
  ACCOUNTANT: 'Contador',
  CASHIER: 'Cajero',
  MANAGER: 'Gerente',
}

const permissionGroupLabels: Record<string, string> = {
  admin: 'Configuraciones',
  cash: 'Caja y gastos',
  catalog: 'Inventario',
  contacts: 'Clientes y proveedores',
  finance: 'Reportes',
  operations: 'Caja',
  sales: 'Ventas',
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
  'sales.create': 'Registrar ventas',
  'sales.delete': 'Anular ventas',
  'sales.edit': 'Editar ventas',
  'sales.view': 'Visualizar movimientos',
  'settings.manage': 'Modificar configuraciones',
  'suppliers.manage': 'Crear y editar proveedores',
  'suppliers.view': 'Ver proveedores',
  'tables.manage': 'Crear y administrar mesas',
  'tables.view': 'Ver mesas',
  'team.manage': 'Crear empleados, editar perfiles y retirar accesos',
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

function getRoleForForm(employee: Employee | null): AssignableUserRole {
  const role = employee?.role
  return role && role !== 'OWNER' && assignableUserRoles.includes(role) ? role : 'SELLER'
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
    })
  }

  return options
}

function getPresetForRole(
  presets: EmployeePermissionPreset[],
  role: AssignableUserRole,
) {
  return presets.find((preset) => preset.recommendedRoles.includes(role)) ?? null
}

function normalizePhone(phone: string) {
  const trimmedPhone = phone.trim()
  if (!trimmedPhone) return ""

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

function getPermissionGroupIcon(groupId: string) {
  switch (groupId) {
    case 'sales':
      return <ReceiptText aria-hidden="true" />
    case 'tables':
      return <UtensilsCrossed aria-hidden="true" />
    case 'cash':
    case 'operations':
      return <DollarSign aria-hidden="true" />
    case 'catalog':
      return <PackageCheck aria-hidden="true" />
    case 'finance':
      return <BarChart3 aria-hidden="true" />
    case 'contacts':
      return <UsersRound aria-hidden="true" />
    case 'admin':
      return <Settings2 aria-hidden="true" />
    default:
      return <ShieldCheck aria-hidden="true" />
  }
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
  const permissionCount = preset.permissionGroups.reduce(
    (total, group) => total + group.permissions.length,
    0,
  )
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => getInitialExpandedGroups(preset),
  )

  useEffect(() => {
    setExpandedGroups(getInitialExpandedGroups(preset))
  }, [preset])

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
          <span className={styles.modalHeaderIcon}>
            <ShieldCheck aria-hidden="true" />
          </span>
          <div className={styles.modalHeaderCopy}>
            <h3 className={styles.modalTitle}>
              Permisos de {roleLabel.toLowerCase()}
            </h3>
            <p className={styles.modalDescription}>
              Acciones asociadas a este rol. La disponibilidad depende de los módulos del negocio.
            </p>
          </div>
        </div>

        <div className={styles.permissionsSummary}>
          <div>
            <strong>{permissionCount}</strong>
            <span>{permissionCount === 1 ? 'permiso' : 'permisos'} en {preset.permissionGroups.length} áreas</span>
          </div>
          <button
            autoFocus
            className={styles.expandPermissions}
            type="button"
            onClick={() => setExpandedGroups(
              expandedGroups.size === preset.permissionGroups.length
                ? new Set()
                : new Set(preset.permissionGroups.map((group) => group.id)),
            )}
          >
            {expandedGroups.size === preset.permissionGroups.length ? 'Contraer todo' : 'Expandir todo'}
          </button>
        </div>

        <div className={styles.permissionsList}>
          {preset.permissionGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id)
            return (
              <article
                className={`${styles.permissionGroupCard} ${
                  isExpanded ? styles.permissionGroupCardExpanded : ''
                }`}
                key={group.id}
              >
                <div className={styles.permissionGroupHeader}>
                  <button
                    className={styles.permissionGroupToggle}
                    aria-controls={`permission-group-${group.id}`}
                    aria-expanded={isExpanded}
                    type="button"
                    onClick={() => toggleExpandedGroup(group.id)}
                  >
                    <span className={styles.permissionGroupIdentity}>
                      <span className={styles.permissionGroupIcon}>
                        {getPermissionGroupIcon(group.id)}
                      </span>
                      <span className={styles.permissionGroupCopy}>
                        <strong>{getGroupLabel(group)}</strong>
                        <small>
                          {group.permissions.length}{' '}
                          {group.permissions.length === 1 ? 'permiso' : 'permisos'}
                        </small>
                      </span>
                    </span>
                    <span className={styles.permissionChevron}>
                      {isExpanded ? <ChevronUp /> : <ChevronDown />}
                    </span>
                  </button>
                </div>

                <ul
                  className={styles.permissionItems}
                  hidden={!isExpanded}
                  id={`permission-group-${group.id}`}
                >
                  {isExpanded ? group.permissions.map((permission) => (
                    <li className={styles.permissionItem} key={permission.key}>
                      <Check aria-hidden="true" />
                      <span>{getPermissionLabel(permission)}</span>
                    </li>
                  )) : null}
                </ul>
              </article>
            )
          })}
        </div>

        <div className={styles.permissionsFooter}>
          <AppButton
            fullWidth
            startIcon={<ShieldCheck aria-hidden="true" size={18} />}
            type="button"
            onClick={onClose}
          >
            Volver al formulario
          </AppButton>
        </div>
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
  const permissionTrigger = useRef<HTMLButtonElement | null>(null)
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
    formState: { errors, isDirty },
  } = useForm<EmployeeFormValues>({
    defaultValues: getDefaultValues(employee),
    resolver: zodResolver(employeeFormSchema),
  })
  const selectedRole = watch('role')
  const roleOptions = getAvailableRetailRoles(roles, selectedRole)
  const selectedPermissions = getPresetForRole(presets, selectedRole)
  const employeeEmail = employee && !employee.email.endsWith('@users.cashgo.local') ? employee.email : null
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

  function showPermissions(role: AssignableUserRole, trigger: HTMLButtonElement) {
    permissionTrigger.current = trigger
    setPermissionRole(role)
  }

  function closePermissions() {
    setPermissionRole(null)
    permissionTrigger.current?.focus()
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
    if (!isEditing && !values.email.trim()) {
      setError('email', { message: 'Indica el correo personal del empleado.' })
      return
    }
    try {
      const normalizedPhone = normalizePhone(values.phone)

      if (isEditing) {
        await onSubmit(
          {
            name: values.name.trim(),
            ...(normalizedPhone ? { phone: normalizedPhone } : {}),
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
          email: pendingConfirmation.values.email.trim(),
          ...(pendingConfirmation.normalizedPhone ? { phone: pendingConfirmation.normalizedPhone } : {}),
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
        confirmClose={isDirty || Boolean(avatarUpload.file)}
        isCloseDisabled={isSubmitting}
        description={isEditing ? 'Actualiza el perfil y revisa el acceso al negocio.' : 'Completa el perfil y envía el acceso por correo.'}
        closeButtonClassName={styles.backButton}
        closeButtonPlacement="start"
        closeContent={<ArrowLeft />}
        closeLabel="Volver"
        footer={
          <AppButton
            fullWidth
            disabled={isSubmitting}
            form={formId}
            isLoading={isSubmitting}
            loadingLabel={isEditing ? 'Guardando...' : 'Creando...'}
            size="lg"
            startIcon={
              isEditing ? (
                <Save aria-hidden="true" size={19} />
              ) : (
                <UserPlus aria-hidden="true" size={19} />
              )
            }
            type="submit"
          >
            {isEditing ? 'Guardar empleado' : 'Crear empleado'}
          </AppButton>
        }
        footerClassName={styles.drawerFooter}
        isOpen={isOpen}
        panelClassName={styles.drawer}
        title={drawerTitle}
        onClose={onClose}
      >
        {employee ? (
          <section className={styles.accessPanel} aria-label="Estado del acceso">
            <span
              className={styles.accessIcon}
              data-active={employee.activationStatus === 'ACTIVE'}
            >
              {employee.activationStatus === 'ACTIVE'
                ? <CircleCheck aria-hidden="true" />
                : <Clock3 aria-hidden="true" />}
            </span>
            <div>
              <strong>{employee.activationStatus === 'ACTIVE' ? 'Acceso activo' : 'Activación pendiente'}</strong>
              {employeeEmail ? <p>{employeeEmail}</p> : null}
            </div>
          </section>
        ) : null}
        {employee?.canInviteAccess ? (
          <EmployeeAccessInvitation key={employee.id} employee={employee} />
        ) : null}
        <form className={styles.form} id={formId} noValidate onSubmit={submitEmployee}>
          <AvatarUploadField
            alt="Foto del empleado"
            className={styles.avatarCard}
            changeLabel="Cambiar foto"
            disabled={isSubmitting}
            hint="Se muestra junto a su nombre en el equipo."
            imageUrl={visibleAvatarUrl}
            placeholderIcon={<UserRound />}
            trailingIcon={<Camera />}
            uploadLabel="Agregar foto"
            variant="card"
            onSelectFile={handleAvatarChange}
          />

          <section className={styles.formSection} aria-label="Datos de contacto">
            <h3><Mail aria-hidden="true" /> Datos de contacto</h3>
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

            {!isEditing ? (
              <label className={styles.field}>
                <span className={styles.label}>Correo del empleado *</span>
                <input aria-invalid={Boolean(errors.email)} className={styles.input} type="email" autoComplete="email" {...register('email')} />
                <small className={styles.fieldHint}>Aquí recibirá el enlace para crear su contraseña.</small>
                {errors.email ? <span className={styles.errorText}>{errors.email.message}</span> : null}
              </label>
            ) : null}

            <label className={styles.field}>
              <span className={styles.label}>Celular del empleado (opcional)</span>
              <span className={styles.phoneField}>
                <span className={styles.phoneIcon}><Phone aria-hidden="true" /></span>
                <input
                  aria-invalid={Boolean(errors.phone)}
                  className={styles.phoneInput}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="300 123 4567"
                  type="tel"
                  {...register('phone')}
                />
              </span>
              <small className={styles.fieldHint}>Usamos +57 para números locales. También puedes escribir el número con su indicativo.</small>
              {errors.phone ? (
                <span className={styles.errorText}>{errors.phone.message}</span>
              ) : null}
            </label>
          </section>

          <section className={styles.formSection} aria-label="Rol y permisos">
            <h3><ShieldCheck aria-hidden="true" /> Rol y permisos</h3>
            <div className={styles.field}>
              <span className={styles.label} id="retail-employee-role-label">Rol *</span>
              <div className={styles.roleSelectWrapper}>
                <button
                  aria-expanded={isRoleMenuOpen}
                  aria-controls="retail-employee-role-options"
                  aria-labelledby="retail-employee-role-label retail-employee-role-value"
                  className={styles.roleSelectButton}
                  type="button"
                  onClick={() => setRoleMenuOpen((isOpenMenu) => !isOpenMenu)}
                >
                  <span className={styles.roleSelectValue}>
                    <span className={styles.roleSelectIcon}>
                      <UserCheck aria-hidden="true" />
                    </span>
                    <span className={styles.roleSelectCopy}>
                      <strong id="retail-employee-role-value">
                        {selectedRole
                          ? getRetailRoleLabel(selectedRole)
                          : 'Selecciona un rol'}
                      </strong>
                      <small>Perfil de acceso del empleado</small>
                    </span>
                  </span>
                  <span className={styles.roleSelectChevron}>
                    {isRoleMenuOpen ? <ChevronUp /> : <ChevronDown />}
                  </span>
                </button>

                {isRoleMenuOpen ? (
                  <div className={styles.roleMenu} id="retail-employee-role-options">
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
                          <span className={styles.roleOptionIcon}>
                            <UserCheck aria-hidden="true" />
                          </span>
                          <span>{option.label}</span>
                          {option.role === selectedRole ? (
                            <Check className={styles.roleSelectedIcon} aria-hidden="true" />
                          ) : null}
                        </button>
                        {getPresetForRole(presets, option.role) ? (
                          <button
                            aria-label={`Ver permisos de ${option.label}`}
                            className={styles.permissionLink}
                            type="button"
                            onClick={(event) => showPermissions(option.role, event.currentTarget)}
                          >
                            Ver permisos
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              {errors.role ? (
                <span className={styles.errorText}>{errors.role.message}</span>
              ) : null}
            </div>
            {selectedPermissions ? (
              <button
                className={styles.selectedPermissionLink}
                type="button"
                onClick={(event) => showPermissions(selectedRole, event.currentTarget)}
              >
                <ShieldCheck aria-hidden="true" size={17} />
                Ver permisos del rol seleccionado
              </button>
            ) : null}
          </section>

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
          onClose={closePermissions}
        />
      ) : null}

      {pendingConfirmation ? (
        <ConfirmDialog
          cancelLabel="Editar"
          confirmLabel="Confirmar"
          description="Confirma el correo. El empleado lo usará para activar su cuenta."
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
                {pendingConfirmation.values.email}
                {pendingConfirmation.normalizedPhone ? ` · ${formatConfirmationPhone(pendingConfirmation.normalizedPhone)}` : ""}
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
