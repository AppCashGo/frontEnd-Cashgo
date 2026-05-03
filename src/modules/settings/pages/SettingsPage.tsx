import { useState } from "react";
import { BusinessSettingsPanel } from "@/modules/settings/components/BusinessSettingsPanel";
import { OperationalSettingsPanel } from "@/modules/settings/components/OperationalSettingsPanel";
import { SettingsMetricCard } from "@/modules/settings/components/SettingsMetricCard";
import { TaxSettingsPanel } from "@/modules/settings/components/TaxSettingsPanel";
import { UsersManagementPanel } from "@/modules/settings/components/UsersManagementPanel";
import {
  useBusinessSettingsQuery,
  useCreateBusinessSettingsMutation,
  useCreateSettingsUserMutation,
  useSettingsRolesQuery,
  useSettingsUsersQuery,
  useUpdateBusinessSettingsMutation,
  useUpdateSettingsUserMutation,
  useDeleteSettingsUserMutation,
} from "@/modules/settings/hooks/use-settings-query";
import {
  settingsUserRoles,
  type BusinessProfileInput,
  type BusinessOperationalSettingsInput,
} from "@/modules/settings/types/settings";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import { useBusinessNavigationPreset } from "@/shared/hooks/use-business-navigation-preset";
import {
  isAdminWorkspaceRole,
  isTeamManagementRole,
} from "@/shared/constants/user-roles";
import { SurfaceCard } from "@/shared/components/ui/SurfaceCard";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./SettingsPage.module.css";
import retailStyles from "./SettingsRetailPage.module.css";

const defaultBusinessTaxSetup = {
  currency: "COP" as const,
  taxRate: 0,
  taxLabel: "IVA",
};

export function SettingsPage() {
  const navigationPreset = useBusinessNavigationPreset();
  const isRetailPreset = navigationPreset === "retail";
  const [retailTab, setRetailTab] = useState<"general" | "plan" | "print">(
    "general",
  );
  const currentUser = useAuthSessionStore((state) => state.user);
  const isAdmin = isAdminWorkspaceRole(currentUser?.role);
  const businessSettingsQuery = useBusinessSettingsQuery(isAdmin);
  const settingsUsersQuery = useSettingsUsersQuery(isAdmin);
  const settingsRolesQuery = useSettingsRolesQuery(isAdmin);
  const createBusinessSettingsMutation = useCreateBusinessSettingsMutation();
  const updateBusinessProfileMutation = useUpdateBusinessSettingsMutation();
  const updateTaxSettingsMutation = useUpdateBusinessSettingsMutation();
  const createSettingsUserMutation = useCreateSettingsUserMutation();
  const updateSettingsUserMutation = useUpdateSettingsUserMutation();
  const deleteSettingsUserMutation = useDeleteSettingsUserMutation();

  if (!currentUser || !isAdmin) {
    return (
      <div className={styles.page}>
        <SurfaceCard className={styles.restrictedCard}>
          <p className={styles.restrictedEyebrow}>Acceso admin requerido</p>
          <h2 className={styles.restrictedTitle}>
            El espacio de configuraciones esta limitado a cuentas administrativas.
          </h2>
          <p className={styles.restrictedDescription}>
            Los ajustes del negocio, impuestos y usuarios estan protegidos como
            operaciones de administrador. Inicia sesion con una cuenta admin
            para continuar.
          </p>
        </SurfaceCard>
      </div>
    );
  }

  const businessSettings = businessSettingsQuery.data ?? null;
  const users = settingsUsersQuery.data ?? [];
  const roles = settingsRolesQuery.data ?? settingsUserRoles;
  const adminUsersCount = users.filter((user) =>
    isAdminWorkspaceRole(user.role),
  ).length;
  const operationalUsersCount = users.filter(
    (user) => !isTeamManagementRole(user.role),
  ).length;
  const businessSettingsError = businessSettingsQuery.isError
    ? getErrorMessage(
        businessSettingsQuery.error,
        "No pudimos cargar la configuracion del negocio en este momento.",
      )
    : null;
  const usersManagementError = settingsUsersQuery.isError
    ? getErrorMessage(
        settingsUsersQuery.error,
        "No pudimos cargar la lista de usuarios en este momento.",
      )
    : null;
  const isRefreshing =
    businessSettingsQuery.isFetching ||
    settingsUsersQuery.isFetching ||
    settingsRolesQuery.isFetching;

  async function handleRefresh() {
    await Promise.allSettled([
      businessSettingsQuery.refetch(),
      settingsUsersQuery.refetch(),
      settingsRolesQuery.refetch(),
    ]);
  }

  async function handleBusinessProfileSubmit(input: BusinessProfileInput) {
    if (businessSettings) {
      await updateBusinessProfileMutation.mutateAsync(input);
      return;
    }

    await createBusinessSettingsMutation.mutateAsync({
      ...input,
      ...defaultBusinessTaxSetup,
    });
  }

  async function handleBusinessTaxSubmit(input: {
    currency: "COP" | "USD" | "EUR" | "MXN";
    taxRate: number;
    taxLabel?: string | null;
  }) {
    await updateTaxSettingsMutation.mutateAsync(input);
  }

  async function handleOperationalSettingsSubmit(
    input: BusinessOperationalSettingsInput,
  ) {
    await updateBusinessProfileMutation.mutateAsync(input);
  }

  if (isRetailPreset) {
    return (
      <div className={retailStyles.page}>
        <div className={retailStyles.tabs}>
          <button
            className={
              retailTab === "general" ? retailStyles.tabActive : retailStyles.tab
            }
            type="button"
            onClick={() => setRetailTab("general")}
          >
            General
          </button>
          <button
            className={
              retailTab === "plan" ? retailStyles.tabActive : retailStyles.tab
            }
            type="button"
            onClick={() => setRetailTab("plan")}
          >
            Tu plan
          </button>
          <button
            className={
              retailTab === "print" ? retailStyles.tabActive : retailStyles.tab
            }
            type="button"
            onClick={() => setRetailTab("print")}
          >
            Impresión
          </button>
        </div>

        {retailTab === "general" ? (
          <div className={retailStyles.stack}>
            <BusinessSettingsPanel
              businessSettings={businessSettings}
              errorMessage={businessSettingsError}
              isLoading={businessSettingsQuery.isLoading}
              isSubmitting={
                createBusinessSettingsMutation.isPending ||
                updateBusinessProfileMutation.isPending
              }
              onRetry={() => {
                void businessSettingsQuery.refetch();
              }}
              onSubmit={handleBusinessProfileSubmit}
            />

            <details className={retailStyles.accordion}>
              <summary className={retailStyles.accordionSummary}>
                <p className={retailStyles.accordionTitle}>Impuestos</p>
                <span>⌄</span>
              </summary>
              <div className={retailStyles.accordionBody}>
                <TaxSettingsPanel
                  businessSettings={businessSettings}
                  errorMessage={businessSettingsError}
                  isLoading={businessSettingsQuery.isLoading}
                  isSubmitting={updateTaxSettingsMutation.isPending}
                  onRetry={() => {
                    void businessSettingsQuery.refetch();
                  }}
                  onSubmit={handleBusinessTaxSubmit}
                />
              </div>
            </details>

            <details className={retailStyles.accordion}>
              <summary className={retailStyles.accordionSummary}>
                <p className={retailStyles.accordionTitle}>Catálogo virtual</p>
                <span>⌄</span>
              </summary>
              <div className={retailStyles.accordionBody}>
                <p className={retailStyles.placeholder}>
                  Aquí podrás activar visibilidad del catálogo, compartir enlaces
                  y ajustar cómo se ve tu inventario para clientes.
                </p>
              </div>
            </details>

            <details className={retailStyles.accordion}>
              <summary className={retailStyles.accordionSummary}>
                <p className={retailStyles.accordionTitle}>Recordatorios</p>
                <span>⌄</span>
              </summary>
              <div className={retailStyles.accordionBody}>
                <p className={retailStyles.placeholder}>
                  Próximamente verás recordatorios operativos y avisos de cartera
                  o inventario desde esta sección.
                </p>
              </div>
            </details>

            <details className={retailStyles.accordion}>
              <summary className={retailStyles.accordionSummary}>
                <p className={retailStyles.accordionTitle}>
                  Configuraciones adicionales
                </p>
                <span>⌄</span>
              </summary>
              <div className={retailStyles.accordionBody}>
                <OperationalSettingsPanel
                  businessSettings={businessSettings}
                  errorMessage={businessSettingsError}
                  isLoading={businessSettingsQuery.isLoading}
                  isSubmitting={updateBusinessProfileMutation.isPending}
                  onRetry={() => {
                    void businessSettingsQuery.refetch();
                  }}
                  onSubmit={handleOperationalSettingsSubmit}
                />
              </div>
            </details>
          </div>
        ) : null}

        {retailTab === "plan" ? (
          <UsersManagementPanel
            currentUserId={currentUser.id}
            errorMessage={usersManagementError}
            isCreatingUser={createSettingsUserMutation.isPending}
            isDeletingUser={deleteSettingsUserMutation.isPending}
            isLoading={
              settingsUsersQuery.isLoading || settingsRolesQuery.isLoading
            }
            isRefreshing={
              settingsUsersQuery.isFetching || settingsRolesQuery.isFetching
            }
            isUpdatingUser={updateSettingsUserMutation.isPending}
            roles={roles}
            users={users}
            onCreateUser={(input) =>
              createSettingsUserMutation.mutateAsync(input)
            }
            onDeleteUser={(userId) =>
              deleteSettingsUserMutation.mutateAsync(userId)
            }
            onRetry={() => {
              void handleRefresh();
            }}
            onUpdateUser={(userId, input) =>
              updateSettingsUserMutation.mutateAsync({
                userId,
                input,
              })
            }
          />
        ) : null}

        {retailTab === "print" ? (
          <SurfaceCard className={retailStyles.accordionBody}>
            <p className={retailStyles.placeholder}>
              Aquí prepararemos el formato de impresión de tickets y comprobantes
              para tu negocio.
            </p>
          </SurfaceCard>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Centro administrativo</p>
          <h2 className={styles.title}>
            Manten negocio, impuestos y accesos organizados en un solo panel.
          </h2>
          <p className={styles.description}>
            Este espacio concentra la configuracion estructural de la
            operacion: identidad del negocio, impuestos y usuarios de toda la
            plataforma.
          </p>
        </div>

        <div className={styles.heroActions}>
          <div className={styles.heroStatusCard}>
            <p className={styles.heroStatusLabel}>Sesión iniciada como</p>
            <p className={styles.heroStatusValue}>{currentUser.name}</p>
            <p className={styles.heroStatusHint}>
              {currentUser.email} • {currentUser.role}
            </p>
          </div>

          <button
            className={styles.heroButton}
            type="button"
            onClick={() => {
              void handleRefresh();
            }}
          >
            {isRefreshing ? "Actualizando panel..." : "Actualizar configuraciones"}
          </button>
        </div>
      </section>

      <div className={styles.metricsGrid}>
        <SettingsMetricCard
          hint="Muestra si el perfil general del negocio ya fue creado."
          label="Perfil del negocio"
          tone={businessSettings ? "success" : "alert"}
          value={businessSettings ? "Listo" : "Pendiente"}
        />
        <SettingsMetricCard
          hint={
            businessSettings
              ? `La moneda actual es ${businessSettings.currency}.`
              : "Los impuestos se activan cuando exista el perfil del negocio."
          }
          label="Configuracion fiscal"
          tone={businessSettings ? "accent" : "default"}
          value={
            businessSettings
              ? `${businessSettings.taxLabel ?? "Impuesto"} ${businessSettings.taxRate.toFixed(2)}%`
              : "Sin configurar"
          }
        />
        <SettingsMetricCard
          hint={`Cuentas operativas: ${operationalUsersCount.toString()}.`}
          label="Miembros del equipo"
          tone="accent"
          value={users.length.toString()}
        />
        <SettingsMetricCard
          hint="Cuentas con acceso al modulo protegido de configuraciones."
          label="Cuentas admin"
          tone={adminUsersCount > 0 ? "success" : "alert"}
          value={adminUsersCount.toString()}
        />
      </div>

      <div className={styles.workspace}>
        <div className={styles.primaryColumn}>
          <BusinessSettingsPanel
            businessSettings={businessSettings}
            errorMessage={businessSettingsError}
            isLoading={businessSettingsQuery.isLoading}
            isSubmitting={
              createBusinessSettingsMutation.isPending ||
              updateBusinessProfileMutation.isPending
            }
            onRetry={() => {
              void businessSettingsQuery.refetch();
            }}
            onSubmit={handleBusinessProfileSubmit}
          />

          <TaxSettingsPanel
            businessSettings={businessSettings}
            errorMessage={businessSettingsError}
            isLoading={businessSettingsQuery.isLoading}
            isSubmitting={updateTaxSettingsMutation.isPending}
            onRetry={() => {
              void businessSettingsQuery.refetch();
            }}
            onSubmit={handleBusinessTaxSubmit}
          />

          <OperationalSettingsPanel
            businessSettings={businessSettings}
            errorMessage={businessSettingsError}
            isLoading={businessSettingsQuery.isLoading}
            isSubmitting={updateBusinessProfileMutation.isPending}
            onRetry={() => {
              void businessSettingsQuery.refetch();
            }}
            onSubmit={handleOperationalSettingsSubmit}
          />
        </div>

        <UsersManagementPanel
          currentUserId={currentUser.id}
          errorMessage={usersManagementError}
          isCreatingUser={createSettingsUserMutation.isPending}
          isDeletingUser={deleteSettingsUserMutation.isPending}
          isLoading={
            settingsUsersQuery.isLoading || settingsRolesQuery.isLoading
          }
          isRefreshing={
            settingsUsersQuery.isFetching || settingsRolesQuery.isFetching
          }
          isUpdatingUser={updateSettingsUserMutation.isPending}
          roles={roles}
          users={users}
          onCreateUser={(input) =>
            createSettingsUserMutation.mutateAsync(input)
          }
          onDeleteUser={(userId) =>
            deleteSettingsUserMutation.mutateAsync(userId)
          }
          onRetry={() => {
            void handleRefresh();
          }}
          onUpdateUser={(userId, input) =>
            updateSettingsUserMutation.mutateAsync({
              userId,
              input,
            })
          }
        />
      </div>
    </div>
  );
}
