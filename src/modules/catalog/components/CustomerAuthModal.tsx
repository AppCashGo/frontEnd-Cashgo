import {
  Check,
  Circle,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import {
  loginCatalogCustomer,
  registerCatalogCustomer,
  resendCatalogCustomerVerification,
  verifyCatalogCustomerEmail,
} from "../services/customer-auth-api";
import type { CustomerAuthResponse } from "../types/customer-session";
import styles from "./CustomerAuthModal.module.css";

type AuthMode = "login" | "register";

export function CustomerAuthModal({
  businessName,
  catalogSlug,
  onAuthenticated,
  onClose,
}: {
  businessName: string;
  catalogSlug: string;
  onAuthenticated: (response: CustomerAuthResponse) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationSentTo, setVerificationSentTo] = useState<string | null>(
    null,
  );
  const [developmentToken, setDevelopmentToken] = useState<string | null>(null);

  const passwordRules = [
    { label: "10 caracteres", valid: password.length >= 10 },
    {
      label: "Una mayúscula y una minúscula",
      valid: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    { label: "Un número", valid: /\d/.test(password) },
    { label: "Un símbolo", valid: /[^A-Za-z0-9]/.test(password) },
  ];
  const isSecurePassword = passwordRules.every((rule) => rule.valid);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setPassword("");
    setConfirmPassword("");
    setVerificationSentTo(null);
    setDevelopmentToken(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (mode === "register" && password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }
    if (mode === "register" && !isSecurePassword) {
      setErrorMessage(
        "Completa todos los requisitos de seguridad de la contraseña.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "login") {
        onAuthenticated(
          await loginCatalogCustomer(catalogSlug, { email, password }),
        );
      } else {
        const response = await registerCatalogCustomer(catalogSlug, {
          email,
          name,
          password,
        });
        setVerificationSentTo(response.email);
        setDevelopmentToken(response.developmentVerificationToken ?? null);
      }
    } catch (error) {
      const message = getErrorMessage(
        error,
        mode === "login"
          ? "No pudimos iniciar sesión. Revisa tus datos."
          : "No pudimos crear tu cuenta. Intenta nuevamente.",
      );
      setErrorMessage(message);
      if (mode === "login" && message.toLowerCase().includes("verificar")) {
        setVerificationSentTo(email.trim().toLowerCase());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyDevelopmentAccount = async () => {
    if (!developmentToken) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      onAuthenticated(
        await verifyCatalogCustomerEmail(catalogSlug, developmentToken),
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "No pudimos verificar el correo."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendVerification = async () => {
    if (!verificationSentTo) return;
    setIsSubmitting(true);
    try {
      const response = await resendCatalogCustomerVerification(
        catalogSlug,
        verificationSentTo,
      );
      setDevelopmentToken(response.developmentVerificationToken ?? null);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "No pudimos reenviar el correo."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.layer}>
      <button
        aria-label="Cerrar acceso de clientes"
        className={styles.backdrop}
        onClick={onClose}
        type="button"
      />
      <section
        aria-label="Acceso de clientes"
        aria-modal="true"
        className={styles.modal}
        role="dialog"
      >
        <button
          aria-label="Cerrar"
          className={styles.closeButton}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" />
        </button>

        {verificationSentTo ? (
          <div className={styles.verificationPanel}>
            <span>
              <Mail aria-hidden="true" />
            </span>
            <p>Verifica tu correo</p>
            <h2>Revisa tu bandeja de entrada</h2>
            <small>
              Enviamos un enlace a <strong>{verificationSentTo}</strong>. Debes
              abrirlo para activar tu cuenta.
            </small>
            {developmentToken ? (
              <button
                className={styles.submitButton}
                disabled={isSubmitting}
                onClick={() => void verifyDevelopmentAccount()}
                type="button"
              >
                Verificar cuenta en desarrollo
              </button>
            ) : null}
            <button
              className={styles.secondaryButton}
              disabled={isSubmitting}
              onClick={() => void resendVerification()}
              type="button"
            >
              Reenviar correo
            </button>
            {errorMessage ? (
              <p className={styles.error}>{errorMessage}</p>
            ) : null}
          </div>
        ) : (
          <>
            <div className={styles.heading}>
              <span>
                <UserRound aria-hidden="true" />
              </span>
              <p>{businessName}</p>
              <h2>
                {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
              </h2>
              <small>
                {mode === "login"
                  ? "Ingresa para continuar con tu compra."
                  : "Guarda tus datos para comprar y seguir tus pedidos."}
              </small>
            </div>

            <div className={styles.tabs} role="tablist">
              <button
                aria-selected={mode === "login"}
                className={mode === "login" ? styles.activeTab : ""}
                onClick={() => switchMode("login")}
                role="tab"
                type="button"
              >
                Iniciar sesión
              </button>
              <button
                aria-selected={mode === "register"}
                className={mode === "register" ? styles.activeTab : ""}
                onClick={() => switchMode("register")}
                role="tab"
                type="button"
              >
                Crear cuenta
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              {mode === "register" ? (
                <label>
                  Nombre completo
                  <span className={styles.inputShell}>
                    <UserRound aria-hidden="true" />
                    <input
                      autoComplete="name"
                      maxLength={120}
                      minLength={2}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="¿Cómo te llamas?"
                      required
                      value={name}
                    />
                  </span>
                </label>
              ) : null}

              <label>
                Correo electrónico
                <span className={styles.inputShell}>
                  <Mail aria-hidden="true" />
                  <input
                    autoComplete="email"
                    inputMode="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nombre@correo.com"
                    required
                    type="email"
                    value={email}
                  />
                </span>
              </label>

              <label>
                Contraseña
                <span className={styles.inputShell}>
                  <LockKeyhole aria-hidden="true" />
                  <input
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={mode === "register" ? 10 : 1}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      mode === "register"
                        ? "Crea una contraseña segura"
                        : "Tu contraseña"
                    }
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                  </button>
                </span>
              </label>

              {mode === "register" ? (
                <div
                  className={styles.passwordRules}
                  aria-label="Requisitos de contraseña"
                >
                  {passwordRules.map((rule) => (
                    <span
                      className={rule.valid ? styles.ruleValid : ""}
                      key={rule.label}
                    >
                      {rule.valid ? (
                        <Check aria-hidden="true" />
                      ) : (
                        <Circle aria-hidden="true" />
                      )}
                      {rule.label}
                    </span>
                  ))}
                </div>
              ) : null}

              {mode === "register" ? (
                <label>
                  Confirmar contraseña
                  <span className={styles.inputShell}>
                    <LockKeyhole aria-hidden="true" />
                    <input
                      autoComplete="new-password"
                      minLength={10}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Repite tu contraseña"
                      required
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                    />
                  </span>
                </label>
              ) : null}

              {errorMessage ? (
                <p className={styles.error} role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <button
                className={styles.submitButton}
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting
                  ? "Procesando..."
                  : mode === "login"
                    ? "Ingresar y continuar"
                    : "Crear cuenta y continuar"}
              </button>
            </form>

            <p className={styles.securityNote}>
              <ShieldCheck aria-hidden="true" /> Tus datos se almacenan de forma
              segura y solo se usan para tus compras.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
