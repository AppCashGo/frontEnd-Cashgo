import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { CashRegisterRetailDrawer } from "@/modules/cash-register/components/CashRegisterRetailDrawer";
import { getBillingConfigurationFormSchema } from "@/modules/billing/schemas/billing-configuration-form-schema";
import type {
  BillingConfiguration,
  BillingConfigurationInput,
} from "@/modules/billing/types/billing";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import { getBillingCopy } from "@/modules/billing/i18n/billing-copy";
import retailStyles from "@/shared/components/retail/RetailUI.module.css";
import styles from "./BillingFormDrawer.module.css";

type BillingConfigurationDrawerProps = {
  languageCode: AppLanguageCode;
  configuration: BillingConfiguration | null;
  isOpen: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: BillingConfigurationInput) => Promise<void>;
};

type BillingConfigurationFormValues = {
  legalName: string;
  taxId: string;
  city: string;
  email: string;
  phone: string;
  address: string;
  taxResponsibility: string;
  taxRegime: string;
  invoiceNote: string;
  resolutionPrefix: string;
  resolutionNumber: string;
  resolutionStartNumber: string;
  resolutionEndNumber: string;
  resolutionCurrentNumber: string;
  resolutionStartDate: string;
  resolutionEndDate: string;
  resolutionActive: boolean;
};

function getDefaultValues(
  configuration: BillingConfiguration | null,
): BillingConfigurationFormValues {
  return {
    legalName: configuration?.legalName ?? "",
    taxId: configuration?.taxId ?? "",
    city: configuration?.city ?? "",
    email: configuration?.email ?? "",
    phone: configuration?.phone ?? "",
    address: configuration?.address ?? "",
    taxResponsibility: configuration?.taxResponsibility ?? "",
    taxRegime: configuration?.taxRegime ?? "",
    invoiceNote: configuration?.invoiceNote ?? "",
    resolutionPrefix: configuration?.resolution?.prefix ?? "",
    resolutionNumber: configuration?.resolution?.resolution ?? "",
    resolutionStartNumber: configuration?.resolution
      ? String(configuration.resolution.startNumber)
      : "",
    resolutionEndNumber: configuration?.resolution
      ? String(configuration.resolution.endNumber)
      : "",
    resolutionCurrentNumber: configuration?.resolution
      ? String(configuration.resolution.currentNumber)
      : "",
    resolutionStartDate: configuration?.resolution?.startDate
      ? configuration.resolution.startDate.slice(0, 10)
      : "",
    resolutionEndDate: configuration?.resolution?.endDate
      ? configuration.resolution.endDate.slice(0, 10)
      : "",
    resolutionActive: configuration?.resolution?.isActive ?? false,
  };
}

function toNullableText(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function toNullableNumber(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? Number(trimmedValue) : null;
}

export function BillingConfigurationDrawer({
  languageCode,
  configuration,
  isOpen,
  isLoading,
  isSubmitting,
  onClose,
  onSubmit,
}: BillingConfigurationDrawerProps) {
  const copy = getBillingCopy(languageCode);
  const formId = "billing-configuration-form";
  const {
    register,
    reset,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<BillingConfigurationFormValues>({
    resolver: zodResolver(getBillingConfigurationFormSchema(languageCode)),
    defaultValues: getDefaultValues(configuration),
  });

  useEffect(() => {
    reset(getDefaultValues(configuration));
  }, [configuration, reset]);

  const submitConfiguration = handleSubmit(async (values) => {
    try {
      await onSubmit({
        legalName: toNullableText(values.legalName),
        taxId: toNullableText(values.taxId),
        city: toNullableText(values.city),
        email: toNullableText(values.email),
        phone: toNullableText(values.phone),
        address: toNullableText(values.address),
        taxResponsibility: toNullableText(values.taxResponsibility),
        taxRegime: toNullableText(values.taxRegime),
        invoiceNote: toNullableText(values.invoiceNote),
        resolutionPrefix: toNullableText(values.resolutionPrefix),
        resolutionNumber: toNullableText(values.resolutionNumber),
        resolutionStartNumber: toNullableNumber(values.resolutionStartNumber),
        resolutionEndNumber: toNullableNumber(values.resolutionEndNumber),
        resolutionCurrentNumber: toNullableNumber(values.resolutionCurrentNumber),
        resolutionStartDate: toNullableText(values.resolutionStartDate),
        resolutionEndDate: toNullableText(values.resolutionEndDate),
        resolutionActive: values.resolutionActive,
      });
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error && error.message ? error.message : copy.configError,
      });
    }
  });

  return (
    <CashRegisterRetailDrawer
      description={copy.configDescription}
      footer={
        <div className={styles.footerActions}>
          <button
            className={retailStyles.buttonOutline}
            disabled={isSubmitting}
            type="button"
            onClick={onClose}
          >
            {languageCode === "en" ? "Cancel" : "Cancelar"}
          </button>
          <button
            className={retailStyles.buttonDark}
            disabled={isSubmitting}
            form={formId}
            type="submit"
          >
            {isSubmitting ? copy.saving : copy.configSave}
          </button>
        </div>
      }
      isOpen={isOpen}
      title={copy.configTitle}
      onClose={onClose}
    >
      <form
        id={formId}
        className={styles.section}
        noValidate
        onSubmit={submitConfiguration}
      >
        <section className={styles.section}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{copy.summaryTaxId}</p>
              <p className={styles.summaryValue}>
                {configuration?.taxId ?? "—"}
              </p>
            </div>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{copy.summaryResolution}</p>
              <p className={styles.summaryValue}>
                {configuration?.resolution?.resolution ?? copy.summaryMissingResolution}
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{copy.configBusinessSection}</h4>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.configLegalName}</span>
              <input className={styles.input} type="text" {...register("legalName")} />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.configTaxId}</span>
              <input className={styles.input} type="text" {...register("taxId")} />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.configCity}</span>
              <input className={styles.input} type="text" {...register("city")} />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.configEmail}</span>
              <input className={styles.input} type="email" {...register("email")} />
              {errors.email ? (
                <p className={styles.errorMessage}>{errors.email.message}</p>
              ) : null}
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.configPhone}</span>
              <input className={styles.input} type="text" {...register("phone")} />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.configAddress}</span>
              <input className={styles.input} type="text" {...register("address")} />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {copy.configTaxResponsibility}
              </span>
              <input
                className={styles.input}
                type="text"
                {...register("taxResponsibility")}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.configTaxRegime}</span>
              <input className={styles.input} type="text" {...register("taxRegime")} />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.configInvoiceNote}</span>
              <textarea
                className={styles.textarea}
                rows={4}
                {...register("invoiceNote")}
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{copy.configResolutionSection}</h4>

          <label className={styles.checkboxCard}>
            <input type="checkbox" {...register("resolutionActive")} />
            <span className={styles.checkboxCopy}>
              <span className={styles.checkboxTitle}>
                {copy.configResolutionActive}
              </span>
              <span className={styles.checkboxDescription}>
                {copy.summaryPrefix}:{" "}
                {configuration?.resolution?.prefix ?? "—"} · {copy.summaryCurrentNumber}:{" "}
                {configuration?.resolution?.currentNumber ?? "—"}
              </span>
            </span>
          </label>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.configResolutionPrefix}</span>
              <input
                className={styles.input}
                type="text"
                {...register("resolutionPrefix")}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.configResolutionNumber}</span>
              <input
                className={styles.input}
                type="text"
                {...register("resolutionNumber")}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {copy.configResolutionStartNumber}
              </span>
              <input
                className={styles.input}
                inputMode="numeric"
                type="text"
                {...register("resolutionStartNumber")}
              />
              {errors.resolutionStartNumber ? (
                <p className={styles.errorMessage}>
                  {errors.resolutionStartNumber.message}
                </p>
              ) : null}
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {copy.configResolutionEndNumber}
              </span>
              <input
                className={styles.input}
                inputMode="numeric"
                type="text"
                {...register("resolutionEndNumber")}
              />
              {errors.resolutionEndNumber ? (
                <p className={styles.errorMessage}>
                  {errors.resolutionEndNumber.message}
                </p>
              ) : null}
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {copy.configResolutionCurrentNumber}
              </span>
              <input
                className={styles.input}
                inputMode="numeric"
                type="text"
                {...register("resolutionCurrentNumber")}
              />
              {errors.resolutionCurrentNumber ? (
                <p className={styles.errorMessage}>
                  {errors.resolutionCurrentNumber.message}
                </p>
              ) : null}
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.configResolutionStartDate}</span>
              <input
                className={styles.input}
                type="date"
                {...register("resolutionStartDate")}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.configResolutionEndDate}</span>
              <input
                className={styles.input}
                type="date"
                {...register("resolutionEndDate")}
              />
            </label>
          </div>
        </section>

        {errors.root?.message ? (
          <div className={styles.errorBanner}>{errors.root.message}</div>
        ) : null}

        {isLoading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>
              {languageCode === "en" ? "Loading configuration..." : "Cargando configuración..."}
            </p>
          </div>
        ) : null}
      </form>
    </CashRegisterRetailDrawer>
  );
}
