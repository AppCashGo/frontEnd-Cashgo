import {
  CarFront,
  ChevronDown,
  ChevronUp,
  Clock3,
  Link2,
  Store,
  Tag,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import type {
  BusinessSettings,
  BusinessVirtualCatalogSettingsInput,
  CatalogBusinessHour,
  CatalogOutOfStockBehavior,
  CatalogWeekdayId,
} from "@/modules/settings/types/settings";
import {
  buildCatalogUrl,
  buildDefaultCatalogSlug,
  extractCatalogSlug,
} from "@/modules/settings/utils/virtual-catalog";
import styles from "./VirtualCatalogSettingsPanel.module.css";

type VirtualCatalogSettingsPanelProps = {
  businessSettings: BusinessSettings | null;
  errorMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  onRetry: () => void;
  onSubmit: (input: BusinessVirtualCatalogSettingsInput) => Promise<void>;
};

type SectionKey = "hours" | "stock" | "delivery" | "url";

type FeedbackMessage = {
  tone: "success" | "error";
  text: string;
};

const weekdays: Array<{ id: CatalogWeekdayId; label: string }> = [
  { id: "monday", label: "Lunes" },
  { id: "tuesday", label: "Martes" },
  { id: "wednesday", label: "Miércoles" },
  { id: "thursday", label: "Jueves" },
  { id: "friday", label: "Viernes" },
  { id: "saturday", label: "Sábado" },
  { id: "sunday", label: "Domingo" },
];

const stockOptions: Array<{
  value: CatalogOutOfStockBehavior;
  label: string;
}> = [
  { value: "SHOW_NORMALLY", label: "Exhibir normalmente" },
  { value: "HIDE_FROM_CATALOG", label: "No mostrar en el catálogo" },
  { value: "SHOW_UNAVAILABLE", label: 'Mostrar "No disponible"' },
];

function buildDefaultHours(): CatalogBusinessHour[] {
  return weekdays.map((weekday) => ({
    day: weekday.id,
    enabled: false,
    opensAt: "00:00",
    closesAt: "00:00",
  }));
}

function mergeBusinessHours(
  storedHours: CatalogBusinessHour[] | null | undefined,
) {
  const storedByDay = new Map(
    (storedHours ?? []).map((businessHour) => [
      businessHour.day,
      businessHour,
    ]),
  );

  return buildDefaultHours().map((businessHour) => ({
    ...businessHour,
    ...storedByDay.get(businessHour.day),
  }));
}

export function VirtualCatalogSettingsPanel({
  businessSettings,
  errorMessage,
  isLoading,
  isSubmitting,
  onRetry,
  onSubmit,
}: VirtualCatalogSettingsPanelProps) {
  const defaultSlug = useMemo(
    () =>
      buildDefaultCatalogSlug({
        businessName: businessSettings?.businessName,
        businessId: businessSettings?.id,
      }),
    [businessSettings],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    hours: false,
    stock: false,
    delivery: false,
    url: false,
  });
  const [businessHours, setBusinessHours] = useState<CatalogBusinessHour[]>(
    buildDefaultHours,
  );
  const [outOfStockBehavior, setOutOfStockBehavior] =
    useState<CatalogOutOfStockBehavior>("SHOW_NORMALLY");
  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [catalogUrl, setCatalogUrl] = useState(buildCatalogUrl(defaultSlug));
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);
  const [feedbackMessage, setFeedbackMessage] =
    useState<FeedbackMessage | null>(null);

  const isDisabled = isLoading || isSubmitting || !businessSettings;

  useEffect(() => {
    setBusinessHours(mergeBusinessHours(businessSettings?.catalogBusinessHours));
    setOutOfStockBehavior(
      businessSettings?.catalogOutOfStockBehavior ?? "SHOW_NORMALLY",
    );
    setPickupEnabled(businessSettings?.catalogPickupEnabled ?? false);
    setDeliveryEnabled(businessSettings?.catalogDeliveryEnabled ?? false);
    setCatalogUrl(
      buildCatalogUrl(businessSettings?.catalogSlug ?? defaultSlug),
    );
  }, [businessSettings, defaultSlug]);

  function toggleSection(sectionKey: SectionKey) {
    setOpenSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: !currentSections[sectionKey],
    }));
  }

  function updateHour(
    day: CatalogWeekdayId,
    patch: Partial<Omit<CatalogBusinessHour, "day">>,
  ) {
    setBusinessHours((currentHours) =>
      currentHours.map((businessHour) =>
        businessHour.day === day ? { ...businessHour, ...patch } : businessHour,
      ),
    );
  }

  async function saveSettings(
    sectionKey: SectionKey,
    input: BusinessVirtualCatalogSettingsInput,
    successMessage: string,
  ) {
    setSavingSection(sectionKey);
    setFeedbackMessage(null);

    try {
      await onSubmit(input);
      setFeedbackMessage({
        tone: "success",
        text: successMessage,
      });
      return true;
    } catch (error) {
      setFeedbackMessage({
        tone: "error",
        text: getErrorMessage(error, "No fue posible guardar los cambios."),
      });
      return false;
    } finally {
      setSavingSection(null);
    }
  }

  async function handleSaveHours() {
    await saveSettings(
      "hours",
      { catalogBusinessHours: businessHours },
      "Horarios actualizados.",
    );
  }

  async function handleStockBehaviorChange(
    nextBehavior: CatalogOutOfStockBehavior,
  ) {
    const previousBehavior = outOfStockBehavior;
    setOutOfStockBehavior(nextBehavior);

    const wasSaved = await saveSettings(
      "stock",
      { catalogOutOfStockBehavior: nextBehavior },
      "Visibilidad de stock actualizada.",
    );

    if (!wasSaved) {
      setOutOfStockBehavior(previousBehavior);
    }
  }

  async function handleDeliveryToggle(
    field: "pickup" | "delivery",
    nextValue: boolean,
  ) {
    const previousPickupEnabled = pickupEnabled;
    const previousDeliveryEnabled = deliveryEnabled;
    const nextPickupEnabled = field === "pickup" ? nextValue : pickupEnabled;
    const nextDeliveryEnabled =
      field === "delivery" ? nextValue : deliveryEnabled;

    setPickupEnabled(nextPickupEnabled);
    setDeliveryEnabled(nextDeliveryEnabled);

    const wasSaved = await saveSettings(
      "delivery",
      {
        catalogPickupEnabled: nextPickupEnabled,
        catalogDeliveryEnabled: nextDeliveryEnabled,
      },
      "Métodos de entrega actualizados.",
    );

    if (!wasSaved) {
      setPickupEnabled(previousPickupEnabled);
      setDeliveryEnabled(previousDeliveryEnabled);
    }
  }

  async function handleSaveCatalogUrl() {
    const catalogSlug = extractCatalogSlug(catalogUrl);

    if (catalogSlug.length < 3) {
      setFeedbackMessage({
        tone: "error",
        text: "El enlace del catálogo debe tener al menos 3 caracteres.",
      });
      return;
    }

    const nextCatalogUrl = buildCatalogUrl(catalogSlug);
    setCatalogUrl(nextCatalogUrl);
    await saveSettings(
      "url",
      { catalogSlug },
      "URL del catálogo actualizada.",
    );
  }

  return (
    <section className={styles.accordion}>
      <button
        aria-expanded={isOpen}
        className={styles.accordionSummary}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className={styles.accordionTitle}>Catálogo virtual</span>
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
              Completa primero los datos del negocio para activar el catálogo.
            </p>
          ) : null}

          <div className={styles.innerAccordion}>
            <button
              aria-expanded={openSections.hours}
              className={styles.innerSummary}
              type="button"
              onClick={() => toggleSection("hours")}
            >
              <span className={styles.summaryContent}>
                <Clock3 />
                <span>Horarios de atención</span>
              </span>
              {openSections.hours ? <ChevronUp /> : <ChevronDown />}
            </button>

            {openSections.hours ? (
              <div className={styles.innerBody}>
                <div className={styles.hoursGrid}>
                  {weekdays.map((weekday) => {
                    const businessHour =
                      businessHours.find((entry) => entry.day === weekday.id) ??
                      buildDefaultHours().find(
                        (entry) => entry.day === weekday.id,
                      )!;

                    const isHourDisabled =
                      isDisabled || savingSection === "hours";

                    return (
                      <div
                        className={
                          businessHour.enabled
                            ? `${styles.dayCard} ${styles.dayCardEnabled}`
                            : styles.dayCard
                        }
                        key={weekday.id}
                      >
                        <label className={styles.dayToggle}>
                          <input
                            checked={businessHour.enabled}
                            disabled={isHourDisabled}
                            type="checkbox"
                            onChange={(event) =>
                              updateHour(weekday.id, {
                                enabled: event.target.checked,
                              })
                            }
                          />
                          <span className={styles.dayName}>{weekday.label}</span>
                          <span className={styles.dayStatus}>
                            {businessHour.enabled ? "Abierto" : "Cerrado"}
                          </span>
                        </label>

                        <div className={styles.timeFields}>
                          <label className={styles.timeField}>
                            <span>Abre</span>
                            <input
                              aria-label={`Hora de apertura ${weekday.label}`}
                              disabled={isHourDisabled || !businessHour.enabled}
                              type="time"
                              value={businessHour.opensAt}
                              onChange={(event) =>
                                updateHour(weekday.id, {
                                  opensAt: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className={styles.timeField}>
                            <span>Cierra</span>
                            <input
                              aria-label={`Hora de cierre ${weekday.label}`}
                              disabled={isHourDisabled || !businessHour.enabled}
                              type="time"
                              value={businessHour.closesAt}
                              onChange={(event) =>
                                updateHour(weekday.id, {
                                  closesAt: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  className={styles.primaryButton}
                  disabled={isDisabled || savingSection === "hours"}
                  type="button"
                  onClick={() => {
                    void handleSaveHours();
                  }}
                >
                  {savingSection === "hours"
                    ? "Guardando..."
                    : "Guardar cambios"}
                </button>
              </div>
            ) : null}
          </div>

          <div className={styles.innerAccordion}>
            <button
              aria-expanded={openSections.stock}
              className={styles.innerSummary}
              type="button"
              onClick={() => toggleSection("stock")}
            >
              <span className={styles.summaryContent}>
                <Tag />
                <span>Productos sin stock</span>
              </span>
              {openSections.stock ? <ChevronUp /> : <ChevronDown />}
            </button>

            {openSections.stock ? (
              <div className={styles.radioGroup}>
                {stockOptions.map((option) => (
                  <label className={styles.radioRow} key={option.value}>
                    <input
                      checked={outOfStockBehavior === option.value}
                      disabled={isDisabled || savingSection === "stock"}
                      name="catalogOutOfStockBehavior"
                      type="radio"
                      value={option.value}
                      onChange={() => {
                        void handleStockBehaviorChange(option.value);
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.innerAccordion}>
            <button
              aria-expanded={openSections.delivery}
              className={styles.innerSummary}
              type="button"
              onClick={() => toggleSection("delivery")}
            >
              <span className={styles.summaryContent}>
                <Truck />
                <span>Métodos de entrega</span>
              </span>
              {openSections.delivery ? <ChevronUp /> : <ChevronDown />}
            </button>

            {openSections.delivery ? (
              <div className={styles.deliveryList}>
                <label className={styles.deliveryRow}>
                  <span className={styles.deliveryLabel}>
                    <CarFront />
                    <span>Retiro en tienda</span>
                  </span>
                  <input
                    checked={pickupEnabled}
                    className={styles.toggleInput}
                    disabled={isDisabled || savingSection === "delivery"}
                    type="checkbox"
                    onChange={(event) => {
                      void handleDeliveryToggle(
                        "pickup",
                        event.target.checked,
                      );
                    }}
                  />
                </label>

                <label className={styles.deliveryRow}>
                  <span className={styles.deliveryLabel}>
                    <Store />
                    <span>Entrega a domicilio</span>
                  </span>
                  <input
                    checked={deliveryEnabled}
                    className={styles.toggleInput}
                    disabled={isDisabled || savingSection === "delivery"}
                    type="checkbox"
                    onChange={(event) => {
                      void handleDeliveryToggle(
                        "delivery",
                        event.target.checked,
                      );
                    }}
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className={styles.innerAccordion}>
            <button
              aria-expanded={openSections.url}
              className={styles.innerSummary}
              type="button"
              onClick={() => toggleSection("url")}
            >
              <span className={styles.summaryContent}>
                <Link2 />
                <span>URL del catálogo</span>
              </span>
              {openSections.url ? <ChevronUp /> : <ChevronDown />}
            </button>

            {openSections.url ? (
              <div className={styles.urlSection}>
                <label className={styles.urlField}>
                  <span>Modifica y comparte tu link</span>
                  <input
                    disabled={isDisabled || savingSection === "url"}
                    value={catalogUrl}
                    onChange={(event) => setCatalogUrl(event.target.value)}
                  />
                </label>
                <button
                  className={styles.primaryButton}
                  disabled={isDisabled || savingSection === "url"}
                  type="button"
                  onClick={() => {
                    void handleSaveCatalogUrl();
                  }}
                >
                  {savingSection === "url"
                    ? "Guardando..."
                    : "Guardar cambios"}
                </button>
              </div>
            ) : null}
          </div>

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
