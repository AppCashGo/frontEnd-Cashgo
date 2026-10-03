import { Eye, EyeOff, LockKeyhole, Mail, UserRound, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import {
  loginCatalogCustomer,
  registerCatalogCustomer,
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

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (mode === "register" && password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response =
        mode === "login"
          ? await loginCatalogCustomer(catalogSlug, { email, password })
          : await registerCatalogCustomer(catalogSlug, {
              email,
              name,
              password,
            });
      onAuthenticated(response);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          mode === "login"
            ? "No pudimos iniciar sesión. Revisa tus datos."
            : "No pudimos crear tu cuenta. Intenta nuevamente.",
        ),
      );
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

        <div className={styles.heading}>
          <span>
            <UserRound aria-hidden="true" />
          </span>
          <p>{businessName}</p>
          <h2>{mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h2>
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
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "register" ? 8 : 1}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === "register" ? "Mínimo 8 caracteres" : "Tu contraseña"}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
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
            <label>
              Confirmar contraseña
              <span className={styles.inputShell}>
                <LockKeyhole aria-hidden="true" />
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setConfirmPassword(event.target.value)}
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

          <button className={styles.submitButton} disabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Procesando..."
              : mode === "login"
                ? "Ingresar y continuar"
                : "Crear cuenta y continuar"}
          </button>
        </form>

        <p className={styles.securityNote}>
          Tus datos se almacenan de forma segura y solo se usan para tus compras.
        </p>
      </section>
    </div>
  );
}
