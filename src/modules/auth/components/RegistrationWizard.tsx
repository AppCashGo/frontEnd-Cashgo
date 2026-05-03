import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { useCompleteRegistrationMutation } from "@/modules/auth/hooks/use-complete-registration-mutation";
import { useStartRegistrationMutation } from "@/modules/auth/hooks/use-start-registration-mutation";
import { useVerifyRegistrationMutation } from "@/modules/auth/hooks/use-verify-registration-mutation";
import {
  createRegisterCompleteSchema,
  type RegisterCompleteValues,
} from "@/modules/auth/schemas/register-complete-schema";
import {
  createRegisterStartSchema,
  type RegisterStartValues,
} from "@/modules/auth/schemas/register-start-schema";
import { BusinessCategoryPickerModal } from "@/shared/components/business/BusinessCategoryPickerModal";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import type { TranslationRecord } from "@/shared/types/translation";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./RegistrationWizard.module.css";

type RegistrationWizardProps = {
  selectedTranslationId: string | null;
  translations: TranslationRecord[];
  onGoToLogin: () => void;
  onGoToLanding: () => void;
  onStepChange: (step: number) => void;
};

type RegistrationSession = {
  registrationId: string;
  maskedPhone: string;
  expiresInSeconds: number;
  developmentVerificationCode?: string;
};

const countryOptions = [
  {
    code: "CO",
    label: "Colombia",
    dialCode: "+57",
  },
  {
    code: "US",
    label: "United States",
    dialCode: "+1",
  },
] as const;

function PhoneStepIcon() {
  return (
    <svg aria-hidden="true" className={styles.sectionIcon} viewBox="0 0 24 24">
      <rect
        height="15"
        rx="2.8"
        width="9"
        x="7.5"
        y="4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M10.3 7.4h3.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="16.25" fill="currentColor" r="1" />
    </svg>
  );
}

function VerificationStepIcon() {
  return (
    <svg aria-hidden="true" className={styles.sectionIcon} viewBox="0 0 24 24">
      <rect
        height="11"
        rx="2.2"
        width="16"
        x="4"
        y="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m5.4 8 6.6 5 6.6-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BusinessStepIcon() {
  return (
    <svg aria-hidden="true" className={styles.sectionIcon} viewBox="0 0 24 24">
      <path
        d="M6 8.5h12V19H6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m7.4 8.6 1.1-3.1h7l1.1 3.1"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M10 12.5h4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="m17.5 13.4 1.3 1.2 2.2-2.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function RegistrationWizard({
  selectedTranslationId,
  translations,
  onGoToLogin,
  onStepChange,
}: RegistrationWizardProps) {
  const { dictionary, languageCode } = useAppTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [registrationSession, setRegistrationSession] =
    useState<RegistrationSession | null>(null);
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const startRegistrationMutation = useStartRegistrationMutation();
  const verifyRegistrationMutation = useVerifyRegistrationMutation();
  const completeRegistrationMutation = useCompleteRegistrationMutation();

  const wizardCopy =
    languageCode === "es"
      ? {
          phoneFieldLabel: "Ingresa tu número de teléfono",
          phoneDescription:
            "Te enviaremos un código de verificación por mensaje de WhatsApp",
          verificationPrefix:
            "Ingresa el código de verificación que hemos enviado por mensaje de WhatsApp al teléfono",
          verificationInfo: "El mensaje puede tardar unos instantes.",
          editPhone: "Editar",
          waitPrefix: "¿No la has recibido? Espera",
          waitSuffix: "minutos",
          loginHint: "¿Ya tienes cuenta en Cashgo?",
          phonePlaceholder: "Escribe tu número",
          sellerCodePlaceholder: "Escribe aquí",
          emailPlaceholder: "correo@negocio.com",
          passwordPlaceholder: "Mínimo 8 caracteres",
          completeFallback:
            "No pudimos terminar tu registro. Inténtalo nuevamente.",
          verifyFallback:
            "No pudimos verificar el código. Revisa el mensaje recibido e inténtalo otra vez.",
          startFallback:
            "No pudimos enviar el código en este momento. Intenta nuevamente.",
          validation: {
            countryRequired: "Selecciona un país.",
            phoneInvalid: "Ingresa un número válido.",
            translationRequired: "Selecciona un idioma.",
            acceptedTermsRequired:
              "Debes aceptar los términos para continuar.",
            fullNameRequired: "Ingresa tu nombre.",
            businessNameRequired: "Ingresa el nombre de tu negocio.",
            categoryRequired: "Selecciona una categoría para tu negocio.",
            emailRequired: "Ingresa tu correo.",
            emailInvalid: "Ingresa un correo válido.",
            passwordMinLength:
              "La contraseña debe tener al menos 8 caracteres.",
          },
        }
      : {
          phoneFieldLabel: "Enter your phone number",
          phoneDescription:
            "We will send you a verification code through WhatsApp",
          verificationPrefix:
            "Enter the verification code that we sent through WhatsApp to",
          verificationInfo: "The message may take a few moments.",
          editPhone: "Edit",
          waitPrefix: "Didn't get it? Wait",
          waitSuffix: "minutes",
          loginHint: "Already have a Cashgo account?",
          phonePlaceholder: "Enter your phone number",
          sellerCodePlaceholder: "Type it here",
          emailPlaceholder: "owner@business.com",
          passwordPlaceholder: "At least 8 characters",
          completeFallback:
            "We could not complete your registration right now. Please try again.",
          verifyFallback:
            "We could not verify the code. Review the message and try again.",
          startFallback:
            "We could not send the code right now. Please try again.",
          validation: {
            countryRequired: "Select a country.",
            phoneInvalid: "Enter a valid phone number.",
            translationRequired: "Select a language.",
            acceptedTermsRequired: "You must accept the terms to continue.",
            fullNameRequired: "Enter your name.",
            businessNameRequired: "Enter your business name.",
            categoryRequired: "Select a category for your business.",
            emailRequired: "Enter your email.",
            emailInvalid: "Enter a valid email address.",
            passwordMinLength:
              "Password must contain at least 8 characters.",
          },
        };

  const defaultTranslationId =
    selectedTranslationId ??
    translations.find((item) => item.isDefault)?.id ??
    translations[0]?.id ??
    "";

  const startFormSchema = useMemo(
    () =>
      createRegisterStartSchema({
        countryRequired: wizardCopy.validation.countryRequired,
        phoneInvalid: wizardCopy.validation.phoneInvalid,
        translationRequired: wizardCopy.validation.translationRequired,
        acceptedTermsRequired: wizardCopy.validation.acceptedTermsRequired,
      }),
    [wizardCopy.validation],
  );

  const completeFormSchema = useMemo(
    () =>
      createRegisterCompleteSchema({
        fullNameRequired: wizardCopy.validation.fullNameRequired,
        businessNameRequired: wizardCopy.validation.businessNameRequired,
        categoryRequired: wizardCopy.validation.categoryRequired,
        emailRequired: wizardCopy.validation.emailRequired,
        emailInvalid: wizardCopy.validation.emailInvalid,
        passwordMinLength: wizardCopy.validation.passwordMinLength,
      }),
    [wizardCopy.validation],
  );

  const startForm = useForm<RegisterStartValues>({
    resolver: zodResolver(startFormSchema),
    defaultValues: {
      countryCode: "CO",
      phone: "",
      translationId: defaultTranslationId,
      acceptedTerms: false,
    },
  });

  const completeForm = useForm<RegisterCompleteValues>({
    resolver: zodResolver(completeFormSchema),
    defaultValues: {
      fullName: "",
      businessName: "",
      businessCategory: undefined,
      sellerCode: "",
      email: "",
      password: "",
    },
  });

  const selectedBusinessCategory = completeForm.watch("businessCategory");
  const selectedCountryCode = startForm.watch("countryCode");
  const selectedCountry =
    countryOptions.find((option) => option.code === selectedCountryCode) ??
    countryOptions[0];
  const otpCode = otpValues.join("");

  useEffect(() => {
    onStepChange(currentStep);
  }, [currentStep, onStepChange]);

  useEffect(() => {
    if (defaultTranslationId) {
      startForm.setValue("translationId", defaultTranslationId, {
        shouldValidate: true,
      });
    }
  }, [defaultTranslationId, startForm]);

  useEffect(() => {
    if (currentStep !== 1 || !registrationSession) {
      return;
    }

    setRemainingSeconds(registrationSession.expiresInSeconds);

    const timer = window.setInterval(() => {
      setRemainingSeconds((previousValue) => {
        if (previousValue <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return previousValue - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentStep, registrationSession]);

  const submitStartForm = startForm.handleSubmit(async (values) => {
    try {
      setOtpError(null);
      const response = await startRegistrationMutation.mutateAsync(values);
      setRegistrationSession({
        registrationId: response.registrationId,
        maskedPhone: response.maskedPhone,
        expiresInSeconds: response.expiresInSeconds,
        developmentVerificationCode: response.developmentVerificationCode,
      });
      setOtpValues(["", "", "", "", "", ""]);
      setCurrentStep(1);
      window.setTimeout(() => otpInputRefs.current[0]?.focus(), 60);
    } catch (error) {
      startForm.setError("root", {
        message: getErrorMessage(error, wizardCopy.startFallback),
      });
    }
  });

  const handleVerificationSubmit = async () => {
    if (!registrationSession) {
      return;
    }

    try {
      setOtpError(null);
      await verifyRegistrationMutation.mutateAsync({
        registrationId: registrationSession.registrationId,
        verificationCode: otpCode,
      });
      setCurrentStep(2);
    } catch (error) {
      setOtpError(getErrorMessage(error, wizardCopy.verifyFallback));
    }
  };

  const submitCompleteForm = completeForm.handleSubmit(async (values) => {
    if (!registrationSession) {
      return;
    }

    try {
      await completeRegistrationMutation.mutateAsync({
        registrationId: registrationSession.registrationId,
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        businessName: values.businessName,
        businessCategory: values.businessCategory,
        ...(values.sellerCode ? { sellerCode: values.sellerCode } : {}),
      });
    } catch (error) {
      completeForm.setError("root", {
        message: getErrorMessage(error, wizardCopy.completeFallback),
      });
    }
  });

  const handleOtpChange = (index: number, nextValue: string) => {
    const sanitizedValue = nextValue.replace(/[^\d]/g, "").slice(-1);
    const nextOtpValues = [...otpValues];
    nextOtpValues[index] = sanitizedValue;
    setOtpValues(nextOtpValues);
    if (otpError) {
      setOtpError(null);
    }

    if (sanitizedValue && index < otpInputRefs.current.length - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/[^\d]/g, "")
      .slice(0, otpValues.length)
      .split("");

    if (pastedDigits.length === 0) {
      return;
    }

    event.preventDefault();

    const nextOtpValues = otpValues.map(
      (_, index) => pastedDigits[index] ?? otpValues[index] ?? "",
    );
    setOtpValues(nextOtpValues);

    const nextFocusIndex = Math.min(
      pastedDigits.length,
      otpInputRefs.current.length - 1,
    );
    otpInputRefs.current[nextFocusIndex]?.focus();
  };

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secondsRemainder = seconds % 60;
    return `${minutes}:${secondsRemainder.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.wrapper}>
      {currentStep === 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.iconCircle}>
              <PhoneStepIcon />
            </span>

            <div className={styles.sectionCopy}>
              <h2 className={styles.title}>
                {dictionary.auth.register.phone.title}
              </h2>
              <p className={styles.labelLead}>{wizardCopy.phoneFieldLabel}</p>
              <p className={styles.description}>{wizardCopy.phoneDescription}</p>
            </div>
          </div>

          <form className={styles.form} noValidate onSubmit={submitStartForm}>
            <input type="hidden" {...startForm.register("translationId")} />

            <div className={styles.field}>
              <label className={styles.phoneControl} htmlFor="register-phone">
                <span className={styles.countrySlot}>
                  <span
                    className={`${styles.flagCircle} ${
                      selectedCountry.code === "US" ? styles.flagUS : styles.flagCO
                    }`}
                  />
                  <span className={styles.countryDivider} />
                  <span className={styles.countryChevron}>⌄</span>
                  <select
                    aria-label={dictionary.common.language}
                    className={styles.countrySelect}
                    {...startForm.register("countryCode")}
                  >
                    {countryOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label} {option.dialCode}
                      </option>
                    ))}
                  </select>
                </span>

                <input
                  autoComplete="tel"
                  className={styles.input}
                  id="register-phone"
                  inputMode="numeric"
                  placeholder={wizardCopy.phonePlaceholder}
                  type="tel"
                  {...startForm.register("phone")}
                />
              </label>
            </div>

            {startForm.formState.errors.phone?.message ? (
              <p className={styles.errorMessage}>
                {startForm.formState.errors.phone.message}
              </p>
            ) : null}

            <label className={styles.checkboxRow}>
              <input type="checkbox" {...startForm.register("acceptedTerms")} />
              <span>{dictionary.auth.register.phone.terms}</span>
            </label>

            {startForm.formState.errors.acceptedTerms?.message ? (
              <p className={styles.errorMessage}>
                {startForm.formState.errors.acceptedTerms.message}
              </p>
            ) : null}

            {startForm.formState.errors.root?.message ? (
              <div className={styles.errorBanner} role="alert">
                {startForm.formState.errors.root.message}
              </div>
            ) : null}

            <button
              className={styles.primaryButton}
              disabled={startRegistrationMutation.isPending}
              type="submit"
            >
              {startRegistrationMutation.isPending
                ? dictionary.auth.register.phone.pending
                : dictionary.auth.register.phone.submit}
            </button>
          </form>
        </section>
      ) : null}

      {currentStep === 1 && registrationSession ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.iconCircle}>
              <VerificationStepIcon />
            </span>

            <div className={styles.sectionCopy}>
              <h2 className={styles.title}>
                {dictionary.auth.register.verification.title}
              </h2>
              <p className={styles.description}>
                {wizardCopy.verificationPrefix}{" "}
                <strong>{registrationSession.maskedPhone}</strong>
                <button
                  className={styles.inlineLink}
                  type="button"
                  onClick={() => {
                    setOtpError(null);
                    setCurrentStep(0);
                  }}
                >
                  {wizardCopy.editPhone}
                </button>
              </p>
            </div>
          </div>

          <div className={styles.infoBanner}>
            <span className={styles.infoIcon}>i</span>
            <span>{wizardCopy.verificationInfo}</span>
          </div>

          <div className={styles.otpGrid}>
            {otpValues.map((value, index) => (
              <input
                key={index}
                ref={(element) => {
                  otpInputRefs.current[index] = element;
                }}
                aria-label={`OTP digit ${index + 1}`}
                className={styles.otpInput}
                inputMode="numeric"
                maxLength={1}
                type="text"
                value={value}
                onChange={(event) => handleOtpChange(index, event.target.value)}
                onKeyDown={(event) => handleOtpKeyDown(index, event)}
                onPaste={handleOtpPaste}
              />
            ))}
          </div>

          <div className={styles.waitRow}>
            <span className={styles.waitIcon}>!</span>
            <span>
              {wizardCopy.waitPrefix}{" "}
              <strong>{formatCountdown(remainingSeconds)}</strong>{" "}
              {wizardCopy.waitSuffix}
            </span>
          </div>

          {registrationSession.developmentVerificationCode ? (
            <p className={styles.devHint}>
              {dictionary.auth.register.verification.developmentHint}:{" "}
              <strong>{registrationSession.developmentVerificationCode}</strong>
            </p>
          ) : null}

          {otpError ? (
            <div className={styles.errorBanner} role="alert">
              {otpError}
            </div>
          ) : null}

          <button
            className={styles.primaryButton}
            disabled={
              otpCode.length !== 6 || verifyRegistrationMutation.isPending
            }
            type="button"
            onClick={handleVerificationSubmit}
          >
            {verifyRegistrationMutation.isPending
              ? dictionary.auth.register.verification.pending
              : dictionary.auth.register.verification.submit}
          </button>
        </section>
      ) : null}

      {currentStep === 2 && registrationSession ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.iconCircle}>
              <BusinessStepIcon />
            </span>

            <div className={styles.sectionCopy}>
              <h2 className={styles.title}>
                {dictionary.auth.register.business.title}
              </h2>
            </div>
          </div>

          <form className={styles.form} noValidate onSubmit={submitCompleteForm}>
            <label className={styles.field}>
              <span className={styles.label}>
                {dictionary.auth.register.business.fullNameLabel}
              </span>
              <input
                autoComplete="name"
                className={styles.input}
                type="text"
                {...completeForm.register("fullName")}
              />
            </label>
            {completeForm.formState.errors.fullName?.message ? (
              <p className={styles.errorMessage}>
                {completeForm.formState.errors.fullName.message}
              </p>
            ) : null}

            <label className={styles.field}>
              <span className={styles.label}>
                {dictionary.auth.register.business.businessNameLabel}
              </span>
              <input
                className={styles.input}
                type="text"
                {...completeForm.register("businessName")}
              />
            </label>
            {completeForm.formState.errors.businessName?.message ? (
              <p className={styles.errorMessage}>
                {completeForm.formState.errors.businessName.message}
              </p>
            ) : null}

            <div className={styles.field}>
              <span className={styles.label}>
                {dictionary.auth.register.business.categoryLabel}
              </span>
              <button
                className={`${styles.categoryButton} ${
                  completeForm.formState.errors.businessCategory
                    ? styles.categoryButtonError
                    : ""
                }`}
                type="button"
                onClick={() => setCategoryModalOpen(true)}
              >
                <span>
                  {selectedBusinessCategory
                    ? dictionary.categories[
                        selectedBusinessCategory as keyof typeof dictionary.categories
                      ]
                    : languageCode === "es"
                      ? "Elige una categoría"
                      : "Choose a category"}
                </span>
                <span aria-hidden="true">⌄</span>
              </button>
            </div>
            {completeForm.formState.errors.businessCategory?.message ? (
              <p className={styles.errorMessage}>
                {completeForm.formState.errors.businessCategory.message}
              </p>
            ) : null}

            <label className={styles.field}>
              <span className={styles.label}>
                {dictionary.auth.register.business.sellerCodeLabel}
              </span>
              <input
                className={styles.input}
                placeholder={wizardCopy.sellerCodePlaceholder}
                type="text"
                {...completeForm.register("sellerCode")}
              />
            </label>

            <div className={styles.accessFields}>
              <label className={styles.field}>
                <span className={styles.label}>
                  {dictionary.auth.register.business.emailLabel}
                </span>
                <input
                  autoCapitalize="none"
                  autoComplete="email"
                  className={styles.input}
                  placeholder={wizardCopy.emailPlaceholder}
                  type="email"
                  {...completeForm.register("email")}
                />
              </label>
              {completeForm.formState.errors.email?.message ? (
                <p className={styles.errorMessage}>
                  {completeForm.formState.errors.email.message}
                </p>
              ) : null}

              <label className={styles.field}>
                <span className={styles.label}>
                  {dictionary.auth.register.business.passwordLabel}
                </span>
                <input
                  autoComplete="new-password"
                  className={styles.input}
                  placeholder={wizardCopy.passwordPlaceholder}
                  type="password"
                  {...completeForm.register("password")}
                />
              </label>
              {completeForm.formState.errors.password?.message ? (
                <p className={styles.errorMessage}>
                  {completeForm.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            {completeForm.formState.errors.root?.message ? (
              <div className={styles.errorBanner} role="alert">
                {completeForm.formState.errors.root.message}
              </div>
            ) : null}

            <button
              className={styles.primaryButton}
              disabled={completeRegistrationMutation.isPending}
              type="submit"
            >
              {completeRegistrationMutation.isPending
                ? dictionary.auth.register.business.pending
                : dictionary.auth.register.business.submit}
            </button>
          </form>
        </section>
      ) : null}

      <p className={styles.loginHint}>
        {wizardCopy.loginHint}{" "}
        <button className={styles.inlineLink} type="button" onClick={onGoToLogin}>
          {dictionary.auth.register.footer.signIn}
        </button>
      </p>

      <BusinessCategoryPickerModal
        isOpen={isCategoryModalOpen}
        requireConfirmation
        selectedCategory={selectedBusinessCategory}
        showDescription={false}
        showSearch={false}
        variant="auth"
        onClose={() => setCategoryModalOpen(false)}
        onSelectCategory={(category) => {
          completeForm.setValue("businessCategory", category, {
            shouldValidate: true,
          });
          setCategoryModalOpen(false);
        }}
      />
    </div>
  );
}
