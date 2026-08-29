import {
  Bell,
  Calculator,
  ChevronDown,
  ChevronUp,
  PackageMinus,
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
  BusinessOperationalSettingsInput,
  BusinessSettings,
} from "@/modules/settings/types/settings";
import { useToast } from "@/shared/hooks/use-toast";
import styles from "./InventorySettingsPanel.module.css";

type InventorySettingsPanelProps = {
  businessSettings: BusinessSettings | null;
  errorMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  onRetry: () => void;
  onSubmit: (input: BusinessOperationalSettingsInput) => Promise<void>;
};

function buildOperationalSettingsInput(
  values: BusinessOperationalSettingsInput,
): BusinessOperationalSettingsInput {
  return values;
}

export function InventorySettingsPanel({
  businessSettings,
  errorMessage,
  isLoading,
  isSubmitting,
  onRetry,
  onSubmit,
}: InventorySettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [lowStockAlertsEnabled, setLowStockAlertsEnabled] = useState(
    businessSettings?.lowStockAlertsEnabled ?? true,
  );
  const [allowSaleWithoutStock, setAllowSaleWithoutStock] = useState(
    businessSettings?.allowSaleWithoutStock ?? false,
  );
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState(
    businessSettings?.defaultLowStockThreshold ?? 5,
  );
  const [useWeightedAverageCost, setUseWeightedAverageCost] = useState(
    businessSettings?.useWeightedAverageCost ?? true,
  );
  const toast = useToast();

  useEffect(() => {
    setLowStockAlertsEnabled(businessSettings?.lowStockAlertsEnabled ?? true);
    setAllowSaleWithoutStock(businessSettings?.allowSaleWithoutStock ?? false);
    setDefaultLowStockThreshold(
      businessSettings?.defaultLowStockThreshold ?? 5,
    );
    setUseWeightedAverageCost(
      businessSettings?.useWeightedAverageCost ?? true,
    );
  }, [businessSettings]);

  const isDisabled = isLoading || isSubmitting || !businessSettings;
  const isDirty =
    Boolean(businessSettings) &&
    (lowStockAlertsEnabled !== businessSettings?.lowStockAlertsEnabled ||
      allowSaleWithoutStock !== businessSettings?.allowSaleWithoutStock ||
      defaultLowStockThreshold !==
        businessSettings?.defaultLowStockThreshold ||
      useWeightedAverageCost !== businessSettings?.useWeightedAverageCost);
  const canSave = isDirty && !isDisabled && !errorMessage;

  async function handleSave() {
    if (!businessSettings || !canSave) {
      return;
    }

    try {
      await onSubmit(
        buildOperationalSettingsInput({
          allowSaleWithoutStock,
          lowStockAlertsEnabled,
          defaultLowStockThreshold,
          useWeightedAverageCost,
        }),
      );
      toast.showSuccess("Configuración de inventario actualizada.");
    } catch (error) {
      toast.showError(
        error,
        "No fue posible guardar la configuración de inventario.",
      );
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
              onChange={(event) =>
                setLowStockAlertsEnabled(event.target.checked)
              }
            />
          </label>

          <label className={styles.numberField}>
            <span>
              <span className={styles.notificationTitle}>
                Mínimo predeterminado
              </span>
              <span className={styles.notificationDescription}>
                Se usará al crear productos nuevos; puedes ajustarlo por producto.
              </span>
            </span>
            <input
              aria-label="Mínimo predeterminado de inventario"
              disabled={isDisabled || Boolean(errorMessage)}
              min={0}
              step={1}
              type="number"
              value={defaultLowStockThreshold}
              onChange={(event) =>
                setDefaultLowStockThreshold(
                  Math.max(0, Math.trunc(Number(event.target.value) || 0)),
                )
              }
            />
          </label>

          <label
            className={
              allowSaleWithoutStock
                ? `${styles.notificationRow} ${styles.notificationRowActive}`
                : styles.notificationRow
            }
          >
            <span className={styles.notificationIcon}>
              <PackageMinus aria-hidden="true" />
            </span>
            <span className={styles.notificationCopy}>
              <span className={styles.notificationTitle}>
                Permitir ventas sin existencias
              </span>
              <span className={styles.notificationDescription}>
                Autoriza inventario negativo cuando no haya unidades disponibles.
              </span>
            </span>
            <input
              checked={allowSaleWithoutStock}
              className={styles.toggleInput}
              disabled={isDisabled || Boolean(errorMessage)}
              type="checkbox"
              onChange={(event) =>
                setAllowSaleWithoutStock(event.target.checked)
              }
            />
          </label>

          <label
            className={
              useWeightedAverageCost
                ? `${styles.notificationRow} ${styles.notificationRowActive}`
                : styles.notificationRow
            }
          >
            <span className={styles.notificationIcon}>
              <Calculator aria-hidden="true" />
            </span>
            <span className={styles.notificationCopy}>
              <span className={styles.notificationTitle}>
                Costo promedio ponderado
              </span>
              <span className={styles.notificationDescription}>
                Recalcula el costo unitario al registrar nuevas compras.
              </span>
            </span>
            <input
              checked={useWeightedAverageCost}
              className={styles.toggleInput}
              disabled={isDisabled || Boolean(errorMessage)}
              type="checkbox"
              onChange={(event) =>
                setUseWeightedAverageCost(event.target.checked)
              }
            />
          </label>

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
