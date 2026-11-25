import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import { acceptEmployeeInvitation } from "@/modules/auth/services/auth-api";
import { BrandLogo } from "@/shared/components/brand/BrandLogo";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "@/modules/auth/components/LoginForm.module.css";
import pageStyles from "./AuthPage.module.css";

export function EmployeeInvitationPage() {
  const token = useLocation().hash.slice(1);
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const invitation = useMutation({
    mutationFn: acceptEmployeeInvitation,
    gcTime: 0,
    onSuccess: () => {
      setPassword("");
      setConfirmation("");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validToken || invitation.isPending) return;
    setMismatch(password !== confirmation);
    if (password === confirmation) invitation.mutate({ token, password });
  }

  return (
    <main className={pageStyles.loginLayout}>
      <section className={styles.card}>
        <BrandLogo brand="CashGo" size="md" />
        <header className={styles.header}>
          <span className={styles.stageIcon}>
            {invitation.isSuccess ? <ShieldCheck aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
          </span>
          <h1 className={styles.title}>{invitation.isSuccess ? "Tu acceso está listo" : "Activa tu acceso a CashGo"}</h1>
          <p className={styles.description}>
            {invitation.isSuccess
              ? `Ingresa con ${invitation.data.email} y la contraseña que acabas de crear.`
              : "Crea una contraseña para acceder a tu equipo en CashGo."}
          </p>
        </header>
        {invitation.isSuccess ? (
          <Link className={styles.primaryButton} to="/auth?method=password">Iniciar sesión</Link>
        ) : validToken ? (
          <form className={styles.form} onSubmit={submit}>
            <label className={styles.field}>
              <span className={styles.label}>Contraseña</span>
              <input className={styles.input} type="password" autoComplete="new-password" required minLength={8}
                maxLength={72} value={password} disabled={invitation.isPending} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Repite la contraseña</span>
              <input className={styles.input} type="password" autoComplete="new-password" required minLength={8}
                maxLength={72} value={confirmation} disabled={invitation.isPending} onChange={(event) => setConfirmation(event.target.value)} />
            </label>
            {mismatch || invitation.error ? (
              <p role="alert" className={styles.errorBanner}>
                {mismatch ? "Las contraseñas deben coincidir." : getErrorMessage(invitation.error, "No se pudo activar el acceso. Pide una nueva invitación.")}
              </p>
            ) : null}
            <button className={styles.primaryButton} type="submit" disabled={invitation.isPending}>
              {invitation.isPending ? "Activando…" : "Crear contraseña y activar acceso"}
            </button>
          </form>
        ) : (
          <p className={styles.errorBanner} role="alert">La invitación no es válida. Pide una nueva al propietario.</p>
        )}
      </section>
    </main>
  );
}
