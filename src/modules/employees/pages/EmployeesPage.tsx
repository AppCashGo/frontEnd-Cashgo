import { useDeferredValue, useEffect, useState } from 'react'
import { CheckCircle, Pencil } from 'lucide-react'
import { EmployeeFormDrawer } from '@/modules/employees/components/EmployeeFormDrawer'
import { EmployeesRoster } from '@/modules/employees/components/EmployeesRoster'
import { RetailEmployeeDrawer } from '@/modules/employees/components/RetailEmployeeDrawer'
import {
  useCreateEmployeeMutation,
  useDeleteEmployeeMutation,
  useEmployeePermissionPresetsQuery,
  useEmployeeRolesQuery,
  useEmployeesQuery,
  useUpdateEmployeeMutation,
} from '@/modules/employees/hooks/use-employees-query'
import type {
  Employee,
  EmployeeCreateInput,
  EmployeeUpdateInput,
} from '@/modules/employees/types/employee'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { RetailPageLayout } from '@/shared/components/retail/RetailPageLayout'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import { useBusinessNavigationPreset } from '@/shared/hooks/use-business-navigation-preset'
import { MetricCard } from '@/shared/components/ui/MetricCard'
import { isTeamManagementRole } from '@/shared/constants/user-roles'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './EmployeesPage.module.css'

function matchesEmployeeSearch(employee: Employee, query: string) {
  if (query.length === 0) {
    return true
  }

  const normalizedQuery = query.toLowerCase()

  return (
    employee.name.toLowerCase().includes(normalizedQuery) ||
    employee.email.toLowerCase().includes(normalizedQuery) ||
    (employee.phone ?? '').toLowerCase().includes(normalizedQuery) ||
    employee.role.toLowerCase().includes(normalizedQuery)
  )
}

function getRetailEmployeeRoleLabel(employee: Employee) {
  if (employee.role === 'OWNER') {
    return 'Propietario'
  }

  if (employee.role === 'ADMIN' || employee.role === 'MANAGER') {
    return 'Administrador'
  }

  if (employee.role === 'STAFF') {
    return 'Domiciliario'
  }

  return 'Mesero o vendedor'
}

function getRetailEmployeeRoleTone(employee: Employee) {
  if (employee.role === 'OWNER') {
    return styles.roleOwner
  }

  if (employee.role === 'ADMIN' || employee.role === 'MANAGER') {
    return styles.roleAdmin
  }

  if (employee.role === 'STAFF') {
    return styles.roleDelivery
  }

  return styles.roleSeller
}

export function EmployeesPage() {
  const navigationPreset = useBusinessNavigationPreset()
  const isRetailPreset = navigationPreset === 'retail'
  const currentUser = useAuthSessionStore((state) => state.user)
  const canManageTeam = isTeamManagementRole(currentUser?.role)
  const [searchValue, setSearchValue] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  )
  const [isRetailEmployeeDrawerOpen, setRetailEmployeeDrawerOpen] =
    useState(false)
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase())
  const employeesQuery = useEmployeesQuery(canManageTeam)
  const employeeRolesQuery = useEmployeeRolesQuery(canManageTeam)
  const employeePresetsQuery = useEmployeePermissionPresetsQuery(canManageTeam)
  const createEmployeeMutation = useCreateEmployeeMutation()
  const updateEmployeeMutation = useUpdateEmployeeMutation()
  const deleteEmployeeMutation = useDeleteEmployeeMutation()

  useEffect(() => {
    if (!selectedEmployeeId) {
      return
    }

    const employeeStillExists = (employeesQuery.data ?? []).some(
      (employee) => employee.id === selectedEmployeeId,
    )

    if (!employeeStillExists) {
      setSelectedEmployeeId(null)
      setRetailEmployeeDrawerOpen(false)
    }
  }, [employeesQuery.data, selectedEmployeeId])

  if (!canManageTeam) {
    return (
      <div className={styles.page}>
        <SurfaceCard className={styles.restrictedCard}>
          <p className={styles.restrictedEyebrow}>Acceso de gestion requerido</p>
          <h2 className={styles.restrictedTitle}>
            El espacio de empleados esta reservado para administradores y gerentes.
          </h2>
          <p className={styles.restrictedDescription}>
            Inicia sesion con una cuenta que pueda crear, editar o revocar
            accesos del equipo.
          </p>
        </SurfaceCard>
      </div>
    )
  }

  const employees = employeesQuery.data ?? []
  const visibleEmployees = employees.filter((employee) =>
    matchesEmployeeSearch(employee, deferredSearchValue),
  )
  const roles = employeeRolesQuery.data ?? []
  const presets = employeePresetsQuery.data ?? []
  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ?? null
  const activeEmployees = employees.filter(
    (employee) => employee.activationStatus === 'ACTIVE',
  ).length
  const pendingEmployees = employees.filter(
    (employee) => employee.activationStatus === 'PENDING_ACCESS',
  ).length
  const phoneSetupNeeded = employees.filter(
    (employee) => employee.activationStatus === 'PHONE_REQUIRED',
  ).length
  const isSubmitting =
    createEmployeeMutation.isPending ||
    updateEmployeeMutation.isPending ||
    deleteEmployeeMutation.isPending

  async function handleSubmitEmployee(
    input: EmployeeCreateInput | EmployeeUpdateInput,
  ) {
    if (selectedEmployee) {
      await updateEmployeeMutation.mutateAsync({
        employeeId: selectedEmployee.id,
        input: input as EmployeeUpdateInput,
      })
      return
    }

    await createEmployeeMutation.mutateAsync(input as EmployeeCreateInput)
  }

  async function handleDeleteEmployee(employee: Employee) {
    const confirmed = window.confirm(
      `Delete ${employee.name} from this business?`,
    )

    if (!confirmed) {
      return
    }

    await deleteEmployeeMutation.mutateAsync(employee.id)

    if (selectedEmployeeId === employee.id) {
      setSelectedEmployeeId(null)
    }
  }

  async function handleRefresh() {
    await Promise.allSettled([
      employeesQuery.refetch(),
      employeeRolesQuery.refetch(),
      employeePresetsQuery.refetch(),
    ])
  }

  function startCreateEmployee() {
    setSelectedEmployeeId(null)

    if (isRetailPreset) {
      setRetailEmployeeDrawerOpen(true)
    }
  }

  function startEditEmployee(employeeId: string) {
    setSelectedEmployeeId(employeeId)

    if (isRetailPreset) {
      setRetailEmployeeDrawerOpen(true)
    }
  }

  function closeRetailEmployeeDrawer() {
    setRetailEmployeeDrawerOpen(false)
    setSelectedEmployeeId(null)
  }

  if (isRetailPreset) {
    return (
      <>
        <RetailPageLayout
          accent="success"
          bodyVariant="flush"
          title="Empleados"
          actions={
            <button
              className={retailStyles.buttonDark}
              type="button"
              onClick={startCreateEmployee}
            >
              Crear empleado
            </button>
          }
        >
          <section className={styles.retailEmployeesWorkspace}>
            <div className={styles.retailTableShell}>
              <table className={styles.retailEmployeesTable}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Celular</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesQuery.isLoading ? (
                    <tr>
                      <td colSpan={5}>
                        <div className={styles.retailFeedback}>
                          Cargando empleados...
                        </div>
                      </td>
                    </tr>
                  ) : null}

                  {employeesQuery.isError ? (
                    <tr>
                      <td colSpan={5}>
                        <div className={styles.retailFeedback} role="alert">
                          No pudimos cargar los empleados.
                          <button
                            type="button"
                            onClick={() => void handleRefresh()}
                          >
                            Reintentar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}

                  {!employeesQuery.isLoading &&
                  !employeesQuery.isError &&
                  visibleEmployees.length > 0
                    ? visibleEmployees.map((employee) => {
                        const canEditEmployee = employee.role !== 'OWNER'

                        return (
                          <tr key={employee.id}>
                            <td>
                              <strong className={styles.retailEmployeeName}>
                                {employee.name}
                              </strong>
                            </td>
                            <td>{employee.phone ?? 'Sin celular'}</td>
                            <td>
                              <span
                                className={joinClassNames(
                                  styles.retailRolePill,
                                  getRetailEmployeeRoleTone(employee),
                                )}
                              >
                                {getRetailEmployeeRoleLabel(employee)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={
                                  employee.activationStatus === 'ACTIVE'
                                    ? styles.retailStatusActive
                                    : styles.retailStatusPending
                                }
                              >
                                <CheckCircle />
                                {employee.activationStatus === 'ACTIVE'
                                  ? 'Activo'
                                  : 'Pendiente'}
                              </span>
                            </td>
                            <td>
                              {canEditEmployee ? (
                                <button
                                  className={styles.retailEditButton}
                                  type="button"
                                  onClick={() => startEditEmployee(employee.id)}
                                >
                                  <Pencil />
                                  Editar
                                  <span aria-hidden="true">›</span>
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        )
                      })
                    : null}

                  {!employeesQuery.isLoading &&
                  !employeesQuery.isError &&
                  visibleEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className={retailStyles.emptyState}>
                          <div className={retailStyles.emptyIcon} />
                          <p className={retailStyles.emptyTitle}>
                            Aun no tienes empleados creados.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </RetailPageLayout>

        <RetailEmployeeDrawer
          employee={selectedEmployee}
          isOpen={isRetailEmployeeDrawerOpen}
          isSubmitting={isSubmitting}
          presets={presets}
          roles={roles}
          onClose={closeRetailEmployeeDrawer}
          onSubmit={handleSubmitEmployee}
        />
      </>
    )
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Gestion del equipo</p>
          <h2 className={styles.title}>
            Organiza tu equipo con accesos rapidos y roles claros.
          </h2>
          <p className={styles.description}>
            Crea empleados, asigna el rol operativo correcto y revisa quien ya
            activo su acceso desde una sola vista.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button
            className={styles.heroButton}
            type="button"
            onClick={() => {
              setSelectedEmployeeId(null)
            }}
          >
            Nuevo empleado
          </button>

          <button
            className={styles.heroGhostButton}
            type="button"
            onClick={() => {
              void handleRefresh()
            }}
          >
            Actualizar equipo
          </button>
        </div>
      </section>

      <div className={styles.metricsGrid}>
        <MetricCard
          label="Tamano del equipo"
          value={employees.length.toString()}
          hint="Empleados asignados actualmente al negocio activo."
          tone="default"
        />
        <MetricCard
          label="Accesos activos"
          value={activeEmployees.toString()}
          hint="Personas que ya iniciaron sesion con su acceso asignado."
          tone={activeEmployees > 0 ? 'success' : 'default'}
        />
        <MetricCard
          label="Pendientes"
          value={pendingEmployees.toString()}
          hint="Empleados que aun esperan su primer ingreso."
          tone={pendingEmployees > 0 ? 'accent' : 'default'}
        />
        <MetricCard
          label="Falta telefono"
          value={phoneSetupNeeded.toString()}
          hint="Perfiles que todavia necesitan telefono para poder entrar."
          tone={phoneSetupNeeded > 0 ? 'alert' : 'default'}
        />
      </div>

      <div className={styles.workspace}>
        <EmployeesRoster
          activeEmployeeId={selectedEmployeeId}
          employees={visibleEmployees}
          errorMessage={
            employeesQuery.isError
              ? getErrorMessage(
                  employeesQuery.error,
                  'No pudimos cargar el equipo en este momento. Intenta otra vez.',
                )
              : null
          }
          isLoading={employeesQuery.isLoading}
          isRefreshing={employeesQuery.isFetching && !employeesQuery.isLoading}
          presets={presets}
          searchValue={searchValue}
          onDeleteEmployee={(employee) => {
            void handleDeleteEmployee(employee)
          }}
          onRetry={() => {
            void handleRefresh()
          }}
          onSearchChange={setSearchValue}
          onSelectEmployee={startEditEmployee}
          onStartCreate={startCreateEmployee}
        />

        <div className={styles.drawerColumn}>
          <EmployeeFormDrawer
            employee={selectedEmployee}
            isSubmitting={isSubmitting}
            presets={presets}
            roles={roles}
            onStartCreate={startCreateEmployee}
            onSubmit={handleSubmitEmployee}
          />
        </div>
      </div>
    </div>
  )
}
