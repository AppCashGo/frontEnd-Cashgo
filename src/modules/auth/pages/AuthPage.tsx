import { useEffect, useMemo, useState } from "react";
import { LoginForm } from "@/modules/auth/components/LoginForm";
import { RegistrationWizard } from "@/modules/auth/components/RegistrationWizard";
import operationsIllustrationUrl from "@/shared/assets/images/cashgo-operations-illustration.svg";
import { BrandLogo } from "@/shared/components/brand/BrandLogo";
import { LanguageSelect } from "@/shared/components/ui/LanguageSelect";
import { useTranslationsQuery } from "@/shared/hooks/use-translations-query";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import type { TranslationRecord } from "@/shared/types/translation";
import styles from "./AuthPage.module.css";

type AuthMode = "landing" | "login" | "register";

export function AuthPage() {
  const { dictionary, languageCode, translationId, setLanguagePreference } =
    useAppTranslation();
  const { data: translations = [], isLoading: isTranslationsLoading } =
    useTranslationsQuery();
  const [mode, setMode] = useState<AuthMode>("landing");
  const [registerStep, setRegisterStep] = useState(0);

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
        }
      : {
          brandTagline: "POS + ERP to sell, collect and grow",
          landingTitle: "Synced across all your devices",
          landingDescription: "Use Cashgo on your phone or on your computer",
          registerBenefitsTitle: "When you sign up in Cashgo you can:",
          helpCta: "Do you need help getting into Cashgo?",
        };

  const languageControl =
    !isTranslationsLoading && activeTranslation ? (
      <div className={styles.languageWrap}>
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
      </div>
    ) : null;

  return (
    <main
      className={
        mode === "login"
          ? `${styles.page} ${styles.pageLogin}`
          : styles.page
      }
    >
      {mode === "landing" ? (
        <div className={styles.landingLayout}>
          <aside className={styles.showcasePanel}>
            <div className={styles.showcaseFrame}>
              <img
                alt=""
                className={styles.showcaseImage}
                src={operationsIllustrationUrl}
              />
            </div>

            <div className={styles.showcaseCopy}>
              <h1 className={styles.heroTitle}>{authCopy.landingTitle}</h1>
              <p className={styles.heroDescription}>
                {authCopy.landingDescription}
              </p>
            </div>

            <div className={styles.dots}>
              <span />
              <span />
              <span className={styles.dotActive} />
            </div>
          </aside>

          <section className={styles.landingContent}>
            {languageControl}

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
                </button>
              </div>

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
            </div>
          </section>
        </div>
      ) : null}

      {mode === "login" ? (
        <div className={styles.loginLayout}>
          {languageControl}
          <LoginForm
            onBack={() => setMode("landing")}
            onGoToRegister={() => setMode("register")}
          />
        </div>
      ) : null}

      {mode === "register" ? (
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
            {languageControl}
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
