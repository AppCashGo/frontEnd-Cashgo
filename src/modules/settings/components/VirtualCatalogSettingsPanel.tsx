import {
  CarFront,
  ChevronDown,
  ChevronUp,
  Clock3,
  CreditCard,
  Link2,
  QrCode,
  ShoppingCart,
  Store,
  Tag,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TimePicker12Hour } from "@/shared/components/ui";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { resolveApiAssetUrl } from "@/shared/services/api-client";
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
  isPaymentQrUploading: boolean;
  onPaymentQrUpload: (file: File) => Promise<void>;
  onRetry: () => void;
  onSubmit: (input: BusinessVirtualCatalogSettingsInput) => Promise<void>;
};

type SectionKey = "shopping" | "hours" | "stock" | "delivery" | "payment" | "url";

type FeedbackMessage = {
  tone: "success" | "error";
  text: string;
};

type QuickSchedule = {
  opensAt: string;
  closesAt: string;
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
    opensAt: "08:00",
    closesAt: "22:00",
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
  isPaymentQrUploading,
  onPaymentQrUpload,
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
    shopping: false,
    hours: false,
    stock: false,
    delivery: false,
    payment: false,
    url: false,
  });
  const [businessHours, setBusinessHours] = useState<CatalogBusinessHour[]>(
    buildDefaultHours,
  );
  const [quickSchedule, setQuickSchedule] = useState<QuickSchedule>({
    opensAt: "08:00",
    closesAt: "22:00",
  });
  const [outOfStockBehavior, setOutOfStockBehavior] =
    useState<CatalogOutOfStockBehavior>("SHOW_NORMALLY");
  const [shoppingEnabled, setShoppingEnabled] = useState(false);
  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [manualPaymentEnabled, setManualPaymentEnabled] = useState(false);
  const [manualPaymentHolder, setManualPaymentHolder] = useState("");
  const [manualPaymentKey, setManualPaymentKey] = useState("");
  const [catalogUrl, setCatalogUrl] = useState(buildCatalogUrl(defaultSlug));
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);
  const [feedbackMessage, setFeedbackMessage] =
    useState<FeedbackMessage | null>(null);

  const isDisabled = isLoading || isSubmitting || !businessSettings;

  useEffect(() => {
    const nextBusinessHours = mergeBusinessHours(
      businessSettings?.catalogBusinessHours,
    );
    const scheduleReference =
      nextBusinessHours.find((businessHour) => businessHour.enabled) ??
      nextBusinessHours[0];

    setBusinessHours(nextBusinessHours);
    if (scheduleReference) {
      setQuickSchedule({
        opensAt:
          scheduleReference.opensAt === "00:00" &&
          scheduleReference.closesAt === "00:00"
            ? "08:00"
            : scheduleReference.opensAt,
        closesAt:
          scheduleReference.opensAt === "00:00" &&
          scheduleReference.closesAt === "00:00"
            ? "22:00"
            : scheduleReference.closesAt,
      });
    }
    setOutOfStockBehavior(
      businessSettings?.catalogOutOfStockBehavior ?? "SHOW_NORMALLY",
    );
    setShoppingEnabled(businessSettings?.catalogShoppingEnabled ?? false);
    setPickupEnabled(businessSettings?.catalogPickupEnabled ?? false);
    setDeliveryEnabled(businessSettings?.catalogDeliveryEnabled ?? false);
    setDeliveryFee(businessSettings?.catalogDeliveryFee ?? 0);
    setManualPaymentEnabled(
      businessSettings?.catalogManualPaymentEnabled ?? false,
    );
    setManualPaymentHolder(
      businessSettings?.catalogManualPaymentHolder ?? "",
    );
    setManualPaymentKey(businessSettings?.catalogManualPaymentKey ?? "");
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

  function toggleBusinessDay(day: CatalogWeekdayId, enabled: boolean) {
    updateHour(day, {
      enabled,
      ...(enabled
        ? {
            opensAt: quickSchedule.opensAt,
            closesAt: quickSchedule.closesAt,
          }
        : {}),
    });
  }

  function setEnabledDays(days: CatalogWeekdayId[]) {
    const enabledDays = new Set(days);
    setBusinessHours((currentHours) =>
      currentHours.map((businessHour) => ({
        ...businessHour,
        enabled: enabledDays.has(businessHour.day),
        ...(enabledDays.has(businessHour.day)
          ? {
              opensAt: quickSchedule.opensAt,
              closesAt: quickSchedule.closesAt,
            }
          : {}),
      })),
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

  async function handleSaveHours(hours = businessHours) {
    await saveSettings(
      "hours",
      { catalogBusinessHours: hours },
      "Horarios actualizados.",
    );
  }

  async function handleApplyQuickSchedule() {
    const nextBusinessHours = businessHours.map((businessHour) =>
      businessHour.enabled
        ? {
            ...businessHour,
            opensAt: quickSchedule.opensAt,
            closesAt: quickSchedule.closesAt,
          }
        : businessHour,
    );

    setBusinessHours(nextBusinessHours);
    await handleSaveHours(nextBusinessHours);
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

  async function handleShoppingToggle(nextValue: boolean) {
    const previousValue = shoppingEnabled;
    setShoppingEnabled(nextValue);

    const wasSaved = await saveSettings(
      "shopping",
      { catalogShoppingEnabled: nextValue },
      nextValue
        ? "Carrito de compras activado."
        : "Carrito de compras desactivado.",
    );

    if (!wasSaved) {
      setShoppingEnabled(previousValue);
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
        catalogDeliveryFee: deliveryFee,
      },
      "Métodos de entrega actualizados.",
    );

    if (!wasSaved) {
      setPickupEnabled(previousPickupEnabled);
      setDeliveryEnabled(previousDeliveryEnabled);
    }
  }

  async function handleSaveDeliveryFee() {
    await saveSettings(
      "delivery",
      { catalogDeliveryFee: deliveryFee },
      "Tarifa de domicilio actualizada.",
    );
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

  async function handleSaveManualPayment() {
    if (manualPaymentEnabled && !businessSettings?.catalogManualPaymentQrUrl) {
      setFeedbackMessage({
        tone: "error",
        text: "Sube primero la imagen del QR para activar este medio de pago.",
      });
      return;
    }

    await saveSettings(
      "payment",
      {
        catalogManualPaymentEnabled: manualPaymentEnabled,
        catalogManualPaymentHolder: manualPaymentHolder.trim() || null,
        catalogManualPaymentKey: manualPaymentKey.trim() || null,
      },
      manualPaymentEnabled
        ? "Pago manual con QR activado."
        : "Pago manual con QR desactivado.",
    );
  }

  async function handlePaymentQrUpload(file: File | undefined) {
    if (!file) return;
    setFeedbackMessage(null);
    try {
      await onPaymentQrUpload(file);
      setFeedbackMessage({ tone: "success", text: "Código QR actualizado." });
    } catch (error) {
      setFeedbackMessage({
        tone: "error",
        text: getErrorMessage(error, "No fue posible subir el código QR."),
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

          <section
            className={`${styles.shoppingToggleCard} ${
              shoppingEnabled ? styles.shoppingToggleCardActive : ""
            }`}
          >
            <span className={styles.shoppingToggleIcon}>
              <ShoppingCart aria-hidden="true" />
            </span>
            <span className={styles.shoppingToggleCopy}>
              <strong>Carrito de compras</strong>
              <small>
                {shoppingEnabled
                  ? "Tus clientes pueden agregar productos y crear pedidos desde el catálogo."
                  : "El catálogo funciona como vitrina: muestra productos y precios, sin permitir compras."}
              </small>
            </span>
            <label className={styles.shoppingToggleControl}>
              <span>{shoppingEnabled ? "Activado" : "Desactivado"}</span>
              <input
                aria-label="Activar carrito de compras"
                checked={shoppingEnabled}
                className={styles.toggleInput}
                disabled={isDisabled || savingSection === "shopping"}
                type="checkbox"
                onChange={(event) => {
                  void handleShoppingToggle(event.target.checked);
                }}
              />
            </label>
          </section>

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
                <section className={styles.quickScheduleCard}>
                  <div className={styles.quickScheduleHeading}>
                    <div>
                      <strong>Configuración rápida</strong>
                      <p>
                        Elige los días que atiendes y guarda un mismo horario
                        para todos.
                      </p>
                    </div>
                    <span className={styles.openDaysCount}>
                      {businessHours.filter((businessHour) => businessHour.enabled)
                        .length}{" "}
                      días abiertos
                    </span>
                  </div>

                  <div
                    aria-label="Selección rápida de días"
                    className={styles.dayPresets}
                    role="group"
                  >
                    <button
                      disabled={isDisabled || savingSection === "hours"}
                      type="button"
                      onClick={() =>
                        setEnabledDays([
                          "monday",
                          "tuesday",
                          "wednesday",
                          "thursday",
                          "friday",
                        ])
                      }
                    >
                      Lunes a viernes
                    </button>
                    <button
                      disabled={isDisabled || savingSection === "hours"}
                      type="button"
                      onClick={() =>
                        setEnabledDays(weekdays.map((weekday) => weekday.id))
                      }
                    >
                      Todos los días
                    </button>
                    <button
                      disabled={isDisabled || savingSection === "hours"}
                      type="button"
                      onClick={() => setEnabledDays([])}
                    >
                      Cerrar todos
                    </button>
                  </div>

                  <div className={styles.quickDayPicker}>
                    {weekdays.map((weekday) => {
                      const isEnabled = businessHours.some(
                        (businessHour) =>
                          businessHour.day === weekday.id &&
                          businessHour.enabled,
                      );

                      return (
                        <label
                          className={
                            isEnabled
                              ? `${styles.quickDay} ${styles.quickDaySelected}`
                              : styles.quickDay
                          }
                          key={weekday.id}
                        >
                          <input
                            checked={isEnabled}
                            disabled={isDisabled || savingSection === "hours"}
                            type="checkbox"
                            onChange={(event) =>
                              toggleBusinessDay(
                                weekday.id,
                                event.target.checked,
                              )
                            }
                          />
                          <span>{weekday.label.slice(0, 3)}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className={styles.quickScheduleFields}>
                    <div className={styles.timeField}>
                      <span>Hora de apertura</span>
                      <TimePicker12Hour
                        ariaLabel="Hora de apertura para los días seleccionados"
                        disabled={isDisabled || savingSection === "hours"}
                        value={quickSchedule.opensAt}
                        onChange={(opensAt) =>
                          setQuickSchedule((currentSchedule) => ({
                            ...currentSchedule,
                            opensAt,
                          }))
                        }
                      />
                    </div>
                    <span aria-hidden="true" className={styles.timeSeparator}>
                      hasta
                    </span>
                    <div className={styles.timeField}>
                      <span>Hora de cierre</span>
                      <TimePicker12Hour
                        ariaLabel="Hora de cierre para los días seleccionados"
                        disabled={isDisabled || savingSection === "hours"}
                        value={quickSchedule.closesAt}
                        onChange={(closesAt) =>
                          setQuickSchedule((currentSchedule) => ({
                            ...currentSchedule,
                            closesAt,
                          }))
                        }
                      />
                    </div>
                    <button
                      className={styles.applyScheduleButton}
                      disabled={
                        isDisabled ||
                        savingSection === "hours"
                      }
                      type="button"
                      onClick={() => {
                        void handleApplyQuickSchedule();
                      }}
                    >
                      {savingSection === "hours"
                        ? "Guardando..."
                        : "Aplicar y guardar"}
                    </button>
                  </div>
                </section>

                <div className={styles.scheduleDetailHeading}>
                  <strong>Ajustes por día</strong>
                  <span>
                    Modifica aquí únicamente los días con un horario diferente.
                  </span>
                </div>

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
                              toggleBusinessDay(
                                weekday.id,
                                event.target.checked,
                              )
                            }
                          />
                          <span className={styles.dayName}>{weekday.label}</span>
                          <span className={styles.dayStatus}>
                            {businessHour.enabled ? "Abierto" : "Cerrado"}
                          </span>
                        </label>

                        <div className={styles.timeFields}>
                          <div className={styles.timeField}>
                            <span>Abre</span>
                            <TimePicker12Hour
                              ariaLabel={`Hora de apertura ${weekday.label}`}
                              disabled={isHourDisabled || !businessHour.enabled}
                              value={businessHour.opensAt}
                              onChange={(opensAt) =>
                                updateHour(weekday.id, {
                                  opensAt,
                                })
                              }
                            />
                          </div>
                          <div className={styles.timeField}>
                            <span>Cierra</span>
                            <TimePicker12Hour
                              ariaLabel={`Hora de cierre ${weekday.label}`}
                              disabled={isHourDisabled || !businessHour.enabled}
                              value={businessHour.closesAt}
                              onChange={(closesAt) =>
                                updateHour(weekday.id, {
                                  closesAt,
                                })
                              }
                            />
                          </div>
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

                {deliveryEnabled ? (
                  <div className={styles.deliveryFeeCard}>
                    <div>
                      <strong>Recargo por domicilio</strong>
                      <p>
                        Se sumará automáticamente al total del cliente cuando
                        elija entrega a domicilio.
                      </p>
                    </div>
                    <label className={styles.deliveryFeeField}>
                      <span>Valor en {businessSettings?.currency ?? "COP"}</span>
                      <span className={styles.moneyInput}>
                        <span>$</span>
                        <input
                          aria-label="Recargo por domicilio"
                          disabled={isDisabled || savingSection === "delivery"}
                          min="0"
                          onChange={(event) =>
                            setDeliveryFee(
                              Math.max(Number(event.target.value) || 0, 0),
                            )
                          }
                          step="100"
                          type="number"
                          value={deliveryFee}
                        />
                      </span>
                    </label>
                    <button
                      className={styles.saveDeliveryFeeButton}
                      disabled={isDisabled || savingSection === "delivery"}
                      onClick={() => void handleSaveDeliveryFee()}
                      type="button"
                    >
                      {savingSection === "delivery"
                        ? "Guardando..."
                        : "Guardar tarifa"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className={styles.innerAccordion}>
            <button
              aria-expanded={openSections.payment}
              className={styles.innerSummary}
              type="button"
              onClick={() => toggleSection("payment")}
            >
              <span className={styles.summaryContent}>
                <CreditCard />
                <span>Pago manual con QR</span>
              </span>
              {openSections.payment ? <ChevronUp /> : <ChevronDown />}
            </button>

            {openSections.payment ? (
              <div className={styles.paymentSection}>
                <div className={styles.paymentIntro}>
                  <div>
                    <strong>Recibe pagos en tu DaviPlata</strong>
                    <p>
                      El cliente escanea el QR, adjunta su comprobante y tú
                      apruebas el pago antes de preparar el pedido.
                    </p>
                  </div>
                  <label className={styles.shoppingToggleControl}>
                    <span>{manualPaymentEnabled ? "Activado" : "Desactivado"}</span>
                    <input
                      checked={manualPaymentEnabled}
                      className={styles.toggleInput}
                      disabled={isDisabled || savingSection === "payment"}
                      type="checkbox"
                      onChange={(event) =>
                        setManualPaymentEnabled(event.target.checked)
                      }
                    />
                  </label>
                </div>

                <div className={styles.paymentGrid}>
                  <div className={styles.qrCard}>
                    {businessSettings?.catalogManualPaymentQrUrl ? (
                      <img
                        alt="Código QR configurado para pagos"
                        src={
                          resolveApiAssetUrl(
                            businessSettings.catalogManualPaymentQrUrl,
                          ) ?? undefined
                        }
                      />
                    ) : (
                      <span className={styles.qrPlaceholder}>
                        <QrCode aria-hidden="true" />
                        Aún no has subido el QR
                      </span>
                    )}
                    <label className={styles.uploadQrButton}>
                      {isPaymentQrUploading ? "Subiendo…" : "Subir o cambiar QR"}
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        disabled={isDisabled || isPaymentQrUploading}
                        type="file"
                        onChange={(event) => {
                          void handlePaymentQrUpload(event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <small>PNG, JPG o WebP. No subas claves ni contraseñas.</small>
                  </div>

                  <div className={styles.paymentFields}>
                    <label>
                      <span>Nombre del titular</span>
                      <input
                        disabled={isDisabled || savingSection === "payment"}
                        maxLength={160}
                        placeholder="Nombre que verá el cliente"
                        value={manualPaymentHolder}
                        onChange={(event) =>
                          setManualPaymentHolder(event.target.value)
                        }
                      />
                    </label>
                    <label>
                      <span>Llave Bre-B o identificador de pago</span>
                      <input
                        disabled={isDisabled || savingSection === "payment"}
                        maxLength={120}
                        placeholder="Ejemplo: @PLATA..."
                        value={manualPaymentKey}
                        onChange={(event) =>
                          setManualPaymentKey(event.target.value)
                        }
                      />
                    </label>
                    <p className={styles.privacyNote}>
                      En el catálogo aparecerá enmascarada y el cliente podrá
                      revelarla solo si necesita copiarla.
                    </p>
                    <button
                      className={styles.primaryButton}
                      disabled={isDisabled || savingSection === "payment"}
                      type="button"
                      onClick={() => void handleSaveManualPayment()}
                    >
                      {savingSection === "payment"
                        ? "Guardando…"
                        : "Guardar medio de pago"}
                    </button>
                  </div>
                </div>
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
