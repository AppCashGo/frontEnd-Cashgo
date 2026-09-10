import {
  BadgeDollarSign,
  ChevronDown,
  ChevronUp,
  AlarmClock,
} from "lucide-react";
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
  const [receivableRemindersEnabled, setReceivableRemindersEnabled] = useState(
    businessSettings?.receivableEmailRemindersEnabled ?? false,
  );
  const [daysBefore, setDaysBefore] = useState(
    businessSettings?.receivableReminderDaysBefore ?? 3,
  );
  const [repeatDays, setRepeatDays] = useState(
    businessSettings?.receivableReminderRepeatDays ?? 3,
  );
  const toast = useToast();

  useEffect(() => {
    setOpeningReminderEnabled(
      businessSettings?.cashRegisterOpeningReminderEnabled ?? true,
    );
    setReceivableRemindersEnabled(
      businessSettings?.receivableEmailRemindersEnabled ?? false,
    );
    setDaysBefore(businessSettings?.receivableReminderDaysBefore ?? 3);
    setRepeatDays(businessSettings?.receivableReminderRepeatDays ?? 3);
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

  const automationHasChanges = Boolean(
    businessSettings &&
      (receivableRemindersEnabled !==
        businessSettings.receivableEmailRemindersEnabled ||
        daysBefore !== businessSettings.receivableReminderDaysBefore ||
        repeatDays !== businessSettings.receivableReminderRepeatDays),
  );

  async function handleAutomationSubmit() {
    if (isDisabled || errorMessage || !automationHasChanges) {
      return;
    }

    try {
      await onSubmit({
        receivableEmailRemindersEnabled: receivableRemindersEnabled,
        receivableReminderDaysBefore: daysBefore,
        receivableReminderRepeatDays: repeatDays,
      });
      toast.showSuccess("Programación de cobros actualizada.");
    } catch (error) {
      setReceivableRemindersEnabled(
        businessSettings?.receivableEmailRemindersEnabled ?? false,
      );
      setDaysBefore(businessSettings?.receivableReminderDaysBefore ?? 3);
      setRepeatDays(businessSettings?.receivableReminderRepeatDays ?? 3);
      toast.showError(error, "No fue posible guardar la programación.");
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

          <div className={styles.automationCard}>
            <label className={styles.settingRow}>
              <span className={styles.settingIcon}>
                <AlarmClock aria-hidden="true" />
              </span>
              <span className={styles.settingCopy}>
                <span className={styles.settingTitle}>
                  Correos automáticos de cobro
                </span>
                <span className={styles.settingDescription}>
                  Envía recordatorios antes del vencimiento, el día límite y
                  mientras exista saldo pendiente.
                </span>
              </span>
              <input
                checked={receivableRemindersEnabled}
                className={styles.toggleInput}
                disabled={isDisabled || Boolean(errorMessage)}
                type="checkbox"
                onChange={(event) => {
                  setReceivableRemindersEnabled(event.target.checked);
                }}
              />
            </label>

            <div className={styles.scheduleGrid}>
              <label className={styles.field}>
                <span>Primer aviso</span>
                <span className={styles.inputWithSuffix}>
                  <input
                    aria-label="Días antes del vencimiento"
                    disabled={
                      isDisabled ||
                      Boolean(errorMessage) ||
                      !receivableRemindersEnabled
                    }
                    max={30}
                    min={1}
                    type="number"
                    value={daysBefore}
                    onChange={(event) => {
                      setDaysBefore(
                        Math.min(30, Math.max(1, Number(event.target.value) || 1)),
                      );
                    }}
                  />
                  <span>días antes</span>
                </span>
              </label>

              <label className={styles.field}>
                <span>Si continúa vencido</span>
                <span className={styles.inputWithSuffix}>
                  <input
                    aria-label="Frecuencia de recordatorios vencidos"
                    disabled={
                      isDisabled ||
                      Boolean(errorMessage) ||
                      !receivableRemindersEnabled
                    }
                    max={30}
                    min={1}
                    type="number"
                    value={repeatDays}
                    onChange={(event) => {
                      setRepeatDays(
                        Math.min(30, Math.max(1, Number(event.target.value) || 1)),
                      );
                    }}
                  />
                  <span>días</span>
                </span>
              </label>
            </div>

            <div className={styles.automationFooter}>
              <p>
                Solo se enviarán correos a clientes con una deuda abierta,
                fecha de vencimiento y correo registrado. Al pagar, los envíos
                se detienen automáticamente.
              </p>
              <button
                className={styles.saveButton}
                disabled={
                  isDisabled ||
                  Boolean(errorMessage) ||
                  !automationHasChanges
                }
                type="button"
                onClick={() => {
                  void handleAutomationSubmit();
                }}
              >
                {isSubmitting ? "Guardando..." : "Guardar programación"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
