import type { Product } from "@/modules/products/types/product";
import type {
  QuotationDetail,
  QuotationItemInput,
  QuotationSummary,
} from "@/modules/quotes/types/quotation";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";

type QuotationCalculationInput = {
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
};

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function calculateQuotationItemTotals({
  quantity,
  unitPrice,
  discount = 0,
  taxRate = 0,
}: QuotationCalculationInput) {
  const normalizedQuantity = Math.max(1, Number(quantity) || 0);
  const normalizedUnitPrice = Math.max(0, Number(unitPrice) || 0);
  const normalizedDiscount = Math.max(0, Number(discount) || 0);
  const normalizedTaxRate = Math.max(0, Number(taxRate) || 0);
  const grossLineTotal = roundMoney(
    Math.max(0, normalizedUnitPrice * normalizedQuantity - normalizedDiscount),
  );
  const divisor = 1 + normalizedTaxRate / 100;
  const subtotal =
    normalizedTaxRate > 0
      ? roundMoney(grossLineTotal / divisor)
      : grossLineTotal;
  const taxAmount = roundMoney(grossLineTotal - subtotal);

  return {
    quantity: normalizedQuantity,
    unitPrice: normalizedUnitPrice,
    discount: normalizedDiscount,
    taxRate: normalizedTaxRate,
    subtotal,
    taxAmount,
    total: grossLineTotal,
  };
}

export function calculateQuotationTotals(items: QuotationItemInput[]) {
  return items.reduce(
    (accumulator, item) => {
      const totals = calculateQuotationItemTotals({
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? 0,
        discount: item.discount,
        taxRate: item.taxRate,
      });

      return {
        subtotal: roundMoney(accumulator.subtotal + totals.subtotal),
        discountTotal: roundMoney(accumulator.discountTotal + totals.discount),
        taxTotal: roundMoney(accumulator.taxTotal + totals.taxAmount),
        total: roundMoney(accumulator.total + totals.total),
      };
    },
    {
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      total: 0,
    },
  );
}

export function formatQuotationCurrency(
  value: number,
  languageCode: AppLanguageCode,
) {
  return new Intl.NumberFormat(languageCode === "en" ? "en-US" : "es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatQuotationDate(
  value: string | Date | null,
  languageCode: AppLanguageCode,
) {
  if (!value) {
    return languageCode === "en" ? "No expiration" : "Sin vencimiento";
  }

  return new Intl.DateTimeFormat(languageCode === "en" ? "en-US" : "es-CO", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatQuotationDateTime(
  value: string | Date,
  languageCode: AppLanguageCode,
) {
  return new Intl.DateTimeFormat(languageCode === "en" ? "en-US" : "es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function toDateInputValue(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function getQuotationConceptLabel(
  quotation: Pick<QuotationSummary, "itemCount" | "concept"> & {
    items?: Array<Pick<QuotationDetail["items"][number], "name">>;
  },
  languageCode: AppLanguageCode,
) {
  if (quotation.concept) {
    return quotation.concept;
  }

  const firstItemName = quotation.items?.[0]?.name;

  if (!firstItemName) {
    return languageCode === "en" ? "No concept" : "Sin concepto";
  }

  if (quotation.itemCount <= 1) {
    return firstItemName;
  }

  return languageCode === "en"
    ? `${firstItemName} +${quotation.itemCount - 1} more`
    : `${firstItemName} +${quotation.itemCount - 1} más`;
}

export function buildQuotationWhatsappMessage(
  quotation: QuotationDetail,
  languageCode: AppLanguageCode,
  publicUrl?: string | null,
) {
  const lines = [
    languageCode === "en"
      ? `Hi, here is quote ${quotation.fullNumber}.`
      : `Hola, te comparto la cotización ${quotation.fullNumber}.`,
    languageCode === "en"
      ? `Total: ${formatQuotationCurrency(quotation.total, languageCode)}`
      : `Total: ${formatQuotationCurrency(quotation.total, languageCode)}`,
    languageCode === "en"
      ? `Valid until: ${formatQuotationDate(quotation.validUntil, languageCode)}`
      : `Validez: ${formatQuotationDate(quotation.validUntil, languageCode)}`,
  ];

  if (publicUrl) {
    lines.push(
      languageCode === "en"
        ? `Review it here: ${publicUrl}`
        : `Revísala aquí: ${publicUrl}`,
    );
  }

  return lines.join("\n");
}

export function getProductSearchLabel(product: Product) {
  return [product.name, product.sku, product.barcode]
    .filter((value) => value && value.trim().length > 0)
    .join(" ");
}

export function buildPublicQuotationUrl(publicToken: string) {
  if (typeof window === "undefined") {
    return `/quote/${publicToken}`;
  }

  return `${window.location.origin}/quote/${publicToken}`;
}
