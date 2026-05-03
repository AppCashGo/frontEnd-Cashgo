import { zodResolver } from "@hookform/resolvers/zod";
import { useDeferredValue, useState } from "react";
import { useForm } from "react-hook-form";
import { CashRegisterRetailDrawer } from "@/modules/cash-register/components/CashRegisterRetailDrawer";
import { useAvailableBillingSalesQuery } from "@/modules/billing/hooks/use-billing-query";
import {
  getBillingCopy,
  getBillingInvoiceTypeLabel,
} from "@/modules/billing/i18n/billing-copy";
import { getCreateBillingInvoiceFormSchema } from "@/modules/billing/schemas/create-billing-invoice-form-schema";
import type {
  BillingAvailableSale,
  CreateBillingInvoiceInput,
} from "@/modules/billing/types/billing";
import {
  formatBillingCurrency,
  formatBillingDateTime,
} from "@/modules/billing/utils/format-billing";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import retailStyles from "@/shared/components/retail/RetailUI.module.css";
import styles from "./BillingFormDrawer.module.css";

type CreateBillingInvoiceDrawerProps = {
  languageCode: AppLanguageCode;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: CreateBillingInvoiceInput) => Promise<void>;
};

type CreateBillingInvoiceFormValues = {
  saleId: string;
  type: "SIMPLE_RECEIPT" | "POS_DOCUMENT" | "ELECTRONIC_INVOICE";
  note: string;
};

const defaultValues: CreateBillingInvoiceFormValues = {
  saleId: "",
  type: "SIMPLE_RECEIPT",
  note: "",
};

function getSaleLabel(
  sale: BillingAvailableSale,
) {
  return sale.customerName
    ? `${sale.saleNumber} · ${sale.customerName}`
    : sale.saleNumber;
}

export function CreateBillingInvoiceDrawer({
  languageCode,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: CreateBillingInvoiceDrawerProps) {
  const copy = getBillingCopy(languageCode);
  const formId = "billing-create-invoice-form";
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue.trim());
  const availableSalesQuery = useAvailableBillingSalesQuery(
    deferredSearchValue,
    isOpen,
  );
  const availableSales = availableSalesQuery.data ?? [];
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateBillingInvoiceFormValues>({
    resolver: zodResolver(getCreateBillingInvoiceFormSchema(languageCode)),
    defaultValues,
  });

  const selectedSaleId = watch("saleId");
  const selectedSale =
    availableSales.find((sale) => sale.id === selectedSaleId) ?? null;

  async function submitInvoice(values: CreateBillingInvoiceFormValues) {
    try {
      await onSubmit({
        saleId: values.saleId,
        type: values.type,
        note: values.note.trim().length > 0 ? values.note.trim() : null,
      });
      reset(defaultValues);
      setSearchValue("");
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error && error.message
            ? error.message
            : copy.createInvoiceError,
      });
    }
  }

  function handleClose() {
    reset(defaultValues);
    setSearchValue("");
    onClose();
  }

  return (
    <CashRegisterRetailDrawer
      description={copy.createInvoiceDescription}
      footer={
        <div className={styles.footerActions}>
          <button
            className={retailStyles.buttonOutline}
            disabled={isSubmitting}
            type="button"
            onClick={handleClose}
          >
            {languageCode === "en" ? "Cancel" : "Cancelar"}
          </button>
          <button
            className={retailStyles.buttonDark}
            disabled={isSubmitting || !selectedSaleId}
            form={formId}
            type="submit"
          >
            {isSubmitting ? copy.saving : copy.createInvoiceSubmit}
          </button>
        </div>
      }
      isOpen={isOpen}
      title={copy.createInvoiceTitle}
      onClose={handleClose}
    >
      <form
        id={formId}
        className={styles.section}
        noValidate
        onSubmit={handleSubmit(submitInvoice)}
      >
        <section className={styles.section}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.createInvoiceSearch}</span>
            <input
              className={styles.input}
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.createInvoiceType}</span>
            <select className={styles.select} {...register("type")}>
              <option value="SIMPLE_RECEIPT">
                {getBillingInvoiceTypeLabel("SIMPLE_RECEIPT", languageCode)}
              </option>
              <option value="POS_DOCUMENT">
                {getBillingInvoiceTypeLabel("POS_DOCUMENT", languageCode)}
              </option>
              <option value="ELECTRONIC_INVOICE">
                {getBillingInvoiceTypeLabel("ELECTRONIC_INVOICE", languageCode)}
              </option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.createInvoiceNote}</span>
            <textarea className={styles.textarea} rows={4} {...register("note")} />
            {errors.note ? (
              <p className={styles.errorMessage}>{errors.note.message}</p>
            ) : null}
          </label>
        </section>

        {selectedSale ? (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>{copy.createInvoiceSelected}</h4>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>{copy.columns.document}</p>
                <p className={styles.summaryValue}>{selectedSale.saleNumber}</p>
              </div>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>{copy.availableSaleCustomer}</p>
                <p className={styles.summaryValue}>
                  {selectedSale.customerName ?? copy.noCustomer}
                </p>
              </div>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>{copy.columns.total}</p>
                <p className={styles.summaryValue}>
                  {formatBillingCurrency(selectedSale.total, languageCode)}
                </p>
              </div>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>{copy.availableSaleBalance}</p>
                <p className={styles.summaryValue}>
                  {formatBillingCurrency(selectedSale.balance, languageCode)}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{copy.tableTitle}</h4>

          {availableSalesQuery.isLoading ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>
                {languageCode === "en" ? "Loading sales..." : "Cargando ventas..."}
              </p>
            </div>
          ) : availableSales.length > 0 ? (
            <div className={styles.list}>
              {availableSales.map((sale) => {
                const isSelected = sale.id === selectedSaleId;

                return (
                  <button
                    key={sale.id}
                    className={`${styles.optionCard} ${
                      isSelected ? styles.optionCardSelected : ""
                    }`}
                    type="button"
                    onClick={() =>
                      setValue("saleId", sale.id, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    <div className={styles.optionHeader}>
                      <div>
                          <p className={styles.optionTitle}>
                          {getSaleLabel(sale)}
                          </p>
                        <p className={styles.optionSubtitle}>
                          {formatBillingCurrency(sale.total, languageCode)}
                        </p>
                      </div>
                      <input readOnly checked={isSelected} type="radio" />
                    </div>
                    <div className={styles.optionMeta}>
                      <span>
                        {copy.availableSaleDate}:{" "}
                        {formatBillingDateTime(sale.createdAt, languageCode)}
                      </span>
                      <span>
                        {copy.availableSaleBalance}:{" "}
                        {formatBillingCurrency(sale.balance, languageCode)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>{copy.createInvoiceEmptyTitle}</p>
              <p className={styles.emptyDescription}>
                {copy.createInvoiceEmptyDescription}
              </p>
            </div>
          )}

          {errors.saleId ? (
            <p className={styles.errorMessage}>{errors.saleId.message}</p>
          ) : null}
        </section>

        {errors.root?.message ? (
          <div className={styles.errorBanner}>{errors.root.message}</div>
        ) : null}
      </form>
    </CashRegisterRetailDrawer>
  );
}
