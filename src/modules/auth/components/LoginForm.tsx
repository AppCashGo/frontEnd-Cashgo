import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Mail, MessageSquareLock, Smartphone } from "lucide-react";
import { useGoogleLoginMutation } from "@/modules/auth/hooks/use-google-login-mutation";
import { useLoginMutation } from "@/modules/auth/hooks/use-login-mutation";
import { useStartPhoneLoginMutation } from "@/modules/auth/hooks/use-start-phone-login-mutation";
import { useVerifyPhoneLoginMutation } from "@/modules/auth/hooks/use-verify-phone-login-mutation";
import {
  createLoginFormSchema,
  type LoginFormValues,
} from "@/modules/auth/schemas/login-form-schema";
import type { PhoneLoginStartResponse } from "@/modules/auth/types/auth-session";
import { getModuleLandingPath } from "@/routes/module-navigation-routes";
import { BrandLogo } from "@/shared/components/brand/BrandLogo";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { ApiError } from "@/shared/services/api-client";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import {
  getGoogleClientId,
  loadGoogleIdentityScript,
} from "@/shared/services/google-identity";
import styles from "./LoginForm.module.css";
import { EmailCodeLogin } from "./EmailCodeLogin";

type LoginFormProps = {
  initialMethod?: "password";
  onBack: () => void;
  onGoToRegister?: () => void;
};

type LoginStage = "choice" | "identifier" | "verification" | "credentials" | "email";

type PhoneLoginRequestState = PhoneLoginStartResponse & {
  phone: string;
  countryCode: PhoneCountry;
  expiresAt: number;
  canResendAt: number;
};

const phoneCountries = {
  CO: { label: "Colombia", dial: "57", length: 10 },
  US: { label: "Estados Unidos", dial: "1", length: 10 },
  MX: { label: "México", dial: "52", length: 10 },
  ES: { label: "España", dial: "34", length: 9 },
} as const;
type PhoneCountry = keyof typeof phoneCountries;
const RESEND_DELAY_MS = 30_000;

function normalizePhoneInput(phone: string, country: PhoneCountry) {
  const input = phone.trim();
  if (!/^\+?[\d\s().-]+$/.test(input)) return null;
  const { dial, length } = phoneCountries[country];
  const digits = input.replace(/\D/g, "");
  const prefixed = input.startsWith("+") || digits.length === length + dial.length;
  if (prefixed && !digits.startsWith(dial)) return null;
  const national = prefixed ? digits.slice(dial.length) : digits;
  return national.length === length ? national : null;
}

function normalizeVerificationCode(value: string) {
  return value.replace(/[^\d]/g, "").slice(0, 6);
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className={styles.providerIcon} viewBox="0 0 24 24">
      <path
        d="M21.8 12.2c0-.7-.1-1.4-.2-2h-9.4v3.8h5.4a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 2.9-4.3 2.9-7.5Z"
        fill="#4285F4"
      />
      <path
        d="M12.2 22c2.7 0 5-.9 6.6-2.4l-3.3-2.6c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.3-4H3.5v2.7A10 10 0 0 0 12.2 22Z"
        fill="#34A853"
      />
      <path
        d="M6.9 13.9a6 6 0 0 1 0-3.8V7.4H3.5a10 10 0 0 0 0 9.1l3.4-2.6Z"
        fill="#FBBC05"
      />
      <path
        d="M12.2 6.1c1.4 0 2.7.5 3.7 1.4l2.8-2.8a9.8 9.8 0 0 0-6.5-2.5 10 10 0 0 0-8.7 5.2L6.9 10c.7-2.4 2.8-4 5.3-4Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginForm({ initialMethod, onBack, onGoToRegister }: LoginFormProps) {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const { mutateAsync: signInWithGoogle } = useGoogleLoginMutation();
  const startPhoneLoginMutation = useStartPhoneLoginMutation();
  const verifyPhoneLoginMutation = useVerifyPhoneLoginMutation();
  const { dictionary, languageCode } = useAppTranslation();
  const [stage, setStage] = useState<LoginStage>(initialMethod === "password" ? "credentials" : "choice");
  const [draftPhone, setDraftPhone] = useState("");
  const [countryCode, setCountryCode] = useState<PhoneCountry>("CO");
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [phoneLoginRequest, setPhoneLoginRequest] =
    useState<PhoneLoginRequestState | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = getGoogleClientId();
  const resendSeconds = phoneLoginRequest ? Math.max(0, Math.ceil((phoneLoginRequest.canResendAt - now) / 1000)) : 0;
  const codeExpired = Boolean(phoneLoginRequest && now >= phoneLoginRequest.expiresAt);
  const isBusy = startPhoneLoginMutation.isPending || verifyPhoneLoginMutation.isPending || loginMutation.isPending;

  useEffect(() => {
    if (stage !== "verification") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  const loginCopy =
    languageCode === "es"
      ? {
          choiceTitle: "Inicia sesión",
          choiceDescription: "Elige cómo quieres acceder a tu negocio.",
          google: "Ingresa con Google",
          phone: "Ingresar con celular",
          phoneHint: "Recibe un código de verificación",
          credentials: "Ingresar con contraseña",
          credentialsHint: "Usa tu correo o número de celular",
          email: "Recibir código por correo",
          emailHint: "Identifícate con tu correo o celular",
          noAccount: "¿No tienes cuenta?",
          createAccount: "Crea una cuenta",
          googleNotice:
            "Configura VITE_GOOGLE_CLIENT_ID para activar el acceso con Google.",
          googleLoadFailed:
            "No pudimos cargar Google en este momento. Intenta nuevamente o usa tu correo y contraseña.",
          googleMissingCredential:
            "Google no devolvió una credencial válida. Intenta nuevamente.",
          googleFailed:
            "No pudimos iniciar sesión con Google. Verifica que tu correo ya tenga cuenta en Cashgo.",
          identifierTitle: "Ingresa con tu celular",
          identifierDescription:
            "Selecciona el país e ingresa el celular vinculado a tu cuenta.",
          identifierPlaceholder: "Correo o número de celular",
          phonePlaceholder: "Número de celular",
          countryLabel: "País",
          identifierContinue: "Enviar código",
          identifierInvalidPhone:
            "Revisa el país seleccionado y escribe un número válido.",
          phoneNotLinked: "No encontramos una cuenta vinculada a ese celular. Revisa el número o ingresa con contraseña.",
          credentialsTitle: "Ingresa con contraseña",
          credentialsDescription:
            "Usa el correo o celular registrado y tu contraseña de CashGo.",
          passwordPlaceholder: "Ingresa tu contraseña",
          showPassword: "Mostrar contraseña",
          hidePassword: "Ocultar contraseña",
          verificationTitle: "Código de verificación",
          verificationDescription:
            "Ingresa el código de 6 dígitos enviado al número",
          verificationEdit: "Cambiar número",
          verificationHelp: "Revisa tus mensajes de WhatsApp o SMS.",
          verificationExpired: "El código venció. Solicita uno nuevo para continuar.",
          verificationPlaceholder: "Código de 6 dígitos",
          verificationSubmit: "Entrar a Cashgo",
          verificationPending: "Validando código...",
          verificationResend: "Reenviar código",
          resendIn: "Reenviar en",
          verificationResendPending: "Enviando código...",
          verificationRequired: "Ingresa el código de 6 dígitos.",
          verificationFailed:
            "No pudimos validar el código. Revisa el número y vuelve a intentarlo.",
          developmentCode: "Código de prueba:",
          back: "Volver",
          identifierRequired: "Ingresa tu número o correo para continuar.",
          loginFailed:
            "No pudimos iniciar sesión. Revisa tus datos e inténtalo de nuevo.",
        }
      : {
          choiceTitle: "Sign in",
          choiceDescription: "Choose how to access your business.",
          google: "Continue with Google",
          phone: "Sign in with your phone",
          phoneHint: "Receive a verification code",
          credentials: "Sign in with a password",
          credentialsHint: "Use your email or phone number",
          email: "Get a code by email",
          emailHint: "Use your email or phone number",
          noAccount: "Don't have an account?",
          createAccount: "Create an account",
          googleNotice:
            "Configure VITE_GOOGLE_CLIENT_ID to enable Google sign-in.",
          googleLoadFailed:
            "We could not load Google right now. Try again or use your email and password.",
          googleMissingCredential:
            "Google did not return a valid credential. Try again.",
          googleFailed:
            "We could not sign you in with Google. Make sure your email already has a Cashgo account.",
          identifierTitle: "Continue with your phone",
          identifierDescription:
            "Select the country and enter the phone number linked to your account.",
          identifierPlaceholder: "Email or phone number",
          phonePlaceholder: "Phone number",
          countryLabel: "Country",
          identifierContinue: "Send code",
          identifierInvalidPhone:
            "Check the selected country and enter a valid number.",
          phoneNotLinked: "We couldn't find an account linked to that phone. Check the number or sign in with a password.",
          credentialsTitle: "Sign in with a password",
          credentialsDescription:
            "Use your registered email or phone number and your CashGo password.",
          passwordPlaceholder: "Enter your password",
          showPassword: "Show password",
          hidePassword: "Hide password",
          verificationTitle: "Verification code",
          verificationDescription:
            "Enter the 6-digit code sent to",
          verificationEdit: "Change number",
          verificationHelp: "Check your WhatsApp or SMS messages.",
          verificationExpired: "The code expired. Request a new one to continue.",
          verificationPlaceholder: "6-digit code",
          verificationSubmit: "Enter Cashgo",
          verificationPending: "Validating code...",
          verificationResend: "Resend code",
          resendIn: "Resend in",
          verificationResendPending: "Sending code...",
          verificationRequired: "Enter the 6-digit code.",
          verificationFailed:
            "We could not validate the code. Check the number and try again.",
          developmentCode: "Test code:",
          back: "Back",
          identifierRequired: "Enter your phone number or email to continue.",
          loginFailed:
            "We could not sign you in right now. Check your details and try again.",
        };

  const loginFormSchema = useMemo(
    () =>
      createLoginFormSchema({
        identifierRequired: loginCopy.identifierRequired,
        passwordRequired:
          languageCode === "es"
            ? "Ingresa tu contraseña."
            : "Enter your password.",
        passwordMinLength:
          languageCode === "es"
            ? "La contraseña debe tener al menos 8 caracteres."
            : "Password must contain at least 8 characters.",
      }),
    [languageCode, loginCopy.identifierRequired],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    clearErrors,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (loginMutation.isPending) return;
    try {
      const response = await loginMutation.mutateAsync(values);
      navigate(
        getModuleLandingPath(
          languageCode,
          response.user.businessCategory,
          response.user.role,
        ),
        { replace: true },
      );
    } catch (error) {
      setError("root", {
        message: error instanceof ApiError && error.status === 401
          ? loginCopy.loginFailed : getErrorMessage(error, loginCopy.loginFailed),
      });
    }
  });

  useEffect(() => {
    if (stage !== "choice" || !googleClientId || !googleButtonRef.current) {
      return undefined;
    }

    let isMounted = true;
    const googleButtonElement = googleButtonRef.current;

    loadGoogleIdentityScript()
      .then(() => {
        if (!isMounted || !window.google?.accounts?.id) {
          return;
        }

        googleButtonElement.replaceChildren();
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response.credential) {
              setProviderNotice(loginCopy.googleMissingCredential);
              return;
            }

            try {
              const authResponse = await signInWithGoogle({
                credential: response.credential,
              });
              navigate(
                getModuleLandingPath(
                  languageCode,
                  authResponse.user.businessCategory,
                  authResponse.user.role,
                ),
                { replace: true },
              );
            } catch (error) {
              setProviderNotice(error instanceof ApiError && error.status === 401
                ? loginCopy.googleFailed : getErrorMessage(error, loginCopy.googleFailed));
            }
          },
        });
        window.google.accounts.id.renderButton(googleButtonElement, {
          shape: "pill",
          size: "large",
          text: "signin_with",
          theme: "outline",
          width: Math.max(200, Math.floor(googleButtonElement.clientWidth)),
        });
      })
      .catch(() => {
        if (isMounted) {
          setProviderNotice(loginCopy.googleLoadFailed);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    googleClientId,
    languageCode,
    loginCopy.googleFailed,
    loginCopy.googleLoadFailed,
    loginCopy.googleMissingCredential,
    navigate,
    signInWithGoogle,
    stage,
  ]);

  const handleBack = () => {
    if (isBusy) return;
    if (stage === "choice") {
      onBack();
      return;
    }

    if (stage === "verification") {
      setPhoneLoginRequest(null);
      setVerificationError(null);
      setVerificationCode("");
      setStage("identifier");
      return;
    }

    setProviderNotice(null);
    setIdentifierError(null);
    setShowPassword(false);
    setValue("password", "");
    clearErrors();
    setStage("choice");
  };

  const requestPhoneCode = async (phone: string, country: PhoneCountry) => {
    const response = await startPhoneLoginMutation.mutateAsync({ countryCode: country, phone });
    const receivedAt = Date.now();
    setNow(receivedAt);
    setPhoneLoginRequest({
      ...response, phone, countryCode: country,
      expiresAt: receivedAt + response.expiresInSeconds * 1000,
      canResendAt: receivedAt + RESEND_DELAY_MS,
    });
    setVerificationCode("");
    setVerificationError(null);
    setStage("verification");
  };

  const handleSendPhoneCode = async () => {
    if (isBusy) return;
    const normalizedPhone = normalizePhoneInput(draftPhone, countryCode);
    if (!normalizedPhone) {
      setIdentifierError(loginCopy.identifierInvalidPhone);
      return;
    }

    setIdentifierError(null);
    try {
      await requestPhoneCode(normalizedPhone, countryCode);
    } catch (error) {
      setIdentifierError(error instanceof ApiError && error.status === 401
        ? loginCopy.phoneNotLinked : getErrorMessage(error, loginCopy.loginFailed));
    }
  };

  const handleResendPhoneCode = async () => {
    if (!phoneLoginRequest || isBusy || Date.now() < phoneLoginRequest.canResendAt) return;

    try {
      await requestPhoneCode(phoneLoginRequest.phone, phoneLoginRequest.countryCode);
    } catch (error) {
      setVerificationError(
        getErrorMessage(error, loginCopy.verificationFailed),
      );
    }
  };

  const handleVerifyPhoneLogin = async () => {
    if (!phoneLoginRequest || isBusy) return;
    if (Date.now() >= phoneLoginRequest.expiresAt) {
      setVerificationError(loginCopy.verificationExpired);
      return;
    }

    const normalizedCode = normalizeVerificationCode(verificationCode);

    if (normalizedCode.length !== 6) {
      setVerificationError(loginCopy.verificationRequired);
      return;
    }

    try {
      const response = await verifyPhoneLoginMutation.mutateAsync({
        loginRequestId: phoneLoginRequest.loginRequestId,
        verificationCode: normalizedCode,
      });
      navigate(
        getModuleLandingPath(
          languageCode,
          response.user.businessCategory,
          response.user.role,
        ),
        { replace: true },
      );
    } catch (error) {
      setVerificationError(
        getErrorMessage(error, loginCopy.verificationFailed),
      );
    }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        {stage !== "choice" && stage !== "email" ? (
          <button
            className={styles.backButton}
            disabled={isBusy}
            type="button"
            onClick={handleBack}
          >
            <ArrowLeft aria-hidden="true" />
            <span>{loginCopy.back}</span>
          </button>
        ) : null}

        {stage === "choice" ? (
          <>
            <BrandLogo
              brand={dictionary.auth.brand}
              className={styles.brandLogo}
              size="md"
            />

            <header className={styles.header}>
              <h2 className={styles.title}>{loginCopy.choiceTitle}</h2>
              <p className={styles.description}>{loginCopy.choiceDescription}</p>
            </header>

            <div className={styles.actions}>
              <button className={styles.methodButton} type="button" onClick={() => setStage("credentials")}>
                <span className={styles.methodIcon}><KeyRound aria-hidden="true" /></span>
                <span><strong>{loginCopy.credentials}</strong><small>{loginCopy.credentialsHint}</small></span>
                <ArrowRight className={styles.methodArrow} aria-hidden="true" />
              </button>
              <button className={styles.methodButton} type="button" onClick={() => setStage("email")}>
                <span className={styles.methodIcon}><Mail aria-hidden="true" /></span>
                <span><strong>{loginCopy.email}</strong><small>{loginCopy.emailHint}</small></span>
                <ArrowRight className={styles.methodArrow} aria-hidden="true" />
              </button>
              {import.meta.env.VITE_LEGACY_PHONE_LOGIN_ENABLED === "true" ? (
              <button className={styles.methodButton} type="button" onClick={() => setStage("identifier")}>
                <span className={styles.methodIcon}><Smartphone aria-hidden="true" /></span>
                <span><strong>{loginCopy.phone}</strong><small>{loginCopy.phoneHint}</small></span>
                <ArrowRight className={styles.methodArrow} aria-hidden="true" />
              </button>
              ) : null}

              {googleClientId ? (
                <div
                  aria-label={loginCopy.google}
                  className={styles.googleButtonHost}
                  ref={googleButtonRef}
                />
              ) : (
                <button
                  className={styles.googleButton}
                  type="button"
                  onClick={() => setProviderNotice(loginCopy.googleNotice)}
                >
                  <GoogleIcon />
                  <span>{loginCopy.google}</span>
                </button>
              )}
            </div>

            {providerNotice ? (
              <div className={styles.noticeBanner} role="status">
                {providerNotice}
              </div>
            ) : null}

            {onGoToRegister ? (
              <p className={styles.footerText}>
                {loginCopy.noAccount}{" "}
                <button
                  className={styles.inlineLink}
                  type="button"
                  onClick={onGoToRegister}
                >
                  {loginCopy.createAccount}
                </button>
              </p>
            ) : null}
          </>
        ) : null}

        {stage === "email" ? <EmailCodeLogin onBack={handleBack} /> : null}

        {stage === "identifier" ? (
          <>
            <header className={styles.header}>
              <span className={styles.stageIcon}><Smartphone aria-hidden="true" /></span>
              <h2 className={styles.title}>{loginCopy.identifierTitle}</h2>
              <p className={styles.description}>
                {loginCopy.identifierDescription}
              </p>
            </header>

            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void handleSendPhoneCode();
              }}
            >
              <div className={styles.phoneField}>
                <div className={styles.field}>
                  <span className={styles.label}>{loginCopy.countryLabel}</span>
                  <SearchableSelect
                    aria-label={loginCopy.countryLabel}
                    disabled={isBusy}
                    value={countryCode}
                    onChange={(event) => {
                      setCountryCode(event.target.value as PhoneCountry);
                      setIdentifierError(null);
                    }}
                  >
                    {Object.entries(phoneCountries).map(([code, country]) => (
                      <option key={code} value={code}>{country.label} +{country.dial}</option>
                    ))}
                  </SearchableSelect>
                </div>
                <label className={styles.field}>
                  <span className={styles.label}>{loginCopy.phonePlaceholder}</span>
                  <input
                    autoComplete="tel-national"
                    aria-invalid={Boolean(identifierError)}
                    aria-describedby={identifierError ? "phone-login-number-error" : undefined}
                    disabled={isBusy}
                    className={styles.input}
                    inputMode="tel"
                    placeholder={loginCopy.phonePlaceholder}
                    type="tel"
                    value={draftPhone}
                    onChange={(event) => {
                      setDraftPhone(event.target.value);
                      setIdentifierError(null);
                    }}
                  />
                </label>
              </div>

              {identifierError ? (
                <p className={styles.errorMessage} id="phone-login-number-error" role="alert">{identifierError}</p>
              ) : null}

              <button className={styles.primaryButton} disabled={!draftPhone.trim() || isBusy} type="submit">
                {startPhoneLoginMutation.isPending
                  ? loginCopy.verificationResendPending
                  : loginCopy.identifierContinue}
              </button>
            </form>
          </>
        ) : null}

        {stage === "verification" ? (
          <>
            <header className={styles.header}>
              <span className={styles.stageIcon}><MessageSquareLock aria-hidden="true" /></span>
              <h2 className={styles.title}>{loginCopy.verificationTitle}</h2>
              <p className={styles.description}>
                {loginCopy.verificationDescription}{" "}
                <strong>{phoneLoginRequest?.maskedPhone}</strong>.{" "}
                <button
                  className={styles.inlineLink}
                  disabled={isBusy}
                  type="button"
                  onClick={handleBack}
                >
                  {loginCopy.verificationEdit}
                </button>
              </p>
              <p className={styles.description}>{loginCopy.verificationHelp}</p>
            </header>

            {phoneLoginRequest?.developmentVerificationCode ? (
              <div className={styles.noticeBanner} role="status">
                {loginCopy.developmentCode}{" "}
                <strong>{phoneLoginRequest.developmentVerificationCode}</strong>
              </div>
            ) : null}

            <form
              className={styles.form}
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void handleVerifyPhoneLogin();
              }}
            >
              <label className={styles.field} htmlFor="phone-login-code">
                <span className={styles.label}>
                  {loginCopy.verificationPlaceholder}
                </span>
                <input
                  autoComplete="one-time-code"
                  className={`${styles.input} ${styles.codeInput}`}
                  id="phone-login-code"
                  disabled={isBusy || codeExpired}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  type="text"
                  value={verificationCode}
                  onChange={(event) => {
                    setVerificationCode(
                      normalizeVerificationCode(event.target.value),
                    );
                    if (verificationError) {
                      setVerificationError(null);
                    }
                  }}
                />
              </label>

              {verificationError || codeExpired ? (
                <div className={styles.errorBanner} role="alert">
                  {verificationError || loginCopy.verificationExpired}
                </div>
              ) : null}

              <button
                className={styles.primaryButton}
                disabled={
                  verificationCode.length !== 6 ||
                  isBusy || codeExpired
                }
                type="submit"
              >
                {verifyPhoneLoginMutation.isPending
                  ? loginCopy.verificationPending
                  : loginCopy.verificationSubmit}
              </button>

              <button
                className={styles.inlineAction}
                disabled={isBusy || resendSeconds > 0}
                type="button"
                onClick={() => void handleResendPhoneCode()}
              >
                {startPhoneLoginMutation.isPending
                  ? loginCopy.verificationResendPending
                  : resendSeconds > 0 ? `${loginCopy.resendIn} ${resendSeconds} s` : loginCopy.verificationResend}
              </button>
            </form>
          </>
        ) : null}

        {stage === "credentials" ? (
          <>
            <header className={styles.header}>
              <span className={styles.stageIcon}><KeyRound aria-hidden="true" /></span>
              <h2 className={styles.title}>{loginCopy.credentialsTitle}</h2>
              <p className={styles.description}>
                {loginCopy.credentialsDescription}
              </p>
            </header>

            <form className={styles.form} noValidate onSubmit={onSubmit}>
              <label className={styles.field} htmlFor="login-identifier">
                <span className={styles.label}>
                  {dictionary.auth.login.identifierLabel}
                </span>
                <input
                  autoCapitalize="none"
                  autoComplete="username"
                  aria-describedby={
                    errors.identifier ? "login-identifier-error" : undefined
                  }
                  aria-invalid={Boolean(errors.identifier)}
                  className={styles.input}
                  id="login-identifier"
                  placeholder={loginCopy.identifierPlaceholder}
                  type="text"
                  {...register("identifier")}
                />
              </label>
              {errors.identifier ? (
                <p className={styles.errorMessage} id="login-identifier-error">
                  {errors.identifier.message}
                </p>
              ) : null}

              <div className={styles.field}>
                <label className={styles.label} htmlFor="login-password">
                  {dictionary.auth.login.passwordLabel}
                </label>
                <div className={styles.passwordField}>
                  <input
                    autoComplete="current-password"
                    aria-describedby={
                      errors.password ? "login-password-error" : undefined
                    }
                    aria-invalid={Boolean(errors.password)}
                    className={styles.input}
                    id="login-password"
                    placeholder={loginCopy.passwordPlaceholder}
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                  />
                  <button type="button" aria-label={showPassword ? loginCopy.hidePassword : loginCopy.showPassword} onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </div>
              </div>
              {errors.password ? (
                <p className={styles.errorMessage} id="login-password-error">
                  {errors.password.message}
                </p>
              ) : null}

              {errors.root?.message ? (
                <div className={styles.errorBanner} role="alert">
                  {errors.root.message}
                </div>
              ) : null}

              <button
                className={styles.primaryButton}
                disabled={loginMutation.isPending}
                type="submit"
              >
                {loginMutation.isPending
                  ? dictionary.auth.login.pending
                  : dictionary.auth.login.submit}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
