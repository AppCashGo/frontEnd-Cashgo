import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Check, Eye, EyeOff, Link2Off, LoaderCircle, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import { routePaths } from "@/routes/route-paths";
import { BrandLogo } from "@/shared/components/brand/BrandLogo";
import { AppButton } from "@/shared/components/ui/AppButton";
import { ApiError, postJson } from "@/shared/services/api-client";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./OwnerInvitationPage.module.css";

type OwnerInvitation = { businessName: string; email: string; needsAccount: boolean };
type InvitationTone = "default" | "success" | "error";

function InvitationCard({ children, description, icon, title, tone = "default", focusTitle = false }: {
  children?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
  tone?: InvitationTone;
  focusTitle?: boolean;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusTitle) titleRef.current?.focus();
  }, [focusTitle]);

  return (
    <section className={styles.card} aria-labelledby="invitation-title" data-tone={tone}>
      <header className={styles.hero}>
        <div className={styles.heroIcon}>{icon}</div>
        <h1 id="invitation-title" ref={titleRef} tabIndex={focusTitle ? -1 : undefined}>{title}</h1>
        <p>{description}</p>
      </header>
      {children ? <div className={styles.content}>{children}</div> : null}
    </section>
  );
}

function BusinessDetails({ businessName, email }: Pick<OwnerInvitation, "businessName" | "email">) {
  return (
    <div className={styles.business}>
      <span className={styles.businessIcon}><Building2 aria-hidden="true" /></span>
      <div className={styles.businessIdentity}>
        <strong>{businessName}</strong>
        <span>{email}</span>
      </div>
      <span className={styles.role}>Propietario</span>
    </div>
  );
}

function ConfirmedInvitation({ businessName, email }: Pick<OwnerInvitation, "businessName" | "email">) {
  const sessionEmail = useAuthSessionStore((state) => state.user?.email);
  const hasSession = Boolean(sessionEmail);
  const sameAccount = sessionEmail?.trim().toLowerCase() === email.toLowerCase();

  return (
    <InvitationCard
      title="¡Ya tienes acceso!"
      description="Tu invitación fue aceptada. Ya puedes administrar la empresa como propietario."
      icon={<Check aria-hidden="true" />}
      tone="success"
      focusTitle
    >
      <BusinessDetails businessName={businessName} email={email} />
      <Link className={styles.primaryLink} to={hasSession ? "/" : `${routePaths.auth}?method=password`} replace>
        {hasSession ? "Entrar a CashGo" : "Iniciar sesión"}
        <ArrowRight aria-hidden="true" />
      </Link>
      <p className={styles.hint}>
        {sameAccount
          ? "Selecciona la empresa en el menú de negocios para comenzar."
          : hasSession
            ? "Para ver esta empresa, entra con el correo que aparece arriba."
            : "Usa el correo de la invitación y tu contraseña de CashGo."}
      </p>
    </InvitationCard>
  );
}

function UnavailableInvitation({ incomplete = false }: { incomplete?: boolean }) {
  return (
    <InvitationCard
      title={incomplete ? "El enlace está incompleto" : "Invitación no disponible"}
      description={incomplete
        ? "Abre el enlace completo que recibiste. Si sigue sin funcionar, solicita uno nuevo a quien te invitó."
        : "El enlace venció, fue reemplazado o ya se utilizó. Solicita uno nuevo a quien te invitó."}
      icon={<Link2Off aria-hidden="true" />}
      tone="error"
    >
      <Link className={styles.secondaryLink} to={routePaths.auth} replace>
        Ir a CashGo <ArrowRight aria-hidden="true" />
      </Link>
    </InvitationCard>
  );
}

function InvitationForm({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const invitation = useQuery({
    queryKey: ["owner-invitation", token],
    queryFn: () => postJson<OwnerInvitation, { token: string }>("/owner-invitations/inspect", { token }),
    retry: false,
    refetchOnWindowFocus: false,
    gcTime: 0,
  });
  const accept = useMutation({
    mutationFn: () => postJson<{ businessName: string }, { token: string; name?: string; password?: string }>(
      "/owner-invitations/accept",
      { token, ...(invitation.data?.needsAccount ? { name: name.trim(), password } : {}) },
    ),
    onSuccess: () => setPassword(""),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accept.isPending) accept.mutate();
  }

  if (accept.isSuccess && invitation.data) {
    return <ConfirmedInvitation businessName={accept.data.businessName} email={invitation.data.email} />;
  }
  if (invitation.isLoading) {
    return (
      <div role="status">
        <InvitationCard
          title="Verificando la invitación"
          description="Estamos preparando tu acceso a CashGo."
          icon={<LoaderCircle className={styles.spinner} aria-hidden="true" />}
        />
      </div>
    );
  }
  if ((invitation.error instanceof ApiError && invitation.error.status === 404) ||
    (accept.error instanceof ApiError && accept.error.status === 404)) {
    return <UnavailableInvitation />;
  }
  if (invitation.isError || !invitation.data) {
    return (
      <InvitationCard
        title="No pudimos verificar la invitación"
        description={getErrorMessage(invitation.error, "Revisa tu conexión e intenta nuevamente.")}
        icon={<Link2Off aria-hidden="true" />}
        tone="error"
      >
        <AppButton fullWidth onClick={() => void invitation.refetch()}>Reintentar</AppButton>
      </InvitationCard>
    );
  }

  const invite = invitation.data;
  return (
    <InvitationCard
      title={invite.needsAccount ? "Crea tu cuenta de propietario" : "Acepta tu invitación"}
      description={invite.needsAccount
        ? "Configura tu acceso para empezar a administrar tu empresa."
        : "Agrega esta empresa a tu cuenta de CashGo."}
      icon={<ShieldCheck aria-hidden="true" />}
    >
      <BusinessDetails businessName={invite.businessName} email={invite.email} />
      <form className={styles.form} onSubmit={submit}>
        {invite.needsAccount ? (
          <fieldset className={styles.fields} disabled={accept.isPending}>
            <label htmlFor="owner-name">Nombre completo</label>
            <input id="owner-name" required autoComplete="name" minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre y apellido" />
            <label htmlFor="owner-password">Contraseña</label>
            <div className={styles.passwordField}>
              <input id="owner-password" required type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={72} aria-describedby="owner-password-hint" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Elige una contraseña" />
              <button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            <p id="owner-password-hint" className={styles.fieldHint}>Usa al menos 8 caracteres.</p>
          </fieldset>
        ) : null}
        {accept.isError ? <p role="alert" className={styles.error}>{getErrorMessage(accept.error, "No fue posible aceptar la invitación.")}</p> : null}
        <AppButton fullWidth size="lg" type="submit" isLoading={accept.isPending} loadingLabel="Activando acceso…" endIcon={<ArrowRight aria-hidden="true" />}>
          {invite.needsAccount ? "Crear cuenta y aceptar" : "Aceptar invitación"}
        </AppButton>
      </form>
    </InvitationCard>
  );
}

export function OwnerInvitationPage() {
  const token = useLocation().hash.slice(1);

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <BrandLogo brand="CashGo" size="sm" className={styles.brand} />
        {/^[A-Za-z0-9_-]{43}$/.test(token)
          ? <InvitationForm key={token} token={token} />
          : <UnavailableInvitation incomplete />}
      </div>
    </main>
  );
}
