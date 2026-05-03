import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { CashRegisterRetailDrawer } from "@/modules/cash-register/components/CashRegisterRetailDrawer";
import type { CashRegisterPaymentMethod } from "@/modules/cash-register/types/cash-register";
import { getQuotesCopy } from "@/modules/quotes/i18n/quotes-copy";
import {
  getConvertQuotationFormSchema,
  type ConvertQuotationFormValues,
} from "@/modules/quotes/schemas/convert-quotation-form-schema";
import type {
  ConvertQuotationToSaleInput,
  QuotationDetail,
} from "@/modules/quotes/types/quotation";
import {
  formatQuotationCurrency,
  formatQuotationDate,
} from "@/modules/quotes/utils/quotation-utils";
import type { CustomerSummary } from "@/modules/customers/types/customer";
import retailStyles from "@/shared/components/retail/RetailUI.module.css";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./ConvertQuotationDrawer.module.css";

type ConvertQuotationDrawerProps = {
  languageCode: AppLanguageCode;
  quotation: QuotationDetail | null;
  customers: CustomerSummary[];
  activeCashRegisterId?: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: ConvertQuotationToSaleInput) => Promise<void>;
};

type PaymentMethodOption = {
  value: Exclude<CashRegisterPaymentMethod, "CREDIT">;
  labelEs: string;
  labelEn: string;
};

const paymentMethodOptions: PaymentMethodOption[] = [
  { value: "CASH", labelEs: "Efectivo", labelEn: "Cash" },
  { value: "CARD", labelEs: "Tarjeta", labelEn: "Card" },
  { value: "TRANSFER", labelEs: "Transferencia", labelEn: "Transfer" },
  { value: "DIGITAL_WALLET", labelEs: "Billetera", labelEn: "Wallet" },
  { value: "BANK_DEPOSIT", labelEs: "Consignación", labelEn: "Deposit" },
  { value: "OTHER", labelEs: "Otro", labelEn: "Other" },
];

function normalizeOptionalText(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : undefined;
}

function getDefaultValues(
  quotation: QuotationDetail | null,
): ConvertQuotationFormValues {
  return {
    paymentStatus: "PAID",
    customerId: quotation?.customer?.id ?? "",
    paymentMethod: "CASH",
    dueDate: quotation?.validUntil?.slice(0, 10) ?? "",
    notes: quotation?.notes ?? "",
  };
}

export function ConvertQuotationDrawer({
  languageCode,
  quotation,
  customers,
  activeCashRegisterId,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: ConvertQuotationDrawerProps) {
  const copy = getQuotesCopy(languageCode);
  const formId = "convert-quotation-form";
  const {
    register,
    watch,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ConvertQuotationFormValues>({
    resolver: zodResolver(getConvertQuotationFormSchema(languageCode)),
    defaultValues: getDefaultValues(quotation),
  });
  const paymentStatus = watch("paymentStatus");
  const paymentMethod = watch("paymentMethod");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset(getDefaultValues(quotation));
  }, [isOpen, quotation, reset]);

  function handleClose() {
    reset(getDefaultValues(quotation));
    onClose();
  }

  const submitConversion = handleSubmit(async (values) => {
    try {
      if (!quotation) {
        return;
      }

      await onSubmit({
        paymentStatus: values.paymentStatus,
        customerId: normalizeOptionalText(values.customerId),
        dueDate:
          values.paymentStatus === "CREDIT"
            ? normalizeOptionalText(values.dueDate)
            : undefined,
        notes: normalizeOptionalText(values.notes),
        cashRegisterId:
          values.paymentStatus === "PAID" ? activeCashRegisterId : undefined,
        payments:
          values.paymentStatus === "PAID" && values.paymentMethod
            ? [
                {
                  method: values.paymentMethod,
                  amount: quotation.total,
                },
              ]
            : undefined,
      });
      reset(getDefaultValues(quotation));
    } catch (error) {
      setError("root", {
        message: getErrorMessage(error, copy.actionError),
      });
    }
  });

  return (
    <CashRegisterRetailDrawer
      description={copy.convertDescription}
      footer={
        <div className={styles.footerActions}>
          <button
            className={retailStyles.buttonOutline}
            disabled={isSubmitting}
            type="button"
            onClick={handleClose}
          >
            {copy.cancelAction}
          </button>
          <button
            className={retailStyles.buttonDark}
            disabled={isSubmitting || !quotation}
            form={formId}
            type="submit"
          >
            {isSubmitting ? copy.convertSubmitLoading : copy.convertSubmit}
          </button>
        </div>
      }
      isOpen={isOpen}
      title={copy.convertTitle}
      onClose={handleClose}
    >
      {quotation ? (
        <form
          id={formId}
          className={styles.layout}
          noValidate
          onSubmit={submitConversion}
        >
          <section className={styles.section}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{copy.convertTotal}</span>
              <strong>{formatQuotationCurrency(quotation.total, languageCode)}</strong>
              <span className={styles.summaryHint}>
                {copy.detailValidity}:{" "}
                {formatQuotationDate(quotation.validUntil, languageCode)}
              </span>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.segmentedControl}>
              <button
                className={`${styles.segmentButton} ${
                  paymentStatus === "PAID" ? styles.segmentButtonActive : ""
                }`}
                type="button"
                onClick={() => setValue("paymentStatus", "PAID")}
              >
                {copy.convertPaid}
              </button>
              <button
                className={`${styles.segmentButton} ${
                  paymentStatus === "CREDIT" ? styles.segmentButtonDanger : ""
                }`}
                type="button"
                onClick={() => setValue("paymentStatus", "CREDIT")}
              >
                {copy.convertCredit}
              </button>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {copy.convertCustomer}
                {paymentStatus === "CREDIT" ? " *" : ""}
              </span>
              <select className={styles.select} {...register("customerId")}>
                <option value="">{copy.noCustomer}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {errors.customerId ? (
                <p className={styles.errorMessage}>{errors.customerId.message}</p>
              ) : null}
            </label>

            {paymentStatus === "PAID" ? (
              <div className={styles.paymentMethods}>
                <span className={styles.fieldLabel}>{copy.convertPaymentMethod}</span>
                <div className={styles.paymentGrid}>
                  {paymentMethodOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`${styles.paymentButton} ${
                        paymentMethod === option.value
                          ? styles.paymentButtonActive
                          : ""
                      }`}
                      type="button"
                      onClick={() => setValue("paymentMethod", option.value)}
                    >
                      {languageCode === "en" ? option.labelEn : option.labelEs}
                    </button>
                  ))}
                </div>
                {errors.paymentMethod ? (
                  <p className={styles.errorMessage}>{errors.paymentMethod.message}</p>
                ) : null}
                {activeCashRegisterId ? (
                  <p className={styles.helperText}>{copy.convertCashRegisterHint}</p>
                ) : null}
              </div>
            ) : (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{copy.convertDueDate}</span>
                <input className={styles.input} type="date" {...register("dueDate")} />
              </label>
            )}

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.convertNote}</span>
              <textarea className={styles.textarea} rows={4} {...register("notes")} />
            </label>

            {errors.root?.message ? (
              <p className={styles.errorBanner}>{errors.root.message}</p>
            ) : null}
          </section>
        </form>
      ) : (
        <p className={styles.helperText}>{copy.detailMissing}</p>
      )}
    </CashRegisterRetailDrawer>
  );
}
