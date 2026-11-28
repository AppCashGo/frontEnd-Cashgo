import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { LoginForm } from "@/modules/auth/components/LoginForm";
import { RegistrationWizard } from "@/modules/auth/components/RegistrationWizard";
import devicesMotion from "@/shared/assets/animations/cashgo-devices.webp";
import devicesStill from "@/shared/assets/animations/cashgo-devices-still.webp";
import posMotion from "@/shared/assets/animations/cashgo-pos-login.webp";
import posStill from "@/shared/assets/animations/cashgo-pos-login-still.webp";
import { BrandLogo } from "@/shared/components/brand/BrandLogo";
import { LanguageSelect } from "@/shared/components/ui/LanguageSelect";
import { useTranslationsQuery } from "@/shared/hooks/use-translations-query";
import { prepareWorkspaceSound, useWorkspaceSound } from "@/shared/hooks/use-workspace-sound";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import type { TranslationRecord } from "@/shared/types/translation";
import styles from "./AuthPage.module.css";

type AuthMode = "landing" | "login" | "register";

export function AuthPage() {
  const { dictionary, languageCode, translationId, setLanguagePreference } =
    useAppTranslation();
  const { data: translations = [], isLoading: isTranslationsLoading } =
    useTranslationsQuery();
  const registrationEnabled = import.meta.env.VITE_PUBLIC_REGISTRATION_ENABLED === "true";
  const [searchParams] = useSearchParams();
  const initialMethod = searchParams.get("method") === "password" ? "password" : undefined;
  const [mode, setMode] = useState<AuthMode>(initialMethod ? "login" : "landing");
  const [registerStep, setRegisterStep] = useState(0);
  const { soundEnabled, toggleSound } = useWorkspaceSound();

  const activeTranslation = useMemo(() => {
    return (
      translations.find((translation) => translation.id === translationId) ??
      translations.find((translation) => translation.isDefault) ??
      translations[0] ??
      null
    );
  }, [translations, translationId]);

  useEffect(() => {
    if (
      activeTranslation &&
      (translationId !== activeTranslation.id ||
        languageCode !== activeTranslation.code)
    ) {
      setLanguagePreference({
        code: activeTranslation.code,
        translationId: activeTranslation.id,
      });
    }
  }, [activeTranslation, languageCode, setLanguagePreference, translationId]);

  const authCopy =
    languageCode === "es"
      ? {
          brandTagline: "POS + ERP para vender, cobrar y crecer",
          landingTitle: "Sincronizado en todos tus dispositivos",
          landingDescription: "Usa Cashgo en tu celular o en tu PC",
          registerBenefitsTitle: "Al registrarte en Cashgo podrás:",
          helpCta: "¿Tienes problemas al ingresar a Cashgo?",
          interfaceSound: "Sonido de la interfaz",
        }
      : {
          brandTagline: "POS + ERP to sell, collect and grow",
          landingTitle: "Synced across all your devices",
          landingDescription: "Use Cashgo on your phone or on your computer",
          registerBenefitsTitle: "When you sign up in Cashgo you can:",
          helpCta: "Do you need help getting into Cashgo?",
          interfaceSound: "Interface sound",
        };

  const accessControls = (
    <div className={styles.accessControls}>
      <button aria-label={authCopy.interfaceSound} aria-pressed={soundEnabled} className={styles.soundControl} onClick={toggleSound} title={authCopy.interfaceSound} type="button">
        {soundEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
      </button>
      {!isTranslationsLoading && activeTranslation ? (
        <LanguageSelect
          id="auth-language"
          label={dictionary.common.language}
          options={translations}
          value={activeTranslation.id}
          onChange={(translation: TranslationRecord) =>
            setLanguagePreference({
              code: translation.code,
              translationId: translation.id,
            })
          }
        />
      ) : null}
    </div>
  );

  return (
    <main
      onClickCapture={prepareWorkspaceSound}
      onSubmitCapture={prepareWorkspaceSound}
      className={
        mode === "login"
          ? `${styles.page} ${styles.pageLogin}`
          : styles.page
      }
    >
      {mode === "landing" ? (
        <div className={styles.landingLayout}>
          <aside className={styles.showcasePanel}>
            <picture className={styles.showcaseFrame}>
              <source media="(prefers-reduced-motion: no-preference)" srcSet={devicesMotion} />
              <img alt="" className={styles.showcaseImage} decoding="async" src={devicesStill} />
            </picture>

            <div className={styles.showcaseCopy}>
              <h1 className={styles.heroTitle}>{authCopy.landingTitle}</h1>
              <p className={styles.heroDescription}>
                {authCopy.landingDescription}
              </p>
            </div>

          </aside>

          <section className={styles.landingContent}>
            {accessControls}

            <div className={styles.centeredPanel}>
              <BrandLogo
                brand={dictionary.auth.brand}
                size="lg"
                tagline={authCopy.brandTagline}
              />

              <div className={styles.ctaBlock}>
                <p className={styles.ctaLabel}>
                  {dictionary.auth.landing.existingLabel}
                </p>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => setMode("login")}
                >
                  {dictionary.auth.landing.signInCta}
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>

              {registrationEnabled ? (
                <div className={styles.ctaBlock}>
                  <p className={styles.ctaLabel}>
                    {dictionary.auth.landing.firstTimeLabel}
                  </p>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => setMode("register")}
                  >
                    {dictionary.auth.landing.registerCta}
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {mode === "login" ? (
        <div className={styles.loginLayout}>
          {accessControls}
          <div className={styles.loginStage}>
            <picture aria-hidden="true" className={styles.loginArtwork}>
              <source media="(min-width: 901px) and (prefers-reduced-motion: no-preference)" srcSet={posMotion} />
              <img alt="" decoding="async" loading="lazy" src={posStill} />
            </picture>
            <LoginForm
              initialMethod={initialMethod}
              onBack={() => setMode("landing")}
              onGoToRegister={registrationEnabled ? () => setMode("register") : undefined}
            />
          </div>
        </div>
      ) : null}

      {registrationEnabled && mode === "register" ? (
        <div className={styles.registerLayout}>
          <aside className={styles.registerRail}>
            <div className={styles.registerRailInner}>
              <BrandLogo
                brand={dictionary.auth.brand}
                size="md"
                tagline={authCopy.brandTagline}
              />

              <div className={styles.decorativeCircleLarge} />
              <div className={styles.decorativeCircleSmall} />

              <div className={styles.stepList}>
                {dictionary.auth.register.stepLabels.map((stepLabel, index) => {
                  const state =
                    index < registerStep
                      ? "completed"
                      : index === registerStep
                        ? "active"
                        : "upcoming";

                  return (
                    <div key={stepLabel} className={styles.stepRow}>
                      <div
                        className={
                          state === "completed"
                            ? styles.stepMarkerCompleted
                            : state === "active"
                              ? styles.stepMarkerActive
                              : styles.stepMarker
                        }
                      >
                        {state === "completed" ? "✓" : index + 1}
                      </div>

                      <div className={styles.stepTextBlock}>
                        <span
                          className={
                            state === "active"
                              ? styles.stepLabelActive
                              : state === "completed"
                                ? styles.stepLabelCompleted
                                : styles.stepLabel
                          }
                        >
                          {stepLabel}
                        </span>
                      </div>

                      {index <
                      dictionary.auth.register.stepLabels.length - 1 ? (
                        <span className={styles.stepConnector} />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className={styles.registerBenefits}>
                <div className={styles.registerBenefitsDivider} />
                <h2 className={styles.registerBenefitsTitle}>
                  {authCopy.registerBenefitsTitle}
                </h2>

                <div className={styles.benefitList}>
                  {dictionary.auth.landing.highlights.map((benefit) => (
                    <div key={benefit} className={styles.benefitItem}>
                      <span className={styles.benefitCheck}>✓</span>
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <section className={styles.registerContent}>
            {accessControls}
            <div className={styles.registerContentInner}>
              <RegistrationWizard
                selectedTranslationId={activeTranslation?.id ?? null}
                translations={translations}
                onGoToLanding={() => setMode("landing")}
                onGoToLogin={() => setMode("login")}
                onStepChange={setRegisterStep}
              />
            </div>
          </section>
        </div>
      ) : null}

      <button className={styles.helpButton} type="button">
        <span className={styles.helpIcon}>◔</span>
        <span>{authCopy.helpCta}</span>
      </button>
    </main>
  );
}
