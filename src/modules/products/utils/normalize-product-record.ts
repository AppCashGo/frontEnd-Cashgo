import type { Product } from "@/modules/products/types/product";
import { normalizeId, normalizeOptionalId } from "@/shared/utils/normalize-id";
import { normalizeNumber } from "@/shared/utils/normalize-number";

export type ProductApiRecord = Omit<
  Product,
  "id" | "categoryId" | "price" | "cost"
> & {
  id: number | string;
  categoryId: number | string | null;
  cost: number | string;
  price: number | string;
  taxRate: number | string;
};

export function normalizeProductRecord(record: ProductApiRecord): Product {
  return {
    ...record,
    id: normalizeId(record.id),
    categoryId: normalizeOptionalId(record.categoryId),
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
