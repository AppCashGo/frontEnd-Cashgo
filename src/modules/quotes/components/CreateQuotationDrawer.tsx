import { zodResolver } from "@hookform/resolvers/zod";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { CashRegisterRetailDrawer } from "@/modules/cash-register/components/CashRegisterRetailDrawer";
import { getQuotesCopy } from "@/modules/quotes/i18n/quotes-copy";
import {
  getQuotationFormSchema,
  type QuotationFormValues,
} from "@/modules/quotes/schemas/quotation-form-schema";
import type {
  CreateQuotationInput,
  QuotationDetail,
} from "@/modules/quotes/types/quotation";
import {
  calculateQuotationItemTotals,
  calculateQuotationTotals,
  formatQuotationCurrency,
  getProductSearchLabel,
  toDateInputValue,
} from "@/modules/quotes/utils/quotation-utils";
import type { CustomerSummary } from "@/modules/customers/types/customer";
import type { Product } from "@/modules/products/types/product";
import retailStyles from "@/shared/components/retail/RetailUI.module.css";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./CreateQuotationDrawer.module.css";

type CreateQuotationDrawerProps = {
  languageCode: AppLanguageCode;
  customers: CustomerSummary[];
  products: Product[];
  quotation: QuotationDetail | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: CreateQuotationInput) => Promise<void>;
};

function normalizeOptionalText(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : undefined;
}

function getDefaultValues(quotation: QuotationDetail | null): QuotationFormValues {
  if (!quotation) {
    return {
      customerId: "",
      validUntil: "",
      notes: "",
      terms: "",
      items: [],
    };
  }

  return {
    customerId: quotation.customer?.id ?? "",
    validUntil: toDateInputValue(quotation.validUntil),
    notes: quotation.notes ?? "",
    terms: quotation.terms ?? "",
    items: quotation.items.map((item) => ({
      productId: item.productId ?? "",
      name: item.name,
      description: item.description ?? "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxRate: item.taxRate,
    })),
  };
}

export function CreateQuotationDrawer({
  languageCode,
  customers,
  products,
  quotation,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: CreateQuotationDrawerProps) {
  const copy = getQuotesCopy(languageCode);
  const formId = quotation ? "edit-quotation-form" : "create-quotation-form";
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(getQuotationFormSchema(languageCode)),
    defaultValues: getDefaultValues(quotation),
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });
  const watchedItems = watch("items");
  const selectedProductIds = useMemo(
    () =>
      new Set(
        watchedItems
          ?.map((item) => item.productId?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    [watchedItems],
  );
  const totals = useMemo(
    () => calculateQuotationTotals(watchedItems ?? []),
    [watchedItems],
  );
  const filteredProducts = useMemo(() => {
    const normalizedProducts = products.filter((product) =>
      deferredSearchValue.length === 0
        ? true
        : getProductSearchLabel(product)
            .toLowerCase()
            .includes(deferredSearchValue),
    );

    return deferredSearchValue.length === 0
      ? normalizedProducts.slice(0, 8)
      : normalizedProducts;
  }, [deferredSearchValue, products]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset(getDefaultValues(quotation));
    setSearchValue("");
  }, [isOpen, quotation, reset]);

  function handleClose() {
    reset(getDefaultValues(quotation));
    setSearchValue("");
    onClose();
  }

  function handleAddProduct(product: Product) {
    if (selectedProductIds.has(product.id)) {
      return;
    }

    append({
      productId: product.id,
      name: product.name,
      description: product.description ?? "",
      quantity: 1,
      unitPrice: product.price,
      discount: 0,
      taxRate: product.taxRate,
    });
  }

  function handleAddManualItem() {
    append({
      productId: "",
      name: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 0,
    });
  }

  const submitQuotation = handleSubmit(async (values) => {
    try {
      await onSubmit({
        customerId: normalizeOptionalText(values.customerId) ?? null,
        validUntil: normalizeOptionalText(values.validUntil),
        notes: normalizeOptionalText(values.notes),
        terms: normalizeOptionalText(values.terms),
        items: values.items.map((item) => ({
          productId: normalizeOptionalText(item.productId) ?? null,
          name: normalizeOptionalText(item.name),
          description: normalizeOptionalText(item.description),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount) || 0,
          taxRate: Number(item.taxRate) || 0,
        })),
      });

      reset(getDefaultValues(null));
      setSearchValue("");
    } catch (error) {
      setError("root", {
        message: getErrorMessage(error, copy.actionError),
      });
    }
  });

  return (
    <CashRegisterRetailDrawer
      description={copy.drawerDescription}
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
            disabled={isSubmitting || watchedItems.length === 0}
            form={formId}
            type="submit"
          >
            {isSubmitting
              ? copy.updating
              : quotation
                ? copy.updateAction
                : copy.saveDraft}
          </button>
        </div>
      }
      isOpen={isOpen}
      title={quotation ? copy.editTitle : copy.createTitle}
      onClose={handleClose}
    >
      <form
        id={formId}
        className={styles.layout}
        noValidate
        onSubmit={submitQuotation}
      >
        <section className={styles.section}>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.customerLabel}</span>
              <select className={styles.select} {...register("customerId")}>
                <option value="">{copy.customerLabel}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{copy.validUntilLabel}</span>
              <input className={styles.input} type="date" {...register("validUntil")} />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.notesLabel}</span>
            <textarea className={styles.textarea} rows={3} {...register("notes")} />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.termsLabel}</span>
            <textarea className={styles.textarea} rows={3} {...register("terms")} />
          </label>
        </section>

        <section className={styles.section}>
          <div className={styles.productsHeader}>
            <h4 className={styles.sectionTitle}>{copy.selectedProducts}</h4>
            <button
              className={retailStyles.buttonOutline}
              type="button"
              onClick={handleAddManualItem}
            >
              {copy.addManualItem}
            </button>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.searchProducts}</span>
            <input
              className={styles.input}
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>

          {filteredProducts.length > 0 ? (
            <div className={styles.productGrid}>
              {filteredProducts.map((product) => {
                const isSelected = selectedProductIds.has(product.id);

                return (
                  <button
                    key={product.id}
                    className={`${styles.productCard} ${
                      isSelected ? styles.productCardSelected : ""
                    }`}
                    disabled={isSelected}
                    type="button"
                    onClick={() => handleAddProduct(product)}
                  >
                    <div className={styles.productCardHeader}>
                      <span className={styles.productName}>{product.name}</span>
                      <span className={styles.productStock}>
                        {product.stock} {languageCode === "en" ? "in stock" : "disponibles"}
                      </span>
                    </div>
                    <span className={styles.productPrice}>
                      {formatQuotationCurrency(product.price, languageCode)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyProducts}>
              <p className={styles.emptyTitle}>{copy.noProductsTitle}</p>
              <p className={styles.emptyDescription}>{copy.noProductsDescription}</p>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{copy.itemsTitle}</h4>

          {fields.length > 0 ? (
            <div className={styles.itemsList}>
              {fields.map((field, index) => {
                const currentItem = watchedItems[index];
                const itemTotals = calculateQuotationItemTotals({
                  quantity: Number(currentItem?.quantity) || 1,
                  unitPrice: Number(currentItem?.unitPrice) || 0,
                  discount: Number(currentItem?.discount) || 0,
                  taxRate: Number(currentItem?.taxRate) || 0,
                });

                return (
                  <article key={field.id} className={styles.itemCard}>
                    <div className={styles.itemHeader}>
                      <div>
                        <h5 className={styles.itemTitle}>
                          {currentItem?.name?.trim() || `${copy.itemName} ${index + 1}`}
                        </h5>
                        {currentItem?.productId ? (
                          <p className={styles.itemBadge}>
                            {languageCode === "en" ? "Catalog product" : "Producto del catálogo"}
                          </p>
                        ) : (
                          <p className={styles.itemBadge}>
                            {languageCode === "en" ? "Manual item" : "Ítem manual"}
                          </p>
                        )}
                      </div>

                      <button
                        className={styles.removeButton}
                        type="button"
                        onClick={() => remove(index)}
                      >
                        {languageCode === "en" ? "Remove" : "Eliminar"}
                      </button>
                    </div>

                    <div className={styles.itemGrid}>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>{copy.itemName}</span>
                        <input
                          className={styles.input}
                          type="text"
                          {...register(`items.${index}.name` as const)}
                        />
                        {errors.items?.[index]?.name ? (
                          <p className={styles.errorMessage}>
                            {errors.items[index]?.name?.message}
                          </p>
                        ) : null}
                      </label>

                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>{copy.itemDescription}</span>
                        <input
                          className={styles.input}
                          type="text"
                          {...register(`items.${index}.description` as const)}
                        />
                      </label>

                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>{copy.itemQuantity}</span>
                        <input
                          className={styles.input}
                          min="1"
                          step="1"
                          type="number"
                          {...register(`items.${index}.quantity` as const)}
                        />
                      </label>

                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>{copy.itemUnitPrice}</span>
                        <input
                          className={styles.input}
                          min="0"
                          step="0.01"
                          type="number"
                          {...register(`items.${index}.unitPrice` as const)}
                        />
                      </label>

                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>{copy.itemDiscount}</span>
                        <input
                          className={styles.input}
                          min="0"
                          step="0.01"
                          type="number"
                          {...register(`items.${index}.discount` as const)}
                        />
                      </label>

                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>{copy.itemTaxRate}</span>
                        <input
                          className={styles.input}
                          max="100"
                          min="0"
                          step="0.01"
                          type="number"
                          {...register(`items.${index}.taxRate` as const)}
                        />
                      </label>
                    </div>

                    <div className={styles.itemTotals}>
                      <span>
                        {copy.subtotal}:{" "}
                        <strong>
                          {formatQuotationCurrency(itemTotals.subtotal, languageCode)}
                        </strong>
                      </span>
                      <span>
                        {copy.taxesTotal}:{" "}
                        <strong>
                          {formatQuotationCurrency(itemTotals.taxAmount, languageCode)}
                        </strong>
                      </span>
                      <span>
                        {copy.itemTotal}:{" "}
                        <strong>
                          {formatQuotationCurrency(itemTotals.total, languageCode)}
                        </strong>
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyItems}>
              <p className={styles.emptyTitle}>
                {languageCode === "en"
                  ? "Add at least one quoted item."
                  : "Agrega al menos un producto o servicio."}
              </p>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{copy.subtotal}</span>
              <strong>{formatQuotationCurrency(totals.subtotal, languageCode)}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{copy.discountTotal}</span>
              <strong>
                {formatQuotationCurrency(totals.discountTotal, languageCode)}
              </strong>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{copy.taxesTotal}</span>
              <strong>{formatQuotationCurrency(totals.taxTotal, languageCode)}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{copy.grandTotal}</span>
              <strong>{formatQuotationCurrency(totals.total, languageCode)}</strong>
            </div>
          </div>

          {errors.root?.message ? (
            <p className={styles.errorBanner}>{errors.root.message}</p>
          ) : null}
        </section>
      </form>
    </CashRegisterRetailDrawer>
  );
}
