import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
  BusinessAdditionalSettingsInput,
  BusinessSettings,
} from "@/modules/settings/types/settings";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./AdditionalSettingsPanel.module.css";

type AdditionalSettingsPanelProps = {
  businessSettings: BusinessSettings | null;
  errorMessage: string | null;
  isDeleting: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  onDeleteBusiness: () => Promise<void>;
  onRetry: () => void;
  onSubmit: (input: BusinessAdditionalSettingsInput) => Promise<void>;
};

type FeedbackMessage = {
  tone: "success" | "error";
  text: string;
};

export function AdditionalSettingsPanel({
  businessSettings,
  errorMessage,
  isDeleting,
  isLoading,
  isSubmitting,
  onDeleteBusiness,
  onRetry,
  onSubmit,
}: AdditionalSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [saleSoundEnabled, setSaleSoundEnabled] = useState(
    businessSettings?.saleCompletionSoundEnabled ?? true,
  );
  const [feedbackMessage, setFeedbackMessage] =
    useState<FeedbackMessage | null>(null);

  useEffect(() => {
    setSaleSoundEnabled(businessSettings?.saleCompletionSoundEnabled ?? true);
  }, [businessSettings]);

  const isDisabled = isLoading || isSubmitting || !businessSettings;
  const isDeleteDisabled = isLoading || isDeleting || !businessSettings;

  async function handleToggle(nextValue: boolean) {
    if (isDisabled || errorMessage) {
      return;
    }

    const previousValue = saleSoundEnabled;
    setFeedbackMessage(null);
    setSaleSoundEnabled(nextValue);

    try {
      await onSubmit({
        saleCompletionSoundEnabled: nextValue,
      });
      setFeedbackMessage({
        tone: "success",
        text: "Configuración adicional actualizada.",
      });
    } catch (error) {
      setSaleSoundEnabled(previousValue);
      setFeedbackMessage({
        tone: "error",
        text: getErrorMessage(
          error,
          "No fue posible guardar la configuración adicional.",
        ),
      });
    }
  }

  async function handleDeleteBusiness() {
    if (isDeleteDisabled) {
      return;
    }

    const wasConfirmed = window.confirm(
      "¿Seguro que quieres eliminar este negocio? Una vez eliminado no podrás recuperar la información registrada.",
    );

    if (!wasConfirmed) {
      return;
    }

    setFeedbackMessage(null);

    try {
      await onDeleteBusiness();
      setFeedbackMessage({
        tone: "success",
        text: "Negocio eliminado.",
      });
    } catch (error) {
      setFeedbackMessage({
        tone: "error",
        text: getErrorMessage(error, "No fue posible eliminar el negocio."),
      });
    }
  }

  return (
    <section className={styles.accordion}>
      <button
        aria-expanded={isOpen}
        className={styles.accordionSummary}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className={styles.accordionTitle}>
          Configuraciones adicionales
        </span>
        {isOpen ? <ChevronUp /> : <ChevronDown />}
      </button>

      {isOpen ? (
        <div className={styles.accordionBody}>
          {errorMessage ? (
            <div className={styles.errorBanner}>
              <p>{errorMessage}</p>
              <button type="button" onClick={onRetry}>
                Reintentar
              </button>
            </div>
          ) : null}

          {!businessSettings && !isLoading ? (
            <p className={styles.emptyMessage}>
              Completa primero los datos del negocio para activar estas
              configuraciones.
            </p>
          ) : null}

          <label className={styles.settingRow}>
            <span className={styles.settingIcon}>
              <Volume2 aria-hidden="true" />
            </span>
            <span className={styles.settingCopy}>
              <span className={styles.settingTitle}>
                Sonido al crear venta
              </span>
              <span className={styles.settingDescription}>
                Reproduce un sonido de caja registradora cuando se completa una
                venta exitosamente
              </span>
            </span>
            <input
              checked={saleSoundEnabled}
              className={styles.toggleInput}
              disabled={isDisabled || Boolean(errorMessage)}
              type="checkbox"
              onChange={(event) => {
                void handleToggle(event.target.checked);
              }}
            />
          </label>

          <button
            className={styles.dangerRow}
            disabled={isDeleteDisabled}
            type="button"
            onClick={() => {
              void handleDeleteBusiness();
            }}
          >
            <span className={styles.dangerIcon}>
              <Trash2 aria-hidden="true" />
            </span>
            <span className={styles.settingCopy}>
              <span className={styles.dangerTitle}>Eliminar negocio</span>
              <span className={styles.dangerDescription}>
                Una vez eliminado el negocio no podrás recuperar la información
                registrada.
              </span>
            </span>
          </button>

          {feedbackMessage ? (
            <p
              className={
                feedbackMessage.tone === "success"
                  ? styles.feedbackSuccess
                  : styles.feedbackError
              }
            >
              {feedbackMessage.text}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
