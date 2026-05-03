import type {
  Employee,
  EmployeePermissionPreset,
} from '@/modules/employees/types/employee'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { userRoleLabels } from '@/shared/constants/user-roles'
import { formatDate } from '@/shared/utils/format-date'
import { joinClassNames } from '@/shared/utils/join-class-names'
import { getEmployeeStatusMeta } from '../utils/get-employee-status-meta'
import styles from './EmployeesRoster.module.css'

type EmployeesRosterProps = {
  activeEmployeeId: string | null
  employees: Employee[]
  errorMessage: string | null
  isLoading: boolean
  isRefreshing: boolean
  presets: EmployeePermissionPreset[]
  searchValue: string
  onDeleteEmployee: (employee: Employee) => void
  onRetry: () => void
  onSearchChange: (value: string) => void
  onSelectEmployee: (employeeId: string) => void
  onStartCreate: () => void
}

function findPresetLabel(
  presets: EmployeePermissionPreset[],
  presetId: string,
): string {
  return presets.find((preset) => preset.id === presetId)?.label ?? presetId
}

export function EmployeesRoster({
  activeEmployeeId,
  employees,
  errorMessage,
  isLoading,
  isRefreshing,
  presets,
  searchValue,
  onDeleteEmployee,
  onRetry,
  onSearchChange,
  onSelectEmployee,
  onStartCreate,
}: EmployeesRosterProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Directorio del equipo</p>
          <h3 className={styles.title}>Crea y administra tu equipo</h3>
          <p className={styles.description}>
            Manten un directorio claro con telefono de acceso, estado de
            activacion y permisos segun el rol.
          </p>
        </div>

        <div className={styles.headerActions}>
          {isRefreshing && !isLoading ? (
            <span className={styles.refreshingLabel}>Actualizando...</span>
          ) : null}

          <button
            className={styles.primaryButton}
            type="button"
            onClick={onStartCreate}
          >
            Crear empleado
          </button>
        </div>
      </div>

      <label className={styles.searchField}>
        <span className={styles.searchLabel}>Buscar empleados</span>
        <input
          className={styles.searchInput}
          name="employees-search"
          placeholder="Busca por nombre, telefono, correo o rol"
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      {errorMessage ? (
        <div className={styles.feedbackCard} role="alert">
          <p className={styles.feedbackTitle}>No pudimos cargar tu equipo</p>
          <p className={styles.feedbackDescription}>{errorMessage}</p>
          <button className={styles.feedbackButton} type="button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className={styles.loadingState}>
          <p className={styles.loadingTitle}>Cargando empleados...</p>
          <p className={styles.loadingDescription}>
            Trayendo roles, accesos y estado de activacion del negocio.
          </p>
        </div>
      ) : null}

      {!isLoading && employees.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Todavia no tienes empleados</p>
          <p className={styles.emptyDescription}>
            Empieza creando el primer empleado y asignandole el rol operativo
            que mejor encaje.
          </p>
        </div>
      ) : null}

      {!isLoading && employees.length > 0 ? (
        <div className={styles.list}>
          <div className={styles.tableHeader} aria-hidden="true">
            <span>Empleado</span>
            <span>Acceso</span>
            <span>Rol</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>

          {employees.map((employee) => {
            const statusMeta = getEmployeeStatusMeta(employee.activationStatus)

            return (
              <button
                key={employee.id}
                className={joinClassNames(
                  styles.employeeRow,
                  activeEmployeeId === employee.id && styles.employeeRowActive,
                )}
                type="button"
                onClick={() => onSelectEmployee(employee.id)}
              >
                <div className={styles.primaryCell}>
                  <p className={styles.employeeName}>{employee.name}</p>
                  <p className={styles.employeeMeta}>
                    {employee.email} • Creado {formatDate(employee.createdAt)}
                  </p>
                </div>

                <div className={styles.secondaryCell}>
                  <p className={styles.employeePhone}>
                    {employee.phone ?? 'Telefono no configurado'}
                  </p>
                  <p className={styles.employeeMeta}>
                    {employee.lastLoginAt
                      ? `Ultimo ingreso ${formatDate(employee.lastLoginAt)}`
                      : 'Aun no ha iniciado sesion'}
                  </p>
                </div>

                <div className={styles.roleCell}>
                  <span className={styles.rolePill}>
                    {userRoleLabels[employee.role]}
                  </span>
                  <p className={styles.employeeMeta}>
                    {findPresetLabel(presets, employee.recommendedPresetId)}
                  </p>
                </div>

                <div className={styles.statusCell}>
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
                </div>

                <div className={styles.actionsCell}>
                  <button
                    className={styles.deleteButton}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDeleteEmployee(employee)
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </button>
            )
          })}
        </div>
      ) : null}
    </SurfaceCard>
  )
}
