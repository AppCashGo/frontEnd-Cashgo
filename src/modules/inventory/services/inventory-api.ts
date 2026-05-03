import {
  normalizeProductRecord,
  type ProductApiRecord,
} from "@/modules/products/utils/normalize-product-record";
import type {
  InventoryAdjustmentInput,
  InventoryExportFilters,
  InventoryLowStockAlert,
  InventoryMovement,
  InventoryMovementType,
  InventoryProductCategory,
  InventoryProductCategoryInput,
  InventoryProductTaxesInput,
  InventoryProductTaxesResult,
  InventoryPurchaseInput,
  InventoryReferenceType,
} from "@/modules/inventory/types/inventory";
import {
  deleteJson,
  getBlob,
  getJson,
  patchJson,
  postJson,
} from "@/shared/services/api-client";
import { getAuthAccessToken } from "@/shared/services/auth-session";
import { normalizeId, normalizeOptionalId } from "@/shared/utils/normalize-id";
import { normalizeNumber } from "@/shared/utils/normalize-number";

type InventoryMovementApiRecord = Omit<
  InventoryMovement,
  | "id"
  | "productId"
  | "referenceId"
  | "performedByUserId"
  | "quantity"
  | "previousStock"
  | "newStock"
  | "unitCost"
  | "product"
  | "type"
  | "referenceType"
> & {
  id: number | string;
  productId: number | string;
  referenceId: number | string | null;
  performedByUserId: number | string | null;
  quantity: number | string;
  previousStock: number | string;
  newStock: number | string;
  unitCost: number | string | null;
  product: ProductApiRecord;
  type: InventoryMovementType;
  referenceType: InventoryReferenceType | null;
};

type InventoryLowStockAlertApiRecord = Omit<
  InventoryLowStockAlert,
  "stock" | "threshold"
> & {
  stock: number | string;
  threshold: number | string;
};

type InventoryProductCategoryApiRecord = Omit<
  InventoryProductCategory,
  "id" | "businessId"
> & {
  id: number | string;
  businessId: number | string;
};

function buildInventoryExportQuery(filters: InventoryExportFilters) {
  const searchParams = new URLSearchParams();

  if (filters.search?.trim()) {
    searchParams.set("search", filters.search.trim());
  }

  if (filters.categoryId?.trim()) {
    searchParams.set("categoryId", filters.categoryId.trim());
  }

  if (filters.lowStockOnly) {
    searchParams.set("lowStockOnly", "true");
  }

  const queryString = searchParams.toString();

  return queryString.length > 0 ? `?${queryString}` : "";
}

function normalizeInventoryMovement(
  record: InventoryMovementApiRecord,
): InventoryMovement {
  return {
    ...record,
    id: normalizeId(record.id),
    productId: normalizeId(record.productId),
    quantity: normalizeNumber(record.quantity),
    previousStock: normalizeNumber(record.previousStock),
    newStock: normalizeNumber(record.newStock),
    unitCost:
      record.unitCost === null ? null : normalizeNumber(record.unitCost),
    referenceType: record.referenceType ?? null,
    referenceId: normalizeOptionalId(record.referenceId),
    performedByUserId: normalizeOptionalId(record.performedByUserId),
    reason: record.reason ?? null,
    notes: record.notes ?? null,
    product: normalizeProductRecord(record.product),
  };
}

function normalizeInventoryProductCategory(
  record: InventoryProductCategoryApiRecord,
): InventoryProductCategory {
  return {
    ...record,
    id: normalizeId(record.id),
    businessId: normalizeId(record.businessId),
  };
}

function normalizeInventoryLowStockAlert(
  record: InventoryLowStockAlertApiRecord,
): InventoryLowStockAlert {
  return {
    ...record,
    stock: normalizeNumber(record.stock),
    threshold: normalizeNumber(record.threshold),
  };
}

export async function getInventoryMovements() {
  const movements = await getJson<InventoryMovementApiRecord[]>(
    "/inventory/movements",
    {
      accessToken: getAuthAccessToken(),
    },
  );

  return movements.map(normalizeInventoryMovement);
}

export async function getInventoryLowStockAlerts() {
  const alerts = await getJson<InventoryLowStockAlertApiRecord[]>(
    "/inventory/low-stock",
    {
      accessToken: getAuthAccessToken(),
    },
  );

  return alerts.map(normalizeInventoryLowStockAlert);
}

export async function createInventoryAdjustment(
  input: InventoryAdjustmentInput,
) {
  const movement = await postJson<
    InventoryMovementApiRecord,
    InventoryAdjustmentInput
  >("/inventory/adjustment", input, {
    accessToken: getAuthAccessToken(),
  });

  return normalizeInventoryMovement(movement);
}

export async function getInventoryCategories() {
  const categories = await getJson<InventoryProductCategoryApiRecord[]>(
    "/inventory/categories",
    {
      accessToken: getAuthAccessToken(),
    },
  );

  return categories.map(normalizeInventoryProductCategory);
}

export async function createInventoryCategory(
  input: InventoryProductCategoryInput,
) {
  const category = await postJson<
    InventoryProductCategoryApiRecord,
    InventoryProductCategoryInput
  >("/inventory/categories", input, {
    accessToken: getAuthAccessToken(),
  });

  return normalizeInventoryProductCategory(category);
}

export async function updateInventoryCategory(
  categoryId: string,
  input: Partial<InventoryProductCategoryInput>,
) {
  const category = await patchJson<
    InventoryProductCategoryApiRecord,
    Partial<InventoryProductCategoryInput>
  >(`/inventory/categories/${categoryId}`, input, {
    accessToken: getAuthAccessToken(),
  });

  return normalizeInventoryProductCategory(category);
}

export async function deleteInventoryCategory(categoryId: string) {
  const category = await deleteJson<InventoryProductCategoryApiRecord>(
    `/inventory/categories/${categoryId}`,
    {
      accessToken: getAuthAccessToken(),
    },
  );

  return normalizeInventoryProductCategory(category);
}

export async function updateInventoryProductTaxes(
  input: InventoryProductTaxesInput,
) {
  return postJson<InventoryProductTaxesResult, InventoryProductTaxesInput>(
    "/inventory/taxes",
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  );
}

export async function registerInventoryPurchase(input: InventoryPurchaseInput) {
  const movement = await postJson<
    InventoryMovementApiRecord,
    InventoryPurchaseInput
  >("/inventory/purchase", input, {
    accessToken: getAuthAccessToken(),
  });

  return normalizeInventoryMovement(movement);
}

export async function exportInventoryReport(filters: InventoryExportFilters) {
  return getBlob(`/inventory/export${buildInventoryExportQuery(filters)}`, {
    accessToken: getAuthAccessToken(),
    accept: "text/csv",
  });
}
