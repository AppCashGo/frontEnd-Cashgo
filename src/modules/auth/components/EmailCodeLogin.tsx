import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { PageLoadingState } from "@/shared/components/states/PageLoadingState";
import { ArrowLeft, CircleHelp, KeyRound, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import { startEmailLogin, verifyEmailLogin } from "@/modules/auth/services/auth-api";
import { getModuleLandingPath } from "@/routes/module-navigation-routes";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./LoginForm.module.css";

type EmailChallenge = { token: string; expiresAt: number; resendAt: number };

const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_FORMAT = /^\+?[\d().\s-]+$/;

function isValidIdentifier(identifier: string) {
  if (EMAIL_ADDRESS.test(identifier)) return true;
  const digits = identifier.replace(/\D/g, "");
  return PHONE_FORMAT.test(identifier) && digits.length >= 7 && digits.length <= 15;
}

const emailCodeCopy = {
  es: {
    back: "Volver",
    title: "Recibe un código por correo",
    description: "Usa el correo o celular registrado en CashGo. El código llega al correo vinculado a tu cuenta.",
    identifier: "Correo o número de celular",
    identifierHint: "Para celulares de Colombia puedes escribir los 10 dígitos. Para otros países, incluye el indicativo con +.",
    invalidIdentifier: "Escribe un correo válido o un número de celular con su indicativo.",
    activationTitle: "Activa tu correo en CashGo",
    activationDescription: "Si aún no has verificado tu correo, usa tu contraseña de CashGo para iniciar la activación.",
    password: "Contraseña actual de CashGo",
    send: "Enviar código",
    sending: "Solicitando…",
    verify: "Ingresar a CashGo",
    verifying: "Validando…",
    verifyTitle: "Ingresa el código",
    verifyDescription: "Si podemos enviar un código, llegará al correo vinculado a tu cuenta.",
    requestedFor: "Dato ingresado",
    code: "Código de 6 dígitos",
    expired: "El código venció. Solicita uno nuevo.",
    resend: "Reenviar código",
    resendActivation: "Volver a ingresar la contraseña",
    wait: "Reenviar en",
    edit: "Cambiar correo o celular",
    activate: "Activar correo con contraseña",
    useCode: "Pedir código sin contraseña",
    helpTitle: "¿No te llegó el código?",
    help: "Revisa Spam. Si usaste el celular, prueba con tu correo registrado.",
    invitation: "Si aún no tienes contraseña, abre la invitación de tu negocio o pide ayuda a tu administrador.",
    failure: "No pudimos completar el acceso. Intenta de nuevo.",
  },
  en: {
    back: "Back",
    title: "Get a code by email",
    description: "Use your registered CashGo email or phone number. The code goes to the email linked to your account.",
    identifier: "Email or phone number",
    identifierHint: "For Colombian phones, enter the 10 digits. For other countries, include the country code with +.",
    invalidIdentifier: "Enter a valid email or a phone number with its country code.",
    activationTitle: "Enable your email in CashGo",
    activationDescription: "If you haven’t verified your email yet, use your CashGo password to start activation.",
    password: "Current CashGo password",
    send: "Send code",
    sending: "Requesting…",
    verify: "Sign in to CashGo",
    verifying: "Verifying…",
    verifyTitle: "Enter the code",
    verifyDescription: "If we can send a code, it will go to the email linked to your account.",
    requestedFor: "You entered",
    code: "6-digit code",
    expired: "The code expired. Request a new one.",
    resend: "Resend code",
    resendActivation: "Enter your password again",
    wait: "Resend in",
    edit: "Change email or phone",
    activate: "Enable email with password",
    useCode: "Request a code without a password",
    helpTitle: "Didn’t get the code?",
    help: "Check Spam. If you entered your phone number, try your registered email.",
    invitation: "If you don’t have a password yet, open your business invitation or ask your administrator for help.",
    failure: "We couldn’t sign you in. Try again.",
  },
} as const;

export function EmailCodeLogin({ onBack }: { onBack: () => void }) {
  const { languageCode, setLanguagePreference } = useAppTranslation();
  const navigate = useNavigate();
  const setSession = useAuthSessionStore((state) => state.setSession);
  const [identifier, setIdentifier] = useState("");
  const [identifierInvalid, setIdentifierInvalid] = useState(false);
  const [activating, setActivating] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<EmailChallenge>();
  const [now, setNow] = useState(Date.now);
  const identifierInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const copy = emailCodeCopy[languageCode === "es" ? "es" : "en"];

  const send = useMutation({
    mutationFn: startEmailLogin,
    onSuccess: ({ requestToken, expiresInSeconds }) => {
      const receivedAt = Date.now();
      setNow(receivedAt);
      setChallenge({
        token: requestToken,
        expiresAt: receivedAt + expiresInSeconds * 1000,
        resendAt: receivedAt + 30_000,
      });
      setPassword("");
      setCode("");
    },
    gcTime: 0,
  });
  const verify = useMutation({
    mutationFn: verifyEmailLogin,
    onSuccess: (result) => {
      setSession({ accessToken: result.accessToken, user: result.user });
      setLanguagePreference({
        code: result.user.translation.code,
        translationId: result.user.translation.id,
      });
      navigate(getModuleLandingPath(languageCode, result.user.businessCategory, result.user.role), { replace: true });
    },
  });

  useEffect(() => {
    if (!challenge) return;
    codeInput.current?.focus();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  const busy = send.isPending || verify.isPending;
  const expired = Boolean(challenge && now >= challenge.expiresAt);
  const remaining = challenge ? Math.max(0, Math.ceil((challenge.resendAt - now) / 1000)) : 0;
  const error = send.error ?? verify.error;

  function showRequestForm(activate: boolean) {
    setActivating(activate);
    setChallenge(undefined);
    setIdentifierInvalid(false);
    setCode("");
    setPassword("");
    send.reset();
    verify.reset();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    if (challenge) {
      if (code.length === 6 && Date.now() < challenge.expiresAt) {
        verify.mutate({ requestToken: challenge.token, verificationCode: code });
      }
      return;
    }

    const value = identifier.trim();
    if (!isValidIdentifier(value)) {
      setIdentifierInvalid(true);
      identifierInput.current?.focus();
      return;
    }

    setIdentifier(value);
    send.mutate({ identifier: value, ...(activating ? { password } : {}) });
  }

  function resend() {
    if (!challenge || busy || Date.now() < challenge.resendAt) return;

    if (activating) {
      showRequestForm(true);
      return;
    }

    verify.reset();
    send.mutate({ identifier });
  }

  return (
    <>
      {verify.isPending ? <PageLoadingState layout="overlay" title={languageCode === "es" ? "Ingresando…" : "Signing in…"} /> : null}
      <button
        className={styles.backButton}
        type="button"
        disabled={busy}
        onClick={challenge || activating ? () => showRequestForm(false) : onBack}
      >
        <ArrowLeft aria-hidden="true" /> {copy.back}
      </button>
      <header className={styles.header}>
        <span className={styles.stageIcon}>
          {challenge ? <ShieldCheck aria-hidden="true" /> : activating ? <KeyRound aria-hidden="true" /> : <Mail aria-hidden="true" />}
        </span>
        <h2 className={styles.title}>{challenge ? copy.verifyTitle : activating ? copy.activationTitle : copy.title}</h2>
        <p className={styles.description}>
          {challenge ? copy.verifyDescription : activating ? copy.activationDescription : copy.description}
        </p>
      </header>
      <form onSubmit={submit} className={styles.form}>
        {challenge ? (
          <>
            <p className={styles.requestedIdentifier}>
              {copy.requestedFor} <strong>{identifier}</strong>
            </p>
            <label className={styles.field}>
              <span className={styles.label}>{copy.code}</span>
              <input
                ref={codeInput}
                className={`${styles.input} ${styles.codeInput}`}
                value={code}
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={busy || expired}
                placeholder="000000"
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  verify.reset();
                }}
              />
            </label>
          </>
        ) : (
          <>
            <label className={styles.field}>
              <span className={styles.label}>{copy.identifier}</span>
              <input
                ref={identifierInput}
                className={styles.input}
                aria-describedby={identifierInvalid ? "email-code-identifier-error" : "email-code-identifier-hint"}
                aria-invalid={identifierInvalid}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={identifier}
                required
                maxLength={191}
                disabled={busy}
                onChange={(event) => {
                  setIdentifier(event.target.value);
                  setIdentifierInvalid(false);
                  if (send.isError) send.reset();
                }}
              />
              {identifierInvalid ? (
                <span id="email-code-identifier-error" className={styles.errorBanner} role="alert">
                  {copy.invalidIdentifier}
                </span>
              ) : (
                <small id="email-code-identifier-hint" className={styles.identifierHint}>{copy.identifierHint}</small>
              )}
            </label>
            {activating ? (
              <label className={styles.field}>
                <span className={styles.label}>{copy.password}</span>
                <input
                  type="password"
                  className={styles.input}
                  value={password}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  maxLength={72}
                  disabled={busy}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            ) : null}
          </>
        )}
        {error || expired ? (
          <p role="alert" className={styles.errorBanner}>
            {error ? getErrorMessage(error, copy.failure) : copy.expired}
          </p>
        ) : null}
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={busy || (challenge ? expired || code.length !== 6 : !identifier.trim())}
        >
          {challenge ? (verify.isPending ? copy.verifying : copy.verify) : (send.isPending ? copy.sending : copy.send)}
        </button>
        {challenge ? (
          <>
            <section className={styles.emailCodeHelp} aria-labelledby="email-code-help-title">
              <h3 id="email-code-help-title"><CircleHelp aria-hidden="true" />{copy.helpTitle}</h3>
              <p>{copy.help}</p>
              <button className={styles.inlineAction} type="button" disabled={busy || remaining > 0} onClick={resend}>
                <RefreshCw aria-hidden="true" />
                {send.isPending ? copy.sending : remaining > 0 ? `${copy.wait} ${remaining} s` : activating ? copy.resendActivation : copy.resend}
              </button>
              <button className={styles.inlineAction} type="button" disabled={busy} onClick={() => showRequestForm(false)}>
                {copy.edit}
              </button>
              {!activating ? (
                <button className={styles.inlineAction} type="button" disabled={busy} onClick={() => showRequestForm(true)}>
                  {copy.activate}
                </button>
              ) : null}
              <p>{copy.invitation}</p>
            </section>
          </>
        ) : (
          <button className={styles.inlineAction} type="button" disabled={busy} onClick={() => showRequestForm(!activating)}>
            {activating ? copy.useCode : copy.activate}
          </button>
        )}
      </form>
    </>
  );
}
