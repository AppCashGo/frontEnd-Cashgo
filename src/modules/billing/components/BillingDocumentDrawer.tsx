import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { CashRegisterRetailDrawer } from "@/modules/cash-register/components/CashRegisterRetailDrawer";
import { getBillingCollectionFormSchema } from "@/modules/billing/schemas/billing-collection-form-schema";
import type { BillingCollectionFormValues } from "@/modules/billing/schemas/billing-collection-form-schema";
import type {
  BillingCollectionInput,
  BillingDocumentDetail,
} from "@/modules/billing/types/billing";
import {
  getBillingCopy,
  getBillingInvoiceStatusLabel,
  getBillingInvoiceTypeLabel,
  getBillingPaymentMethodLabel,
  getBillingStatusLabel,
} from "@/modules/billing/i18n/billing-copy";
import {
  formatBillingCurrency,
  formatBillingDate,
  formatBillingDateTime,
} from "@/modules/billing/utils/format-billing";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import retailStyles from "@/shared/components/retail/RetailUI.module.css";
import styles from "./BillingDocumentDrawer.module.css";

type BillingDocumentDrawerProps = {
  languageCode: AppLanguageCode;
  document: BillingDocumentDetail | null;
  isOpen: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  activeCashRegisterId?: string;
  onClose: () => void;
  onCollectPayment: (input: BillingCollectionInput) => Promise<void>;
  onDownloadReceipt: () => Promise<void>;
  onPrintReceipt: () => Promise<void>;
};

function getDefaultValues(
  document: BillingDocumentDetail | null,
): BillingCollectionFormValues {
  return {
    amount: document?.balance && document.balance > 0 ? document.balance : 0,
    method: "CASH",
    reference: "",
    notes: "",
  };
}

function normalizeOptionalText(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : undefined;
}

function getPaymentStatusClassName(status: BillingDocumentDetail["paymentStatus"]) {
  if (status === "PAID") {
    return styles.statusPaid;
  }

  if (status === "PARTIAL") {
    return styles.statusPartial;
  }

  if (status === "PENDING") {
    return styles.statusPending;
  }

  if (status === "OVERDUE") {
    return styles.statusOverdue;
  }

  return styles.statusCancelled;
}

function getInvoiceStatusClassName(status: BillingDocumentDetail["invoiceStatus"]) {
  if (status === "APPROVED") {
    return styles.statusApproved;
  }

  if (status === "PENDING" || status === "SENT") {
    return styles.statusPending;
  }

  if (status === "REJECTED") {
    return styles.statusRejected;
  }

  if (status === "CANCELLED") {
    return styles.statusCancelled;
  }

  return styles.statusDraft;
}

export function BillingDocumentDrawer({
  languageCode,
  document,
  isOpen,
  isLoading,
  isSubmitting,
  activeCashRegisterId,
  onClose,
  onCollectPayment,
  onDownloadReceipt,
  onPrintReceipt,
}: BillingDocumentDrawerProps) {
  const copy = getBillingCopy(languageCode);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<BillingCollectionFormValues>({
    resolver: zodResolver(getBillingCollectionFormSchema(languageCode)),
    defaultValues: getDefaultValues(document),
  });

  useEffect(() => {
    reset(getDefaultValues(document));
  }, [document, reset]);

  const selectedMethod = watch("method");

  const submitCollection = handleSubmit(async (values) => {
    try {
      await onCollectPayment({
        amount: values.amount,
        method: values.method,
        cashRegisterId: activeCashRegisterId,
        reference: normalizeOptionalText(values.reference),
        notes: normalizeOptionalText(values.notes),
      });
      reset(getDefaultValues(document));
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error && error.message ? error.message : copy.paymentError,
      });
    }
  });

  return (
    <CashRegisterRetailDrawer
      description={copy.drawerDescription}
      isOpen={isOpen}
      title={document?.documentNumber ?? copy.drawerTitle}
      onClose={onClose}
    >
      <div className={styles.section}>
        {isLoading ? (
          <p className={styles.emptyText}>{copy.loadingDocument}</p>
        ) : !document ? (
          <p className={styles.emptyText}>{copy.missingDocument}</p>
        ) : (
          <>
            <div className={styles.actions}>
              <button
                className={retailStyles.buttonOutline}
                type="button"
                onClick={() => void onPrintReceipt()}
              >
                {copy.printReceipt}
              </button>
              <button
                className={retailStyles.buttonDark}
                type="button"
                onClick={() => void onDownloadReceipt()}
              >
                {copy.downloadReceipt}
              </button>
            </div>

            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>{copy.documentSummary}</h4>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.columns.invoiceType}</p>
                  <p className={styles.summaryValue}>
                    {getBillingInvoiceTypeLabel(document.type, languageCode)}
                  </p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.columns.invoiceStatus}</p>
                  <p className={styles.summaryValue}>
                    <span
                      className={`${styles.statusPill} ${getInvoiceStatusClassName(
                        document.invoiceStatus,
                      )}`}
                    >
                      {getBillingInvoiceStatusLabel(
                        document.invoiceStatus,
                        languageCode,
                      )}
                    </span>
                  </p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.statusLabel}</p>
                  <p className={styles.summaryValue}>
                    <span
                      className={`${styles.statusPill} ${getPaymentStatusClassName(
                        document.paymentStatus,
                      )}`}
                    >
                      {getBillingStatusLabel(document.paymentStatus, languageCode)}
                    </span>
                  </p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.totalLabel}</p>
                  <p className={styles.summaryValue}>
                    {formatBillingCurrency(document.total, languageCode)}
                  </p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.paidLabel}</p>
                  <p className={styles.summaryValue}>
                    {formatBillingCurrency(document.paidAmount, languageCode)}
                  </p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.balanceLabel}</p>
                  <p className={styles.summaryValue}>
                    {formatBillingCurrency(document.balance, languageCode)}
                  </p>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>{copy.configBusinessSection}</h4>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.customerLabel}</p>
                  <p className={styles.summaryValue}>
                    {document.customer?.name ?? copy.noCustomer}
                  </p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.createdBy}</p>
                  <p className={styles.summaryValue}>
                    {document.sellerName ?? copy.noSeller}
                  </p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.dateLabel}</p>
                  <p className={styles.summaryValue}>
                    {formatBillingDateTime(document.createdAt, languageCode)}
                  </p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.dueDate}</p>
                  <p className={styles.summaryValue}>
                    {document.dueDate
                      ? formatBillingDate(document.dueDate, languageCode)
                      : "—"}
                  </p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.configLegalName}</p>
                  <p className={styles.summaryValue}>
                    {document.business.legalName ?? document.business.businessName}
                  </p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.summaryTaxId}</p>
                  <p className={styles.summaryValue}>
                    {document.business.taxId ?? "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>{copy.configResolutionSection}</h4>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.summaryResolution}</p>
                  <p className={styles.summaryValue}>
                    {document.resolution?.resolution ?? copy.summaryMissingResolution}
                  </p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.summaryPrefix}</p>
                  <p className={styles.summaryValue}>
                    {document.resolution?.prefix ?? "—"}
                  </p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.summaryCurrentNumber}</p>
                  <p className={styles.summaryValue}>
                    {document.resolution?.currentNumber ?? "—"}
                  </p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>{copy.noDianStatus}</p>
                  <p className={styles.summaryValue}>
                    {document.dianStatus ?? copy.noDianStatus}
                  </p>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>{copy.detailItems}</h4>
              <div className={styles.tableCard}>
                <div className={styles.tableScroller}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{copy.productLabel}</th>
                        <th>{copy.quantityLabel}</th>
                        <th>{copy.unitPriceLabel}</th>
                        <th>{copy.lineTotalLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {document.items.length > 0 ? (
                        document.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.productName}</td>
                            <td>{item.quantity}</td>
                            <td>
                              {formatBillingCurrency(item.unitPrice, languageCode)}
                            </td>
                            <td>
                              {formatBillingCurrency(item.total, languageCode)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4}>{copy.manualSale}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>{copy.detailPayments}</h4>
              <div className={styles.tableCard}>
                <div className={styles.tableScroller}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{copy.paymentTypeLabel}</th>
                        <th>{copy.collectMethod}</th>
                        <th>{copy.collectAmount}</th>
                        <th>{copy.dateLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {document.payments.length > 0 ? (
                        document.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td>
                              {payment.source === "SALE"
                                ? copy.paymentSourceSale
                                : copy.paymentSourceCollection}
                            </td>
                            <td>
                              {getBillingPaymentMethodLabel(
                                payment.method,
                                languageCode,
                              )}
                            </td>
                            <td>
                              {formatBillingCurrency(payment.amount, languageCode)}
                            </td>
                            <td>
                              {formatBillingDateTime(payment.createdAt, languageCode)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4}>{copy.noPayments}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {document.note ? (
              <div className={styles.noteCard}>
                <h4 className={styles.sectionTitle}>{copy.receiptNote}</h4>
                <p className={styles.noteText}>{document.note}</p>
              </div>
            ) : null}

            {document.balance > 0 && document.paymentStatus !== "CANCELLED" ? (
              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>{copy.collectTitle}</h4>
                <p className={styles.sectionDescription}>
                  {copy.collectDescription}
                </p>

                <form className={styles.form} noValidate onSubmit={submitCollection}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{copy.collectAmount}</span>
                    <input
                      className={styles.input}
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      type="number"
                      {...register("amount")}
                    />
                    {errors.amount ? (
                      <p className={styles.errorMessage}>{errors.amount.message}</p>
                    ) : null}
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{copy.collectMethod}</span>
                    <select className={styles.select} {...register("method")}>
                      <option value="CASH">
                        {getBillingPaymentMethodLabel("CASH", languageCode)}
                      </option>
                      <option value="CARD">
                        {getBillingPaymentMethodLabel("CARD", languageCode)}
                      </option>
                      <option value="TRANSFER">
                        {getBillingPaymentMethodLabel("TRANSFER", languageCode)}
                      </option>
                      <option value="DIGITAL_WALLET">
                        {getBillingPaymentMethodLabel("DIGITAL_WALLET", languageCode)}
                      </option>
                      <option value="BANK_DEPOSIT">
                        {getBillingPaymentMethodLabel("BANK_DEPOSIT", languageCode)}
                      </option>
                      <option value="CREDIT">
                        {getBillingPaymentMethodLabel("CREDIT", languageCode)}
                      </option>
                      <option value="OTHER">
                        {getBillingPaymentMethodLabel("OTHER", languageCode)}
                      </option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{copy.collectReference}</span>
                    <input
                      className={styles.input}
                      type="text"
                      {...register("reference")}
                    />
                    {errors.reference ? (
                      <p className={styles.errorMessage}>
                        {errors.reference.message}
                      </p>
                    ) : null}
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{copy.collectNotes}</span>
                    <textarea className={styles.textarea} rows={3} {...register("notes")} />
                    {errors.notes ? (
                      <p className={styles.errorMessage}>{errors.notes.message}</p>
                    ) : null}
                  </label>

                  {selectedMethod === "CASH" && activeCashRegisterId ? (
                    <div className={styles.helperBanner}>
                      {copy.cashRegisterHelper}
                    </div>
                  ) : null}

                  {errors.root?.message ? (
                    <div className={styles.errorBanner}>{errors.root.message}</div>
                  ) : null}

                  <button
                    className={retailStyles.buttonDark}
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? copy.saving : copy.collectButton}
                  </button>
                </form>
              </section>
            ) : null}
          </>
        )}
      </div>
    </CashRegisterRetailDrawer>
  );
}
