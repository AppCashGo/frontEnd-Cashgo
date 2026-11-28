import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Check, Circle, History, Plus, RefreshCw, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import { appDictionary } from "@/shared/i18n/app-dictionary";
import { userRoleLabels } from "@/shared/constants/user-roles";
import { businessCategoryOptions } from "@/shared/constants/business-categories";
import { useConfirmDialog } from "@/shared/hooks/use-confirm-dialog";
import { AppButton } from "@/shared/components/ui/AppButton";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import {
  listPlatformBusinessChanges,
  listPlatformBusinessEmployees,
  removePlatformBusinessEmployee,
  listPlatformBusinesses,
  createPlatformBusiness,
  planModules,
  renewOwnerInvitation,
  savePlatformBusiness,
  usePlatformAccess,
  type CommercialSettings,
  type InvitationDelivery,
  type PlanModule,
  type PlatformBusiness,
} from "./platform-admin-api";
import styles from "./PlatformAdminPage.module.css";

const statusLabels: Record<CommercialSettings["status"], string> = {
  TRIAL: "En prueba",
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
};

const emptySettings: CommercialSettings = {
  planName: "",
  status: "ACTIVE",
  maxUsers: null,
  validUntil: null,
  revision: 0,
};

const activationSteps = [
  { key: "hasAddedProduct", label: "Cargar productos", pendingAction: "cargar productos" },
  { key: "hasOpenedCashRegister", label: "Abrir caja", pendingAction: "abrir caja" },
  { key: "hasRecordedSale", label: "Registrar la primera venta", pendingAction: "registrar la primera venta" },
] as const;

const activationFilters = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "complete", label: "Completadas" },
] as const;

function getActivationPendingSteps(progress: NonNullable<PlatformBusiness["setupProgress"]>) {
  return activationSteps.filter(({ key }) => !progress[key]);
}

function formatActivationProgress(pending: ReturnType<typeof getActivationPendingSteps>) {
  const completed = activationSteps.length - pending.length;
  const count = `${completed} de ${activationSteps.length} pasos`;
  if (pending.length === 0) return `${count} · Completado`;
  if (completed === 0) return `${count} · Sin iniciar`;
  return `${count} · Falta ${pending.map(({ pendingAction }) => pendingAction).join(" y ")}`;
}

function BusinessActivation({ progress }: { progress: PlatformBusiness["setupProgress"] }) {
  if (!progress) return null;

  return (
    <section className={styles.activation} aria-labelledby="platform-business-activation">
      <h3 id="platform-business-activation">Activación del negocio</h3>
      <p>{formatActivationProgress(getActivationPendingSteps(progress))}</p>
      <ul role="list" className={styles.activationSteps}>
        {activationSteps.map(({ key, label }) => (
          <li key={key} data-complete={progress[key] || undefined}>
            {progress[key] ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
            <span>{label}</span>
            <small>{progress[key] ? "Completado" : "Pendiente"}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlanModuleFields({ modules = [], onChange }: { modules?: PlanModule[]; onChange: (modules: PlanModule[]) => void }) {
  return (
    <fieldset className={styles.moduleFields}>
      <legend>Módulos adicionales</legend>
      {(Object.keys(planModules) as PlanModule[]).map((module) => (
        <label key={module}>
          <input type="checkbox" checked={modules.includes(module)} onChange={(event) =>
            onChange(event.target.checked ? [...modules, module] : modules.filter((item) => item !== module))
          } />
          {planModules[module]}
        </label>
      ))}
    </fieldset>
  );
}

function InvitationResult({ invitation }: { invitation: InvitationDelivery }) {
  const link = invitation.link ?? new URL(invitation.path, window.location.origin).href;
  const [copied, setCopied] = useState(false);
  return (
    <div className={styles.notice}>
      <p role="status">{invitation.emailSent ? "Invitación enviada por correo." : "Invitación generada. Comparte este enlace con el propietario."}</p>
      <label>Enlace de invitación
        <input className={styles.invitationLink} readOnly value={link} onFocus={(event) => event.target.select()} />
      </label>
      {navigator.clipboard ? (
        <AppButton size="sm" variant="secondary" onClick={() =>
          void navigator.clipboard.writeText(link).then(() => setCopied(true)).catch(() => setCopied(false))
        }>{copied ? "Copiado" : "Copiar enlace"}</AppButton>
      ) : null}
    </div>
  );
}

function CreateBusinessForm({ onCreated, onCancel }: {
  onCreated: (result: InvitationDelivery) => void;
  onCancel: () => void;
}) {
  const [modules, setModules] = useState<PlanModule[]>([]);
  const create = useMutation({ mutationFn: createPlatformBusiness, onSuccess: onCreated });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (create.isPending) return;
    const fields = new FormData(event.currentTarget);
    const text = (key: string) => String(fields.get(key) ?? "").trim();
    create.mutate({
      ...emptySettings,
      businessName: text("businessName"),
      businessCategory: text("businessCategory"),
      ownerEmail: text("ownerEmail"),
      planName: text("planName"),
      status: text("status") === "TRIAL" ? "TRIAL" : "ACTIVE",
      maxUsers: text("maxUsers") ? Number(text("maxUsers")) : null,
      validUntil: text("validUntil") || null,
      modules,
    });
  }

  return (
    <section className={styles.card}>
      <h2>Nueva empresa</h2>
      <form className={styles.form} onSubmit={submit}>
        <fieldset className={styles.fields} disabled={create.isPending}>
          <label>Nombre de la empresa<input name="businessName" required minLength={2} maxLength={120} /></label>
          <label>Tipo de negocio
            <SearchableSelect aria-label="Tipo de negocio" name="businessCategory" defaultValue="corner_store">
              {businessCategoryOptions.map((option) => <option value={option} key={option}>{appDictionary.es.categories[option]}</option>)}
            </SearchableSelect>
          </label>
          <label>Correo del propietario<input type="email" name="ownerEmail" required maxLength={191} /></label>
          <label>Plan comercial<input name="planName" required maxLength={80} placeholder="Ej. Inicial" /></label>
          <label>Estado inicial
            <SearchableSelect aria-label="Estado inicial" name="status" defaultValue="ACTIVE">
              <option value="ACTIVE">Activo</option>
              <option value="TRIAL">En prueba</option>
            </SearchableSelect>
          </label>
          <label>Cupo de usuarios<input type="number" name="maxUsers" min={1} max={100_000} placeholder="Sin límite" /></label>
          <label>Vigencia hasta<input type="date" name="validUntil" /></label>
          <PlanModuleFields modules={modules} onChange={setModules} />
        </fieldset>
        <p className={styles.secondary}>El propietario ocupa un cupo. La invitación vence en 48 horas.</p>
        {create.isError ? <p role="alert" className={styles.error}>{getErrorMessage(create.error, "No fue posible crear la empresa.")}</p> : null}
        <div className={styles.actions}>
          <AppButton disabled={create.isPending} variant="secondary" onClick={onCancel}>Cancelar</AppButton>
          <AppButton type="submit" isLoading={create.isPending}>Crear e invitar</AppButton>
        </div>
      </form>
    </section>
  );
}

function BusinessEmployees({ business, userId }: { business: PlatformBusiness; userId: string }) {
  const queryClient = useQueryClient();
  const { confirm, confirmationDialog } = useConfirmDialog();
  const queryKey = ["platform-business-employees", userId, business.id];
  const employees = useQuery({
    queryKey,
    queryFn: () => listPlatformBusinessEmployees(business.id),
  });
  const removal = useMutation({
    mutationFn: (employeeId: string) => removePlatformBusinessEmployee(business.id, employeeId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["platform-businesses", userId] }),
        queryClient.invalidateQueries({ queryKey: ["employees"] }),
      ]);
    },
  });

  async function remove(employee: { id: string; name: string }) {
    const confirmed = await confirm({
      title: "Eliminar empleado",
      description: `Se retirará el acceso de ${employee.name} a ${business.businessName}. Su historial se conservará.`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (confirmed) removal.mutate(employee.id);
  }

  return (
    <section className={styles.history} aria-label="Equipo de la empresa">
      {confirmationDialog}
      <h3><Users aria-hidden="true" /> Equipo de la empresa</h3>
      {employees.isError ? (
        <AppButton size="sm" variant="secondary" onClick={() => void employees.refetch()}>Reintentar cargar equipo</AppButton>
      ) : employees.isLoading ? (
        <p className={styles.secondary} role="status">Cargando equipo…</p>
      ) : employees.data?.length ? (
        <ul>
          {employees.data.map((employee) => (
            <li key={employee.id} className={styles.employeeItem}>
              <div>
                <strong>{employee.name}</strong>
                <span>{userRoleLabels[employee.role]} · {employee.email}</span>
              </div>
              {employee.canRemove && String(employee.id) !== String(userId) ? (
                <AppButton aria-label={`Eliminar a ${employee.name}`} disabled={removal.isPending}
                  size="sm" variant="danger" startIcon={<Trash2 aria-hidden="true" />} onClick={() => void remove(employee)}>
                  Eliminar
                </AppButton>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className={styles.secondary}>Esta empresa aún no tiene usuarios vinculados.</p>}
      {removal.isError ? <p className={styles.error} role="alert">{getErrorMessage(removal.error, "No se pudo eliminar al empleado.")}</p> : null}
      {removal.isSuccess ? <p className={styles.success} role="status">Se retiró el acceso del empleado.</p> : null}
    </section>
  );
}

function BusinessEditor({ business, userId }: { business: PlatformBusiness; userId: string }) {
  const queryClient = useQueryClient();
  const businessesKey = ["platform-businesses", userId];
  const changesKey = ["platform-business-changes", userId, business.id];
  const [draft, setDraft] = useState<CommercialSettings>(business.platformSettings ?? emptySettings);
  const managed = Boolean(business.platformSettings?.managed);
  const ownerInvitation = business.ownerInvitations?.[0];
  const { confirm, confirmationDialog } = useConfirmDialog();
  const renew = useMutation({
    mutationFn: () => renewOwnerInvitation(business.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: businessesKey }),
  });
  const changes = useQuery({
    queryKey: changesKey,
    queryFn: () => listPlatformBusinessChanges(business.id),
  });
  const save = useMutation({
    mutationFn: (settings: CommercialSettings) => savePlatformBusiness(business.id, settings),
    onSuccess: (settings) => {
      setDraft(settings);
      queryClient.setQueryData<PlatformBusiness[]>(businessesKey, (list) =>
        list?.map((item) => item.id === business.id ? { ...item, platformSettings: settings } : item),
      );
      void queryClient.invalidateQueries({ queryKey: changesKey });
    },
  });

  function updateDraft<K extends keyof CommercialSettings>(key: K, value: CommercialSettings[K]) {
    save.reset();
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.isPending || !draft.planName.trim()) return;
    if (managed && draft.status === "SUSPENDED" && business.platformSettings?.status !== "SUSPENDED" &&
      !await confirm({
        title: "Suspender el acceso de la empresa",
        description: `${business.businessName} perderá acceso hasta que reactives su plan. Sus datos se conservarán.`,
        confirmLabel: "Suspender empresa",
      })) return;
    save.mutate({ ...draft, planName: draft.planName.trim() });
  }

  async function reloadSettings() {
    try {
      const businesses = await queryClient.fetchQuery({
        queryKey: businessesKey,
        queryFn: listPlatformBusinesses,
      });
      setDraft(businesses.find((item) => item.id === business.id)?.platformSettings ?? emptySettings);
      save.reset();
    } catch {
      // Keep the current draft and save error available for retry.
    }
  }

  return (
    <section className={styles.card} aria-labelledby="platform-business-heading">
      {confirmationDialog}
      <h2 id="platform-business-heading">{business.businessName}</h2>
      <p className={styles.secondary}>Empresa #{business.id} · {business._count.memberships} usuarios vinculados</p>
      <BusinessActivation progress={business.setupProgress} />
      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        <fieldset disabled={save.isPending} className={styles.fields}>
          <label>
            Plan comercial
            <input required maxLength={80} value={draft.planName} onChange={(event) => updateDraft("planName", event.target.value)} placeholder="Ej. Inicial" />
          </label>
          <label>
            Estado comercial
            <SearchableSelect aria-label="Estado comercial" value={draft.status} onChange={(event) => updateDraft("status", event.target.value as CommercialSettings["status"])}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </SearchableSelect>
          </label>
          <label>
            Usuarios contratados
            <input type="number" min={1} max={100_000} value={draft.maxUsers ?? ""} onChange={(event) => updateDraft("maxUsers", event.target.value === "" ? null : event.target.valueAsNumber)} placeholder="Sin límite definido" />
          </label>
          <label>
            Vigencia hasta
            <input type="date" value={draft.validUntil ?? ""} onChange={(event) => updateDraft("validUntil", event.target.value || null)} />
          </label>
          {managed ? <PlanModuleFields modules={draft.modules} onChange={(modules) => updateDraft("modules", modules)} /> : null}
        </fieldset>
        <p className={styles.notice}>{managed
          ? "El servidor aplica el estado, la vigencia, los módulos y el cupo. Si reduces el cupo, los usuarios actuales conservan su acceso."
          : "Esta empresa conserva su acceso habitual. Los datos de esta ficha son informativos."}</p>
        {save.isError ? (
          <div className={styles.error} role="alert">
            {getErrorMessage(save.error, "No fue posible guardar los cambios.")}
            <AppButton size="sm" variant="secondary" onClick={() => void reloadSettings()}>Recargar ficha</AppButton>
          </div>
        ) : null}
        {save.isSuccess ? <p role="status" className={styles.success}>Cambios guardados.</p> : null}
        <div className={styles.actions}>
          <AppButton type="submit" isLoading={save.isPending}>Guardar cambios</AppButton>
        </div>
      </form>
      {ownerInvitation ? (
        <div className={styles.history}>
          <h3>Invitación al propietario</h3>
          <p className={styles.secondary}>{ownerInvitation.email} · {ownerInvitation.acceptedAt
            ? "Aceptada"
            : `Vence ${new Date(ownerInvitation.expiresAt).toLocaleString("es-CO")}`}</p>
          {!ownerInvitation.acceptedAt ? (
            <AppButton size="sm" variant="secondary" isLoading={renew.isPending} onClick={() => renew.mutate()}>Renovar invitación</AppButton>
          ) : null}
          {renew.isError ? <p className={styles.error} role="alert">{getErrorMessage(renew.error, "No fue posible renovar la invitación.")}</p> : null}
          {renew.data ? <InvitationResult key={renew.data.path} invitation={renew.data} /> : null}
        </div>
      ) : null}

      <BusinessEmployees business={business} userId={userId} />

      <div className={styles.history}>
        <h3><History aria-hidden="true" /> Historial comercial</h3>
        {changes.isError ? (
          <AppButton size="sm" variant="secondary" onClick={() => void changes.refetch()}>Reintentar cargar historial</AppButton>
        ) : changes.isLoading ? <p className={styles.secondary}>Cargando historial…</p> : changes.data?.length ? (
          <ul>
            {changes.data.map((change) => (
              <li key={change.id}>
                <strong>{change.next.planName} · {statusLabels[change.next.status]}</strong>
                <span>{new Date(change.createdAt).toLocaleString("es-CO")} · Usuario #{change.actorUserId}</span>
                <span>Usuarios contratados: {change.next.maxUsers ?? "Sin límite definido"} · Vigencia: {change.next.validUntil ?? "Sin fecha"}</span>
              </li>
            ))}
          </ul>
        ) : <p className={styles.secondary}>Todavía no hay cambios registrados.</p>}
      </div>
    </section>
  );
}

export function PlatformAdminPage() {
  const access = usePlatformAccess();
  const userId = useAuthSessionStore((state) => state.user?.id ?? "");
  const [search, setSearch] = useState("");
  const [activationFilter, setActivationFilter] = useState<(typeof activationFilters)[number]["value"]>("all");
  const [businessId, setBusinessId] = useState<number>();
  const [creating, setCreating] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDelivery>();
  const businesses = useQuery({
    queryKey: ["platform-businesses", userId],
    queryFn: listPlatformBusinesses,
    enabled: Boolean(access.data?.allowed),
    refetchOnWindowFocus: true,
  });
  const query = search.trim().toLocaleLowerCase("es-CO");
  const visibleBusinesses = businesses.data
    ?.filter((business) => !query || business.businessName.toLocaleLowerCase("es-CO").includes(query) || String(business.id) === query)
    .map((business) => ({
      business,
      pending: business.setupProgress ? getActivationPendingSteps(business.setupProgress) : null,
    }))
    .filter(({ pending }) => activationFilter === "all" || (
      pending !== null && (activationFilter === "pending" ? pending.length > 0 : pending.length === 0)
    ));
  const selected = businesses.data?.find((business) => business.id === businessId);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link to="/"><ArrowLeft aria-hidden="true" /> Volver a mi negocio</Link>
        <div className={styles.heading}>
          <span><ShieldCheck aria-hidden="true" /></span>
          <div><h1>Administración CashGo</h1><p>Empresas y condiciones comerciales</p></div>
        </div>
      </header>
      {access.isError ? (
        <AppButton variant="secondary" onClick={() => void access.refetch()}>Reintentar verificar acceso</AppButton>
      ) : access.isLoading ? <p role="status">Verificando acceso…</p> : !access.data?.allowed ? (
        <p role="alert">Esta sección es exclusiva de administración de CashGo.</p>
      ) : (
        <div className={styles.workspace}>
          <section className={styles.card} aria-labelledby="platform-companies-heading">
            <h2 id="platform-companies-heading">Empresas</h2>
            <div className={styles.companyActions}>
              <AppButton disabled={businesses.isFetching} size="sm" variant="secondary" startIcon={<RefreshCw aria-hidden="true" />} onClick={() => void businesses.refetch()}>Actualizar</AppButton>
              <AppButton startIcon={<Plus aria-hidden="true" />} onClick={() => { setCreating(true); setInvitation(undefined); }}>Nueva empresa</AppButton>
            </div>
            <label className={styles.search}>
              <Search aria-hidden="true" />
              <input type="search" aria-label="Buscar empresa" placeholder="Buscar por nombre o ID" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <div className={styles.activationFilters} role="group" aria-label="Filtrar por activación">
              {activationFilters.map(({ value, label }) => (
                <button key={value} type="button" aria-pressed={activationFilter === value} onClick={() => setActivationFilter(value)}>{label}</button>
              ))}
            </div>
            {businesses.isError ? (
              <AppButton variant="secondary" onClick={() => void businesses.refetch()}>Reintentar cargar empresas</AppButton>
            ) : businesses.isLoading ? <p role="status">Cargando empresas…</p> : visibleBusinesses?.length ? (
              <ul className={styles.companies}>
                {visibleBusinesses.map(({ business, pending }) => (
                  <li key={business.id}>
                    <button type="button" aria-pressed={business.id === businessId && !creating} onClick={() => { setBusinessId(business.id); setCreating(false); setInvitation(undefined); }}>
                      <Building2 aria-hidden="true" />
                      <span>
                        <strong>{business.businessName}</strong>
                        <small>{business.platformSettings?.planName ?? "Sin ficha comercial"}</small>
                        <small className={styles.activationSummary} data-complete={pending?.length === 0 || undefined}>
                          {pending ? formatActivationProgress(pending) : "Sin información de activación"}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.secondary} role="status">{query || activationFilter !== "all" ? "Ninguna empresa coincide con los filtros." : "No hay empresas para mostrar."}</p>}
          </section>
          <div className={styles.detail}>
          {invitation ? <InvitationResult key={invitation.path} invitation={invitation} /> : null}
          {creating ? <CreateBusinessForm onCancel={() => setCreating(false)} onCreated={(result) => {
            setCreating(false);
            setSearch("");
            setActivationFilter("all");
            setBusinessId(result.businessId);
            setInvitation(result);
            void businesses.refetch();
          }} /> : selected ? <BusinessEditor key={`${userId}:${selected.id}`} business={selected} userId={userId} /> : (
            <section className={styles.card}><h2>Ficha comercial</h2><p className={styles.secondary}>Selecciona una empresa para consultar o editar su ficha.</p></section>
          )}
          </div>
        </div>
      )}
    </main>
  );
}
