import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
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
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./LoginForm.module.css";

type LoginFormProps = {
  onBack: () => void;
  onGoToRegister: () => void;
};

type LoginStage = "choice" | "identifier" | "verification" | "credentials";

type PhoneLoginRequestState = PhoneLoginStartResponse & {
  phone: string;
};

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      shape: "pill";
      size: "large";
      text: "signin_with";
      theme: "outline";
      width: number;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services";
const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const PHONE_LOGIN_COUNTRY_CODE = "CO";

function isEmailIdentifier(identifier: string) {
  return /\S+@\S+\.\S+/.test(identifier);
}

function normalizePhoneInput(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");

  if (digits.startsWith("57") && digits.length > 10) {
    return digits.slice(2);
  }

  return digits;
}

function normalizeVerificationCode(value: string) {
  return value.replace(/[^\d]/g, "").slice(0, 6);
}

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID);

  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Google Identity Services failed to load.")),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = GOOGLE_IDENTITY_SCRIPT_ID;
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Google Identity Services failed to load.")),
      { once: true },
    );
    document.head.appendChild(script);
  });
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

export function LoginForm({ onBack, onGoToRegister }: LoginFormProps) {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const googleLoginMutation = useGoogleLoginMutation();
  const startPhoneLoginMutation = useStartPhoneLoginMutation();
  const verifyPhoneLoginMutation = useVerifyPhoneLoginMutation();
  const { dictionary, languageCode } = useAppTranslation();
  const [stage, setStage] = useState<LoginStage>("choice");
  const [draftIdentifier, setDraftIdentifier] = useState("");
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [phoneLoginRequest, setPhoneLoginRequest] =
    useState<PhoneLoginRequestState | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  const loginCopy =
    languageCode === "es"
      ? {
          banner:
            "Si ya utilizas la app de Cashgo, inicia sesión con la misma cuenta.",
          choiceTitle: "Inicia sesión",
          google: "Ingresa con Google",
          phone: "Ingresa con tu número de celular",
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
            "Usa el celular o correo con el que registraste tu cuenta.",
          identifierPlaceholder: "Escribe tu número o correo",
          identifierContinue: "Continuar",
          identifierInvalidPhone:
            "Ingresa un número de celular válido para enviar el código.",
          credentialsTitle: "Confirma tu acceso",
          credentialsDescription:
            "Ingresa tu contraseña para entrar a tu negocio.",
          passwordPlaceholder: "Ingresa tu contraseña",
          verificationTitle: "Código de verificación",
          verificationDescription:
            "Ingresa el código de verificación que enviamos por WhatsApp al teléfono",
          verificationEdit: "Editar",
          verificationHelp: "El mensaje puede tardar unos instantes.",
          verificationPlaceholder: "Código de 6 dígitos",
          verificationSubmit: "Entrar a Cashgo",
          verificationPending: "Validando código...",
          verificationResend: "Reenviar código",
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
          banner:
            "If you already use the Cashgo app, sign in with the same account.",
          choiceTitle: "Sign in",
          google: "Continue with Google",
          phone: "Continue with your phone number",
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
            "Use the phone number or email that belongs to your account.",
          identifierPlaceholder: "Enter your phone number or email",
          identifierContinue: "Continue",
          identifierInvalidPhone:
            "Enter a valid phone number to receive the code.",
          credentialsTitle: "Confirm your access",
          credentialsDescription:
            "Enter your password to access your business.",
          passwordPlaceholder: "Enter your password",
          verificationTitle: "Verification code",
          verificationDescription:
            "Enter the verification code we sent by WhatsApp to",
          verificationEdit: "Edit",
          verificationHelp: "The message can take a few moments.",
          verificationPlaceholder: "6-digit code",
          verificationSubmit: "Enter Cashgo",
          verificationPending: "Validating code...",
          verificationResend: "Resend code",
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
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
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
        message: getErrorMessage(error, loginCopy.loginFailed),
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
              const authResponse = await googleLoginMutation.mutateAsync({
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
              setProviderNotice(getErrorMessage(error, loginCopy.googleFailed));
            }
          },
        });
        window.google.accounts.id.renderButton(googleButtonElement, {
          shape: "pill",
          size: "large",
          text: "signin_with",
          theme: "outline",
          width: 320,
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
    googleLoginMutation,
    languageCode,
    loginCopy.googleFailed,
    loginCopy.googleLoadFailed,
    loginCopy.googleMissingCredential,
    navigate,
    stage,
  ]);

  const handleBack = () => {
    if (stage === "choice") {
      onBack();
      return;
    }

    if (stage === "identifier") {
      setProviderNotice(null);
      setStage("choice");
      return;
    }

    if (stage === "verification") {
      setVerificationError(null);
      setVerificationCode("");
      setStage("identifier");
      return;
    }

    setStage("identifier");
  };

  const handleContinueToCredentials = async () => {
    const normalizedIdentifier = draftIdentifier.trim();

    if (!normalizedIdentifier) {
      setIdentifierError(loginCopy.identifierRequired);
      return;
    }

    setIdentifierError(null);
    setProviderNotice(null);

    if (isEmailIdentifier(normalizedIdentifier)) {
      setValue("identifier", normalizedIdentifier, { shouldValidate: true });
      setStage("credentials");
      return;
    }

    const normalizedPhone = normalizePhoneInput(normalizedIdentifier);

    if (normalizedPhone.length < 7) {
      setIdentifierError(loginCopy.identifierInvalidPhone);
      return;
    }

    try {
      const response = await startPhoneLoginMutation.mutateAsync({
        countryCode: PHONE_LOGIN_COUNTRY_CODE,
        phone: normalizedPhone,
      });
      setPhoneLoginRequest({
        ...response,
        phone: normalizedPhone,
      });
      setVerificationCode("");
      setVerificationError(null);
      setStage("verification");
    } catch (error) {
      setIdentifierError(getErrorMessage(error, loginCopy.loginFailed));
    }
  };

  const handleResendPhoneCode = async () => {
    if (!phoneLoginRequest) {
      setStage("identifier");
      return;
    }

    try {
      const response = await startPhoneLoginMutation.mutateAsync({
        countryCode: PHONE_LOGIN_COUNTRY_CODE,
        phone: phoneLoginRequest.phone,
      });
      setPhoneLoginRequest({
        ...response,
        phone: phoneLoginRequest.phone,
      });
      setVerificationCode("");
      setVerificationError(null);
    } catch (error) {
      setVerificationError(
        getErrorMessage(error, loginCopy.verificationFailed),
      );
    }
  };

  const handleVerifyPhoneLogin = async () => {
    if (!phoneLoginRequest) {
      setStage("identifier");
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
        {stage !== "choice" ? (
          <button
            className={styles.backButton}
            type="button"
            onClick={handleBack}
          >
            <span aria-hidden="true">←</span>
            <span>{loginCopy.back}</span>
          </button>
        ) : null}

        {stage === "choice" ? (
          <>
            <div className={styles.infoBanner}>
              <span className={styles.infoIcon}>i</span>
              <p>{loginCopy.banner}</p>
            </div>

            <BrandLogo
              brand={dictionary.auth.brand}
              className={styles.brandLogo}
              size="md"
              version="1.2.9"
            />

            <header className={styles.header}>
              <h2 className={styles.title}>{loginCopy.choiceTitle}</h2>
            </header>

            <div className={styles.actions}>
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

              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => setStage("identifier")}
              >
                {loginCopy.phone}
              </button>
            </div>

            {providerNotice ? (
              <div className={styles.noticeBanner} role="status">
                {providerNotice}
              </div>
            ) : null}

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
          </>
        ) : null}

        {stage === "identifier" ? (
          <>
            <BrandLogo
              brand={dictionary.auth.brand}
              className={styles.brandLogo}
              size="md"
              version="1.2.9"
            />

            <header className={styles.header}>
              <h2 className={styles.title}>{loginCopy.identifierTitle}</h2>
              <p className={styles.description}>
                {loginCopy.identifierDescription}
              </p>
            </header>

            <div className={styles.phoneField}>
              <span className={styles.phonePrefix}>
                <span className={styles.flagCircle} />
                <span className={styles.prefixDivider} />
                <span className={styles.chevron}>⌄</span>
              </span>
              <input
                autoCapitalize="none"
                className={styles.input}
                inputMode="text"
                placeholder={loginCopy.identifierPlaceholder}
                type="text"
                value={draftIdentifier}
                onChange={(event) => {
                  setDraftIdentifier(event.target.value);
                  if (identifierError) {
                    setIdentifierError(null);
                  }
                }}
              />
            </div>

            {identifierError ? (
              <p className={styles.errorMessage}>{identifierError}</p>
            ) : null}

            <button
              className={styles.primaryButton}
              disabled={
                !draftIdentifier.trim() || startPhoneLoginMutation.isPending
              }
              type="button"
              onClick={() => void handleContinueToCredentials()}
            >
              {startPhoneLoginMutation.isPending
                ? loginCopy.verificationResendPending
                : loginCopy.identifierContinue}
            </button>
          </>
        ) : null}

        {stage === "verification" ? (
          <>
            <div className={styles.infoBanner}>
              <span className={styles.infoIcon}>i</span>
              <p>{loginCopy.verificationHelp}</p>
            </div>

            <BrandLogo
              brand={dictionary.auth.brand}
              className={styles.brandLogo}
              size="md"
              version="1.2.9"
            />

            <header className={styles.header}>
              <h2 className={styles.title}>{loginCopy.verificationTitle}</h2>
              <p className={styles.description}>
                {loginCopy.verificationDescription}{" "}
                <strong>{phoneLoginRequest?.maskedPhone}</strong>.{" "}
                <button
                  className={styles.inlineLink}
                  type="button"
                  onClick={() => {
                    setVerificationError(null);
                    setVerificationCode("");
                    setStage("identifier");
                  }}
                >
                  {loginCopy.verificationEdit}
                </button>
              </p>
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

              {verificationError ? (
                <div className={styles.errorBanner} role="alert">
                  {verificationError}
                </div>
              ) : null}

              <button
                className={styles.primaryButton}
                disabled={
                  verificationCode.length !== 6 ||
                  verifyPhoneLoginMutation.isPending
                }
                type="submit"
              >
                {verifyPhoneLoginMutation.isPending
                  ? loginCopy.verificationPending
                  : loginCopy.verificationSubmit}
              </button>

              <button
                className={styles.inlineAction}
                disabled={startPhoneLoginMutation.isPending}
                type="button"
                onClick={() => void handleResendPhoneCode()}
              >
                {startPhoneLoginMutation.isPending
                  ? loginCopy.verificationResendPending
                  : loginCopy.verificationResend}
              </button>
            </form>
          </>
        ) : null}

        {stage === "credentials" ? (
          <>
            <BrandLogo
              brand={dictionary.auth.brand}
              className={styles.brandLogo}
              size="md"
              version="1.2.9"
            />

            <header className={styles.header}>
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

              <label className={styles.field} htmlFor="login-password">
                <span className={styles.label}>
                  {dictionary.auth.login.passwordLabel}
                </span>
                <input
                  autoComplete="current-password"
                  aria-describedby={
                    errors.password ? "login-password-error" : undefined
                  }
                  aria-invalid={Boolean(errors.password)}
                  className={styles.input}
                  id="login-password"
                  placeholder={loginCopy.passwordPlaceholder}
                  type="password"
                  {...register("password")}
                />
              </label>
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
