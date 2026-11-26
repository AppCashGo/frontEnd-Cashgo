import { useToast } from "@/shared/hooks/use-toast"
import { useDeferredValue, useEffect, useState } from 'react'
import { CheckCircle, Clock3, MailPlus, Pencil, Search, Trash2, UserPlus, UsersRound } from 'lucide-react'
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
  useUploadEmployeeAvatarMutation,
} from '@/modules/employees/hooks/use-employees-query'
import type {
  Employee,
  EmployeeCreateInput,
  EmployeeUpdateInput,
} from '@/modules/employees/types/employee'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { RetailPageLayout } from '@/shared/components/retail/RetailPageLayout'
import { WorkspaceBusinessTitle } from '@/shared/components/retail/WorkspaceBusinessTitle'
import workspaceVisual from '@/shared/components/retail/WorkspaceVisual.module.css'
import { SalesCustomerAvatar } from '@/modules/sales/components/SalesVisuals'
import { RetailTableShell } from '@/shared/components/retail/RetailTableShell'
import { TableStateRow } from '@/shared/components/retail/TableStateRow'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import { useBusinessNavigationPreset } from '@/shared/hooks/use-business-navigation-preset'
import { useConfirmDialog } from '@/shared/hooks/use-confirm-dialog'
import { MetricCard } from '@/shared/components/ui/MetricCard'
import { isAdminWorkspaceRole, userRoleLabels } from '@/shared/constants/user-roles'
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
    employee.role.toLowerCase().includes(normalizedQuery) ||
    getRetailEmployeeRoleLabel(employee).toLowerCase().includes(normalizedQuery)
  )
}

function getRetailEmployeeRoleLabel(employee: Employee) {
  if (employee.role === 'OWNER') {
    return 'Propietario'
  }

  if (employee.role === 'STAFF') {
    return 'Domiciliario'
  }

  return employee.role === 'SELLER' ? 'Mesero o vendedor' : userRoleLabels[employee.role]
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
  const toast = useToast()
  const navigationPreset = useBusinessNavigationPreset()
  const isRetailPreset = navigationPreset === 'retail'
  const currentUser = useAuthSessionStore((state) => state.user)
  const canManageTeam = isAdminWorkspaceRole(currentUser?.role)
  const [searchValue, setSearchValue] = useState('')
  const [accessFilter, setAccessFilter] = useState<'all' | 'active' | 'pending'>('all')
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
  const uploadEmployeeAvatarMutation = useUploadEmployeeAvatarMutation()
  const deleteEmployeeMutation = useDeleteEmployeeMutation()
  const { confirm, confirmationDialog } = useConfirmDialog()

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
          <p className={styles.restrictedEyebrow}>
            Acceso de gestion requerido
          </p>
          <h2 className={styles.restrictedTitle}>
            El espacio de empleados está reservado para propietarios y administradores.
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
    uploadEmployeeAvatarMutation.isPending ||
    deleteEmployeeMutation.isPending

  async function handleSubmitEmployee(
    input: EmployeeCreateInput | EmployeeUpdateInput,
    avatarFile?: File | null,
  ) {
    if (selectedEmployee) {
      const updatedEmployee = await updateEmployeeMutation.mutateAsync({
        employeeId: selectedEmployee.id,
        input: input as EmployeeUpdateInput,
      })

      if (avatarFile) {
        await uploadEmployeeAvatarMutation.mutateAsync({
          employeeId: updatedEmployee.id,
          file: avatarFile,
        })
      }

      return
    }

    const createdEmployee = await createEmployeeMutation.mutateAsync(
      input as EmployeeCreateInput,
    )

    if (createdEmployee.invitationEmailSent) {
      toast.showSuccess(`Enviamos el acceso a ${createdEmployee.email}.`, { title: 'Correo enviado' })
    } else if (createdEmployee.canInviteAccess) {
      toast.showWarning('Abre la ficha para enviar de nuevo la invitación de acceso.', { title: 'Empleado creado' })
    } else if (createdEmployee.invitationEmailSent === false) {
      toast.showWarning('El empleado ya puede ingresar con su cuenta habitual. El aviso por correo quedó pendiente.')
    }

    if (avatarFile) {
      await uploadEmployeeAvatarMutation.mutateAsync({
        employeeId: createdEmployee.id,
        file: avatarFile,
      })
    }
  }

  function canRemoveEmployee(employee: Employee) {
    return employee.canRemove && String(employee.id) !== String(currentUser?.id)
  }

  async function handleDeleteEmployee(employee: Employee) {
    if (!canRemoveEmployee(employee) || deleteEmployeeMutation.isPending) return

    const confirmed = await confirm({
      title: 'Eliminar empleado',
      description: `¿Quieres eliminar a ${employee.name} de este negocio? Se revocará su acceso a este equipo y se conservará su historial.`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteEmployeeMutation.mutateAsync(employee.id)
      toast.showSuccess('Se retiró el acceso del empleado.')
      if (selectedEmployeeId === employee.id) {
        setSelectedEmployeeId(null)
        setRetailEmployeeDrawerOpen(false)
      }
    } catch (error) {
      toast.showError(error, 'No se pudo eliminar al empleado.')
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
    const filteredEmployees = visibleEmployees.filter((employee) =>
      accessFilter === 'all' || (employee.activationStatus === 'ACTIVE') === (accessFilter === 'active'),
    )

    return (
      <>
        {confirmationDialog}
        <RetailPageLayout
          headerClassName={`${workspaceVisual.hero} ${workspaceVisual.catalogHeader}`}
          title={<WorkspaceBusinessTitle>Empleados</WorkspaceBusinessTitle>}
          meta={<span>Gestiona los accesos y roles de tu equipo.</span>}
          actions={
            <button
              className={`${retailStyles.buttonDark} ${workspaceVisual.catalogAction} ${workspaceVisual.catalogPrimary}`}
              type="button"
              onClick={startCreateEmployee}
            >
              <UserPlus aria-hidden="true" size={18} />
              Crear empleado
            </button>
          }
        >
          <section className={styles.retailEmployeesWorkspace} aria-label="Equipo del negocio">
            <div className={styles.teamSummary} role="group" aria-label="Filtrar por estado de acceso">
              {([
                { id: 'all', label: 'Todo el equipo', count: employees.length, Icon: UsersRound },
                { id: 'active', label: 'Accesos activos', count: activeEmployees, Icon: CheckCircle },
                { id: 'pending', label: 'Activación pendiente', count: pendingEmployees + phoneSetupNeeded, Icon: Clock3 },
              ] as const).map(({ id, label, count, Icon }) => (
                <button
                  aria-pressed={accessFilter === id}
                  className={styles.teamMetric}
                  data-tone={id}
                  key={id}
                  type="button"
                  onClick={() => setAccessFilter(id)}
                >
                  <span className={styles.metricIcon}><Icon aria-hidden="true" /></span>
                  <span><strong>{count}</strong>{label}</span>
                </button>
              ))}
            </div>
            <RetailTableShell
              isRefreshing={employeesQuery.isFetching && !employeesQuery.isLoading}
              title="Empleados registrados"
              toolbar={
                <label className={styles.teamSearch}>
                  <Search aria-hidden="true" size={18} />
                  <input
                    aria-label="Buscar empleados"
                    placeholder="Nombre, correo, celular o rol"
                    type="search"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                  />
                </label>
              }
            >
              <table className={retailStyles.table}>
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Celular</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesQuery.isLoading ? (
                    <TableStateRow
                      colSpan={5}
                      tone="feedback"
                      title="Cargando empleados..."
                    />
                  ) : null}

                  {employeesQuery.isError ? (
                    <TableStateRow
                      action={
                        <button
                          className={retailStyles.tableAction}
                          type="button"
                          onClick={() => void handleRefresh()}
                        >
                          Reintentar
                        </button>
                      }
                      colSpan={5}
                      description="Intenta nuevamente para consultar la lista del equipo."
                      tone="error"
                      title="No pudimos cargar los empleados."
                    />
                  ) : null}

                  {!employeesQuery.isLoading &&
                  !employeesQuery.isError &&
                  filteredEmployees.length > 0
                    ? filteredEmployees.map((employee) => {
                        const canEditEmployee = employee.role !== 'OWNER'
                        const email = employee.email.endsWith('@users.cashgo.local') ? null : employee.email
                        const active = employee.activationStatus === 'ACTIVE'

                        return (
                          <tr key={employee.id}>
                            <td data-label="Empleado">
                              <span className={styles.retailEmployeeIdentity}>
                                <SalesCustomerAvatar name={employee.name} avatarUrl={employee.avatarUrl} />
                                <span className={styles.identityCopy}>
                                  <strong className={styles.retailEmployeeName}>{employee.name}</strong>
                                  {email ? <small>{email}</small> : null}
                                </span>
                              </span>
                            </td>
                            <td data-label="Celular">
                              {employee.phone ?? 'Sin celular'}
                            </td>
                            <td data-label="Rol">
                              <span
                                className={joinClassNames(
                                  styles.retailRolePill,
                                  getRetailEmployeeRoleTone(employee),
                                )}
                              >
                                {getRetailEmployeeRoleLabel(employee)}
                              </span>
                            </td>
                            <td data-label="Estado">
                              <span className={styles.retailAccessBadge} data-active={active}>
                                {active ? <CheckCircle aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
                                {active ? 'Activo' : 'Pendiente'}
                              </span>
                            </td>
                            <td data-label="Acciones">
                              <div className={styles.teamRowActions}>
                                {canEditEmployee ? (
                                  <button
                                    className={styles.retailEditButton}
                                    type="button"
                                    onClick={() => startEditEmployee(employee.id)}
                                  >
                                    {employee.canInviteAccess ? <MailPlus aria-hidden="true" /> : <Pencil aria-hidden="true" />}
                                    {employee.canInviteAccess ? 'Gestionar acceso' : 'Editar'}
                                  </button>
                                ) : null}
                                {canRemoveEmployee(employee) ? (
                                  <button
                                    aria-label={`Eliminar a ${employee.name}`}
                                    className={`${styles.retailEditButton} ${styles.retailDeleteButton}`}
                                    disabled={deleteEmployeeMutation.isPending}
                                    type="button"
                                    onClick={() => void handleDeleteEmployee(employee)}
                                  >
                                    <Trash2 aria-hidden="true" />
                                    Eliminar
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    : null}

                  {!employeesQuery.isLoading &&
                  !employeesQuery.isError &&
                  filteredEmployees.length === 0 ? (
                    <TableStateRow
                      colSpan={5}
                      description={employees.length ? 'Cambia la búsqueda o selecciona otro estado.' : 'Crea un empleado para enviarle su acceso por correo.'}
                      title={employees.length ? 'No encontramos empleados' : 'Aún no hay empleados'}
                    />
                  ) : null}
                </tbody>
              </table>
            </RetailTableShell>
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
    <>
      {confirmationDialog}
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
            canRemoveEmployee={canRemoveEmployee}
            isRemoving={deleteEmployeeMutation.isPending}
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
            isRefreshing={
              employeesQuery.isFetching && !employeesQuery.isLoading
            }
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
    </>
  )
}
