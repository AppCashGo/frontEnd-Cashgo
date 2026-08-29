import { BadgeDollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  BusinessReminderSettingsInput,
  BusinessSettings,
} from "@/modules/settings/types/settings";
import { useToast } from "@/shared/hooks/use-toast";
import styles from "./ReminderSettingsPanel.module.css";

type ReminderSettingsPanelProps = {
  businessSettings: BusinessSettings | null;
  errorMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  onRetry: () => void;
  onSubmit: (input: BusinessReminderSettingsInput) => Promise<void>;
};

export function ReminderSettingsPanel({
  businessSettings,
  errorMessage,
  isLoading,
  isSubmitting,
  onRetry,
  onSubmit,
}: ReminderSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openingReminderEnabled, setOpeningReminderEnabled] = useState(
    businessSettings?.cashRegisterOpeningReminderEnabled ?? true,
  );
  const toast = useToast();

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
    setOpeningReminderEnabled(nextValue);

    try {
      await onSubmit({
        cashRegisterOpeningReminderEnabled: nextValue,
      });
      toast.showSuccess("Recordatorio actualizado.");
    } catch (error) {
      setOpeningReminderEnabled(previousValue);
      toast.showError(error, "No fue posible guardar el recordatorio.");
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

        </div>
      ) : null}
    </section>
  );
}
