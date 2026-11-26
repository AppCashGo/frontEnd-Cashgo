import { type ReactNode, useState } from "react";
import { Bell, Building2, LayoutGrid, Package, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdditionalSettingsPanel } from "@/modules/settings/components/AdditionalSettingsPanel";
import { BusinessSettingsPanel } from "@/modules/settings/components/BusinessSettingsPanel";
import { InventorySettingsPanel } from "@/modules/settings/components/InventorySettingsPanel";
import { OperationalSettingsPanel } from "@/modules/settings/components/OperationalSettingsPanel";
import { PrintSettingsPanel } from "@/modules/settings/components/PrintSettingsPanel";
import { ReminderSettingsPanel } from "@/modules/settings/components/ReminderSettingsPanel";
import { SettingsMetricCard } from "@/modules/settings/components/SettingsMetricCard";
import { TaxSettingsPanel } from "@/modules/settings/components/TaxSettingsPanel";
import { VirtualCatalogSettingsPanel } from "@/modules/settings/components/VirtualCatalogSettingsPanel";
import {
  useBusinessSettingsQuery,
  useCreateBusinessSettingsMutation,
  useDeleteBusinessSettingsMutation,
  useUploadBusinessManualPaymentQrMutation,
  useUploadBusinessLogoMutation,
  useUpdateBusinessSettingsMutation,
} from "@/modules/settings/hooks/use-settings-query";
import {
  type BusinessSettings,
  type BusinessAdditionalSettingsInput,
  type BusinessProfileInput,
  type BusinessOperationalSettingsInput,
  type BusinessPrintSettingsInput,
  type BusinessReminderSettingsInput,
  type BusinessVirtualCatalogSettingsInput,
} from "@/modules/settings/types/settings";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import { useBusinessNavigationPreset } from "@/shared/hooks/use-business-navigation-preset";
import { isAdminWorkspaceRole } from "@/shared/constants/user-roles";
import { SurfaceCard } from "@/shared/components/ui/SurfaceCard";
import { RetailPageLayout } from "@/shared/components/retail/RetailPageLayout";
import { WorkspaceBusinessTitle } from "@/shared/components/retail/WorkspaceBusinessTitle";
import workspaceVisual from "@/shared/components/retail/WorkspaceVisual.module.css";
import { routePaths } from "@/routes/route-paths";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./SettingsPage.module.css";
import retailStyles from "./SettingsRetailPage.module.css";

const defaultBusinessTaxSetup = {
  currency: "COP" as const,
  taxRate: 0,
  taxLabel: "IVA",
};

const settingsTabs = [
  { id: "general", label: "General", icon: LayoutGrid },
  { id: "print", label: "Impresión", icon: Printer },
] as const;

function SettingsGroup({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={retailStyles.group} data-group={id}>
      <h2 id={id} className={retailStyles.groupTitle}>
        <span aria-hidden="true">{icon}</span>
        {title}
      </h2>
      <div className={retailStyles.panels}>{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const navigationPreset = useBusinessNavigationPreset();
  const isRetailPreset = navigationPreset === "retail";
  const [retailTab, setRetailTab] = useState<"general" | "print">(
    "general",
  );
  const currentUser = useAuthSessionStore((state) => state.user);
  const updateActiveBusiness = useAuthSessionStore(
    (state) => state.updateActiveBusiness,
  );
  const clearSession = useAuthSessionStore((state) => state.clearSession);
  const isAdmin = isAdminWorkspaceRole(currentUser?.role);
  const businessSettingsQuery = useBusinessSettingsQuery(isAdmin);
  const createBusinessSettingsMutation = useCreateBusinessSettingsMutation();
  const updateBusinessProfileMutation = useUpdateBusinessSettingsMutation();
  const updateOperationalSettingsMutation = useUpdateBusinessSettingsMutation();
  const updateTaxSettingsMutation = useUpdateBusinessSettingsMutation();
  const updateVirtualCatalogSettingsMutation = useUpdateBusinessSettingsMutation();
  const updateReminderSettingsMutation = useUpdateBusinessSettingsMutation();
  const updateAdditionalSettingsMutation = useUpdateBusinessSettingsMutation();
  const updatePrintSettingsMutation = useUpdateBusinessSettingsMutation();
  const uploadBusinessLogoMutation = useUploadBusinessLogoMutation();
  const uploadBusinessManualPaymentQrMutation =
    useUploadBusinessManualPaymentQrMutation();
  const deleteBusinessSettingsMutation = useDeleteBusinessSettingsMutation();

  if (!currentUser || !isAdmin) {
    return (
      <div className={styles.page}>
        <SurfaceCard className={styles.restrictedCard}>
          <p className={styles.restrictedEyebrow}>Acceso admin requerido</p>
          <h2 className={styles.restrictedTitle}>
            El espacio de configuraciones esta limitado a cuentas administrativas.
          </h2>
          <p className={styles.restrictedDescription}>
            Los ajustes del negocio e impuestos están protegidos como
            operaciones de administrador. Inicia sesion con una cuenta admin
            para continuar.
          </p>
        </SurfaceCard>
      </div>
    );
  }

  const businessSettings = businessSettingsQuery.data ?? null;
  const businessSettingsError = businessSettingsQuery.isError
    ? getErrorMessage(
        businessSettingsQuery.error,
        "No pudimos cargar la configuracion del negocio en este momento.",
      )
    : null;
  const isRefreshing = businessSettingsQuery.isFetching;

  async function handleRefresh() {
    await businessSettingsQuery.refetch();
  }

  function syncBusinessSession(settings: BusinessSettings) {
    updateActiveBusiness({
      businessName: settings.businessName,
      businessCategory: settings.businessCategory,
      logoUrl: settings.logoUrl,
    });
  }

  async function handleBusinessProfileSubmit(input: BusinessProfileInput) {
    if (businessSettings) {
      const settings = await updateBusinessProfileMutation.mutateAsync(input);
      syncBusinessSession(settings);
      return;
    }

    const settings = await createBusinessSettingsMutation.mutateAsync({
      ...input,
      ...defaultBusinessTaxSetup,
    });
    syncBusinessSession(settings);
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
    await updateOperationalSettingsMutation.mutateAsync(input);
  }

  async function handleVirtualCatalogSettingsSubmit(
    input: BusinessVirtualCatalogSettingsInput,
  ) {
    await updateVirtualCatalogSettingsMutation.mutateAsync(input);
  }

  async function handleReminderSettingsSubmit(
    input: BusinessReminderSettingsInput,
  ) {
    await updateReminderSettingsMutation.mutateAsync(input);
  }

  async function handleAdditionalSettingsSubmit(
    input: BusinessAdditionalSettingsInput,
  ) {
    await updateAdditionalSettingsMutation.mutateAsync(input);
  }

  async function handlePrintSettingsSubmit(input: BusinessPrintSettingsInput) {
    await updatePrintSettingsMutation.mutateAsync(input);
  }

  async function handleDeleteBusinessSettings() {
    await deleteBusinessSettingsMutation.mutateAsync();
    clearSession();
    navigate(routePaths.auth, { replace: true });
  }

  if (isRetailPreset) {
    return (
      <RetailPageLayout
        bodyClassName={retailStyles.body}
        headerClassName={`${workspaceVisual.hero} ${retailStyles.header}`}
        title={<WorkspaceBusinessTitle>Configuraciones</WorkspaceBusinessTitle>}
        meta="Ajusta los datos, la operación y los comprobantes de tu negocio."
        actions={
          <div aria-label="Secciones de configuración" className={retailStyles.tabs} role="tablist">
            {settingsTabs.map(({ id, label, icon: Icon }, index) => (
              <button
                aria-controls={`settings-panel-${id}`}
                aria-selected={retailTab === id}
                className={retailStyles.tab}
                id={`settings-tab-${id}`}
                key={id}
                role="tab"
                tabIndex={retailTab === id ? 0 : -1}
                type="button"
                onClick={() => setRetailTab(id)}
                onKeyDown={(event) => {
                  const nextIndex = {
                    ArrowLeft: 1 - index,
                    ArrowRight: 1 - index,
                    Home: 0,
                    End: settingsTabs.length - 1,
                  }[event.key];
                  if (nextIndex === undefined) return;

                  event.preventDefault();
                  const nextTab = settingsTabs[nextIndex].id;
                  setRetailTab(nextTab);
                  document.getElementById(`settings-tab-${nextTab}`)?.focus();
                }}
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        }
      >
        <div
          aria-labelledby="settings-tab-general"
          className={retailStyles.stack}
          hidden={retailTab !== "general"}
          id="settings-panel-general"
          role="tabpanel"
        >
          {retailTab === "general" ? (
            <>
              <SettingsGroup id="settings-business" title="Negocio" icon={<Building2 />}>
                <BusinessSettingsPanel
                  businessSettings={businessSettings}
                  errorMessage={businessSettingsError}
                  initialOpen={false}
                  isLoading={businessSettingsQuery.isLoading}
                  isSubmitting={
                    createBusinessSettingsMutation.isPending ||
                    updateBusinessProfileMutation.isPending
                  }
                  isLogoUploading={uploadBusinessLogoMutation.isPending}
                  variant="retail"
                  onLogoUpload={async (file) => {
                    const settings = await uploadBusinessLogoMutation.mutateAsync(file);
                    syncBusinessSession(settings);
                  }}
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
                  variant="retail"
                  onRetry={() => {
                    void businessSettingsQuery.refetch();
                  }}
                  onSubmit={handleBusinessTaxSubmit}
                />
              </SettingsGroup>

              <SettingsGroup id="settings-operation" title="Operación" icon={<Package />}>
                <VirtualCatalogSettingsPanel
                  businessSettings={businessSettings}
                  errorMessage={businessSettingsError}
                  isLoading={businessSettingsQuery.isLoading}
                  isSubmitting={updateVirtualCatalogSettingsMutation.isPending}
                  isPaymentQrUploading={uploadBusinessManualPaymentQrMutation.isPending}
                  onPaymentQrUpload={async (file) => {
                    await uploadBusinessManualPaymentQrMutation.mutateAsync(file);
                  }}
                  onRetry={() => {
                    void businessSettingsQuery.refetch();
                  }}
                  onSubmit={handleVirtualCatalogSettingsSubmit}
                />

                <InventorySettingsPanel
                  businessSettings={businessSettings}
                  errorMessage={businessSettingsError}
                  isLoading={businessSettingsQuery.isLoading}
                  isSubmitting={updateOperationalSettingsMutation.isPending}
                  onRetry={() => {
                    void businessSettingsQuery.refetch();
                  }}
                  onSubmit={handleOperationalSettingsSubmit}
                />
              </SettingsGroup>

              <SettingsGroup id="settings-preferences" title="Preferencias" icon={<Bell />}>
                <ReminderSettingsPanel
                  businessSettings={businessSettings}
                  errorMessage={businessSettingsError}
                  isLoading={businessSettingsQuery.isLoading}
                  isSubmitting={updateReminderSettingsMutation.isPending}
                  onRetry={() => {
                    void businessSettingsQuery.refetch();
                  }}
                  onSubmit={handleReminderSettingsSubmit}
                />

                <AdditionalSettingsPanel
                  businessSettings={businessSettings}
                  canDeleteBusiness={currentUser.role === "OWNER"}
                  errorMessage={businessSettingsError}
                  isDeleting={deleteBusinessSettingsMutation.isPending}
                  isLoading={businessSettingsQuery.isLoading}
                  isSubmitting={updateAdditionalSettingsMutation.isPending}
                  onDeleteBusiness={handleDeleteBusinessSettings}
                  onRetry={() => {
                    void businessSettingsQuery.refetch();
                  }}
                  onSubmit={handleAdditionalSettingsSubmit}
                />
              </SettingsGroup>
            </>
          ) : null}
        </div>

        <div
          aria-labelledby="settings-tab-print"
          hidden={retailTab !== "print"}
          id="settings-panel-print"
          role="tabpanel"
        >
          {retailTab === "print" ? (
            <PrintSettingsPanel
              businessSettings={businessSettings}
              isSubmitting={updatePrintSettingsMutation.isPending}
              onSubmit={handlePrintSettingsSubmit}
            />
          ) : null}
        </div>
      </RetailPageLayout>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Centro administrativo</p>
          <h1 className={styles.title}>
            <WorkspaceBusinessTitle>Configuraciones</WorkspaceBusinessTitle>
          </h1>
          <p className={styles.description}>
            Administra los datos, los impuestos y el inventario de tu negocio.
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
          hint="Define si una venta puede dejar existencias negativas."
          label="Política de inventario"
          tone="accent"
          value={
            businessSettings?.allowSaleWithoutStock ? "Flexible" : "Controlado"
          }
        />
        <SettingsMetricCard
          hint="Avisos cuando un producto alcanza su mínimo configurado."
          label="Alertas de inventario"
          tone={businessSettings?.lowStockAlertsEnabled ? "success" : "alert"}
          value={
            businessSettings?.lowStockAlertsEnabled
              ? "Activadas"
              : "Desactivadas"
          }
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
            isLogoUploading={uploadBusinessLogoMutation.isPending}
            onLogoUpload={async (file) => {
              const settings = await uploadBusinessLogoMutation.mutateAsync(file)
              syncBusinessSession(settings)
            }}
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
            isSubmitting={updateOperationalSettingsMutation.isPending}
            onRetry={() => {
              void businessSettingsQuery.refetch();
            }}
            onSubmit={handleOperationalSettingsSubmit}
          />
        </div>

      </div>
    </div>
  );
}
