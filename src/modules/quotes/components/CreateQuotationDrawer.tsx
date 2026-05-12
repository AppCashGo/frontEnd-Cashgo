import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  Minus,
  PackagePlus,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { CashRegisterRetailDrawer } from "@/modules/cash-register/components/CashRegisterRetailDrawer";
import { useInventoryCategoriesQuery } from "@/modules/inventory/hooks/use-inventory-query";
import { getQuotesCopy } from "@/modules/quotes/i18n/quotes-copy";
import {
  getQuotationFormSchema,
  type QuotationFormValues,
} from "@/modules/quotes/schemas/quotation-form-schema";
import type {
  CreateQuotationInput,
  QuotationDetail,
  QuotationItemInput,
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
import { routePaths } from "@/routes/route-paths";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import {
  getTodayDateInput,
  toDateInputValue as toLocalDateInputValue,
} from "@/shared/utils/date-input";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./CreateQuotationDrawer.module.css";

export type QuotationCreationMode = "products" | "free";

type CreateQuotationDrawerProps = {
  languageCode: AppLanguageCode;
  customers: CustomerSummary[];
  products: Product[];
  quotation: QuotationDetail | null;
  isOpen: boolean;
  isSubmitting: boolean;
  initialMode?: QuotationCreationMode;
  onClose: () => void;
  onSubmit: (input: CreateQuotationInput) => Promise<QuotationDetail>;
};

type QuotationStep = "catalog" | "details" | "success";
type ExpirationOption = "week" | "fifteenDays" | "month" | "never";

const allCategoriesId = "ALL";
const noCategoryId = "NONE";
const receiptWindowFeatures = "width=840,height=960,noopener,noreferrer";

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function normalizeOptionalText(value: string | undefined | null) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : undefined;
}

function createLocalDateFromInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function addDaysToDateInput(value: string, days: number) {
  const date = createLocalDateFromInput(value);

  date.setDate(date.getDate() + days);

  return toLocalDateInputValue(date);
}

function getExpirationDate(option: ExpirationOption, baseDate: string) {
  if (option === "never") {
    return "";
  }

  if (option === "month") {
    return addDaysToDateInput(baseDate, 30);
  }

  if (option === "fifteenDays") {
    return addDaysToDateInput(baseDate, 15);
  }

  return addDaysToDateInput(baseDate, 7);
}

function getDefaultValues(
  quotation: QuotationDetail | null,
  mode: QuotationCreationMode,
  freeItemName: string,
): QuotationFormValues {
  if (!quotation) {
    return {
      customerId: "",
      validUntil: getExpirationDate("week", getTodayDateInput()),
      notes: "",
      terms: "",
      items:
        mode === "free"
          ? [
              {
                productId: "",
                name: freeItemName,
                description: "",
                quantity: 1,
                unitPrice: 0,
                discount: 0,
                taxRate: 0,
              },
            ]
          : [],
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

function distributeDiscount(
  items: QuotationItemInput[],
  discountAmount: number,
) {
  const normalizedDiscount = Math.max(0, Number(discountAmount) || 0);

  if (normalizedDiscount <= 0) {
    return items;
  }

  const subtotal = items.reduce((accumulator, item) => {
    const quantity = Math.max(1, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);

    return accumulator + quantity * unitPrice;
  }, 0);

  if (subtotal <= 0) {
    return items;
  }

  let appliedDiscount = 0;

  return items.map((item, index) => {
    const lineSubtotal =
      Math.max(1, Number(item.quantity) || 0) *
      Math.max(0, Number(item.unitPrice) || 0);
    const discount =
      index === items.length - 1
        ? roundMoney(normalizedDiscount - appliedDiscount)
        : roundMoney((lineSubtotal / subtotal) * normalizedDiscount);

    appliedDiscount = roundMoney(appliedDiscount + discount);

    return {
      ...item,
      discount: roundMoney((Number(item.discount) || 0) + discount),
    };
  });
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openPrintableDocument(html: string) {
  const printWindow = window.open("", "_blank", receiptWindowFeatures);

  if (!printWindow) {
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function downloadHtmlFile(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(blob);
  const linkElement = document.createElement("a");

  linkElement.href = downloadUrl;
  linkElement.download = filename;
  linkElement.click();
  URL.revokeObjectURL(downloadUrl);
}

function createQuotationReceiptHtml({
  title,
  businessName,
  customerName,
  validUntil,
  items,
  subtotal,
  discountTotal,
  taxTotal,
  total,
  languageCode,
}: {
  title: string;
  businessName: string;
  customerName: string;
  validUntil: string;
  items: QuotationItemInput[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  languageCode: AppLanguageCode;
}) {
  const dateFormatter = new Intl.DateTimeFormat(
    languageCode === "en" ? "en-US" : "es-CO",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
  const itemRows = items
    .map((item) => {
      const quantity = Math.max(1, Number(item.quantity) || 0);
      const unitPrice = Number(item.unitPrice) || 0;
      const lineTotal = calculateQuotationItemTotals({
        quantity,
        unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
      }).total;

      return `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${quantity}</td>
          <td>${formatQuotationCurrency(unitPrice, languageCode)}</td>
          <td>${formatQuotationCurrency(lineTotal, languageCode)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="${languageCode}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { margin: 0; background: #f4f7fb; color: #1f2937; font-family: Arial, sans-serif; }
          main { width: min(720px, calc(100% - 32px)); margin: 32px auto; padding: 32px; background: #fff; border-radius: 16px; box-shadow: 0 18px 50px rgba(15, 23, 42, .12); }
          h1 { margin: 0 0 8px; font-size: 26px; }
          .muted { color: #64748b; }
          .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 28px 0; }
          .box { padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 12px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
          th { color: #64748b; font-size: 13px; }
          .totals { margin-left: auto; width: min(320px, 100%); }
          .totalLine { display: flex; justify-content: space-between; padding: 8px 0; }
          .grandTotal { margin-top: 10px; padding-top: 12px; border-top: 2px solid #1f2937; font-size: 22px; font-weight: 800; }
        </style>
      </head>
      <body>
        <main>
          <h1>${escapeHtml(title)}</h1>
          <p class="muted">${escapeHtml(businessName)}</p>
          <div class="meta">
            <div class="box"><strong>Cliente</strong><br />${escapeHtml(customerName)}</div>
            <div class="box"><strong>Fecha</strong><br />${escapeHtml(dateFormatter.format(new Date()))}</div>
            <div class="box"><strong>Validez</strong><br />${escapeHtml(validUntil || "No expira")}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <section class="totals">
            <div class="totalLine"><span>Subtotal</span><strong>${formatQuotationCurrency(subtotal, languageCode)}</strong></div>
            <div class="totalLine"><span>Descuento</span><strong>${formatQuotationCurrency(discountTotal, languageCode)}</strong></div>
            <div class="totalLine"><span>Impuestos</span><strong>${formatQuotationCurrency(taxTotal, languageCode)}</strong></div>
            <div class="totalLine grandTotal"><span>Total</span><strong>${formatQuotationCurrency(total, languageCode)}</strong></div>
          </section>
        </main>
      </body>
    </html>
  `;
}

function getProductCategoryId(product: Product) {
  return product.categoryId ?? noCategoryId;
}

export function CreateQuotationDrawer({
  languageCode,
  customers,
  products,
  quotation,
  isOpen,
  isSubmitting,
  initialMode = "products",
  onClose,
  onSubmit,
}: CreateQuotationDrawerProps) {
  const copy = getQuotesCopy(languageCode);
  const navigate = useNavigate();
  const categoriesQuery = useInventoryCategoriesQuery();
  const formId = quotation ? "edit-quotation-form" : "create-quotation-form";
  const isEditing = quotation !== null;
  const [mode, setMode] = useState<QuotationCreationMode>(initialMode);
  const [step, setStep] = useState<QuotationStep>(
    initialMode === "free" ? "details" : "catalog",
  );
  const [searchValue, setSearchValue] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(allCategoriesId);
  const [selectedExpiration, setSelectedExpiration] =
    useState<ExpirationOption>("week");
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [createdQuotation, setCreatedQuotation] =
    useState<QuotationDetail | null>(null);
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(getQuotationFormSchema(languageCode)),
    defaultValues: getDefaultValues(quotation, initialMode, copy.freeItemName),
  });
  const { fields, append, remove, update, replace } = useFieldArray({
    control,
    name: "items",
  });
  const watchedItemsValue = watch("items");
  const watchedItems = useMemo(
    () => watchedItemsValue ?? [],
    [watchedItemsValue],
  );
  const watchedCustomerId = watch("customerId");
  const watchedValidUntil = watch("validUntil");
  const selectedCustomer = customers.find(
    (customer) => customer.id === watchedCustomerId,
  );
  const baseTotals = useMemo(
    () => calculateQuotationTotals(watchedItems),
    [watchedItems],
  );
  const displayTotals = useMemo(
    () => ({
      subtotal: baseTotals.subtotal,
      discountTotal: roundMoney(baseTotals.discountTotal + discountAmount),
      taxTotal: baseTotals.taxTotal,
      total: roundMoney(Math.max(0, baseTotals.total - discountAmount)),
    }),
    [baseTotals, discountAmount],
  );
  const selectedLineCount = watchedItems.length;
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  );
  const categoryChips = useMemo(
    () => [
      { id: allCategoriesId, name: copy.allProductsChip },
      { id: noCategoryId, name: copy.noCategoryChip },
      ...categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    ],
    [categories, copy.allProductsChip, copy.noCategoryChip],
  );
  const filteredProducts = useMemo(() => {
    const byCategory =
      activeCategoryId === allCategoriesId
        ? products
        : products.filter(
            (product) => getProductCategoryId(product) === activeCategoryId,
          );

    const bySearch =
      deferredSearchValue.length === 0
        ? byCategory
        : byCategory.filter((product) =>
            getProductSearchLabel(product)
              .toLowerCase()
              .includes(deferredSearchValue),
          );

    return bySearch.filter((product) => product.isActive);
  }, [activeCategoryId, deferredSearchValue, products]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextMode = quotation ? "products" : initialMode;

    setMode(nextMode);
    setStep(nextMode === "free" ? "details" : "catalog");
    setSearchValue("");
    setActiveCategoryId(allCategoriesId);
    setSelectedExpiration("week");
    setShowDiscount(false);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setCreatedQuotation(null);
    reset(getDefaultValues(quotation, nextMode, copy.freeItemName));
  }, [copy.freeItemName, initialMode, isOpen, quotation, reset]);

  function handleClose() {
    reset(getDefaultValues(quotation, mode, copy.freeItemName));
    setSearchValue("");
    setCreatedQuotation(null);
    onClose();
  }

  function handleAddProduct(product: Product) {
    const existingItemIndex = watchedItems.findIndex(
      (item) => item.productId === product.id,
    );

    if (existingItemIndex >= 0) {
      const existingItem = watchedItems[existingItemIndex];

      update(existingItemIndex, {
        ...existingItem,
        quantity: Math.max(1, Number(existingItem.quantity) || 0) + 1,
      });
      clearErrors("items");
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
    clearErrors("items");
  }

  function handleChangeItemQuantity(index: number, nextQuantity: number) {
    const currentItem = watchedItems[index];

    if (!currentItem) {
      return;
    }

    update(index, {
      ...currentItem,
      quantity: Math.max(1, nextQuantity),
    });
  }

  function handleClearBasket() {
    replace([]);
    setDiscountPercent(0);
    setDiscountAmount(0);
  }

  function handleGoToDetails() {
    if (watchedItems.length === 0) {
      setError("items", {
        message: copy.noProductsDescription,
      });
      return;
    }

    clearErrors("items");
    setStep("details");
  }

  function handleBackToCart() {
    setStep("catalog");
  }

  function handleExpirationChange(nextOption: ExpirationOption) {
    const today = getTodayDateInput();

    setSelectedExpiration(nextOption);
    setValue("validUntil", getExpirationDate(nextOption, today), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleDiscountPercentChange(value: string) {
    const nextPercent = Math.max(0, Number(value) || 0);
    const nextAmount = roundMoney((baseTotals.total * nextPercent) / 100);

    setDiscountPercent(nextPercent);
    setDiscountAmount(Math.min(nextAmount, baseTotals.total));
  }

  function handleDiscountAmountChange(value: string) {
    const nextAmount = Math.min(Math.max(0, Number(value) || 0), baseTotals.total);
    const nextPercent =
      baseTotals.total > 0 ? roundMoney((nextAmount / baseTotals.total) * 100) : 0;

    setDiscountAmount(nextAmount);
    setDiscountPercent(nextPercent);
  }

  function buildDraftReceiptHtml() {
    const values = getValues();

    return createQuotationReceiptHtml({
      title: quotation?.fullNumber ?? copy.createTitle,
      businessName: quotation?.business.businessName ?? "Cashgo",
      customerName: selectedCustomer?.name ?? copy.noCustomer,
      validUntil: values.validUntil || copy.expirationNever,
      items: values.items,
      subtotal: displayTotals.subtotal,
      discountTotal: displayTotals.discountTotal,
      taxTotal: displayTotals.taxTotal,
      total: displayTotals.total,
      languageCode,
    });
  }

  function handlePrintDraftQuotation() {
    openPrintableDocument(buildDraftReceiptHtml());
  }

  function buildCreatedReceiptHtml(quotationDetail: QuotationDetail) {
    return createQuotationReceiptHtml({
      title: quotationDetail.fullNumber,
      businessName: quotationDetail.business.businessName,
      customerName: quotationDetail.customer?.name ?? copy.noCustomer,
      validUntil: quotationDetail.validUntil ?? copy.expirationNever,
      items: quotationDetail.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        description: item.description ?? undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
      })),
      subtotal: quotationDetail.subtotal,
      discountTotal: quotationDetail.discountTotal,
      taxTotal: quotationDetail.taxTotal,
      total: quotationDetail.total,
      languageCode,
    });
  }

  function handlePrintCreatedReceipt() {
    if (!createdQuotation) {
      return;
    }

    openPrintableDocument(buildCreatedReceiptHtml(createdQuotation));
  }

  function handleDownloadCreatedReceipt() {
    if (!createdQuotation) {
      return;
    }

    downloadHtmlFile(
      buildCreatedReceiptHtml(createdQuotation),
      `${createdQuotation.fullNumber.toLowerCase()}.html`,
    );
  }

  async function handleShareCreatedReceipt() {
    if (!createdQuotation) {
      return;
    }

    const text = `${createdQuotation.fullNumber} - ${formatQuotationCurrency(
      createdQuotation.total,
      languageCode,
    )}`;

    if (navigator.share) {
      await navigator.share({
        title: createdQuotation.fullNumber,
        text,
      });
      return;
    }

    await navigator.clipboard?.writeText(text);
  }

  const submitQuotation = handleSubmit(async (values) => {
    try {
      if (!normalizeOptionalText(values.customerId)) {
        setError("customerId", {
          message: copy.customerRequired,
        });
        return;
      }

      const items = distributeDiscount(
        values.items.map((item) => ({
          productId: normalizeOptionalText(item.productId) ?? null,
          name: normalizeOptionalText(item.name),
          description: normalizeOptionalText(item.description),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount) || 0,
          taxRate: Number(item.taxRate) || 0,
        })),
        discountAmount,
      );
      const savedQuotation = await onSubmit({
        customerId: normalizeOptionalText(values.customerId) ?? null,
        validUntil: normalizeOptionalText(values.validUntil),
        notes: normalizeOptionalText(values.notes),
        terms: normalizeOptionalText(values.terms),
        items,
      });

      if (isEditing) {
        return;
      }

      setCreatedQuotation(savedQuotation);
      setStep("success");
      reset(getDefaultValues(null, mode, copy.freeItemName));
      setDiscountPercent(0);
      setDiscountAmount(0);
    } catch (error) {
      setError("root", {
        message: getErrorMessage(error, copy.actionError),
      });
    }
  });

  function renderProductCard(product: Product) {
    const selectedItem = watchedItems.find((item) => item.productId === product.id);
    const selectedQuantity = selectedItem ? Number(selectedItem.quantity) || 1 : 0;

    return (
      <button
        key={product.id}
        className={joinClassNames(
          styles.productCard,
          selectedQuantity > 0 && styles.productCardSelected,
        )}
        type="button"
        onClick={() => handleAddProduct(product)}
      >
        {selectedQuantity > 0 ? (
          <span className={styles.productQuantityBadge}>
            {selectedQuantity}
          </span>
        ) : null}
        <span className={styles.productImage} aria-hidden="true">
          t.
        </span>
        <strong>{formatQuotationCurrency(product.price, languageCode)}</strong>
        <span>{product.name}</span>
        <small>
          {product.stock} {copy.stockAvailable}
        </small>
      </button>
    );
  }

  function renderCartItem(index: number, variant: "compact" | "editable") {
    const item = watchedItems[index];

    if (!item) {
      return null;
    }

    const itemTotals = calculateQuotationItemTotals({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxRate: item.taxRate,
    });

    return (
      <article
        key={fields[index]?.id ?? `${item.name}-${index}`}
        className={styles.cartItem}
      >
        <input
          type="hidden"
          {...register(`items.${index}.productId` as const)}
        />
        <input
          type="hidden"
          {...register(`items.${index}.description` as const)}
        />
        <input
          type="hidden"
          {...register(`items.${index}.taxRate` as const, {
            valueAsNumber: true,
          })}
        />
        {variant !== "editable" || mode !== "free" ? (
          <input type="hidden" {...register(`items.${index}.name` as const)} />
        ) : null}

        <div className={styles.cartItemHeader}>
          <div>
            {variant === "editable" && mode === "free" ? (
              <input
                className={styles.inlineInput}
                aria-label={copy.itemName}
                {...register(`items.${index}.name` as const)}
              />
            ) : (
              <strong>{item.name || copy.freeItemName}</strong>
            )}
            <small>
              {formatQuotationCurrency(Number(item.unitPrice) || 0, languageCode)}
            </small>
          </div>
          <button
            className={styles.deleteButton}
            title={copy.removeItem}
            type="button"
            onClick={() => remove(index)}
          >
            <Trash2 size={18} strokeWidth={2.4} />
          </button>
        </div>

        <div className={styles.cartControls}>
          <button
            className={styles.quantityButton}
            type="button"
            onClick={() =>
              handleChangeItemQuantity(index, Number(item.quantity) - 1)
            }
          >
            <Minus size={16} strokeWidth={2.4} />
          </button>
          <input
            className={styles.quantityInput}
            min={1}
            type="number"
            {...register(`items.${index}.quantity` as const, {
              valueAsNumber: true,
            })}
          />
          <button
            className={styles.quantityButton}
            type="button"
            onClick={() =>
              handleChangeItemQuantity(index, Number(item.quantity) + 1)
            }
          >
            <Plus size={16} strokeWidth={2.4} />
          </button>
          <input
            className={styles.priceInput}
            min={0}
            step="0.01"
            type="number"
            {...register(`items.${index}.unitPrice` as const, {
              valueAsNumber: true,
            })}
          />
        </div>

        <p className={styles.unitSummary}>
          {copy.unitPriceSummary}:{" "}
          {formatQuotationCurrency(itemTotals.unitPrice, languageCode)}
        </p>
      </article>
    );
  }

  if (step === "success" && createdQuotation) {
    return (
      <CashRegisterRetailDrawer
        bodyClassName={styles.successBody}
        isOpen={isOpen}
        title={copy.createTitle}
        onClose={handleClose}
      >
        <section className={styles.successPanel}>
          <CheckCircle2
            aria-hidden="true"
            className={styles.successIcon}
            size={62}
            strokeWidth={2.4}
          />
          <h3>{copy.successTitle}</h3>
          <p>{copy.successDescription}</p>

          <div className={styles.receiptCard}>
            <strong>{copy.receiptTitle}</strong>
            <span>{copy.receiptDescription}</span>
            <button type="button" onClick={handlePrintCreatedReceipt}>
              <Printer size={18} strokeWidth={2.4} />
              {copy.printReceipt}
            </button>
            <button type="button" onClick={handleDownloadCreatedReceipt}>
              {copy.downloadReceipt}
            </button>
            <button type="button" onClick={() => void handleShareCreatedReceipt()}>
              {copy.shareReceipt}
            </button>
          </div>
        </section>
      </CashRegisterRetailDrawer>
    );
  }

  return (
    <CashRegisterRetailDrawer
      bodyClassName={styles.workspaceBody}
      isOpen={isOpen}
      panelClassName={styles.workspacePanel}
      title={quotation ? copy.editTitle : copy.createTitle}
      onClose={handleClose}
    >
      <form
        id={formId}
        className={styles.workspace}
        noValidate
        onSubmit={submitQuotation}
      >
        <section className={styles.catalogArea}>
          {mode === "products" ? (
            <>
              <div className={styles.catalogToolbar}>
                <button className={styles.iconButton} type="button">
                  <PackagePlus size={18} strokeWidth={2.4} />
                </button>
                <label className={styles.searchField}>
                  <Search size={18} strokeWidth={2.4} />
                  <input
                    placeholder={copy.searchProducts}
                    type="search"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                  />
                </label>
              </div>

              <div className={styles.categoryStrip} aria-label="Categorías">
                {categoryChips.map((category) => (
                  <button
                    key={category.id}
                    className={joinClassNames(
                      styles.categoryChip,
                      activeCategoryId === category.id &&
                        styles.categoryChipActive,
                    )}
                    type="button"
                    onClick={() => setActiveCategoryId(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className={styles.productGrid}>
                <button
                  className={styles.createProductCard}
                  type="button"
                  onClick={() => navigate(routePaths.products)}
                >
                  <Plus size={22} strokeWidth={2.6} />
                  <span>{copy.createProductCard}</span>
                </button>

                {filteredProducts.map(renderProductCard)}
              </div>

              {filteredProducts.length === 0 ? (
                <div className={styles.emptyProducts}>
                  <strong>{copy.noProductsTitle}</strong>
                  <span>{copy.noProductsDescription}</span>
                </div>
              ) : null}
            </>
          ) : (
            <div className={styles.freeModePanel}>
              <h3>{copy.createFreeTitle}</h3>
              <p>{copy.createFreeDescription}</p>
              {fields.map((_, index) => renderCartItem(index, "editable"))}
            </div>
          )}
        </section>

        <aside className={styles.sidePanel}>
          {step === "catalog" ? (
            <>
              <div className={styles.sideHeader}>
                <h3>{copy.cartTitle}</h3>
                {watchedItems.length > 0 ? (
                  <button type="button" onClick={handleClearBasket}>
                    {copy.clearBasket}
                  </button>
                ) : null}
              </div>
              <div className={styles.sideContent}>
                {watchedItems.length === 0 ? (
                  <div className={styles.emptyCart}>
                    <PackagePlus size={58} strokeWidth={1.8} />
                    <strong>{copy.emptyCartTitle}</strong>
                    <p>{copy.emptyCartDescription}</p>
                  </div>
                ) : (
                  watchedItems.map((_, index) => renderCartItem(index, "compact"))
                )}
                {errors.items?.message ? (
                  <p className={styles.errorMessage}>{errors.items.message}</p>
                ) : null}
              </div>
              <div className={styles.sideFooter}>
                <button
                  className={styles.primaryFooterButton}
                  disabled={watchedItems.length === 0}
                  type="button"
                  onClick={handleGoToDetails}
                >
                  <span>{selectedLineCount}</span>
                  {copy.continueAction}
                  <strong>
                    {formatQuotationCurrency(displayTotals.total, languageCode)}
                  </strong>
                  <ChevronRight size={18} strokeWidth={2.4} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.sideHeader}>
                {mode === "products" ? (
                  <button
                    className={styles.backButton}
                    type="button"
                    onClick={handleBackToCart}
                  >
                    <ArrowLeft size={18} strokeWidth={2.6} />
                    {copy.backToCart}
                  </button>
                ) : (
                  <h3>{copy.createTitle}</h3>
                )}
              </div>
              <div className={styles.sideContent}>
                <label className={styles.field}>
                  <span>
                    {copy.quotationDateLabel}
                    <CalendarDays size={16} strokeWidth={2.4} />
                  </span>
                  <input
                    readOnly
                    className={styles.input}
                    type="date"
                    value={getTodayDateInput()}
                  />
                </label>

                <input type="hidden" {...register("validUntil")} />
                <div className={styles.field}>
                  <span>{copy.expirationLabel}</span>
                  <div className={styles.expirationGrid}>
                    {(
                      [
                        ["week", copy.expirationWeek],
                        ["fifteenDays", copy.expirationFifteenDays],
                        ["month", copy.expirationMonth],
                        ["never", copy.expirationNever],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        className={joinClassNames(
                          styles.expirationButton,
                          selectedExpiration === value &&
                            styles.expirationButtonActive,
                        )}
                        type="button"
                        onClick={() => handleExpirationChange(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {watchedValidUntil ? (
                    <small>{toLocalDateInputValue(watchedValidUntil)}</small>
                  ) : null}
                </div>

                <label className={styles.field}>
                  <span>{copy.customerLabel} *</span>
                  <select
                    className={styles.input}
                    {...register("customerId", {
                      onChange: () => clearErrors("customerId"),
                    })}
                  >
                    <option value="">{copy.customerPlaceholder}</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  {errors.customerId?.message ? (
                    <small className={styles.errorMessage}>
                      {errors.customerId.message}
                    </small>
                  ) : null}
                </label>

                {showDiscount ? (
                  <div className={styles.discountBox}>
                    <button
                      className={styles.closeDiscountButton}
                      type="button"
                      onClick={() => {
                        setShowDiscount(false);
                        setDiscountPercent(0);
                        setDiscountAmount(0);
                      }}
                    >
                      <X size={16} strokeWidth={2.6} />
                    </button>
                    <label>
                      <span>{copy.discountTotal}</span>
                      <input
                        min={0}
                        type="number"
                        value={discountPercent}
                        onChange={(event) =>
                          handleDiscountPercentChange(event.target.value)
                        }
                      />
                    </label>
                    <span>=</span>
                    <label>
                      <span>{copy.itemTotal}</span>
                      <input
                        min={0}
                        type="number"
                        value={discountAmount}
                        onChange={(event) =>
                          handleDiscountAmountChange(event.target.value)
                        }
                      />
                    </label>
                  </div>
                ) : (
                  <button
                    className={styles.discountLink}
                    type="button"
                    onClick={() => setShowDiscount(true)}
                  >
                    {copy.discountLink}
                  </button>
                )}

                {mode === "free"
                  ? fields.map((_, index) => renderCartItem(index, "editable"))
                  : null}

                <label className={styles.field}>
                  <span>{copy.conceptLabel}</span>
                  <textarea
                    className={styles.textarea}
                    placeholder={copy.conceptPlaceholder}
                    rows={3}
                    {...register("notes")}
                  />
                </label>

                <div className={styles.summaryCard}>
                  <span>{copy.subtotal}</span>
                  <strong>
                    {formatQuotationCurrency(displayTotals.subtotal, languageCode)}
                  </strong>
                  <span>{copy.discountTotal}</span>
                  <strong>
                    {formatQuotationCurrency(
                      displayTotals.discountTotal,
                      languageCode,
                    )}
                  </strong>
                  <span>{copy.taxesTotal}</span>
                  <strong>
                    {formatQuotationCurrency(displayTotals.taxTotal, languageCode)}
                  </strong>
                </div>

                {errors.root?.message ? (
                  <p className={styles.errorBanner}>{errors.root.message}</p>
                ) : null}
              </div>
              <div className={styles.sideFooter}>
                <button
                  className={styles.printButton}
                  type="button"
                  onClick={handlePrintDraftQuotation}
                >
                  <Printer size={18} strokeWidth={2.4} />
                </button>
                <button
                  className={styles.primaryFooterButton}
                  disabled={isSubmitting || watchedItems.length === 0}
                  form={formId}
                  type="submit"
                >
                  <span>{selectedLineCount}</span>
                  {isSubmitting
                    ? copy.updating
                    : quotation
                      ? copy.updateAction
                      : copy.createQuotationAction}
                  <strong>
                    {formatQuotationCurrency(displayTotals.total, languageCode)}
                  </strong>
                  <ChevronRight size={18} strokeWidth={2.4} />
                </button>
              </div>
            </>
          )}
        </aside>
      </form>
    </CashRegisterRetailDrawer>
  );
}
