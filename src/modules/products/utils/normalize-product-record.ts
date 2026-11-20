import type { Product } from "@/modules/products/types/product";
import { normalizeId, normalizeOptionalId } from "@/shared/utils/normalize-id";
import { normalizeNumber } from "@/shared/utils/normalize-number";

export type ProductApiRecord = Omit<
  Product,
  "id" | "categoryId" | "parentProductId" | "price" | "cost" | "recipeAvailability" | "variantGroup"
> & {
  id: number | string;
  categoryId: number | string | null;
  parentProductId?: number | string | null;
  imageUrls?: unknown;
  cost: number | string;
  price: number | string;
  taxRate: number | string;
  recipeAvailability?: {
    configured?: boolean;
    availableQuantity?: number | string | null;
    limitingIngredientName?: string | null;
  } | null;
  variantGroup?: {
    id: number | string;
    name: string;
    imageUrls?: unknown;
  } | null;
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
    inventoryBehavior: record.inventoryBehavior ?? "PURCHASED",
    recipeAvailability: record.recipeAvailability
      ? {
          configured: record.recipeAvailability.configured ?? false,
          availableQuantity:
            record.recipeAvailability.availableQuantity === null ||
            record.recipeAvailability.availableQuantity === undefined
              ? null
              : normalizeNumber(record.recipeAvailability.availableQuantity),
          limitingIngredientName:
            record.recipeAvailability.limitingIngredientName ?? null,
        }
      : null,
    variantGroup: record.variantGroup
      ? {
          id: normalizeId(record.variantGroup.id),
          name: record.variantGroup.name,
          imageUrls: normalizeProductImageUrls(record.variantGroup.imageUrls),
        }
      : null,
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
    isFavorite: record.isFavorite ?? false,
    isVisibleInCatalog: record.isVisibleInCatalog ?? true,
  };
}
