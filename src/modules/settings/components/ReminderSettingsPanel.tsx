import { BadgeDollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  BusinessReminderSettingsInput,
  BusinessSettings,
} from "@/modules/settings/types/settings";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./ReminderSettingsPanel.module.css";

type ReminderSettingsPanelProps = {
  businessSettings: BusinessSettings | null;
  errorMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  onRetry: () => void;
  onSubmit: (input: BusinessReminderSettingsInput) => Promise<void>;
};

type FeedbackMessage = {
  tone: "success" | "error";
  text: string;
};

export function ReminderSettingsPanel({
  businessSettings,
  errorMessage,
  isLoading,
  isSubmitting,
  onRetry,
  onSubmit,
}: ReminderSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [openingReminderEnabled, setOpeningReminderEnabled] = useState(
    businessSettings?.cashRegisterOpeningReminderEnabled ?? true,
  );
  const [feedbackMessage, setFeedbackMessage] =
    useState<FeedbackMessage | null>(null);

  useEffect(() => {
    setOpeningReminderEnabled(
      businessSettings?.cashRegisterOpeningReminderEnabled ?? true,
    );
  }, [businessSettings]);

  const isDisabled = isLoading || isSubmitting || !businessSettings;

  async function handleToggle(nextValue: boolean) {
    if (isDisabled || errorMessage) {
      return;
    }

    const previousValue = openingReminderEnabled;
    setFeedbackMessage(null);
    setOpeningReminderEnabled(nextValue);

    try {
      await onSubmit({
        cashRegisterOpeningReminderEnabled: nextValue,
      });
      setFeedbackMessage({
        tone: "success",
        text: "Recordatorio actualizado.",
      });
    } catch (error) {
      setOpeningReminderEnabled(previousValue);
      setFeedbackMessage({
        tone: "error",
        text: getErrorMessage(
          error,
          "No fue posible guardar el recordatorio.",
        ),
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
        <span className={styles.accordionTitle}>Recordatorios</span>
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
              Completa primero los datos del negocio para activar recordatorios.
            </p>
          ) : null}

          <label className={styles.settingRow}>
            <span className={styles.settingIcon}>
              <BadgeDollarSign aria-hidden="true" />
            </span>
            <span className={styles.settingCopy}>
              <span className={styles.settingTitle}>Apertura de caja</span>
              <span className={styles.settingDescription}>
                Te recordaremos abrir caja si no lo has hecho al realizar tu
                primera venta del día.
              </span>
            </span>
            <input
              checked={openingReminderEnabled}
              className={styles.toggleInput}
              disabled={isDisabled || Boolean(errorMessage)}
              type="checkbox"
              onChange={(event) => {
                void handleToggle(event.target.checked);
              }}
            />
          </label>

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
