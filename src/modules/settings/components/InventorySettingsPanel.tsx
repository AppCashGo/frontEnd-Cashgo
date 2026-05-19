import { Bell, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  BusinessOperationalSettingsInput,
  BusinessSettings,
} from "@/modules/settings/types/settings";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./InventorySettingsPanel.module.css";

type InventorySettingsPanelProps = {
  businessSettings: BusinessSettings | null;
  errorMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  onRetry: () => void;
  onSubmit: (input: BusinessOperationalSettingsInput) => Promise<void>;
};

type FeedbackMessage = {
  tone: "success" | "error";
  text: string;
};

function buildOperationalSettingsInput(
  businessSettings: BusinessSettings,
  lowStockAlertsEnabled: boolean,
): BusinessOperationalSettingsInput {
  return {
    allowSaleWithoutStock: businessSettings.allowSaleWithoutStock,
    lowStockAlertsEnabled,
    defaultLowStockThreshold: businessSettings.defaultLowStockThreshold,
    useWeightedAverageCost: businessSettings.useWeightedAverageCost,
  };
}

export function InventorySettingsPanel({
  businessSettings,
  errorMessage,
  isLoading,
  isSubmitting,
  onRetry,
  onSubmit,
}: InventorySettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [lowStockAlertsEnabled, setLowStockAlertsEnabled] = useState(
    businessSettings?.lowStockAlertsEnabled ?? true,
  );
  const [feedbackMessage, setFeedbackMessage] =
    useState<FeedbackMessage | null>(null);

  useEffect(() => {
    setLowStockAlertsEnabled(businessSettings?.lowStockAlertsEnabled ?? true);
  }, [businessSettings]);

  const isDisabled = isLoading || isSubmitting || !businessSettings;
  const isDirty =
    Boolean(businessSettings) &&
    lowStockAlertsEnabled !== businessSettings?.lowStockAlertsEnabled;
  const canSave = isDirty && !isDisabled && !errorMessage;

  async function handleSave() {
    if (!businessSettings || !canSave) {
      return;
    }

    setFeedbackMessage(null);

    try {
      await onSubmit(
        buildOperationalSettingsInput(businessSettings, lowStockAlertsEnabled),
      );
      setFeedbackMessage({
        tone: "success",
        text: "Configuración de inventario actualizada.",
      });
    } catch (error) {
      setFeedbackMessage({
        tone: "error",
        text: getErrorMessage(
          error,
          "No fue posible guardar la configuración de inventario.",
        ),
      });
    }
  }

  function handleToggle(nextValue: boolean) {
    setFeedbackMessage(null);
    setLowStockAlertsEnabled(nextValue);
  }

  return (
    <section className={styles.accordion}>
      <button
        aria-expanded={isOpen}
        className={styles.accordionSummary}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className={styles.accordionTitle}>Inventario</span>
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
              Completa primero los datos del negocio para configurar el
              inventario.
            </p>
          ) : null}

          <label
            className={
              lowStockAlertsEnabled
                ? `${styles.notificationRow} ${styles.notificationRowActive}`
                : styles.notificationRow
            }
          >
            <span className={styles.notificationIcon}>
              <Bell aria-hidden="true" />
            </span>
            <span className={styles.notificationCopy}>
              <span className={styles.notificationTitle}>
                Notificar unidades bajas
              </span>
              <span className={styles.notificationDescription}>
                Te avisamos cuando un producto llegue al mínimo que configuraste.
              </span>
            </span>
            <input
              checked={lowStockAlertsEnabled}
              className={styles.toggleInput}
              disabled={isDisabled || Boolean(errorMessage)}
              type="checkbox"
              onChange={(event) => handleToggle(event.target.checked)}
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

          <div className={styles.footer}>
            <button
              className={styles.saveButton}
              disabled={!canSave}
              type="button"
              onClick={() => {
                void handleSave();
              }}
            >
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
