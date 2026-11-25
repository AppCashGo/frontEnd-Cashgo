import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { routePaths } from "@/routes/route-paths";
import { AppButton } from "@/shared/components/ui/AppButton";
import { postJson } from "@/shared/services/api-client";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./PlatformAdminPage.module.css";

type OwnerInvitation = { businessName: string; email: string; needsAccount: boolean };

function InvitationForm({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
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
      { token, ...(invitation.data?.needsAccount ? { name, password } : {}) },
    ),
    onSuccess: () => setPassword(""),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accept.isPending) accept.mutate();
  }

  if (accept.isSuccess) {
    return (
      <div>
        <p className={styles.success} role="status">Ya tienes acceso a {accept.data.businessName} como propietario.</p>
        <Link to={routePaths.auth}>Ir a CashGo</Link>
        <p className={styles.secondary}>Si ya tienes sesión abierta, actualiza la página y elige la empresa en el selector.</p>
      </div>
    );
  }
  if (invitation.isLoading) return <p role="status">Verificando invitación…</p>;
  if (invitation.isError || !invitation.data) {
    return <p role="alert">{getErrorMessage(invitation.error, "La invitación venció o ya fue utilizada.")}</p>;
  }
  return (
    <form className={styles.form} onSubmit={submit}>
      <p>Te invitaron a administrar <strong>{invitation.data.businessName}</strong>.</p>
      <p className={styles.secondary}>{invitation.data.email}</p>
      {invitation.data.needsAccount ? (
        <fieldset className={styles.fields} disabled={accept.isPending}>
          <label>Nombre<input required autoComplete="name" minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Contraseña<input required type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        </fieldset>
      ) : (
        <p>La empresa se agregará a tu cuenta de CashGo.</p>
      )}
      {accept.isError ? <p role="alert" className={styles.error}>{getErrorMessage(accept.error, "No fue posible aceptar la invitación.")}</p> : null}
      <div className={styles.actions}>
        <AppButton type="submit" isLoading={accept.isPending}>Aceptar invitación</AppButton>
      </div>
    </form>
  );
}

export function OwnerInvitationPage() {
  const token = useLocation().hash.slice(1);
  return (
    <main className={styles.page}>
      <section className={`${styles.card} ${styles.invitationPage}`}>
        <div className={styles.heading}>
          <span><Building2 aria-hidden="true" /></span>
          <h1>Invitación a CashGo</h1>
        </div>
        {/^[A-Za-z0-9_-]{43}$/.test(token) ? <InvitationForm key={token} token={token} /> : (
          <p role="alert">El enlace de invitación está incompleto. Solicita uno nuevo a administración.</p>
        )}
      </section>
    </main>
  );
}
