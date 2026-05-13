import type { Product } from "@/modules/products/types/product";
import { normalizeId, normalizeOptionalId } from "@/shared/utils/normalize-id";
import { normalizeNumber } from "@/shared/utils/normalize-number";

export type ProductApiRecord = Omit<
  Product,
  "id" | "categoryId" | "parentProductId" | "price" | "cost"
> & {
  id: number | string;
  categoryId: number | string | null;
  parentProductId?: number | string | null;
  imageUrls?: unknown;
  cost: number | string;
  price: number | string;
  taxRate: number | string;
};

function normalizeProductImageUrls(imageUrls: unknown) {
  return Array.isArray(imageUrls)
    ? imageUrls.filter(
        (imageUrl): imageUrl is string =>
          typeof imageUrl === "string" && imageUrl.trim().length > 0,
      )
    : [];
}

export function normalizeProductRecord(record: ProductApiRecord): Product {
  return {
    ...record,
    id: normalizeId(record.id),
    categoryId: normalizeOptionalId(record.categoryId),
    parentProductId: normalizeOptionalId(record.parentProductId ?? null),
    productType: record.productType ?? "BASIC",
    variantName: record.variantName ?? null,
    imageUrls: normalizeProductImageUrls(record.imageUrls),
    description: record.description ?? null,
    sku: record.sku ?? null,
    barcode: record.barcode ?? null,
    taxLabel: record.taxLabel ?? null,
    taxRate: normalizeNumber(record.taxRate),
    cost: normalizeNumber(record.cost),
    price: normalizeNumber(record.price),
    minStock: record.minStock ?? 0,
    unit: record.unit ?? "UNIT",
    isActive: record.isActive ?? true,
    isVisibleInCatalog: record.isVisibleInCatalog ?? true,
  };
}
