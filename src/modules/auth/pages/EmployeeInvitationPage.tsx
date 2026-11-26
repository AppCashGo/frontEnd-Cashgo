import { useId, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { acceptEmployeeInvitation } from "@/modules/auth/services/auth-api";
import { BrandLogo } from "@/shared/components/brand/BrandLogo";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "@/modules/auth/components/LoginForm.module.css";
import pageStyles from "./AuthPage.module.css";

function InvitationPasswordField({ label, visibilityLabel, value, disabled, onChange }: {
  label: string;
  visibilityLabel: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.passwordField}>
        <input
          autoComplete="new-password"
          className={styles.input}
          disabled={disabled}
          id={id}
          maxLength={72}
          minLength={8}
          required
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          aria-controls={id}
          aria-label={`${visible ? "Ocultar" : "Mostrar"} ${visibilityLabel}`}
          disabled={disabled}
          type="button"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

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
            <InvitationPasswordField
              label="Contraseña"
              visibilityLabel="contraseña"
              value={password}
              disabled={invitation.isPending}
              onChange={setPassword}
            />
            <InvitationPasswordField
              label="Repite la contraseña"
              visibilityLabel="confirmación de contraseña"
              value={confirmation}
              disabled={invitation.isPending}
              onChange={setConfirmation}
            />
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
