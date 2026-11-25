import { EmployeeAccessInvitation } from "./EmployeeAccessInvitation"
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { zodResolver } from '@hookform/resolvers/zod'
import { RotateCcw, Save, UserPlus } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  employeeFormSchema,
  type EmployeeFormValues,
} from '@/modules/employees/schemas/employee-form-schema'
import type {
  Employee,
  EmployeeCreateInput,
  EmployeePermissionPreset,
  EmployeeUpdateInput,
} from '@/modules/employees/types/employee'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { AppButton } from '@/shared/components/ui/AppButton'
import {
  assignableUserRoles,
  type AssignableUserRole,
  userRoleLabels,
} from '@/shared/constants/user-roles'
import { ApiError } from '@/shared/services/api-client'
import { joinClassNames } from '@/shared/utils/join-class-names'
import { getEmployeeStatusMeta } from '../utils/get-employee-status-meta'
import styles from './EmployeeFormDrawer.module.css'

type EmployeeFormDrawerProps = {
  employee: Employee | null
  isSubmitting: boolean
  presets: EmployeePermissionPreset[]
  roles: readonly AssignableUserRole[]
  onStartCreate: () => void
  onSubmit: (
    input: EmployeeCreateInput | EmployeeUpdateInput,
  ) => Promise<void>
}

function getRoleForForm(employee: Employee | null): AssignableUserRole {
  if (
    employee &&
    assignableUserRoles.includes(employee.role as AssignableUserRole)
  ) {
    return employee.role as AssignableUserRole
  }

  return 'STAFF'
}

function getDefaultValues(employee: Employee | null): EmployeeFormValues {
  return {
    name: employee?.name ?? '',
    email: employee?.email.includes('@users.cashgo.local')
      ? ''
      : (employee?.email ?? ''),
    phone: employee?.phone ?? '',
    role: getRoleForForm(employee),
  }
}

function normalizeOptionalEmail(value: string) {
  const trimmedValue = value.trim().toLowerCase()

  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'No pudimos guardar el empleado en este momento. Intenta otra vez.'
}

export function EmployeeFormDrawer({
  employee,
  isSubmitting,
  presets,
  roles,
  onStartCreate,
  onSubmit,
}: EmployeeFormDrawerProps) {
  const isEditing = employee !== null
  const availableRoles = roles.length > 0 ? roles : assignableUserRoles
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: getDefaultValues(employee),
  })

  const selectedRole = watch('role')
  const selectedPreset =
    presets.find((preset) => preset.recommendedRoles.includes(selectedRole)) ??
    presets.find((preset) => preset.id === employee?.recommendedPresetId) ??
    null
  const statusMeta = employee
    ? getEmployeeStatusMeta(employee.activationStatus)
    : null

  useEffect(() => {
    reset(getDefaultValues(employee))
  }, [employee, reset])

  const submitEmployee = handleSubmit(async (values) => {
    try {
      const normalizedEmail = normalizeOptionalEmail(values.email)

      if (isEditing) {
        await onSubmit({
          name: values.name.trim(),
          ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
          role: values.role,
        })
      } else {
        if (!normalizedEmail) {
          setError('email', { message: 'Indica el correo personal del empleado.' })
          return
        }
        await onSubmit({
          name: values.name.trim(),
          email: normalizedEmail,
          ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
          role: values.role,
        })
      }

      if (!isEditing) {
        reset(getDefaultValues(null))
      }
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error),
      })
    }
  })

  return (
    <SurfaceCard className={styles.drawer}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {isEditing ? 'Editar empleado' : 'Nuevo empleado'}
          </p>
          <h3 className={styles.title}>
            {isEditing ? employee.name : 'Invita a un nuevo miembro del equipo'}
          </h3>
          <p className={styles.description}>
            Configura quién es esta persona, cómo entra al sistema y qué
            permisos encajan mejor con su rol.
          </p>
        </div>

        <AppButton
          size="sm"
          startIcon={<RotateCcw aria-hidden="true" size={16} />}
          type="button"
          variant="secondary"
          onClick={onStartCreate}
        >
          {isEditing ? 'Crear otro' : 'Limpiar formulario'}
        </AppButton>
      </div>

      {statusMeta && employee ? (
        <div className={styles.statusBanner}>
          <span
            className={joinClassNames(
              styles.statusPill,
              statusMeta.tone === 'success' && styles.statusPillSuccess,
              statusMeta.tone === 'accent' && styles.statusPillAccent,
              statusMeta.tone === 'alert' && styles.statusPillAlert,
            )}
          >
            {statusMeta.label}
          </span>
          <p className={styles.statusDescription}>{statusMeta.description}</p>
        </div>
      ) : null}

      {employee?.canInviteAccess ? (
        <EmployeeAccessInvitation key={employee.id} employee={employee} />
      ) : null}
      <form className={styles.form} noValidate onSubmit={submitEmployee}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="employee-name">
            Nombre del empleado
          </label>
          <input
            aria-describedby={errors.name ? 'employee-name-error' : undefined}
            aria-invalid={Boolean(errors.name)}
            className={styles.input}
            id="employee-name"
            placeholder="Laura Gomez"
            type="text"
            {...register('name')}
          />
          {errors.name ? (
            <p className={styles.errorMessage} id="employee-name-error">
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div className={styles.inlineFields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="employee-phone">
              Celular (opcional)
            </label>
            <input
              aria-describedby={errors.phone ? 'employee-phone-error' : undefined}
              aria-invalid={Boolean(errors.phone)}
              className={styles.input}
              id="employee-phone"
              placeholder="+57 300 123 4567"
              type="tel"
              {...register('phone')}
            />
            {errors.phone ? (
              <p className={styles.errorMessage} id="employee-phone-error">
                {errors.phone.message}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="employee-role">
              Rol operativo
            </label>
            <SearchableSelect
              aria-describedby={errors.role ? 'employee-role-error' : undefined}
              aria-invalid={Boolean(errors.role)}
              className={styles.select}
              id="employee-role"
              {...register('role')}
            >
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {userRoleLabels[role]}
                </option>
              ))}
            </SearchableSelect>
            {errors.role ? (
              <p className={styles.errorMessage} id="employee-role-error">
                {errors.role.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="employee-email">
            Correo del empleado
          </label>
          <input
            aria-describedby={errors.email ? 'employee-email-error' : undefined}
            aria-invalid={Boolean(errors.email)}
            className={styles.input}
            id="employee-email"
            placeholder="nombre@correo.com"
            readOnly={isEditing}
            type="email"
            {...register('email')}
          />
          {errors.email ? (
            <p className={styles.errorMessage} id="employee-email-error">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        {selectedPreset ? (
          <div className={styles.permissionsCard}>
            <div className={styles.permissionsHeader}>
              <div>
                <p className={styles.permissionsEyebrow}>Perfil recomendado</p>
                <h4 className={styles.permissionsTitle}>{selectedPreset.label}</h4>
              </div>
              <p className={styles.permissionsSummary}>{selectedPreset.summary}</p>
            </div>

            <div className={styles.permissionGroups}>
              {selectedPreset.permissionGroups.map((group) => (
                <div key={group.id} className={styles.permissionGroup}>
                  <p className={styles.permissionGroupTitle}>{group.label}</p>
                  <p className={styles.permissionGroupDescription}>
                    {group.description}
                  </p>
                  <ul className={styles.permissionList}>
                    {group.permissions.map((permission) => (
                      <li key={permission.key} className={styles.permissionItem}>
                        <span className={styles.permissionBullet} />
                        <div>
                          <p className={styles.permissionLabel}>
                            {permission.label}
                          </p>
                          <p className={styles.permissionDescription}>
                            {permission.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {errors.root?.message ? (
          <div className={styles.errorBanner} role="alert">
            {errors.root.message}
          </div>
        ) : null}

        <div className={styles.footer}>
          <p className={styles.helperText}>
            {isEditing
              ? 'Usa esta edición para mantener actualizado el equipo.'
              : 'Los nuevos empleados aparecerán en la lista apenas guardes.'}
          </p>

          <AppButton
            disabled={isSubmitting}
            isLoading={isSubmitting}
            loadingLabel={isEditing ? 'Guardando empleado...' : 'Creando empleado...'}
            startIcon={
              isEditing ? (
                <Save aria-hidden="true" size={17} />
              ) : (
                <UserPlus aria-hidden="true" size={17} />
              )
            }
            type="submit"
          >
            {isEditing ? 'Guardar empleado' : 'Crear empleado'}
          </AppButton>
        </div>
      </form>
    </SurfaceCard>
  )
}
