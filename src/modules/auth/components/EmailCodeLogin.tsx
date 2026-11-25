import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import { startEmailLogin, verifyEmailLogin } from "@/modules/auth/services/auth-api";
import { getModuleLandingPath } from "@/routes/module-navigation-routes";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./LoginForm.module.css";

type EmailChallenge = { token: string; expiresAt: number; resendAt: number };

export function EmailCodeLogin({ onBack }: { onBack: () => void }) {
  const { languageCode, setLanguagePreference } = useAppTranslation();
  const navigate = useNavigate();
  const setSession = useAuthSessionStore((state) => state.setSession);
  const [identifier, setIdentifier] = useState("");
  const [activating, setActivating] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<EmailChallenge>();
  const [now, setNow] = useState(Date.now);
  const send = useMutation({
    mutationFn: startEmailLogin,
    onSuccess: ({ requestToken, expiresInSeconds }) => {
      const receivedAt = Date.now();
      setNow(receivedAt);
      setChallenge({ token: requestToken, expiresAt: receivedAt + expiresInSeconds * 1000, resendAt: receivedAt + 30_000 });
      setPassword("");
      setCode("");
    },
    gcTime: 0,
  });
  const verify = useMutation({
    mutationFn: verifyEmailLogin,
    onSuccess: (result) => {
      setSession({ accessToken: result.accessToken, user: result.user });
      setLanguagePreference({ code: result.user.translation.code, translationId: result.user.translation.id });
      navigate(getModuleLandingPath(languageCode, result.user.businessCategory, result.user.role), { replace: true });
    },
  });

  useEffect(() => {
    if (!challenge) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  const busy = send.isPending || verify.isPending;
  const expired = Boolean(challenge && now >= challenge.expiresAt);
  const remaining = challenge ? Math.max(0, Math.ceil((challenge.resendAt - now) / 1000)) : 0;
  const copy = languageCode === "es" ? {
    back: "Volver",
    title: "Recibe un código por correo",
    description: "Escribe tu correo o celular registrado. El código llega al correo vinculado a tu cuenta.",
    identifier: "Correo o número de celular",
    first: "Activar acceso por correo con mi contraseña",
    password: "Tu contraseña actual",
    send: "Enviar código",
    sending: "Enviando…",
    verify: "Ingresar a CashGo",
    verifying: "Validando…",
    verifyTitle: "Revisa tu correo",
    verifyDescription: "Si tu cuenta está habilitada, recibirás un código de 6 dígitos. Revisa también la carpeta de spam.",
    code: "Código de 6 dígitos",
    expired: "El código venció. Solicita uno nuevo.",
    resend: "Reenviar código",
    wait: "Reenviar en",
    edit: "Cambiar datos o activar acceso por correo",
    failure: "No pudimos completar el acceso. Intenta de nuevo.",
  } : {
    back: "Back",
    title: "Get a code by email",
    description: "Enter your registered email or phone number. The code goes to the email linked to your account.",
    identifier: "Email or phone number",
    first: "Enable email sign-in with my password",
    password: "Your current password",
    send: "Send code",
    sending: "Sending…",
    verify: "Sign in to CashGo",
    verifying: "Verifying…",
    verifyTitle: "Check your email",
    verifyDescription: "If your account is enabled, you’ll receive a 6-digit code. Check your spam folder too.",
    code: "6-digit code",
    expired: "The code expired. Request a new one.",
    resend: "Resend code",
    wait: "Resend in",
    edit: "Change details or enable email sign-in",
    failure: "We couldn’t sign you in. Try again.",
  };

  function edit() {
    setChallenge(undefined);
    setCode("");
    setPassword("");
    send.reset();
    verify.reset();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!challenge) {
      if (identifier.trim()) send.mutate({ identifier: identifier.trim(), ...(activating ? { password } : {}) });
    } else if (code.length === 6 && Date.now() < challenge.expiresAt) {
      verify.mutate({ requestToken: challenge.token, verificationCode: code });
    }
  }

  const error = send.error ?? verify.error;
  return (
    <>
      <button className={styles.backButton} type="button" disabled={busy} onClick={challenge ? edit : onBack}>
        <ArrowLeft aria-hidden="true" /> {copy.back}
      </button>
      <header className={styles.header}>
        <span className={styles.stageIcon}>{challenge ? <ShieldCheck aria-hidden="true" /> : <Mail aria-hidden="true" />}</span>
        <h2 className={styles.title}>{challenge ? copy.verifyTitle : copy.title}</h2>
        <p className={styles.description}>{challenge ? copy.verifyDescription : copy.description}</p>
      </header>
      <form onSubmit={submit} className={styles.form}>
        {challenge ? (
          <label className={styles.field}>
            <span className={styles.label}>{copy.code}</span>
            <input className={`${styles.input} ${styles.codeInput}`} value={code} inputMode="numeric"
              autoComplete="one-time-code" disabled={busy || expired} placeholder="000000"
              onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); verify.reset(); }} />
          </label>
        ) : (
          <>
            <label className={styles.field}>
              <span className={styles.label}>{copy.identifier}</span>
              <input className={styles.input} autoComplete="username" autoCapitalize="none" value={identifier}
                required maxLength={191} disabled={busy} onChange={(event) => setIdentifier(event.target.value)} />
            </label>
            <label className={styles.confirmEmail}>
              <input type="checkbox" disabled={busy} checked={activating} onChange={(event) => {
                setActivating(event.target.checked);
                setPassword("");
              }} />
              <span>{copy.first}</span>
            </label>
            {activating ? (
              <label className={styles.field}>
                <span className={styles.label}>{copy.password}</span>
                <input type="password" className={styles.input} value={password} autoComplete="current-password"
                  required minLength={8} maxLength={72} disabled={busy} onChange={(event) => setPassword(event.target.value)} />
              </label>
            ) : null}
          </>
        )}
        {error || expired ? (
          <p role="alert" className={styles.errorBanner}>{expired ? copy.expired : getErrorMessage(error, copy.failure)}</p>
        ) : null}
        <button type="submit" className={styles.primaryButton} disabled={busy || (challenge ? expired || code.length !== 6 : !identifier.trim())}>
          {challenge ? (verify.isPending ? copy.verifying : copy.verify) : (send.isPending ? copy.sending : copy.send)}
        </button>
        {challenge ? (
          <>
            <button className={styles.inlineAction} type="button" disabled={busy || remaining > 0} onClick={() => {
              if (Date.now() < challenge.resendAt || busy) return;
              if (activating) edit();
              else { verify.reset(); send.mutate({ identifier: identifier.trim() }); }
            }}>
              {send.isPending ? copy.sending : remaining > 0 ? `${copy.wait} ${remaining} s` : copy.resend}
            </button>
            <button className={styles.inlineAction} type="button" disabled={busy} onClick={edit}>{copy.edit}</button>
          </>
        ) : null}
      </form>
    </>
  );
}
