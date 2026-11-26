import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Mail } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { completePasswordReset, requestPasswordReset } from "@/modules/auth/services/auth-api";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "@/modules/auth/components/LoginForm.module.css";
import layout from "./AuthPage.module.css";

export const passwordResetPath = "/restablecer-contrasena";

const copy = {
  es: {
    requestTitle: "Recupera tu contraseña",
    requestHint: "Escribe el correo que usas para entrar a CashGo.",
    email: "Correo electrónico",
    send: "Enviar enlace",
    sending: "Enviando…",
    check: "Si el correo está verificado en CashGo, te llegará un enlace. Revisa también la carpeta de spam.",
    resetTitle: "Crea una nueva contraseña",
    password: "Nueva contraseña",
    confirmation: "Repite la contraseña",
    save: "Guardar contraseña",
    saving: "Guardando…",
    mismatch: "Las contraseñas deben coincidir.",
    invalidLength: "Usa al menos 8 caracteres y un máximo de 72 bytes.",
    invalidLink: "El enlace no es válido. Solicita uno nuevo.",
    requestAgain: "Solicitar otro enlace",
    success: "Tu contraseña se actualizó. Ya puedes entrar con la nueva.",
    login: "Volver a iniciar sesión",
    error: "No pudimos completar la solicitud. Inténtalo de nuevo.",
  },
  en: {
    requestTitle: "Reset your password",
    requestHint: "Enter the email address you use to sign in to CashGo.",
    email: "Email address",
    send: "Send link",
    sending: "Sending…",
    check: "If this email is verified in CashGo, you’ll receive a link. Check your spam folder too.",
    resetTitle: "Create a new password",
    password: "New password",
    confirmation: "Confirm password",
    save: "Save password",
    saving: "Saving…",
    mismatch: "The passwords must match.",
    invalidLength: "Use at least 8 characters and no more than 72 bytes.",
    invalidLink: "This link is invalid. Request a new one.",
    requestAgain: "Request another link",
    success: "Your password was updated. You can now sign in with the new password.",
    login: "Back to sign in",
    error: "We couldn’t complete your request. Try again.",
  },
};

export function PasswordResetPage() {
  const token = useLocation().hash.slice(1);
  const { languageCode } = useAppTranslation();
  const labels = languageCode === "es" ? copy.es : copy.en;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validation, setValidation] = useState("");
  const request = useMutation({ mutationFn: requestPasswordReset });
  const reset = useMutation({
    mutationFn: completePasswordReset,
    gcTime: 0,
    onSuccess: () => { setPassword(""); setConfirmation(""); },
  });
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const problem = token ? reset.error : request.error;

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request.isPending) request.mutate(email.trim());
  }

  function submitReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reset.isPending || !validToken) return;
    if (password !== confirmation) {
      setValidation(labels.mismatch);
      return;
    }
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
      setValidation(labels.invalidLength);
      return;
    }
    setValidation("");
    reset.mutate({ token, password });
  }

  return (
    <main className={layout.loginLayout}>
      <div className={styles.shell}>
        <section className={styles.card}>
          <header className={styles.header}>
            <span className={styles.stageIcon}>{token ? <KeyRound aria-hidden="true" /> : <Mail aria-hidden="true" />}</span>
            <h1 className={styles.title}>{token ? labels.resetTitle : labels.requestTitle}</h1>
            {!token ? <p className={styles.description}>{labels.requestHint}</p> : null}
          </header>
          {!token ? (
            request.isSuccess ? <p className={styles.noticeBanner} role="status">{labels.check}</p> : (
              <form className={styles.form} onSubmit={submitRequest}>
                <label className={styles.field}>
                  <span className={styles.label}>{labels.email}</span>
                  <input className={styles.input} autoComplete="email" autoCapitalize="none" type="email"
                    value={email} required maxLength={191} onChange={(event) => setEmail(event.target.value)} />
                </label>
                <button className={styles.primaryButton} type="submit" disabled={request.isPending}>
                  {request.isPending ? labels.sending : labels.send}
                </button>
              </form>
            )
          ) : reset.isSuccess ? <p className={styles.noticeBanner} role="status">{labels.success}</p> : validToken ? (
            <form className={styles.form} onSubmit={submitReset}>
              <label className={styles.field}>
                <span className={styles.label}>{labels.password}</span>
                <input className={styles.input} type="password" autoComplete="new-password" required minLength={8}
                  maxLength={72} value={password} onChange={(event) => { setPassword(event.target.value); setValidation(""); }} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>{labels.confirmation}</span>
                <input className={styles.input} type="password" autoComplete="new-password" required
                  maxLength={72} value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setValidation(""); }} />
              </label>
              <button className={styles.primaryButton} type="submit" disabled={reset.isPending}>
                {reset.isPending ? labels.saving : labels.save}
              </button>
            </form>
          ) : <p className={styles.errorBanner} role="alert">{labels.invalidLink}</p>}
          {problem || (token && validation) ? (
            <p className={styles.errorBanner} role="alert">{(token && validation) || getErrorMessage(problem, labels.error)}</p>
          ) : null}
          {token && !reset.isSuccess ? <Link className={styles.inlineAction} to={passwordResetPath}>{labels.requestAgain}</Link> : null}
          <Link className={styles.inlineAction} to="/auth?method=password">{labels.login}</Link>
        </section>
      </div>
    </main>
  );
}
